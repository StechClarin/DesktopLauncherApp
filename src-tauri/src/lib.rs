use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager, Runtime, Window, Emitter};
use futures_util::StreamExt;
use flate2::read::GzDecoder;
use tar::Archive;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::process::Child;
use sha2::{Sha256, Digest};

#[derive(Clone, Serialize)]
struct ProgressPayload {
    app_id: String,
    progress: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DbConfig {
    host: String,
    port: u16,
    user: String,
    pass: String,
}

struct ProcessManager {
    processes: Mutex<HashMap<String, Child>>,
}

impl ProcessManager {
    fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AppManifest {
    name: String,
    version: String,
    port: u16,
    exec_command: Option<String>,
}

const SHARED_SECRET: &str = "ETHERNANOS_SHIELD_2026_PROD_SECRET";

/// MECANISME DE LANCEMENT D'APPLICATION (ORCHESTRATEUR SÉCURISÉ)
/// ---------------------------------
#[tauri::command]
async fn execute_app<R: Runtime>(
    app_handle: AppHandle<R>,
    process_manager: tauri::State<'_, ProcessManager>,
    _window: Window<R>,
    app_id: String,
    tenant_id: String,
) -> Result<u16, String> {
    let app_data_path = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    
    // Read global DB config (host, port)
    let config_path = app_data_path.join("db_config.json");
    let global_config_json = fs::read_to_string(&config_path)
        .map_err(|_| "Configuration de base de données globale manquante. Allez dans Settings.".to_string())?;
    let global_config: DbConfig = serde_json::from_str(&global_config_json).map_err(|e| e.to_string())?;

    let mut app_path = app_data_path.clone();
    app_path.push("apps");
    app_path.push(&app_id);

    // Read application DB config (name, user, pass)
    let app_db_path = app_path.join("db.json");
    let app_db_json = fs::read_to_string(&app_db_path)
        .map_err(|_| format!("Configuration de la base de données de l'application {} manquante.", app_id))?;
    let app_db_creds: serde_json::Value = serde_json::from_str(&app_db_json).map_err(|e| e.to_string())?;

    // Read application manifest
    let manifest_path = app_path.join("ethernanos.json");
    let manifest_json = fs::read_to_string(&manifest_path).map_err(|_| "Manifeste 'ethernanos.json' manquant.".to_string())?;
    let manifest: AppManifest = serde_json::from_str(&manifest_json).map_err(|e| e.to_string())?;

    // --- SCRIPT PERMISSIONS (Unix) ---
    let exec_cmd = manifest.exec_command.unwrap_or_else(|| "./hub_start.sh".to_string());
    
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let script_path = app_path.join(&exec_cmd);
        if script_path.exists() {
            let mut perms = fs::metadata(&script_path).map_err(|e| e.to_string())?.permissions();
            perms.set_mode(0o755); // rwxr-xr-x
            fs::set_permissions(&script_path, perms).map_err(|e| e.to_string())?;
        }
    }

    // --- PORT HUNTING LOGIC ---
    let mut actual_port = manifest.port;
    let mut found = false;
    for p in manifest.port..(manifest.port + 100) {
        if std::net::TcpListener::bind(("127.0.0.1", p)).is_ok() {
            actual_port = p;
            found = true;
            break;
        }
    }

    if !found {
        return Err(format!("Impossible de trouver un port libre pour {} (essayé de {} à {})", app_id, manifest.port, manifest.port + 99));
    }

    // --- SECURITY HANDSHAKE (The Shield) ---
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let mut hasher = Sha256::new();
    hasher.update(format!("{}:{}", timestamp, SHARED_SECRET));
    let security_token = format!("{:x}", hasher.finalize());
    let hub_pid = std::process::id();

    // Preparation of the command
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.arg("/C").arg(&exec_cmd);
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c").arg(format!("./{}", exec_cmd));
        c
    };

    // Execution with Security Handshake and Configuration
    let child = cmd
        .current_dir(&app_path)
        .env("ETHER_HUB_TOKEN", security_token)
        .env("ETHER_HUB_TS", timestamp.to_string())
        .env("ETHER_HUB_PID", hub_pid.to_string())
        .arg("--tenant-id")
        .arg(tenant_id)
        .arg("--app-port")
        .arg(actual_port.to_string())
        .arg("--db-host")
        .arg(&global_config.host)
        .arg("--db-port")
        .arg(global_config.port.to_string())
        .arg("--db-name")
        .arg(app_db_creds["db_name"].as_str().unwrap_or(""))
        .arg("--db-user")
        .arg(app_db_creds["db_user"].as_str().unwrap_or(""))
        .arg("--db-pass")
        .arg(app_db_creds["db_pass"].as_str().unwrap_or(""))
        .spawn()
        .map_err(|e| format!("Échec du lancement ({}): {}", exec_cmd, e))?;

    // --- PROCESS REGISTRATION ---
    let mut lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    
    // Kill previous instance if exists for this app_id
    if let Some(mut old_child) = lock.remove(&app_id) {
        let _ = old_child.kill();
    }
    
    lock.insert(app_id, child);

    Ok(actual_port)
}

#[tauri::command]
async fn get_app_manifest<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
) -> Result<AppManifest, String> {
    let mut manifest_path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    manifest_path.push("apps");
    manifest_path.push(&app_id);
    manifest_path.push("ethernanos.json");

    if !manifest_path.exists() {
        return Err(format!("Manifeste 'ethernanos.json' manquant pour {}", app_id));
    }

    let json = fs::read_to_string(manifest_path).map_err(|e| e.to_string())?;
    let manifest: AppManifest = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(manifest)
}

#[tauri::command]
async fn is_app_installed<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
) -> Result<bool, String> {
    let mut app_path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    app_path.push("apps");
    app_path.push(&app_id);
    
    if app_path.exists() && app_path.is_dir() {
        let entries = fs::read_dir(app_path).map_err(|e| e.to_string())?;
        return Ok(entries.count() > 0);
    }
    
    Ok(false)
}

#[tauri::command]
async fn download_app<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    app_id: String,
    url: String,
    checksum: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    app_dir.push("apps");
    app_dir.push(&app_id);
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

    let temp_tar_gz = app_dir.join("temp.tar.gz");
    let mut file = fs::File::create(&temp_tar_gz).map_err(|e| e.to_string())?;
    
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        std::io::copy(&mut &*chunk, &mut file).map_err(|e| e.to_string())?;
        
        downloaded += chunk.len() as u64;
        if total_size > 0 {
            let progress = (downloaded * 100) / total_size;
            window.emit("download-progress", ProgressPayload { 
                app_id: app_id.clone(), 
                progress 
            }).map_err(|e: tauri::Error| e.to_string())?;
        }
    }

    if let Some(expected_checksum) = checksum {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        let mut file_to_check = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
        std::io::copy(&mut file_to_check, &mut hasher).map_err(|e| e.to_string())?;
        let hash = format!("{:x}", hasher.finalize());
        
        if hash != expected_checksum.to_lowercase() {
            fs::remove_file(&temp_tar_gz).ok();
            return Err(format!(
                "Security Alert: Checksum mismatch! Expected: {}, Found: {}. Installation aborted.", 
                expected_checksum, 
                hash
            ));
        }
    }

    let tar_gz = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
    let tar = GzDecoder::new(tar_gz);
async fn update_hub<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    url: String,
    checksum: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut update_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    update_dir.push("pending_update");
    fs::create_dir_all(&update_dir).map_err(|e| e.to_string())?;

    let update_pack = update_dir.join("update.tar.gz");
    let mut file = fs::File::create(&update_pack).map_err(|e| e.to_string())?;
    
    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        std::io::copy(&mut &*chunk, &mut file).map_err(|e| e.to_string())?;
        
        downloaded += chunk.len() as u64;
        if total_size > 0 {
            let progress = (downloaded * 100) / total_size;
            window.emit("hub-update-progress", progress).map_err(|e: tauri::Error| e.to_string())?;
        }
    }

    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    let mut file_to_check = fs::File::open(&update_pack).map_err(|e| e.to_string())?;
    std::io::copy(&mut file_to_check, &mut hasher).map_err(|e| e.to_string())?;
    let hash = format!("{:x}", hasher.finalize());
    
    if hash != checksum.to_lowercase() {
        fs::remove_file(&update_pack).ok();
        return Err(format!("Hub Update Security Alert: Checksum mismatch! Found: {}", hash));
    }

    Ok("Mise à jour téléchargée et vérifiée. Prêt pour le redémarrage.".to_string())
}

#[tauri::command]
async fn save_db_config<R: Runtime>(
    app_handle: AppHandle<R>,
    config: DbConfig,
) -> Result<(), String> {
    let mut config_path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;
    config_path.push("db_config.json");

    let json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_db_config<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<Option<DbConfig>, String> {
    let mut config_path = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    config_path.push("db_config.json");

    if !config_path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: DbConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(config))
}

#[tauri::command]
async fn test_db_connection(config: DbConfig) -> Result<String, String> {
    use sqlx::postgres::PgPoolOptions;
    
    let url = format!(
        "postgres://{}:{}@{}:{}/postgres",
        config.user, config.pass, config.host, config.port
    );

    let pool = PgPoolOptions::new()
        .max_connections(1)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(&url)
        .await
        .map_err(|e| format!("Erreur de connexion : {}", e))?;

    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| format!("Erreur d'exécution : {}", e))?;

    Ok("Connexion réussie !".to_string())
}

#[tauri::command]
async fn initialize_database<R: Runtime>(
    app_handle: AppHandle<R>,
    config: DbConfig, 
    app_id: String
) -> Result<String, String> {
    use sqlx::postgres::PgPoolOptions;
    
    let admin_url = format!(
        "postgres://{}:{}@{}:{}/postgres",
        config.user, config.pass, config.host, config.port
    );

    let admin_pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&admin_url)
        .await
        .map_err(|e| format!("Erreur admin pool : {}", e))?;

    let db_name = format!("db_{}", app_id.replace("-", "_"));
    let app_user = format!("user_{}", app_id.replace("-", "_"));
    let app_pass = uuid::Uuid::new_v4().to_string().replace("-", ""); 

    let exists: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM pg_database WHERE datname = $1")
        .bind(&db_name)
        .fetch_one(&admin_pool)
        .await
        .map_err(|e| e.to_string())?;

    if exists.0 == 0 {
        sqlx::query(&format!("CREATE DATABASE {}", db_name))
            .execute(&admin_pool)
            .await
            .map_err(|e| format!("Erreur création DB : {}", e))?;
    }

    let new_db_url = format!(
        "postgres://{}:{}@{}:{}/{}",
        config.user, config.pass, config.host, config.port, db_name
    );
    
    let db_pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&new_db_url)
        .await
        .map_err(|e| format!("Erreur new DB pool : {}", e))?;

    sqlx::query(&format!(
        "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = '{}') THEN CREATE USER {} WITH PASSWORD '{}'; END IF; END $$;",
        app_user, app_user, app_pass
    )).execute(&db_pool).await.map_err(|e| e.to_string())?;

    sqlx::query(&format!("GRANT ALL PRIVILEGES ON DATABASE {} TO {}", db_name, app_user))
        .execute(&db_pool)
        .await
        .map_err(|e| e.to_string())?;

    sqlx::query(&format!("GRANT ALL ON SCHEMA public TO {}", app_user))
        .execute(&db_pool)
        .await
        .map_err(|e| e.to_string())?;

    let mut app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    app_dir.push("apps");
    app_dir.push(&app_id);
    fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    
    let db_json_path = app_dir.join("db.json");
    let creds = serde_json::json!({
        "db_name": db_name,
        "db_user": app_user,
        "db_pass": app_pass
    });
    fs::write(db_json_path, serde_json::to_string(&creds).unwrap()).map_err(|e| e.to_string())?;

    Ok(serde_json::to_string(&creds).unwrap())
}

#[tauri::command]
async fn uninstall_app<R: Runtime>(
    app_handle: AppHandle<R>,
    config: DbConfig, 
    app_id: String
) -> Result<String, String> {
    use sqlx::postgres::PgPoolOptions;
    
    let mut app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    app_dir.push("apps");
    app_dir.push(&app_id);

    let db_json_path = app_dir.join("db.json");
    if db_json_path.exists() {
        let db_json_str = fs::read_to_string(&db_json_path).map_err(|e| e.to_string())?;
        let creds: serde_json::Value = serde_json::from_str(&db_json_str).map_err(|e| e.to_string())?;
        
        if let Some(db_name) = creds["db_name"].as_str() {
            let admin_url = format!(
                "postgres://{}:{}@{}:{}/postgres",
                config.user, config.pass, config.host, config.port
            );

            let admin_pool = PgPoolOptions::new()
                .max_connections(1)
                .connect(&admin_url)
                .await
                .map_err(|e| format!("Erreur admin pool (Uninstallation) : {}", e))?;

            sqlx::query(&format!("DROP DATABASE IF EXISTS {} WITH (FORCE)", db_name))
                .execute(&admin_pool)
                .await
                .map_err(|e| format!("Erreur drop DB : {}", e))?;
                
            let app_user = format!("user_{}", app_id.replace("-", "_"));
            sqlx::query(&format!("DROP USER IF EXISTS {}", app_user))
                .execute(&admin_pool)
                .await
                .ok(); 
        }
    }

    if app_dir.exists() {
        fs::remove_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    Ok(format!("Application {} désinstallée proprement.", app_id))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .manage(ProcessManager::new())
    .invoke_handler(tauri::generate_handler![
        download_app,
        execute_app,
        save_db_config,
        get_db_config,
        test_db_connection,
        initialize_database,
        uninstall_app,
        is_app_installed,
        get_app_manifest,
        update_hub
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
