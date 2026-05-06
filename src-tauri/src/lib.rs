pub mod models;
pub mod services;

use std::sync::Arc;
use tauri::Manager;
use models::{ProcessManager, DownloadManager};
use services::{
    app_manager_service,
    download_service,
    db_service,
    update_service,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(ProcessManager::new())
        .manage(Arc::new(DownloadManager {
            tasks: std::sync::Mutex::new(std::collections::HashMap::new()),
            abort_handles: std::sync::Mutex::new(std::collections::HashMap::new()),
        }))
        .setup(|app| {
            // Load download tasks from disk
            let dm = app.state::<Arc<DownloadManager>>();
            dm.load_from_disk(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_manager_service::execute_app,
            app_manager_service::is_app_installed,
            app_manager_service::get_app_manifest,
            app_manager_service::run_app_setup,
            app_manager_service::uninstall_app,
            app_manager_service::kill_app,
            app_manager_service::get_active_apps,
            download_service::get_download_tasks,
            download_service::download_app,
            download_service::pause_download,
            download_service::cancel_download,
            download_service::resume_download,
            db_service::save_db_config,
            db_service::get_db_config,
            db_service::test_db_connection,
            db_service::initialize_database,
            update_service::update_hub,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
