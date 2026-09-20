import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { licenseDb } from '../db/index.js';
import {
  signLicensePayload,
  getPublicKeyPem,
  LicenseTokenPayload,
} from '../crypto/keys.js';

export const licenseRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  // Public Key Endpoint
  server.get('/public-key', async () => {
    return {
      format: 'Ed25519 SPKI PEM',
      publicKey: getPublicKeyPem(),
    };
  });

  // Activate License Endpoint
  server.post<{
    Body: {
      licenseKey: string;
      deviceFingerprint: string;
      deviceName?: string;
    };
  }>('/activate', async (request, reply) => {
    const { licenseKey, deviceFingerprint, deviceName } = request.body || {};

    if (!licenseKey || !deviceFingerprint) {
      return reply.code(400).send({
        error: 'BAD_REQUEST',
        message: 'Both licenseKey and deviceFingerprint are required.',
      });
    }

    const license = licenseDb.findLicenseByKey(licenseKey);
    if (!license) {
      return reply.code(404).send({
        error: 'LICENSE_NOT_FOUND',
        message: 'The provided license key is not recognized.',
      });
    }

    if (license.status !== 'ACTIVE') {
      return reply.code(403).send({
        error: 'LICENSE_INACTIVE',
        message: `This license is currently ${license.status}. Please contact support.`,
      });
    }

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      return reply.code(403).send({
        error: 'LICENSE_EXPIRED',
        message: `This license expired on ${new Date(license.expiresAt).toLocaleDateString()}. Please renew.`,
      });
    }

    // Check device limit
    const activeDevices = licenseDb.getActiveDevicesForLicense(license.id);
    const isAlreadyBound = activeDevices.some((d) => d.fingerprintHash === deviceFingerprint);

    if (!isAlreadyBound && activeDevices.length >= license.maxDevices) {
      return reply.code(403).send({
        error: 'DEVICE_LIMIT_REACHED',
        message: `Maximum allowed devices (${license.maxDevices}) reached for this license. Please reset old devices or purchase additional seats.`,
        activeDevicesCount: activeDevices.length,
        maxDevices: license.maxDevices,
      });
    }

    // Register / update device
    const boundDevice = licenseDb.bindDevice(
      license.id,
      deviceFingerprint,
      deviceName || 'Windows Desktop PC'
    );

    // Calculate offline grace window (60 days from now or license expiration, whichever is earlier)
    const graceMs = 60 * 24 * 60 * 60 * 1000;
    const graceDate = new Date(Date.now() + graceMs);
    const offlineGraceUntil =
      license.expiresAt && new Date(license.expiresAt) < graceDate
        ? license.expiresAt
        : graceDate.toISOString();

    const payload: LicenseTokenPayload = {
      licenseId: license.id,
      licenseKey: license.licenseKey,
      customerName: license.customerName,
      plan: license.plan,
      deviceFingerprint,
      issuedAt: new Date().toISOString(),
      expiresAt: license.expiresAt,
      offlineGraceUntil,
    };

    const signedToken = signLicensePayload(payload);

    return {
      success: true,
      message: 'License activated and bound to this device successfully.',
      license: {
        customerName: license.customerName,
        plan: license.plan,
        expiresAt: license.expiresAt,
        offlineGraceUntil,
        deviceId: boundDevice.id,
      },
      signedToken,
    };
  });

  // Periodic License Validation
  server.post<{
    Body: {
      licenseKey: string;
      deviceFingerprint: string;
    };
  }>('/validate', async (request, reply) => {
    const { licenseKey, deviceFingerprint } = request.body || {};

    const license = licenseDb.findLicenseByKey(licenseKey);
    if (!license || license.status !== 'ACTIVE') {
      return reply.code(403).send({
        valid: false,
        message: 'License is invalid, suspended, or revoked.',
      });
    }

    const activeDevices = licenseDb.getActiveDevicesForLicense(license.id);
    const device = activeDevices.find((d) => d.fingerprintHash === deviceFingerprint);

    if (!device) {
      return reply.code(403).send({
        valid: false,
        message: 'Device registration not found or was reset. Re-activation required.',
      });
    }

    device.lastSeenAt = new Date().toISOString();

    const graceMs = 60 * 24 * 60 * 60 * 1000;
    const graceDate = new Date(Date.now() + graceMs);
    const offlineGraceUntil =
      license.expiresAt && new Date(license.expiresAt) < graceDate
        ? license.expiresAt
        : graceDate.toISOString();

    const payload: LicenseTokenPayload = {
      licenseId: license.id,
      licenseKey: license.licenseKey,
      customerName: license.customerName,
      plan: license.plan,
      deviceFingerprint,
      issuedAt: new Date().toISOString(),
      expiresAt: license.expiresAt,
      offlineGraceUntil,
    };

    const signedToken = signLicensePayload(payload);

    return {
      valid: true,
      offlineGraceUntil,
      signedToken,
    };
  });

  // Reset Device (PC Replacement)
  server.post<{
    Body: {
      licenseKey: string;
      deviceId: string;
    };
  }>('/reset-device', async (request, reply) => {
    const { licenseKey, deviceId } = request.body || {};
    const license = licenseDb.findLicenseByKey(licenseKey);
    if (!license) {
      return reply.code(404).send({ error: 'License not found' });
    }

    const ok = licenseDb.resetDevice(license.id, deviceId);
    if (!ok) {
      return reply.code(404).send({ error: 'Device not found on this license' });
    }

    return {
      success: true,
      message: 'Device unbind successful. The seat is now free for a new PC activation.',
    };
  });
};
