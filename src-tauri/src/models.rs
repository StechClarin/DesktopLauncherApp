use serde::{Deserialize, Serialize};
use std::process::Child;
use std::sync::Mutex;
use std::collections::HashMap;

#[derive(Clone, Serialize)]
pub struct ProgressPayload {
    pub app_id: String,
    pub progress: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DbConfig {
    pub host: String,
    pub port: u16,
    pub user: String,
    pub pass: String,
    pub mode: Option<String>,      // "solo" | "structure"
    pub role: Option<String>,      // "server" | "client"
    pub server_ip: Option<String>, 
    pub db_name: Option<String>,
}

pub struct ActiveApp {
    pub child: Child,
    pub name: String,
    pub port: u16,
}

pub struct ProcessManager {
    pub processes: Mutex<HashMap<String, ActiveApp>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum DownloadStatus {
    Pending,
    Downloading,
    Paused,
    Completed,
    Error(String),
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DownloadTask {
    pub app_id: String,
    pub url: String,
    pub total_size: u64,
    pub downloaded: u64,
    pub status: DownloadStatus,
    pub checksum: Option<String>,
}

pub struct DownloadManager {
    pub tasks: Mutex<HashMap<String, DownloadTask>>,
    pub abort_handles: Mutex<HashMap<String, tokio::task::JoinHandle<()>>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppManifest {
    pub name: String,
    pub version: String,
    pub port: u16,
    pub exec_command: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn download_status_serde_roundtrip() {
        for status in [
            DownloadStatus::Pending,
            DownloadStatus::Downloading,
            DownloadStatus::Paused,
            DownloadStatus::Completed,
            DownloadStatus::Error("network failure".to_string()),
        ] {
            let json = serde_json::to_string(&status).unwrap();
            let back: DownloadStatus = serde_json::from_str(&json).unwrap();
            assert_eq!(status, back, "roundtrip failed for {:?}", status);
        }
    }

    #[test]
    fn download_status_error_serializes_message() {
        let json = serde_json::to_string(&DownloadStatus::Error("boom".into())).unwrap();
        assert!(json.contains("boom"), "JSON was: {}", json);
    }

    #[test]
    fn download_task_serde_roundtrip() {
        let task = DownloadTask {
            app_id: "school-manager".to_string(),
            url: "https://example.com/app.tar.gz".to_string(),
            total_size: 1024,
            downloaded: 512,
            status: DownloadStatus::Paused,
            checksum: Some("abc123".to_string()),
        };
        let json = serde_json::to_string(&task).unwrap();
        let back: DownloadTask = serde_json::from_str(&json).unwrap();
        assert_eq!(back.app_id, "school-manager");
        assert_eq!(back.status, DownloadStatus::Paused);
        assert_eq!(back.checksum.as_deref(), Some("abc123"));
    }

    #[test]
    fn db_config_serde_with_optional_fields() {
        let cfg = DbConfig {
            host: "localhost".to_string(),
            port: 5432,
            user: "postgres".to_string(),
            pass: "secret".to_string(),
            mode: Some("structure".to_string()),
            role: Some("client".to_string()),
            server_ip: Some("192.168.1.10".to_string()),
            db_name: Some("db_school".to_string()),
        };
        let json = serde_json::to_string(&cfg).unwrap();
        let back: DbConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(back.host, "localhost");
        assert_eq!(back.port, 5432);
        assert_eq!(back.mode.as_deref(), Some("structure"));
        assert_eq!(back.db_name.as_deref(), Some("db_school"));
    }

    #[test]
    fn db_config_serde_without_optional_fields() {
        let cfg = DbConfig {
            host: "h".to_string(),
            port: 1,
            user: "u".to_string(),
            pass: "p".to_string(),
            mode: None,
            role: None,
            server_ip: None,
            db_name: None,
        };
        let json = serde_json::to_string(&cfg).unwrap();
        let back: DbConfig = serde_json::from_str(&json).unwrap();
        assert!(back.mode.is_none());
        assert!(back.server_ip.is_none());
    }

    #[test]
    fn app_manifest_serde_roundtrip() {
        let manifest = AppManifest {
            name: "EtherNanos Hub".to_string(),
            version: "1.0.0".to_string(),
            port: 8000,
            exec_command: Some("./hub_start.sh".to_string()),
        };
        let json = serde_json::to_string(&manifest).unwrap();
        let back: AppManifest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "EtherNanos Hub");
        assert_eq!(back.port, 8000);
    }

    #[test]
    fn progress_payload_serializes_correctly() {
        let payload = ProgressPayload {
            app_id: "app-1".to_string(),
            progress: 42,
        };
        let json = serde_json::to_string(&payload).unwrap();
        let v: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(v["app_id"], "app-1");
        assert_eq!(v["progress"], 42);
    }

    #[test]
    fn process_manager_starts_empty() {
        let pm = ProcessManager::new();
        let guard = pm.processes.lock().unwrap();
        assert!(guard.is_empty());
    }

    #[test]
    fn download_manager_starts_empty() {
        use tokio::task::JoinHandle;
        let dm = DownloadManager {
            tasks: Mutex::new(HashMap::new()),
            abort_handles: Mutex::new(HashMap::<String, JoinHandle<()>>::new()),
        };
        assert!(dm.tasks.lock().unwrap().is_empty());
        assert!(dm.abort_handles.lock().unwrap().is_empty());
    }
}
