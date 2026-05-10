use std::fs::{self, OpenOptions};
use std::sync::Arc;
use tauri::{AppHandle, Runtime, Window, Emitter, Manager};
use futures_util::StreamExt;
use flate2::read::GzDecoder;
use tar::Archive;
use tokio::sync::oneshot;
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
    {
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
        task.url = url.clone();
        task.checksum = checksum.clone();
    }
    dm.save_to_disk(&app_handle);

    let _ = app_handle.emit("download-status-changed", serde_json::json!({
        "app_id": app_id.clone(),
        "status": "Downloading"
    }));

    let dm_arc = dm.inner().clone();
    let (tx, rx) = oneshot::channel::<Result<String, String>>();
    let app_handle_task = app_handle.clone();
    let window_task = window.clone();
    let dm_task = dm_arc.clone();
    let app_id_task = app_id.clone();
    let url_task = url.clone();
    let checksum_task = checksum.clone();

    let handle = tokio::spawn(async move {
        let result = async move {
            let task_state = {
                let tasks = dm_task.tasks.lock().map_err(|_| "Lock error")?;
                tasks.get(&app_id_task)
                    .cloned()
                    .ok_or_else(|| "Download task missing".to_string())?
            };

            let mut downloaded = task_state.downloaded;
            let mut progress: u64 = if task_state.total_size > 0 && downloaded > 0 {
                std::cmp::min(100, downloaded * 100 / task_state.total_size)
            } else {
                0
            };

            let client = reqwest::Client::builder()
                .no_gzip()
                .no_brotli()
                .no_deflate()
                .user_agent("EtherNanos-Hub/1.0")
                .build()
                .map_err(|e| format!("Échec création client réseau : {}", e))?;

            let mut request = client.get(&url_task);
            if downloaded > 0 {
                request = request.header(reqwest::header::RANGE, format!("bytes={}-", downloaded));
            }

            let response = request.send().await.map_err(|e| format!("Échec du téléchargement réseau : {}", e))?;
            if !(response.status().is_success() || response.status() == reqwest::StatusCode::PARTIAL_CONTENT) {
                return Err(format!("Server returned error: {}", response.status()));
            }

            let total_size = response.content_length().unwrap_or(0);
            let supports_range = response.status() == reqwest::StatusCode::PARTIAL_CONTENT;

            let mut app_dir = app_handle_task.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
            app_dir.push("apps");
            app_dir.push(&app_id_task);
            fs::create_dir_all(&app_dir).map_err(|e| format!("Impossible de créer le dossier de l'app : {}", e))?;

            let temp_tar_gz = app_dir.join("temp.tar.gz");
            let mut file = if downloaded > 0 && supports_range && temp_tar_gz.exists() {
                OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(&temp_tar_gz)
                    .map_err(|e| format!("Impossible d'ouvrir le fichier temporaire : {}", e))?
            } else {
                if temp_tar_gz.exists() {
                    downloaded = 0;
                    progress = 0;
                }
                fs::File::create(&temp_tar_gz).map_err(|e| format!("Impossible de créer l'archive temporaire : {}", e))?
            };

            let mut stream = response.bytes_stream();
            while let Some(item) = stream.next().await {
                let chunk = item.map_err(|e| e.to_string())?;
                std::io::copy(&mut &*chunk, &mut file).map_err(|e| e.to_string())?;
                downloaded += chunk.len() as u64;

                progress = if total_size > 0 {
                    std::cmp::min(100, downloaded * 100 / total_size)
                } else {
                    std::cmp::min(99, progress + 5)
                };

                if let Ok(mut tasks) = dm_task.tasks.lock() {
                    if let Some(task) = tasks.get_mut(&app_id_task) {
                        task.downloaded = downloaded;
                        task.total_size = total_size;
                    }
                }
                dm_task.save_to_disk(&app_handle_task);

                let _ = window_task.emit("download-progress", ProgressPayload {
                    app_id: app_id_task.clone(),
                    progress,
                });
            }

            if progress < 100 {
                progress = 100;
                let _ = window_task.emit("download-progress", ProgressPayload {
                    app_id: app_id_task.clone(),
                    progress,
                });
            }

            if let Some(expected_checksum) = checksum_task {
                use sha2::{Digest, Sha256};
                let mut hasher = Sha256::new();
                let mut file_to_check = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
                std::io::copy(&mut file_to_check, &mut hasher).map_err(|e| e.to_string())?;
                let hash = format!("{:x}", hasher.finalize());
                if hash != expected_checksum.to_lowercase() {
                    fs::remove_file(&temp_tar_gz).ok();
                    return Err(format!(
                        "Security Alert: Checksum mismatch! Expected: {}, Found: {}",
                        expected_checksum,
                        hash
                    ));
                }
            }

            let tar_gz = fs::File::open(&temp_tar_gz).map_err(|e| format!("Impossible de rouvrir l'archive pour extraction : {}", e))?;
            let tar = GzDecoder::new(tar_gz);
            let mut archive = Archive::new(tar);
            archive.unpack(&app_dir).map_err(|e| format!("Le désarchivage du tar.gz a échoué (corrompue ?) : {}", e))?;

            fs::remove_file(&temp_tar_gz).ok();

            {
                let mut tasks = dm_task.tasks.lock().map_err(|_| "Lock error")?;
                if let Some(task) = tasks.get_mut(&app_id_task) {
                    task.status = DownloadStatus::Completed;
                    task.downloaded = downloaded;
                    if task.total_size == 0 {
                        task.total_size = downloaded;
                    }
                }
            }
            dm_task.save_to_disk(&app_handle_task);

            let _ = window_task.emit("download-status-changed", serde_json::json!({
                "app_id": app_id_task.clone(),
                "status": "Completed"
            }));

            let _ = window_task.emit("download-progress", ProgressPayload {
                app_id: app_id_task.clone(),
                progress: 100,
            });

            Ok(format!("App {} installed and verified", app_id_task))
        }
        .await;

        let _ = tx.send(result);
    });

    {
        let mut abort_handles = dm.abort_handles.lock().map_err(|_| "Lock error")?;
        abort_handles.insert(app_id.clone(), handle);
    }

    let result = rx.await.map_err(|_| "Download aborted".to_string())?;

    let mut abort_handles = dm.abort_handles.lock().map_err(|_| "Lock error")?;
    abort_handles.remove(&app_id);

    if let Err(ref error) = result {
        {
            let mut tasks = dm.tasks.lock().map_err(|_| "Lock error")?;
            if let Some(task) = tasks.get_mut(&app_id) {
                task.status = DownloadStatus::Error(error.clone());
            }
        }
        dm.save_to_disk(&app_handle);
    }

    result
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
            println!("[INSTALL] Verifying checksum...");
            use sha2::{Sha256, Digest};
            let mut hasher = Sha256::new();
            let mut file_to_check = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
            std::io::copy(&mut file_to_check, &mut hasher).map_err(|e| e.to_string())?;
            let hash = format!("{:x}", hasher.finalize());
            
            if hash != checksum.to_lowercase() {
                println!("[INSTALL] Checksum mismatch! Expected: {}, Got: {}", checksum, hash);
                fs::remove_file(&temp_tar_gz).ok();
                return Err("Checksum mismatch".to_string());
            }
            println!("[INSTALL] Checksum OK");
        }

        println!("[INSTALL] Unpacking archive into {:?}", app_dir);
        let tar_gz = fs::File::open(&temp_tar_gz).map_err(|e| e.to_string())?;
        let tar = GzDecoder::new(tar_gz);
        let mut archive = Archive::new(tar);
        archive.unpack(&app_dir).map_err(|e| {
            println!("[INSTALL] Unpack error: {}", e);
            e.to_string()
        })?;
        println!("[INSTALL] Unpack successful");
        Ok(())
    })();

    if let Err(e) = result {
        {
            let mut tasks = dm.tasks.lock().unwrap();
            if let Some(t) = tasks.get_mut(&app_id) {
                t.status = DownloadStatus::Error(e.clone());
            }
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
