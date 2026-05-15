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
