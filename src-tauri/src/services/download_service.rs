use std::fs;
use std::sync::Arc;
use tauri::{AppHandle, Runtime, Window, Emitter, Manager};
use futures_util::StreamExt;
use flate2::read::GzDecoder;
use tar::Archive;
use crate::models::{DownloadManager, DownloadTask, DownloadStatus, ProgressPayload};

impl DownloadManager {
    pub fn save_to_disk<R: Runtime>(&self, app_handle: &tauri::AppHandle<R>) {
        if let Ok(mut path) = app_handle.path().app_data_dir() {
            let _ = fs::create_dir_all(&path);
            path.push("downloads.json");
            if let Ok(tasks) = self.tasks.lock() {
                let json = serde_json::to_string(&*tasks).unwrap_or_default();
                let _ = fs::write(path, json);
            }
        }
    }

    pub fn load_from_disk<R: Runtime>(&self, app_handle: &tauri::AppHandle<R>) {
        if let Ok(mut path) = app_handle.path().app_data_dir() {
            path.push("downloads.json");
            if path.exists() {
                if let Ok(json) = fs::read_to_string(path) {
                    if let Ok(saved_tasks) = serde_json::from_str::<std::collections::HashMap<String, DownloadTask>>(&json) {
                        if let Ok(mut tasks) = self.tasks.lock() {
                            let mut loaded = saved_tasks;
                            for task in loaded.values_mut() {
                                if task.status == DownloadStatus::Downloading {
                                    task.status = DownloadStatus::Paused;
                                }
                            }
                            *tasks = loaded;
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
pub async fn get_download_tasks(
    dm: tauri::State<'_, Arc<DownloadManager>>,
) -> Result<Vec<DownloadTask>, String> {
    let tasks = dm.tasks.lock().map_err(|_| "Lock error")?;
    Ok(tasks.values().cloned().collect())
}

#[tauri::command]
pub async fn pause_download<R: Runtime>(
    app_handle: AppHandle<R>,
    dm: tauri::State<'_, Arc<DownloadManager>>,
    app_id: String,
) -> Result<(), String> {
    let mut abort_handles = dm.abort_handles.lock().map_err(|_| "Lock error")?;
    if let Some(handle) = abort_handles.remove(&app_id) {
        handle.abort();
    }

    let mut tasks = dm.tasks.lock().map_err(|_| "Lock error")?;
    if let Some(task) = tasks.get_mut(&app_id) {
        task.status = DownloadStatus::Paused;
    }
    drop(tasks);
    dm.save_to_disk(&app_handle);

    let _ = app_handle.emit("download-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "Paused"
    }));
    Ok(())
}

#[tauri::command]
pub async fn cancel_download<R: Runtime>(
    app_handle: AppHandle<R>,
    dm: tauri::State<'_, Arc<DownloadManager>>,
    app_id: String,
) -> Result<(), String> {
    let mut abort_handles = dm.abort_handles.lock().map_err(|_| "Lock error")?;
    if let Some(handle) = abort_handles.remove(&app_id) {
        handle.abort();
    }

    let mut tasks = dm.tasks.lock().map_err(|_| "Lock error")?;
    tasks.remove(&app_id);
    drop(tasks);
    dm.save_to_disk(&app_handle);

    let mut app_dir = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    app_dir.push("apps");
    app_dir.push(&app_id);
    let temp_file = app_dir.join("temp.tar.gz");
    if temp_file.exists() {
        let _ = fs::remove_file(temp_file);
    }
    
    Ok(())
}

#[tauri::command]
pub async fn resume_download<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    dm: tauri::State<'_, Arc<DownloadManager>>,
    app_id: String,
) -> Result<(), String> {
    let (url, checksum) = {
        let tasks = dm.tasks.lock().map_err(|_| "Lock error")?;
        let task = tasks.get(&app_id).ok_or("Task not found")?;
        (task.url.clone(), task.checksum.clone())
    };

    download_app(app_handle, window, dm, app_id, url, checksum).await?;
    Ok(())
}

#[tauri::command]
pub async fn download_app<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    dm: tauri::State<'_, Arc<DownloadManager>>,
    app_id: String,
    url: String,
    checksum: Option<String>,
) -> Result<String, String> {
    let (downloaded_initial, total_size_initial) = {
        let mut tasks = dm.tasks.lock().map_err(|_| "Lock error")?;
        
        let task = tasks.entry(app_id.clone()).or_insert(DownloadTask {
            app_id: app_id.clone(),
            url: url.clone(),
            total_size: 0,
            downloaded: 0,
            status: DownloadStatus::Pending,
            checksum: checksum.clone(),
        });

        if task.status == DownloadStatus::Downloading {
            return Ok("Already downloading".to_string());
        }

        task.status = DownloadStatus::Downloading;
        let d = task.downloaded;
        let t = task.total_size;
        
        dm.save_to_disk(&app_handle);
        (d, t)
    };

    let _ = app_handle.emit("download-status-changed", serde_json::json!({
        "app_id": app_id.clone(),
        "status": "Downloading"
    }));

    let client = reqwest::Client::new();
    let mut downloaded = downloaded_initial;
    let mut total_size = total_size_initial;
    
    let mut request = client.get(&url);
    if downloaded > 0 {
        request = request.header("Range", format!("bytes={}-", downloaded));
    }

    let response = match request.send().await {
        Ok(res) => res,
        Err(e) => {
            let mut tasks = dm.tasks.lock().unwrap();
            if let Some(t) = tasks.get_mut(&app_id) {
                t.status = DownloadStatus::Error(e.to_string());
            }
            let _ = window.emit("download-status-changed", serde_json::json!({
                "app_id": app_id,
                "status": "Error",
                "message": e.to_string()
            }));
            return Err(e.to_string());
        }
    };

    if total_size == 0 {
        total_size = response.content_length().unwrap_or(0) + downloaded;
        let mut tasks = dm.tasks.lock().unwrap();
        if let Some(t) = tasks.get_mut(&app_id) {
            t.total_size = total_size;
        }
    }

    let mut app_dir = app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
    app_dir.push("apps");
    app_dir.push(&app_id);
    let _ = fs::create_dir_all(&app_dir);
    let temp_tar_gz = app_dir.join("temp.tar.gz");

    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&temp_tar_gz)
        .map_err(|e| format!("Failed to open temp file: {}", e))?;

    let mut stream = response.bytes_stream();
    while let Some(item) = stream.next().await {
        // --- CHECK FOR INTERRUPTION ---
        let status = {
            let tasks = dm.tasks.lock().unwrap();
            tasks.get(&app_id).map(|t| t.status.clone())
        };

        match status {
            Some(DownloadStatus::Paused) => return Ok("Download paused".to_string()),
            None => return Ok("Download cancelled".to_string()),
            _ => {}
        }

        match item {
            Ok(chunk) => {
                use std::io::Write;
                file.write_all(&chunk).map_err(|e| e.to_string())?;
                downloaded += chunk.len() as u64;
                
                let mut tasks = dm.tasks.lock().unwrap();
                if let Some(t) = tasks.get_mut(&app_id) {
                    t.downloaded = downloaded;
                    if total_size > 0 {
                        let progress = (downloaded * 100) / total_size;
                        let _ = window.emit("download-progress", ProgressPayload { 
                            app_id: app_id.clone(), 
                            progress 
                        });
                    }
                }
            },
            Err(e) => {
                let mut tasks = dm.tasks.lock().unwrap();
                if let Some(t) = tasks.get_mut(&app_id) {
                    t.status = DownloadStatus::Error(e.to_string());
                }
                let _ = window.emit("download-status-changed", serde_json::json!({
                    "app_id": app_id,
                    "status": "Error",
                    "message": e.to_string()
                }));
                return Err(e.to_string());
            }
        }
    }

    finalize_installation(app_handle, window, dm.inner().clone(), app_id, checksum)?;
    
    Ok("Installation complete".to_string())
}

pub fn finalize_installation<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    dm: Arc<DownloadManager>,
    app_id: String,
    expected_checksum: Option<String>,
) -> Result<(), String> {
    let mut app_dir = app_handle.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    app_dir.push("apps");
    app_dir.push(&app_id);
    let temp_tar_gz = app_dir.join("temp.tar.gz");

    let result: Result<(), String> = (|| {
        if let Some(checksum) = expected_checksum {
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            let mut file_to_check = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
            std::io::copy(&mut file_to_check, &mut hasher).map_err(|e| e.to_string())?;
            let hash = format!("{:x}", hasher.finalize());
            
            if hash != checksum.to_lowercase() {
                fs::remove_file(&temp_tar_gz).ok();
                return Err("Checksum mismatch".to_string());
            }
        }

        let tar_gz = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
        let tar = GzDecoder::new(tar_gz);
        let mut archive = Archive::new(tar);
        archive.unpack(&app_dir).map_err(|e| e.to_string())?;
        Ok(())
    })();

    if let Err(e) = result {
        let mut tasks = dm.tasks.lock().unwrap();
        if let Some(t) = tasks.get_mut(&app_id) {
            t.status = DownloadStatus::Error(e.clone());
        }
        dm.save_to_disk(&app_handle);
        let _ = window.emit("download-status-changed", serde_json::json!({
            "app_id": app_id,
            "status": "Error",
            "message": e
        }));
        return Err(e);
    }

    fs::remove_file(temp_tar_gz).ok();

    {
        let mut tasks = dm.tasks.lock().unwrap();
        if let Some(t) = tasks.get_mut(&app_id) {
            t.status = DownloadStatus::Completed;
        }
    }
    dm.save_to_disk(&app_handle);

    let _ = window.emit("download-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "Completed"
    }));

    let _ = app_handle.emit("hub-app-status-changed", serde_json::json!({
        "app_id": app_id,
        "status": "installed"
    }));

    Ok(())
}
