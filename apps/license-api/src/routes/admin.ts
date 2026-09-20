import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { licenseDb } from '../db/index.js';

export const adminRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // List all licenses with registered devices
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

  // List all customers
  server.get('/customers', async () => {
    return licenseDb.customers;
  });

  // Create new customer license
  server.post<{
    Body: {
      customerId: string;
      plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
      maxDevices: number;
      durationDays?: number;
    };
  }>('/licenses', async (request, reply) => {
    const { customerId, plan, maxDevices, durationDays } = request.body || {};
    const customer = licenseDb.customers.find((c) => c.id === customerId);
    if (!customer) {
      return reply.code(404).send({ error: 'Customer not found' });
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const licenseKey = `LAB-2026-${plan.substring(0, 4)}-${randomSuffix}`;

    const expiresAt =
      plan === 'LIFETIME'
        ? null
        : new Date(Date.now() + 86400000 * (durationDays || 365)).toISOString();

    const newLicense = {
      id: `lic_${Date.now()}`,
      customerId,
      customerName: customer.name,
      licenseKey,
      plan,
      status: 'ACTIVE' as const,
      maxDevices: maxDevices || 1,
      expiresAt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    licenseDb.licenses.push(newLicense);
    licenseDb.recordEvent(newLicense.id, 'CREATED', { plan, maxDevices });

    return {
      success: true,
      license: newLicense,
    };
  });

  // Suspend license
  server.post<{
    Params: { id: string };
  }>('/licenses/:id/suspend', async (request, reply) => {
    const lic = licenseDb.licenses.find((l) => l.id === request.params.id);
    if (!lic) return reply.code(404).send({ error: 'License not found' });
    lic.status = 'SUSPENDED';
    licenseDb.recordEvent(lic.id, 'SUSPENDED', {});
    return { success: true, message: `License ${lic.licenseKey} suspended.` };
  });

  // Extend license expiration
  server.post<{
    Params: { id: string };
    Body: { additionalDays: number };
  }>('/licenses/:id/extend', async (request, reply) => {
    const lic = licenseDb.licenses.find((l) => l.id === request.params.id);
    if (!lic) return reply.code(404).send({ error: 'License not found' });
    const currentExpiry = lic.expiresAt ? new Date(lic.expiresAt).getTime() : Date.now();
    lic.expiresAt = new Date(currentExpiry + 86400000 * (request.body.additionalDays || 365)).toISOString();
    licenseDb.recordEvent(lic.id, 'EXTENDED', { newExpiresAt: lic.expiresAt });
    return { success: true, license: lic };
  });

  // Audit Events
  server.get('/events', async () => {
    return licenseDb.events;
  });
};
