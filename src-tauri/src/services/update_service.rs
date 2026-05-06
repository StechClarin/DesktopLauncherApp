use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime, Window, Emitter, Manager};
use futures_util::StreamExt;

#[tauri::command]
pub async fn update_hub<R: Runtime>(
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
    let mut file_to_check = fs::File::open(&update_pack).map_err(|e: std::io::Error| e.to_string())?;
    std::io::copy(&mut file_to_check, &mut hasher).map_err(|e| e.to_string())?;
    let hash = format!("{:x}", hasher.finalize());
    
    if hash != checksum.to_lowercase() {
        fs::remove_file(&update_pack).ok();
        return Err(format!("Hub Update Security Alert: Checksum mismatch! Found: {}", hash));
    }

    Ok("Mise à jour téléchargée et vérifiée. Prêt pour le redémarrage.".to_string())
}
