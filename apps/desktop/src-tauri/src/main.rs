// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::{Connection, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Sha256, Digest};

// ─────────────────────────────────────────────────────────────
// Data directory
// ─────────────────────────────────────────────────────────────

fn get_app_data_dir() -> PathBuf {
    let base = std::env::var("ProgramData").unwrap_or_else(|_| "C:\\ProgramData".to_string());
    let path = PathBuf::from(base).join("LabBilling");
    let _ = fs::create_dir_all(path.join("database"));
    let _ = fs::create_dir_all(path.join("backups"));
    let _ = fs::create_dir_all(path.join("exports"));
    let _ = fs::create_dir_all(path.join("logs"));
    path
}

fn get_db_path() -> PathBuf {
    get_app_data_dir().join("database").join("labbilling.db")
}

// ─────────────────────────────────────────────────────────────
// Database State (shared across Tauri commands)
// ─────────────────────────────────────────────────────────────

pub struct DbState(pub Mutex<Connection>);

fn init_db(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA foreign_keys=ON;

        CREATE TABLE IF NOT EXISTS settings (
            id      TEXT PRIMARY KEY DEFAULT 'singleton',
            data    TEXT NOT NULL DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS users (
            id          TEXT PRIMARY KEY,
            username    TEXT UNIQUE NOT NULL,
            full_name   TEXT NOT NULL DEFAULT '',
            role        TEXT NOT NULL DEFAULT 'ADMIN',
            status      TEXT NOT NULL DEFAULT 'ACTIVE',
            pwd_hash    TEXT NOT NULL DEFAULT '',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            last_login  TEXT
        );

        CREATE TABLE IF NOT EXISTS patients (
            id              TEXT PRIMARY KEY,
            patient_code    TEXT UNIQUE NOT NULL,
            name            TEXT NOT NULL,
            age             INTEGER NOT NULL,
            gender          TEXT NOT NULL,
            mobile          TEXT NOT NULL,
            address         TEXT,
            referral_doctor TEXT,
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS procedure_categories (
            id          TEXT PRIMARY KEY,
            name        TEXT UNIQUE NOT NULL,
            status      TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS procedures (
            id              TEXT PRIMARY KEY,
            code            TEXT UNIQUE NOT NULL,
            name            TEXT NOT NULL,
            category_id     TEXT NOT NULL,
            category_name   TEXT NOT NULL,
            sample_type     TEXT NOT NULL DEFAULT '',
            department      TEXT NOT NULL DEFAULT '',
            price           REAL NOT NULL DEFAULT 0,
            status          TEXT NOT NULL DEFAULT 'ACTIVE',
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            FOREIGN KEY (category_id) REFERENCES procedure_categories(id)
        );

        CREATE TABLE IF NOT EXISTS bills (
            id              TEXT PRIMARY KEY,
            bill_number     TEXT UNIQUE NOT NULL,
            patient_id      TEXT NOT NULL,
            bill_date       TEXT NOT NULL,
            subtotal        REAL NOT NULL DEFAULT 0,
            discount        REAL NOT NULL DEFAULT 0,
            tax             REAL NOT NULL DEFAULT 0,
            round_off       REAL NOT NULL DEFAULT 0,
            grand_total     REAL NOT NULL DEFAULT 0,
            payment_status  TEXT NOT NULL DEFAULT 'PAID',
            status          TEXT NOT NULL DEFAULT 'ACTIVE',
            created_by      TEXT NOT NULL,
            created_by_name TEXT NOT NULL DEFAULT '',
            created_at      TEXT NOT NULL,
            updated_at      TEXT NOT NULL,
            cancellation    TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(id)
        );

        CREATE TABLE IF NOT EXISTS bill_items (
            id              TEXT PRIMARY KEY,
            bill_id         TEXT NOT NULL,
            procedure_id    TEXT NOT NULL,
            procedure_code  TEXT NOT NULL,
            procedure_name  TEXT NOT NULL,
            quantity        INTEGER NOT NULL DEFAULT 1,
            rate            REAL NOT NULL,
            discount        REAL NOT NULL DEFAULT 0,
            amount          REAL NOT NULL,
            FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS bill_payments (
            id              TEXT PRIMARY KEY,
            bill_id         TEXT NOT NULL,
            payment_mode    TEXT NOT NULL,
            amount          REAL NOT NULL,
            reference_number TEXT,
            paid_at         TEXT NOT NULL,
            created_by      TEXT NOT NULL,
            FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS license_state (
            id                  TEXT PRIMARY KEY DEFAULT 'singleton',
            is_activated        INTEGER NOT NULL DEFAULT 0,
            license_key         TEXT,
            customer_name       TEXT,
            plan                TEXT,
            status              TEXT,
            expires_at          TEXT,
            offline_grace_until TEXT,
            device_fingerprint  TEXT,
            device_name         TEXT,
            last_validated_at   TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
        CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(bill_date);
        CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
        CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code);
        CREATE INDEX IF NOT EXISTS idx_procedures_code ON procedures(code);
    ")?;

    // Seed default admin password (SHA-256 of 'admin123') if no user exists
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM users",
        [],
        |row| row.get(0),
    )?;

    if count == 0 {
        let now = chrono::Utc::now().to_rfc3339();
        // SHA-256 of 'admin123'
        let default_hash = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
        conn.execute(
            "INSERT OR IGNORE INTO users (id, username, full_name, role, status, pwd_hash, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                "usr_admin_01", "admin", "Laboratory Operator", "ADMIN", "ACTIVE",
                default_hash, now, now
            ],
        )?;

        // Seed default settings
        let default_settings = json!({
            "labName": "MEDILAB DIAGNOSTIC CENTER",
            "labTagline": "Accuracy in Every Diagnosis",
            "labAddress": "104 Healthcare Boulevard, City Hospital Road, Metro City - 500001",
            "labPhone": "+91 98765 43210 / 040-23456789",
            "labEmail": "contact@medilabdiagnostics.com",
            "labGstin": "36AAAAA0000A1Z5",
            "labTimings": "Mon - Sat: 7:00 AM - 9:00 PM | Sun: 7:00 AM - 1:00 PM",
            "labLogo": "",
            "invoicePrefix": "LAB",
            "invoiceFy": "2026-27",
            "invoiceSequence": 100,
            "invoiceFooter": "Thank you for choosing MediLab. Fasting results are for reference only. Please correlate clinically.",
            "thermalPrinterName": "Default 80mm Thermal",
            "a4PrinterName": "Default Laser Printer",
            "autoBackupEnabled": true,
            "backupIntervalDays": 1,
            "signatoryLabel": "Authorized Signatory",
            "signatoryDesignation": "Pathologist / Lab In-Charge",
            "signatoryName": "",
            "quickTests": []
        });
        conn.execute(
            "INSERT OR IGNORE INTO settings (id, data) VALUES ('singleton', ?1)",
            params![default_settings.to_string()],
        )?;

        // Seed license state row
        conn.execute(
            "INSERT OR IGNORE INTO license_state (id) VALUES ('singleton')",
            [],
        )?;

        eprintln!("✅ Database initialized with seed data.");
    }

    Ok(())
}

// ─────────────────────────────────────────────────────────────
// Tauri Commands
// ─────────────────────────────────────────────────────────────

/// Verify password hash (SHA-256)
#[tauri::command]
fn verify_password(entered_password: String, state: tauri::State<DbState>) -> bool {
    let conn = state.0.lock().unwrap();
    let stored: SqlResult<String> = conn.query_row(
        "SELECT pwd_hash FROM users WHERE username = 'admin' LIMIT 1",
        [],
        |row| row.get(0),
    );
    match stored {
        Ok(hash) => {
            let mut hasher = Sha256::new();
            hasher.update(entered_password.trim().as_bytes());
            let computed = format!("{:x}", hasher.finalize());
            computed == hash
        }
        Err(_) => false,
    }
}

/// Change admin password
#[tauri::command]
fn change_password(new_password: String, state: tauri::State<DbState>) -> bool {
    let conn = state.0.lock().unwrap();
    let mut hasher = Sha256::new();
    hasher.update(new_password.trim().as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "UPDATE users SET pwd_hash = ?1, updated_at = ?2 WHERE username = 'admin'",
        params![hash, now],
    ).is_ok()
}

/// Get app system status
#[tauri::command]
fn get_system_status(state: tauri::State<DbState>) -> Value {
    let conn = state.0.lock().unwrap();
    let bill_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM bills WHERE status = 'ACTIVE'",
        [], |r| r.get(0)
    ).unwrap_or(0);
    let patient_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM patients",
        [], |r| r.get(0)
    ).unwrap_or(0);
    let db_path = get_db_path();
    json!({
        "status": "ONLINE_SQLITE",
        "data_dir": get_app_data_dir().to_string_lossy(),
        "database_file": db_path.to_string_lossy(),
        "offline_ready": true,
        "version": "1.0.0",
        "bill_count": bill_count,
        "patient_count": patient_count,
    })
}

/// Get settings JSON blob
#[tauri::command]
fn db_get_settings(state: tauri::State<DbState>) -> String {
    let conn = state.0.lock().unwrap();
    conn.query_row(
        "SELECT data FROM settings WHERE id = 'singleton'",
        [], |r| r.get::<_, String>(0)
    ).unwrap_or_else(|_| "{}".to_string())
}

/// Save settings JSON blob
#[tauri::command]
fn db_save_settings(data: String, state: tauri::State<DbState>) -> bool {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO settings (id, data) VALUES ('singleton', ?1)
         ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        params![data],
    ).is_ok()
}

/// Generic query interface: returns JSON array of rows
#[tauri::command]
fn db_query(sql: String, args: Vec<Value>, state: tauri::State<DbState>) -> Value {
    let conn = state.0.lock().unwrap();
    match execute_query(&conn, &sql, &args) {
        Ok(rows) => json!({ "ok": true, "rows": rows }),
        Err(e) => json!({ "ok": false, "error": e.to_string() }),
    }
}

/// Generic execute interface (INSERT/UPDATE/DELETE): returns rows affected
#[tauri::command]
fn db_execute(sql: String, args: Vec<Value>, state: tauri::State<DbState>) -> Value {
    let conn = state.0.lock().unwrap();
    match execute_mutation(&conn, &sql, &args) {
        Ok(affected) => json!({ "ok": true, "changes": affected }),
        Err(e) => json!({ "ok": false, "error": e.to_string() }),
    }
}

fn execute_query(conn: &Connection, sql: &str, args: &[Value]) -> SqlResult<Vec<Value>> {
    let mut stmt = conn.prepare(sql)?;
    let col_names: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();
    let rows = stmt.query_map(
        rusqlite::params_from_iter(args.iter().map(value_to_sql_param)),
        |row| {
            let mut obj = serde_json::Map::new();
            for (i, col) in col_names.iter().enumerate() {
                let val: rusqlite::types::Value = row.get(i)?;
                obj.insert(col.clone(), rusqlite_value_to_json(val));
            }
            Ok(Value::Object(obj))
        },
    )?;
    rows.collect::<SqlResult<Vec<Value>>>()
}

fn execute_mutation(conn: &Connection, sql: &str, args: &[Value]) -> SqlResult<usize> {
    let mut stmt = conn.prepare(sql)?;
    stmt.execute(rusqlite::params_from_iter(args.iter().map(value_to_sql_param)))
}

fn value_to_sql_param(v: &Value) -> rusqlite::types::Value {
    match v {
        Value::Null => rusqlite::types::Value::Null,
        Value::Bool(b) => rusqlite::types::Value::Integer(*b as i64),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                rusqlite::types::Value::Integer(i)
            } else if let Some(f) = n.as_f64() {
                rusqlite::types::Value::Real(f)
            } else {
                rusqlite::types::Value::Null
            }
        }
        Value::String(s) => rusqlite::types::Value::Text(s.clone()),
        other => rusqlite::types::Value::Text(other.to_string()),
    }
}

fn rusqlite_value_to_json(v: rusqlite::types::Value) -> Value {
    match v {
        rusqlite::types::Value::Null => Value::Null,
        rusqlite::types::Value::Integer(i) => json!(i),
        rusqlite::types::Value::Real(f) => json!(f),
        rusqlite::types::Value::Text(s) => Value::String(s),
        rusqlite::types::Value::Blob(b) => Value::String(base64_encode(&b)),
    }
}

fn base64_encode(bytes: &[u8]) -> String {
    const CHARS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::new();
    for chunk in bytes.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        result.push(CHARS[(b0 >> 2)] as char);
        result.push(CHARS[((b0 & 3) << 4) | (b1 >> 4)] as char);
        result.push(if chunk.len() > 1 { CHARS[((b1 & 15) << 2) | (b2 >> 6)] as char } else { '=' });
        result.push(if chunk.len() > 2 { CHARS[b2 & 63] as char } else { '=' });
    }
    result
}

/// Get license state JSON
#[tauri::command]
fn db_get_license(state: tauri::State<DbState>) -> Value {
    let conn = state.0.lock().unwrap();
    match conn.query_row(
        "SELECT is_activated, license_key, customer_name, plan, status,
                expires_at, offline_grace_until, device_fingerprint, device_name, last_validated_at
         FROM license_state WHERE id = 'singleton'",
        [],
        |row| {
            Ok(json!({
                "isActivated": row.get::<_, i64>(0)? == 1,
                "licenseKey": row.get::<_, Option<String>>(1)?,
                "customerName": row.get::<_, Option<String>>(2)?,
                "plan": row.get::<_, Option<String>>(3)?,
                "status": row.get::<_, Option<String>>(4)?,
                "expiresAt": row.get::<_, Option<String>>(5)?,
                "offlineGraceUntil": row.get::<_, Option<String>>(6)?,
                "deviceFingerprint": row.get::<_, Option<String>>(7)?,
                "deviceName": row.get::<_, Option<String>>(8)?,
                "lastValidatedAt": row.get::<_, Option<String>>(9)?,
            }))
        },
    ) {
        Ok(v) => v,
        Err(_) => json!({ "isActivated": false }),
    }
}

/// Save license state JSON
#[tauri::command]
fn db_save_license(
    is_activated: bool,
    license_key: Option<String>,
    customer_name: Option<String>,
    plan: Option<String>,
    status: Option<String>,
    expires_at: Option<String>,
    offline_grace_until: Option<String>,
    device_fingerprint: Option<String>,
    device_name: Option<String>,
    last_validated_at: Option<String>,
    state: tauri::State<DbState>,
) -> bool {
    let conn = state.0.lock().unwrap();
    conn.execute(
        "INSERT INTO license_state
            (id, is_activated, license_key, customer_name, plan, status,
             expires_at, offline_grace_until, device_fingerprint, device_name, last_validated_at)
         VALUES ('singleton', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(id) DO UPDATE SET
            is_activated = excluded.is_activated,
            license_key = excluded.license_key,
            customer_name = excluded.customer_name,
            plan = excluded.plan,
            status = excluded.status,
            expires_at = excluded.expires_at,
            offline_grace_until = excluded.offline_grace_until,
            device_fingerprint = excluded.device_fingerprint,
            device_name = excluded.device_name,
            last_validated_at = excluded.last_validated_at",
        params![
            is_activated as i64, license_key, customer_name, plan, status,
            expires_at, offline_grace_until, device_fingerprint, device_name, last_validated_at
        ],
    ).is_ok()
}

/// Get stable hardware fingerprint using Windows Machine GUID from registry
#[tauri::command]
fn get_hardware_fingerprint() -> String {
    #[cfg(target_os = "windows")]
    {
        // Try Windows MachineGuid from registry (most stable hardware identifier)
        let machine_guid = read_machine_guid_windows();
        if !machine_guid.is_empty() {
            let mut hasher = Sha256::new();
            hasher.update(machine_guid.trim().to_lowercase().as_bytes());
            return format!("SHA256:{:x}", hasher.finalize());
        }
    }

    // Fallback: hash from system hostname + username combo
    let hostname = hostname_fallback();
    let mut hasher = Sha256::new();
    hasher.update(hostname.as_bytes());
    format!("SHA256:{:x}", hasher.finalize())
}

#[cfg(target_os = "windows")]
fn read_machine_guid_windows() -> String {
    // Read HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid
    // Using std::process to avoid winreg crate dependency for now
    let output = std::process::Command::new("powershell")
        .args([
            "-NonInteractive",
            "-NoProfile",
            "-Command",
            "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid"
        ])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        }
        _ => String::new(),
    }
}

fn hostname_fallback() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "UNKNOWN_HOST".to_string())
}

/// Create a full backup of the database as base64 JSON
#[tauri::command]
fn db_export_backup(state: tauri::State<DbState>) -> Value {
    let conn = state.0.lock().unwrap();
    let now = chrono::Utc::now().to_rfc3339();

    // Export all tables as JSON
    let patients = execute_query(&conn, "SELECT * FROM patients ORDER BY created_at", &[]).unwrap_or_default();
    let categories = execute_query(&conn, "SELECT * FROM procedure_categories ORDER BY name", &[]).unwrap_or_default();
    let procedures = execute_query(&conn, "SELECT * FROM procedures ORDER BY code", &[]).unwrap_or_default();
    let bills = execute_query(&conn, "SELECT * FROM bills ORDER BY created_at", &[]).unwrap_or_default();
    let bill_items = execute_query(&conn, "SELECT * FROM bill_items ORDER BY bill_id", &[]).unwrap_or_default();
    let bill_payments = execute_query(&conn, "SELECT * FROM bill_payments ORDER BY bill_id", &[]).unwrap_or_default();
    let settings = conn.query_row("SELECT data FROM settings WHERE id = 'singleton'", [], |r| r.get::<_, String>(0)).unwrap_or_default();

    json!({
        "version": 2,
        "createdAt": now,
        "engine": "sqlite",
        "state": {
            "patients": patients,
            "categories": categories,
            "procedures": procedures,
            "bills": bills,
            "billItems": bill_items,
            "billPayments": bill_payments,
            "settings": settings,
        }
    })
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

fn main() {
    let db_path = get_db_path();
    let conn = Connection::open(&db_path).expect("Failed to open SQLite database");
    init_db(&conn).expect("Failed to initialize database schema");

    eprintln!("✅ SQLite database open: {}", db_path.display());

    tauri::Builder::default()
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            get_system_status,
            get_hardware_fingerprint,
            verify_password,
            change_password,
            db_get_settings,
            db_save_settings,
            db_query,
            db_execute,
            db_get_license,
            db_save_license,
            db_export_backup,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MediLab billing application");
}
