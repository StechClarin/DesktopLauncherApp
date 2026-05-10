use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime, Manager};
use crate::models::DbConfig;

#[tauri::command]
pub async fn save_db_config<R: Runtime>(
    app_handle: AppHandle<R>,
    config: DbConfig,
) -> Result<(), String> {
    let mut config_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    fs::create_dir_all(&config_path).map_err(|e| e.to_string())?;
    config_path.push("db_config.json");

    let json = serde_json::to_string(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_db_config<R: Runtime>(
    app_handle: AppHandle<R>,
) -> Result<Option<DbConfig>, String> {
    let mut config_path = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    config_path.push("db_config.json");

    if !config_path.exists() {
        return Ok(None);
    }

    let json = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: DbConfig = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(config))
}

#[tauri::command]
pub async fn test_db_connection(config: DbConfig) -> Result<String, String> {
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
pub async fn initialize_database<R: Runtime>(
    app_handle: AppHandle<R>,
    config: DbConfig, 
    app_id: String
) -> Result<String, String> {
    let _ = config;
    let mut app_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    app_dir.push("apps");
    app_dir.push(&app_id);
    fs::create_dir_all(&app_dir).map_err(|e| format!("Impossible de créer le dossier de l'application : {}", e))?;
    
    let db_json_path = app_dir.join("db.json");
    let creds = serde_json::json!({
        "engine": "sqlite",
        "db_name": "db.sqlite3"
    });
    fs::write(db_json_path, serde_json::to_string(&creds).unwrap()).map_err(|e| format!("Impossible d'écrire db.json : {}", e))?;

    Ok(serde_json::to_string(&creds).unwrap())
}
