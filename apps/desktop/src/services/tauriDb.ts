/**
 * tauriDb.ts — Tauri SQLite Bridge
 *
 * When running inside Tauri, routes all DB operations through
 * Rust SQLite via invoke(). Falls back to localStorage when
 * running in plain browser (dev mode without Tauri).
 */

import { isTauri } from './db';

// ─────────────────────────────────────────────────────────────
// Tauri invoke wrapper
// ─────────────────────────────────────────────────────────────

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
  return tauriInvoke<T>(cmd, args);
}

// ─────────────────────────────────────────────────────────────
// Generic query / execute helpers
// ─────────────────────────────────────────────────────────────

export interface QueryResult {
  ok: boolean;
  rows?: Record<string, unknown>[];
  error?: string;
}

export interface ExecResult {
  ok: boolean;
  changes?: number;
  error?: string;
}

export async function tauriQuery(
  sql: string,
  args: unknown[] = []
): Promise<Record<string, unknown>[]> {
  if (!isTauri()) return [];
  const result = await invoke<QueryResult>('db_query', { sql, args });
  if (!result.ok) throw new Error(result.error || 'DB query failed');
  return result.rows || [];
}

export async function tauriExec(
  sql: string,
  args: unknown[] = []
): Promise<number> {
  if (!isTauri()) return 0;
  const result = await invoke<ExecResult>('db_execute', { sql, args });
  if (!result.ok) throw new Error(result.error || 'DB execute failed');
  return result.changes || 0;
}

// ─────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────

export async function tauriGetSettings(): Promise<Record<string, unknown> | null> {
  if (!isTauri()) return null;
  const raw = await invoke<string>('db_get_settings');
  try { return JSON.parse(raw); } catch { return null; }
}

export async function tauriSaveSettings(data: Record<string, unknown>): Promise<void> {
  if (!isTauri()) return;
  await invoke('db_save_settings', { data: JSON.stringify(data) });
}

// ─────────────────────────────────────────────────────────────
// License State
// ─────────────────────────────────────────────────────────────

export async function tauriGetLicense(): Promise<Record<string, unknown> | null> {
  if (!isTauri()) return null;
  const result = await invoke<Record<string, unknown>>('db_get_license');
  return result;
}

export async function tauriSaveLicense(lic: Record<string, unknown>): Promise<void> {
  if (!isTauri()) return;
  await invoke('db_save_license', {
    isActivated: lic.isActivated ?? false,
    licenseKey: lic.licenseKey ?? null,
    customerName: lic.customerName ?? null,
    plan: lic.plan ?? null,
    status: lic.status ?? null,
    expiresAt: lic.expiresAt ?? null,
    offlineGraceUntil: lic.offlineGraceUntil ?? null,
    deviceFingerprint: lic.deviceFingerprint ?? null,
    deviceName: lic.deviceName ?? null,
    lastValidatedAt: lic.lastValidatedAt ?? null,
  });
}

// ─────────────────────────────────────────────────────────────
// Password verification (delegated to Rust for hash comparison)
// ─────────────────────────────────────────────────────────────

export async function tauriVerifyPassword(enteredPassword: string): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>('verify_password', { enteredPassword });
}

export async function tauriChangePassword(newPassword: string): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>('change_password', { newPassword });
}

// ─────────────────────────────────────────────────────────────
// Hardware Fingerprint
// ─────────────────────────────────────────────────────────────

export async function tauriGetHardwareFingerprint(): Promise<string | null> {
  if (!isTauri()) return null;
  return invoke<string>('get_hardware_fingerprint');
}

// ─────────────────────────────────────────────────────────────
// Backup
// ─────────────────────────────────────────────────────────────

export async function tauriExportBackup(): Promise<Record<string, unknown> | null> {
  if (!isTauri()) return null;
  return invoke<Record<string, unknown>>('db_export_backup');
}

// ─────────────────────────────────────────────────────────────
// Patient CRUD helpers (used by db.ts)
// ─────────────────────────────────────────────────────────────

export const tauriPatients = {
  async getAll(): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT id, patient_code as patientCode, name, age, gender, mobile, address,
              referral_doctor as referralDoctor, created_at as createdAt, updated_at as updatedAt
       FROM patients ORDER BY created_at DESC`
    );
  },

  async search(q: string): Promise<Record<string, unknown>[]> {
    const like = `%${q}%`;
    return tauriQuery(
      `SELECT id, patient_code as patientCode, name, age, gender, mobile, address,
              referral_doctor as referralDoctor, created_at as createdAt, updated_at as updatedAt
       FROM patients
       WHERE patient_code LIKE ?1 OR name LIKE ?2 OR mobile LIKE ?3
       ORDER BY created_at DESC`,
      [like, like, like]
    );
  },

  async insert(p: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `INSERT INTO patients (id, patient_code, name, age, gender, mobile, address, referral_doctor, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
      [p.id, p.patientCode, p.name, p.age, p.gender, p.mobile, p.address ?? null, p.referralDoctor ?? null, p.createdAt, p.updatedAt]
    );
  },

  async update(p: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `UPDATE patients SET name=?1, age=?2, gender=?3, mobile=?4, address=?5, referral_doctor=?6, updated_at=?7
       WHERE id=?8`,
      [p.name, p.age, p.gender, p.mobile, p.address ?? null, p.referralDoctor ?? null, p.updatedAt, p.id]
    );
  },
};

// ─────────────────────────────────────────────────────────────
// Procedure CRUD helpers
// ─────────────────────────────────────────────────────────────

export const tauriProcedures = {
  async getAll(): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT id, code, name, category_id as categoryId, category_name as categoryName,
              sample_type as sampleType, department, price, status, created_at as createdAt, updated_at as updatedAt
       FROM procedures ORDER BY name`
    );
  },

  async getCategories(): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT id, name, status, created_at as createdAt, updated_at as updatedAt
       FROM procedure_categories ORDER BY name`
    );
  },

  async upsert(p: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `INSERT INTO procedures (id, code, name, category_id, category_name, sample_type, department, price, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
       ON CONFLICT(id) DO UPDATE SET
         code=excluded.code, name=excluded.name, category_id=excluded.category_id,
         category_name=excluded.category_name, sample_type=excluded.sample_type,
         department=excluded.department, price=excluded.price, status=excluded.status, updated_at=excluded.updated_at`,
      [p.id, p.code, p.name, p.categoryId, p.categoryName, p.sampleType, p.department, p.price, p.status, p.createdAt, p.updatedAt]
    );
  },

  async insertCategory(cat: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `INSERT OR IGNORE INTO procedure_categories (id, name, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)`,
      [cat.id, cat.name, cat.status, cat.createdAt, cat.updatedAt]
    );
  },
};

// ─────────────────────────────────────────────────────────────
// Bill CRUD helpers
// ─────────────────────────────────────────────────────────────

export const tauriBills = {
  async getRecent(limit: number): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT b.*, p.patient_code as patient_code, p.name as patient_name, p.age as patient_age,
              p.gender as patient_gender, p.mobile as patient_mobile, p.address as patient_address,
              p.referral_doctor as patient_referral
       FROM bills b JOIN patients p ON b.patient_id = p.id
       ORDER BY b.created_at DESC LIMIT ?1`,
      [limit]
    );
  },

  async getAll(): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT b.*, p.patient_code, p.name as patient_name, p.age as patient_age,
              p.gender as patient_gender, p.mobile as patient_mobile
       FROM bills b JOIN patients p ON b.patient_id = p.id
       ORDER BY b.created_at DESC`
    );
  },

  async getById(id: string): Promise<Record<string, unknown> | null> {
    const rows = await tauriQuery(
      `SELECT b.*, p.patient_code, p.name as patient_name, p.age as patient_age,
              p.gender as patient_gender, p.mobile as patient_mobile, p.address as patient_address
       FROM bills b JOIN patients p ON b.patient_id = p.id
       WHERE b.id = ?1`,
      [id]
    );
    return rows[0] || null;
  },

  async getItems(billId: string): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT id, bill_id as billId, procedure_id as procedureId, procedure_code as procedureCode,
              procedure_name as procedureName, quantity, rate, discount, amount
       FROM bill_items WHERE bill_id = ?1`,
      [billId]
    );
  },

  async getPayments(billId: string): Promise<Record<string, unknown>[]> {
    return tauriQuery(
      `SELECT id, bill_id as billId, payment_mode as paymentMode, amount,
              reference_number as referenceNumber, paid_at as paidAt, created_by as createdBy
       FROM bill_payments WHERE bill_id = ?1`,
      [billId]
    );
  },

  async insertBill(b: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `INSERT INTO bills (id, bill_number, patient_id, bill_date, subtotal, discount, tax, round_off,
                          grand_total, payment_status, status, created_by, created_by_name, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`,
      [b.id, b.billNumber, b.patientId, b.billDate, b.subtotal, b.discount, b.tax, b.roundOff,
       b.grandTotal, b.paymentStatus, b.status, b.createdBy, b.createdByName, b.createdAt, b.updatedAt]
    );
  },

  async insertItem(item: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `INSERT INTO bill_items (id, bill_id, procedure_id, procedure_code, procedure_name, quantity, rate, discount, amount)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      [item.id || `bi_${Date.now()}`, item.billId, item.procedureId, item.procedureCode,
       item.procedureName, item.quantity, item.rate, item.discount, item.amount]
    );
  },

  async insertPayment(pay: Record<string, unknown>): Promise<void> {
    await tauriExec(
      `INSERT INTO bill_payments (id, bill_id, payment_mode, amount, reference_number, paid_at, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
      [pay.id || `bp_${Date.now()}`, pay.billId, pay.paymentMode, pay.amount,
       pay.referenceNumber ?? null, pay.paidAt, pay.createdBy]
    );
  },

  async cancel(billId: string, cancellationJson: string, now: string): Promise<void> {
    await tauriExec(
      `UPDATE bills SET status='CANCELLED', cancellation=?1, updated_at=?2 WHERE id=?3`,
      [cancellationJson, now, billId]
    );
  },

  async updateNextSequence(invoiceSequence: number, settings: Record<string, unknown>): Promise<void> {
    const updated = { ...settings, invoiceSequence };
    await tauriExec(
      `UPDATE settings SET data=?1 WHERE id='singleton'`,
      [JSON.stringify(updated)]
    );
  },
};

// ─────────────────────────────────────────────────────────────
// SQLite Native Backup Helpers
// ─────────────────────────────────────────────────────────────

export async function tauriBackupSqlite(customDest?: string): Promise<string> {
  if (!isTauri()) return 'SQLite backup only available in native desktop mode';
  return invoke<string>('db_backup_sqlite', { customDest: customDest || null });
}

export async function tauriGetBackupDir(): Promise<string> {
  if (!isTauri()) return '';
  return invoke<string>('db_get_backup_dir');
}

