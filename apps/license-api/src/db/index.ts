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

class LicenseDatabase {
  customers: CustomerRecord[] = [
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

  licenses: LicenseRecord[] = [
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
    {
      id: 'lic_04',
      customerId: 'cust_02',
      customerName: 'Apex Clinical Pathology Lab',
      licenseKey: 'LAB-2026-EXPD-0001',
      plan: 'MONTHLY',
      status: 'ACTIVE',
      maxDevices: 1,
      expiresAt: new Date(Date.now() - 86400000 * 5).toISOString(), // Expired 5 days ago
      createdAt: new Date(Date.now() - 86400000 * 35).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  devices: DeviceRecord[] = [];
  events: LicenseEventRecord[] = [];

  findLicenseByKey(key: string): LicenseRecord | undefined {
    return this.licenses.find((l) => l.licenseKey.toUpperCase() === key.trim().toUpperCase());
  }

  getActiveDevicesForLicense(licenseId: string): DeviceRecord[] {
    return this.devices.filter((d) => d.licenseId === licenseId && d.status === 'ACTIVE');
  }

  bindDevice(licenseId: string, fingerprintHash: string, deviceName: string): DeviceRecord {
    const existing = this.devices.find(
      (d) => d.licenseId === licenseId && d.fingerprintHash === fingerprintHash
    );

    if (existing) {
      existing.status = 'ACTIVE';
      existing.lastSeenAt = new Date().toISOString();
      existing.deviceName = deviceName || existing.deviceName;
      return existing;
    }

    const newDevice: DeviceRecord = {
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      licenseId,
      fingerprintHash,
      deviceName: deviceName || 'Windows Desktop PC',
      activatedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    this.devices.push(newDevice);
    this.recordEvent(licenseId, 'DEVICE_BOUND', { deviceId: newDevice.id, fingerprintHash });
    return newDevice;
  }

  resetDevice(licenseId: string, deviceId: string): boolean {
    const dev = this.devices.find((d) => d.licenseId === licenseId && d.id === deviceId);
    if (!dev) return false;
    dev.status = 'RESET';
    this.recordEvent(licenseId, 'DEVICE_RESET', { deviceId });
    return true;
  }

  recordEvent(licenseId: string, eventType: string, metadata: any) {
    this.events.push({
      id: `evt_${Date.now()}`,
      licenseId,
      eventType,
      metadata,
      createdAt: new Date().toISOString(),
    });
  }
}

export const licenseDb = new LicenseDatabase();
