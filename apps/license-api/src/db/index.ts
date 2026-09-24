import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface CustomerRecord {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface LicenseRecord {
  id: string;
  customerId: string;
  customerName: string;
  licenseKey: string;
  plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  maxDevices: number;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceRecord {
  id: string;
  licenseId: string;
  fingerprintHash: string;
  deviceName: string;
  activatedAt: string;
  lastSeenAt: string;
  status: 'ACTIVE' | 'REVOKED' | 'RESET';
}

export interface LicenseEventRecord {
  id: string;
  licenseId: string;
  eventType: string;
  metadata: any;
  createdAt: string;
}

interface DbState {
  customers: CustomerRecord[];
  licenses: LicenseRecord[];
  devices: DeviceRecord[];
  events: LicenseEventRecord[];
}

// ─────────────────────────────────────────────────────────
// FILE-BASED PERSISTENT DATABASE
// Uses an atomic write pattern (write to temp → rename) to
// prevent corruption if the process is killed mid-write.
// In production on managed platforms, swap this for Postgres.
// ─────────────────────────────────────────────────────────

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'licensedb.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`📁 Created data directory: ${DATA_DIR}`);
  }
}

const SEED_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust_01',
    name: 'MediLab Diagnostic Center',
    contactName: 'Dr. S. K. Raman',
    email: 'contact@medilabdiagnostics.com',
    phone: '+91 98765 43210',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cust_02',
    name: 'Apex Clinical Pathology Lab',
    contactName: 'Priya Mehta',
    email: 'info@apexlabs.com',
    phone: '+91 91234 56789',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

const SEED_LICENSES: LicenseRecord[] = [
  {
    id: 'lic_01',
    customerId: 'cust_01',
    customerName: 'MediLab Diagnostic Center',
    licenseKey: 'LAB-2026-ABCD-1234',
    plan: 'ANNUAL',
    status: 'ACTIVE',
    maxDevices: 1,
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lic_02',
    customerId: 'cust_01',
    customerName: 'MediLab Diagnostic Center',
    licenseKey: 'LAB-2026-PRO1-9821',
    plan: 'ANNUAL',
    status: 'ACTIVE',
    maxDevices: 2,
    expiresAt: new Date(Date.now() + 86400000 * 300).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'lic_03',
    customerId: 'cust_02',
    customerName: 'Apex Clinical Pathology Lab',
    licenseKey: 'LAB-2026-LIFE-7777',
    plan: 'LIFETIME',
    status: 'ACTIVE',
    maxDevices: 1,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function loadState(): DbState {
  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DbState;
      console.log(`✅ License DB loaded from ${DB_FILE} (${parsed.licenses.length} licenses, ${parsed.devices.length} devices)`);
      return parsed;
    } catch (e) {
      console.error('❌ Failed to parse DB file, falling back to seed data:', e);
    }
  }

  // First boot — write seed data
  console.log('🌱 No DB file found. Seeding initial data...');
  const initial: DbState = {
    customers: SEED_CUSTOMERS,
    licenses: SEED_LICENSES,
    devices: [],
    events: [],
  };
  saveState(initial);
  return initial;
}

function saveState(state: DbState) {
  ensureDataDir();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmp, DB_FILE); // atomic rename
}

class LicenseDatabase {
  private state: DbState;

  constructor() {
    this.state = loadState();
  }

  get customers(): CustomerRecord[] {
    return this.state.customers;
  }

  get licenses(): LicenseRecord[] {
    return this.state.licenses;
  }

  get devices(): DeviceRecord[] {
    return this.state.devices;
  }

  get events(): LicenseEventRecord[] {
    return this.state.events;
  }

  private persist() {
    saveState(this.state);
  }

  findLicenseByKey(key: string): LicenseRecord | undefined {
    return this.state.licenses.find((l) => l.licenseKey.toUpperCase() === key.trim().toUpperCase());
  }

  getActiveDevicesForLicense(licenseId: string): DeviceRecord[] {
    return this.state.devices.filter((d) => d.licenseId === licenseId && d.status === 'ACTIVE');
  }

  bindDevice(licenseId: string, fingerprintHash: string, deviceName: string): DeviceRecord {
    const existing = this.state.devices.find(
      (d) => d.licenseId === licenseId && d.fingerprintHash === fingerprintHash
    );

    if (existing) {
      existing.status = 'ACTIVE';
      existing.lastSeenAt = new Date().toISOString();
      existing.deviceName = deviceName || existing.deviceName;
      this.persist();
      return existing;
    }

    const newDevice: DeviceRecord = {
      id: `dev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      licenseId,
      fingerprintHash,
      deviceName: deviceName || 'Windows Desktop PC',
      activatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    this.state.devices.push(newDevice);
    this.recordEvent(licenseId, 'DEVICE_BOUND', { deviceId: newDevice.id, fingerprintHash });
    this.persist();
    return newDevice;
  }

  updateDeviceLastSeen(fingerprintHash: string, licenseId: string) {
    const dev = this.state.devices.find(
      (d) => d.licenseId === licenseId && d.fingerprintHash === fingerprintHash && d.status === 'ACTIVE'
    );
    if (dev) {
      dev.lastSeenAt = new Date().toISOString();
      this.persist();
    }
  }

  resetDevice(licenseId: string, deviceId: string): boolean {
    const dev = this.state.devices.find((d) => d.licenseId === licenseId && d.id === deviceId);
    if (!dev) return false;
    dev.status = 'RESET';
    this.recordEvent(licenseId, 'DEVICE_RESET', { deviceId });
    this.persist();
    return true;
  }

  recordEvent(licenseId: string, eventType: string, metadata: any) {
    this.state.events.push({
      id: `evt_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      licenseId,
      eventType,
      metadata,
      createdAt: new Date().toISOString(),
    });
    this.persist();
  }

  addLicense(license: LicenseRecord) {
    this.state.licenses.push(license);
    this.persist();
  }

  updateLicense(id: string, updates: Partial<LicenseRecord>) {
    const lic = this.state.licenses.find((l) => l.id === id);
    if (lic) {
      Object.assign(lic, updates, { updatedAt: new Date().toISOString() });
      this.persist();
    }
  }
}

export const licenseDb = new LicenseDatabase();
