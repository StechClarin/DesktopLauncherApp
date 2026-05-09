use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Runtime, Window, Emitter, Manager};
use sha2::Sha256;
use crate::models::{AppManifest, ProcessManager, ActiveApp, DbConfig};


#[tauri::command]
pub async fn execute_app<R: Runtime>(
    app_handle: AppHandle<R>,
    process_manager: tauri::State<'_, ProcessManager>,
    _window: Window<R>,
    app_id: String,
    tenant_id: String,
) -> Result<u16, String> {
    let app_data_path = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    
    // Read global DB config (host, port) - Optional for SQLite mode
    let config_path = app_data_path.join("db_config.json");
    let _global_config: Option<DbConfig> = if config_path.exists() {
        let json = fs::read_to_string(&config_path).unwrap_or_default();
        serde_json::from_str(&json).ok()
    } else {
        None
    };

    let mut app_path = app_data_path.clone();
    app_path.push("apps");
    app_path.push(&app_id);

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

    // --- PORT SHIELDING LOGIC ---
    let mut actual_port = manifest.port;
    let mut found = false;
    let mut _port_shield: Option<std::net::TcpListener> = None;

    for p in manifest.port..(manifest.port + 100) {
        match std::net::TcpListener::bind(("127.0.0.1", p)) {
            Ok(listener) => {
                actual_port = p;
                found = true;
                _port_shield = Some(listener);
                break;
            },
            Err(_) => continue,
        }
    }

    if !found {
        return Err(format!("Impossible de trouver un port libre pour {} (essayé de {} à {})", app_id, manifest.port, manifest.port + 99));
    }

    // --- SECURITY HANDSHAKE ---
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
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

    // GENERATE UNIQUE SESSION TOKEN
    use sha2::Digest;
    let session_msg = format!("{}:{}", hub_pid, timestamp);
    let mut hasher = Sha256::new();
    hasher.update(session_msg.as_bytes());
    let session_token = format!("{:x}", hasher.finalize());

    let hub_api_key = std::env::var("VITE_HUB_API_KEY").unwrap_or_else(|_| "ethernanos-hub-secret-2026".to_string());
    let mut cmd = cmd.current_dir(&app_path);
    cmd = cmd.env("ETHER_SESSION_TOKEN", &session_token)
        .env("ETHER_HUB_PID", hub_pid.to_string())
        .env("ETHER_APP_PORT", actual_port.to_string())
        .env("ETHER_HUB_API_KEY", &hub_api_key)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .stdin(std::process::Stdio::piped());

    let mut child = cmd.spawn()
        .map_err(|e| format!("Échec du lancement ({}): {}", exec_cmd, e))?;

    // --- CONFIG INJECTION VIA STDIN ---
    let app_db_path = app_path.join("db.json");
    let app_db_creds: Option<serde_json::Value> = if app_db_path.exists() {
        let json = fs::read_to_string(&app_db_path).unwrap_or_default();
        serde_json::from_str(&json).ok()
    } else {
        None
    };

    let mut stdin = child.stdin.take().expect("Failed to open stdin");
    let config_payload = serde_json::json!({
        "session_token": session_token,
        "tenant_id": tenant_id,
        "app_port": actual_port,
        "db_config": app_db_creds,
        "hub_api_key": hub_api_key,
        "url_prefix": format!("/schoolmanage/{}/", tenant_id)
    });

    use std::io::Write;
    let config_str = serde_json::to_string(&config_payload).unwrap();
    let _ = stdin.write_all(config_str.as_bytes());
    let _ = stdin.write_all(b"\n");
    drop(stdin);

    // --- LOG BROADCASTING ---
    let stdout = child.stdout.take().expect("Child did not have a handle to stdout");
    let stderr = child.stderr.take().expect("Child did not have a handle to stderr");
    let app_handle_clone = app_handle.clone();
    let app_id_clone = app_id.clone();

    tokio::spawn(async move {
        use std::io::{BufRead, BufReader};
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
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

    let app_name = match get_app_manifest(app_handle.clone(), app_id.clone()).await {
        Ok(m) => m.name,
        Err(_) => "Application".to_string(),
    };

    // --- PROCESS REGISTRATION ---
    let mut lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    
    if let Some(old_app) = lock.remove(&app_id) {
        let mut old_child = old_app.child;
        let _ = old_child.kill();
    }
    
    lock.insert(app_id.clone(), ActiveApp { 
        child, 
        name: app_name, 
        port: actual_port 
    });

    let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "started"
    }));

    Ok(actual_port)
}

#[tauri::command]
pub async fn is_app_installed<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
) -> Result<bool, String> {
    let mut app_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| format!("Impossible de localiser AppDataDir : {}", e))?;
    app_path.push("apps");
    app_path.push(&app_id);
    
    if app_path.exists() && app_path.is_dir() {
        let entries = fs::read_dir(app_path).map_err(|e| e.to_string())?;
        return Ok(entries.count() > 0);
    }
    
    Ok(false)
}

#[tauri::command]
pub async fn get_app_manifest<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
) -> Result<AppManifest, String> {
    let app_data_dir = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    let mut app_dir = app_data_dir.clone();
    app_dir.push("apps");
    app_dir.push(&app_id);

    let manifest_path = app_dir.join("ethernanos.json");

    if !manifest_path.exists() {
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
pub async fn run_app_setup<R: Runtime>(
    app_handle: AppHandle<R>,
    app_id: String,
    _tenant_id: String,
    _config: DbConfig
) -> Result<(), String> {
    // Basic setup logic extracted
    let app_data_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    let mut app_path = app_data_path.clone();
    app_path.push("apps");
    app_path.push(&app_id);

    if !app_path.exists() {
        return Err("Application non installée".to_string());
    }

    // --- EXECUTE hub_setup.sh ---
    let mut setup_cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.arg("/C").arg("hub_setup.bat");
        c
    } else {
        let mut c = Command::new("sh");
        c.arg("-c").arg("./hub_setup.sh");
        c
    };

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let script_path = app_path.join("hub_setup.sh");
        if script_path.exists() {
            let mut perms = fs::metadata(&script_path).map_err(|e| e.to_string())?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&script_path, perms).map_err(|e| e.to_string())?;
        }
    }

    let status = setup_cmd.current_dir(&app_path)
        .status()
        .map_err(|e| format!("Échec du lancement du setup : {}", e))?;

    if !status.success() {
        return Err("Le script de configuration a échoué.".to_string());
    }

    Ok(())
}

#[tauri::command]
pub async fn uninstall_app<R: Runtime>(
    app_handle: AppHandle<R>,
    process_manager: tauri::State<'_, ProcessManager>,
    app_id: String,
) -> Result<(), String> {
    // 1. Kill the process if running
    {
        let mut lock = process_manager.processes.lock().map_err(|_| "Impossible de verrouiller le gestionnaire de processus")?;
        if let Some(mut app) = lock.remove(&app_id) {
            let _ = app.child.kill();
        }
    }

    // 2. Get the path
    let mut app_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    app_path.push("apps");
    app_path.push(&app_id);

    // 3. Delete directory
    if app_path.exists() {
        fs::remove_dir_all(&app_path).map_err(|e| format!("Échec de la suppression des fichiers : {}", e))?;
    }

    // 4. Notify UI
    let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "uninstalled"
    }));

    Ok(())
}

#[tauri::command]
pub async fn kill_app<R: Runtime>(
    app_handle: AppHandle<R>,
    process_manager: tauri::State<'_, ProcessManager>,
    app_id: String,
) -> Result<(), String> {
    let mut lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    if let Some(mut app) = lock.remove(&app_id) {
        let _ = app.child.kill();
        
        let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
            "app_id": app_id,
            "status": "stopped"
        }));
    }
    Ok(())
}

#[tauri::command]
pub async fn get_active_apps(
    process_manager: tauri::State<'_, ProcessManager>,
) -> Result<Vec<serde_json::Value>, String> {
    let lock = process_manager.processes.lock().map_err(|_| "Failed to lock process manager")?;
    let mut active = Vec::new();
    for (id, app) in lock.iter() {
        active.push(serde_json::json!({
            "id": id,
            "name": app.name,
            "port": app.port
        }));
    }
    Ok(active)
}
