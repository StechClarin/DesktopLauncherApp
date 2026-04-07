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
use sha2::Sha256;

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

struct ActiveApp {
    child: Child,
    name: String,
    port: u16,
}

struct ProcessManager {
    processes: Mutex<HashMap<String, ActiveApp>>,
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
    
    // Read global DB config (host, port) - Optional for SQLite mode
    let config_path = app_data_path.join("db_config.json");
    let global_config: Option<DbConfig> = if config_path.exists() {
        let json = fs::read_to_string(&config_path).unwrap_or_default();
        serde_json::from_str(&json).ok()
    } else {
        None
    };

    let mut app_path = app_data_path.clone();
    app_path.push("apps");
    app_path.push(&app_id);

    // Read application DB config (name, user, pass) - Optional for SQLite mode
    let app_db_path = app_path.join("db.json");
    let app_db_creds: Option<serde_json::Value> = if app_db_path.exists() {
        let json = fs::read_to_string(&app_db_path).unwrap_or_default();
        serde_json::from_str(&json).ok()
    } else {
        None
    };

    // Read application manifest
    let manifest_path = app_path.join("ethernanos.json");
    if !manifest_path.exists() {
        let fallback = app_path.join("_internal").join("ethernanos.json");
        if fallback.exists() {
            std::fs::copy(&fallback, &manifest_path).unwrap_or_default();
        }
    }
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

    // --- PORT SHIELDING LOGIC (v3.5 Industrial) ---
    let mut actual_port = manifest.port;
    let mut found = false;
    let mut _port_shield: Option<std::net::TcpListener> = None; // Keeping it in scope to lock the port

    for p in manifest.port..(manifest.port + 100) {
        match std::net::TcpListener::bind(("127.0.0.1", p)) {
            Ok(listener) => {
                actual_port = p;
                found = true;
                _port_shield = Some(listener); // We "hold" the port and keep it busy for others
                break;
            },
            Err(_) => continue,
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
    
    let _ = Sha256::new()
        .chain_update(format!("{}:{}", timestamp, SHARED_SECRET))
        .finalize();
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

    // GENERATE UNIQUE SESSION TOKEN (Industrial v2.0)
    use sha2::Digest;
    let session_msg = format!("{}:{}", hub_pid, timestamp);
    let mut hasher = sha2::Sha256::new();
    hasher.update(session_msg.as_bytes());
    let session_token = format!("{:x}", hasher.finalize());

    let mut cmd = cmd.current_dir(&app_path);
    cmd = cmd.env("ETHER_SESSION_TOKEN", &session_token)
        .env("ETHER_HUB_PID", hub_pid.to_string())
        .env("ETHER_APP_PORT", actual_port.to_string())
        .env("ETHER_HUB_SECRET_KEY", "ethernanos-hub-secret-2026")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::piped()); // Use stdin for sensitive config

    let mut child = cmd.spawn()
        .map_err(|e| format!("Échec du lancement ({}): {}", exec_cmd, e))?;

    // --- CONFIG INJECTION VIA STDIN ---
    let mut stdin = child.stdin.take().expect("Failed to open stdin");
    let config_payload = serde_json::json!({
        "session_token": session_token,
        "tenant_id": tenant_id,
        "app_port": actual_port,
        "db_config": match (&global_config, &app_db_creds) {
            (Some(global), _) => {
                // Determine database name: use app specific name if available, else fallback to safe app_id name
                let db_name = match app_db_creds {
                    Some(ref app) => app["db_name"].as_str().unwrap_or(&format!("db_{}", app_id.replace("-", "_"))).to_string(),
                    None => format!("db_{}", app_id.replace("-", "_"))
                };
                let db_user = match app_db_creds {
                    Some(ref app) => app["db_user"].as_str().unwrap_or(&format!("user_{}", app_id.replace("-", "_"))).to_string(),
                    None => format!("user_{}", app_id.replace("-", "_"))
                };
                
                Some(serde_json::json!({
                    "host": global.host,
                    "port": global.port,
                    "name": db_name,
                    "user": db_user,
                    "pass": match app_db_creds {
                        Some(ref app) => app["db_pass"].as_str().unwrap_or(""),
                        None => ""
                    }
                }))
            },
            _ => None
        },
        "hub_api_key": "ethernanos-hub-secret-2026",
        "url_prefix": format!("/schoolmanage/{}/", tenant_id) // SYNCHRONISATION ROUTAGE (v22.3)
    });

    use std::io::Write;
    let config_str = serde_json::to_string(&config_payload).unwrap();
    let _ = stdin.write_all(config_str.as_bytes());
    let _ = stdin.write_all(b"\n");
    drop(stdin); // Close stdin to signal config is sent

    // --- LOG BROADCASTING & SIGNAL DETECTION ---
    let stdout = child.stdout.take().expect("Child did not have a handle to stdout");
    let stderr = child.stderr.take().expect("Child did not have a handle to stderr");
    let app_handle_clone = app_handle.clone();
    let app_id_clone = app_id.clone();

    // Task for STDOUT (with Signal Detector)
    tokio::spawn(async move {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                // DETECTOR: [HUB_SIGNAL:READY]
                if l.contains("[HUB_SIGNAL:READY]") {
                    let _ = app_handle_clone.emit("app-ready", &app_id_clone);
                }

                let _ = app_handle_clone.emit("app-log", serde_json::json!({
                    "app_id": app_id_clone,
                    "stream": "stdout",
                    "message": l
                }));
            }
        }
    });

    // Task for STDERR
    let app_handle_clone_err = app_handle.clone();
    let app_id_clone_err = app_id.clone();
    tokio::spawn(async move {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = app_handle_clone_err.emit("app-log", serde_json::json!({
                    "app_id": app_id_clone_err,
                    "stream": "stderr",
                    "message": l
                }));
            }
        }
    });

    // Retrieve app name from manifest or metadata (Async, before lock)
    let app_name = match get_app_manifest(app_handle.clone(), app_id.clone()).await {
        Ok(m) => m.name,
        Err(_) => "Application".to_string(),
    };

    // --- PROCESS REGISTRATION ---
    let mut lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    
    // Kill previous instance if exists for this app_id
    if let Some(old_app) = lock.remove(&app_id) {
        let mut old_child = old_app.child;
        let _ = old_child.kill();
    }
    
    lock.insert(app_id.clone(), ActiveApp { 
        child, 
        name: app_name, 
        port: actual_port 
    });

    // NOTIFY FRONTEND (v11.1)
    let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "started"
    }));

    // The _port_shield listener automatically drops here, releasing the port
    // precisely when Python (Waitress) is ready to take it over.
    Ok(actual_port)
}

#[tauri::command]
async fn is_app_installed<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
) -> Result<bool, String> {
    let mut app_path = app_handle.path().app_data_dir().map_err(|e| format!("Impossible de localiser AppDataDir : {}", e))?;
    app_path.push("apps");
    app_path.push(&app_id);
    
    if app_path.exists() && app_path.is_dir() {
        let entries = fs::read_dir(app_path).map_err(|e| e.to_string())?;
        return Ok(entries.count() > 0);
    }
    
    Ok(false)
}

#[tauri::command]
async fn get_app_manifest<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
) -> Result<AppManifest, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    let mut app_dir = app_data_dir.clone();
    app_dir.push("apps");
    app_dir.push(&app_id);

    let manifest_path = app_dir.join("ethernanos.json");

    if !manifest_path.exists() {
        // We already have app_dir which is absolute, use it directly
        let mut fallback_path = app_dir.clone();
        fallback_path.push("_internal");
        fallback_path.push("ethernanos.json");
        
        if fallback_path.exists() {
            std::fs::copy(&fallback_path, &manifest_path).unwrap_or_default();
        } else {
            return Err(format!("Manifeste 'ethernanos.json' manquant pour {} (Tentative racine et _internal échouées)", app_id));
        }
    }

    let json = fs::read_to_string(manifest_path).map_err(|e| e.to_string())?;
    let manifest: AppManifest = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(manifest)
}

#[tauri::command]
async fn download_app<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    app_id: String,
    url: String,
    checksum: Option<String>,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .no_gzip()
        .no_brotli()
        .no_deflate()
        .build()
        .map_err(|e| format!("Échec création client réseau : {}", e))?;

    let response = client.get(&url).send().await.map_err(|e| format!("Échec du téléchargement réseau : {}", e))?;
    
    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    app_dir.push("apps");
    app_dir.push(&app_id);
    fs::create_dir_all(&app_dir).map_err(|e| format!("Impossible de créer le dossier de l'app : {}", e))?;

    let temp_tar_gz = app_dir.join("temp.tar.gz");
    let mut file = fs::File::create(&temp_tar_gz).map_err(|e| format!("Impossible de créer l'archive temporaire : {}", e))?;
    
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

    let tar_gz = fs::File::open(&temp_tar_gz).map_err(|e| format!("Impossible de rouvrir l'archive pour extraction : {}", e))?;
    let tar = GzDecoder::new(tar_gz);
    let mut archive = Archive::new(tar);
    archive.unpack(&app_dir).map_err(|e| format!("Le désarchivage du tar.gz a échoué (archive corrompue ?) : {}", e))?;

    fs::remove_file(temp_tar_gz).ok();

    let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "installed"
    }));

    Ok(format!("App {} installed and verified at {:?}", app_id, app_dir))
}

#[tauri::command]
async fn update_hub<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    url: String,
    checksum: String,
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .no_gzip()
        .no_brotli()
        .no_deflate()
        .build()
        .map_err(|e| format!("Échec création client réseau (Update) : {}", e))?;

    let response = client.get(&url).send().await.map_err(|e| format!("Échec du téléchargement de la mise à jour : {}", e))?;
    
    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut update_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    update_dir.push("pending_update");
    fs::create_dir_all(&update_dir).map_err(|e| format!("Impossible de créer le dossier des mises à jour : {}", e))?;

    let update_pack = update_dir.join("update.tar.gz");
    let mut file = fs::File::create(&update_pack).map_err(|e| format!("Impossible d'enregistrer la nouvelle version du Hub : {}", e))?;

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| format!("Erreur réseau (chunk) : {}", e))?;
        std::io::copy(&mut &*chunk, &mut file).map_err(|e| format!("Erreur écriture (chunk) : {}", e))?;
        
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
    let db_user = "postgres"; // Forced as per industrial v3.4

    let exists: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM pg_database WHERE datname = $1")
        .bind(&db_name)
        .fetch_one(&admin_pool)
        .await
        .map_err(|e| format!("Impossible de vérifier l'existence de la DB : {}", e))?;

    if exists.0 == 0 {
        sqlx::query(&format!("CREATE DATABASE {}", db_name))
            .execute(&admin_pool)
            .await
            .map_err(|e| format!("Erreur création DB : {}", e))?;
    }

    let mut app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    app_dir.push("apps");
    app_dir.push(&app_id);
    fs::create_dir_all(&app_dir).map_err(|e| format!("Impossible de créer le dossier pour sauvegarder db.json : {}", e))?;
    
    let db_json_path = app_dir.join("db.json");
    let creds = serde_json::json!({
        "db_name": db_name,
        "db_user": db_user,
        "db_pass": config.pass // Reuse global password
    });
    fs::write(db_json_path, serde_json::to_string(&creds).unwrap()).map_err(|e| format!("Impossible d'écrire db.json : {}", e))?;

    Ok(serde_json::to_string(&creds).unwrap())
}

#[tauri::command]
async fn run_app_setup<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
    tenant_id: String,
    config: DbConfig
) -> Result<String, String> {
    let app_data_path = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let mut app_path = app_data_path.clone();
    app_path.push("apps");
    app_path.push(&app_id);

    #[cfg(target_os = "windows")]
    let exe_path = app_path.join("schoolmanage.exe");
    #[cfg(not(target_os = "windows"))]
    let exe_path = app_path.join("schoolmanage");

    if !exe_path.exists() {
        return Err("Exécutable introuvable pour le setup.".into());
    }

    use std::process::Stdio;
    use std::io::Write;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let mut cmd = Command::new(&exe_path);
    cmd.arg("--ether-setup");
    cmd.current_dir(&app_path);
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());
    
    // Handshake Security v3.4
    let hub_pid = std::process::id();
    cmd.env("ETHER_HUB_PID", hub_pid.to_string())
       .env("ETHER_SESSION_TOKEN", "setup-handshake-v3.4")
       .env("ETHER_HUB_API_KEY", "ethernanos-hub-secret-2026");
    
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW

    let mut child = cmd.spawn().map_err(|e| format!("Failed to launch setup: {}", e))?;
    
    // Config Injection
    let mut stdin = child.stdin.take().expect("Failed to open setup stdin");
    let db_name = format!("db_{}", app_id.replace("-", "_"));
    
    let config_payload = serde_json::json!({
        "session_token": "setup-handshake-v3.4",
        "tenant_id": tenant_id,
        "db_config": {
            "host": config.host,
            "port": config.port,
            "name": db_name,
            "user": "postgres",
            "pass": config.pass
        }
    });

    let config_str = format!("{}\n", serde_json::to_string(&config_payload).unwrap());
    let _ = stdin.write_all(config_str.as_bytes());
    drop(stdin); 

    let output = child.wait_with_output().map_err(|e| format!("Setup process error: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(format!("Installation failed (Setup Error).\n\nSTDOUT: {}\nSTDERR: {}", stdout, stderr));
    }

    Ok("Setup completed successfully.".into())
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

    // NOTIFY FRONTEND (v11.1)
    let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "uninstalled"
    }));

    Ok(format!("Application {} désinstallée proprement.", app_id))
}

#[derive(Serialize)]
struct ActiveAppResponse {
    id: String,
    name: String,
    port: u16,
}

#[tauri::command]
async fn get_active_apps(
    process_manager: tauri::State<'_, ProcessManager>,
) -> Result<Vec<ActiveAppResponse>, String> {
    let lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    let mut apps = Vec::new();
    
    for (id, app) in lock.iter() {
        apps.push(ActiveAppResponse {
            id: id.clone(),
            name: app.name.clone(),
            port: app.port,
        });
    }
    
    Ok(apps)
}

#[tauri::command]
async fn kill_app<R: Runtime>(
    app_handle: AppHandle<R>,
    process_manager: tauri::State<'_, ProcessManager>,
    app_id: String,
) -> Result<bool, String> {
    let mut lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    
    if let Some(app) = lock.remove(&app_id) {
        let mut child = app.child;
        let _ = child.kill();

        // NOTIFY FRONTEND (v11.1)
        let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
            "app_id": app_id,
            "status": "stopped"
        }));

        Ok(true)
    } else {
        Ok(false)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .manage(ProcessManager::new())
    .invoke_handler(tauri::generate_handler![
        download_app,
        execute_app,
        kill_app,
        get_active_apps,
        save_db_config,
        get_db_config,
        test_db_connection,
        initialize_database,
        run_app_setup,
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
