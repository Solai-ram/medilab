// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

/// Resolves standard Windows data directory: C:\ProgramData\LabBilling\
fn get_app_data_dir() -> PathBuf {
    let base = std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".to_string());
    let path = PathBuf::from(base).join("LabBilling");
    let _ = fs::create_dir_all(path.join("database"));
    let _ = fs::create_dir_all(path.join("backups"));
    let _ = fs::create_dir_all(path.join("exports"));
    let _ = fs::create_dir_all(path.join("logs"));
    path
}

#[tauri::command]
fn get_system_status() -> serde_json::Value {
    let data_dir = get_app_data_dir();
    serde_json::json!({
        "status": "ONLINE_SQLITE",
        "data_dir": data_dir.to_string_lossy(),
        "database_file": data_dir.join("database").join("labbilling.db").to_string_lossy(),
        "offline_ready": true,
        "version": "1.0.0"
    })
}

fn main() {
    let _data_dir = get_app_data_dir();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_system_status])
        .run(tauri::generate_context!())
        .expect("error while running MediLab billing application");
}
