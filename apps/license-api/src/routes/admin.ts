import crypto from 'node:crypto';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { licenseDb, LicenseRecord } from '../db/index.js';

export const adminRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // ─── List all licenses with registered devices ───────────
  server.get('/licenses', async () => {
    return licenseDb.licenses.map((lic) => {
      const devices = licenseDb.getActiveDevicesForLicense(lic.id);
      return {
        ...lic,
        activeDevicesCount: devices.length,
        devices,
      };
    });
  });

  // ─── List all customers ──────────────────────────────────
  server.get('/customers', async () => {
    return licenseDb.customers;
  });

  // ─── Add new customer laboratory ─────────────────────────
  server.post<{
    Body: {
      name: string;
      location?: string;
      contactName?: string;
      email?: string;
      phone?: string;
    };
  }>('/customers', async (request, reply) => {
    const { name, location, contactName, email, phone } = request.body || {};
    if (!name || !name.trim()) {
      return reply.code(400).send({ error: 'Laboratory name is required.' });
    }

    const newCustomer = {
      id: `cust_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      name: name.trim(),
      location: location?.trim() || '',
      contactName: contactName?.trim() || 'Lab In-charge',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
    };

    licenseDb.addCustomer(newCustomer);
    return { success: true, customer: newCustomer };
  });

  // ─── Create new customer license ─────────────────────────
  server.post<{
    Body: {
      customerId: string;
      plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
      maxDevices: number;
      durationDays?: number;
      deviceFingerprint?: string;
    };
  }>('/licenses', async (request, reply) => {
    const { customerId, plan, maxDevices, durationDays, deviceFingerprint } = request.body || {};
    const customer = licenseDb.customers.find((c) => c.id === customerId);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    // Clean name prefix for key readability (e.g. STAR from Star Diagnostics)
    const namePrefix = customer.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase() || 'LAB';
    const secureSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
    const licenseKey = `LAB-${new Date().getFullYear()}-${namePrefix}-${secureSuffix}`;

    const expiresAt =
      plan === 'LIFETIME'
        ? null
        : new Date(Date.now() + 86400000 * (durationDays || 365)).toISOString();

    const newLicense: LicenseRecord = {
      id: `lic_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      customerId,
      customerName: customer.name,
      licenseKey,
      plan,
      status: 'ACTIVE',
      maxDevices: maxDevices || 1,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    licenseDb.addLicense(newLicense);
    licenseDb.recordEvent(newLicense.id, 'CREATED', { plan, maxDevices, deviceFingerprint });

    // Pre-bind device fingerprint if provided by admin
    if (deviceFingerprint && deviceFingerprint.trim()) {
      licenseDb.bindDevice(
        newLicense.id,
        deviceFingerprint.trim(),
        `${customer.name} Frontdesk Workstation`
      );
    }

    const boundDevices = licenseDb.getActiveDevicesForLicense(newLicense.id);

    return {
      success: true,
      license: {
        ...newLicense,
        activeDevicesCount: boundDevices.length,
        devices: boundDevices,
      },
    };
  });

  // ─── Suspend license ─────────────────────────────────────
  server.post<{
    Params: { id: string };
  }>('/licenses/:id/suspend', async (request, reply) => {
    const lic = licenseDb.licenses.find((l) => l.id === request.params.id);
    if (!lic) return reply.code(404).send({ error: 'License not found' });
    licenseDb.updateLicense(lic.id, { status: 'SUSPENDED' });
    licenseDb.recordEvent(lic.id, 'SUSPENDED', {});
    return { success: true, message: `License ${lic.licenseKey} suspended.` };
  });

  // ─── Extend license expiration ───────────────────────────
  server.post<{
    Params: { id: string };
    Body: { additionalDays: number };
  }>('/licenses/:id/extend', async (request, reply) => {
    const lic = licenseDb.licenses.find((l) => l.id === request.params.id);
    if (!lic) return reply.code(404).send({ error: 'License not found' });
    const currentExpiry = lic.expiresAt ? new Date(lic.expiresAt).getTime() : Date.now();
    const newExpiresAt = new Date(currentExpiry + 86400000 * (request.body.additionalDays || 365)).toISOString();
    licenseDb.updateLicense(lic.id, { expiresAt: newExpiresAt });
    licenseDb.recordEvent(lic.id, 'EXTENDED', { newExpiresAt });
    return { success: true, license: { ...lic, expiresAt: newExpiresAt } };
  });

  // ─── Audit Events ────────────────────────────────────────
  server.get('/events', async () => {
    return licenseDb.events;
  });
};
