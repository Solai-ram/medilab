import { test } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../dist/server.js';
import {
  signLicensePayload,
  verifyLicenseSignature,
  computeFingerprintHash,
} from '../dist/crypto/keys.js';

test('Ed25519 signature correctly validates authentic payload', () => {
  const payload = {
    licenseId: 'test_lic_01',
    licenseKey: 'LAB-2026-TEST-1111',
    customerName: 'Test Diagnostic Lab',
    plan: 'ANNUAL',
    deviceFingerprint: 'sha256_mock_hash_123',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    offlineGraceUntil: new Date(Date.now() + 86400000 * 60).toISOString(),
  };

  const signed = signLicensePayload(payload);
  assert.ok(signed.signature.length > 30);

  // Verification passes with authentic payload
  const isValid = verifyLicenseSignature(payload, signed.signature, signed.publicKey);
  assert.strictEqual(isValid, true);

  // Tampering with payload fails signature verification
  const tamperedPayload = { ...payload, plan: 'LIFETIME' as const };
  const isTamperedValid = verifyLicenseSignature(tamperedPayload, signed.signature, signed.publicKey);
  assert.strictEqual(isTamperedValid, false);
});

test('License API - /health endpoint returns UP', async () => {
  const server = await createServer();
  const res = await server.inject({
    method: 'GET',
    url: '/health',
  });
  assert.strictEqual(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.strictEqual(json.status, 'UP');
});

test('License API - Activation succeeds for valid key and binds device', async () => {
  const server = await createServer();
  const fingerprint = computeFingerprintHash('MOTHERBOARD_UUID_111 + DISK_SERIAL_222');

  const res = await server.inject({
    method: 'POST',
    url: '/api/v1/licenses/activate',
    payload: {
      licenseKey: 'LAB-2026-ABCD-1234',
      deviceFingerprint: fingerprint,
      deviceName: 'Reception Counter PC',
    },
  });

  assert.strictEqual(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.strictEqual(json.success, true);
  assert.strictEqual(json.license.customerName, 'MediLab Diagnostic Center');
  assert.ok(json.signedToken.signature);

  // Verify the issued signature
  const valid = verifyLicenseSignature(
    json.signedToken.payload,
    json.signedToken.signature,
    json.signedToken.publicKey
  );
  assert.strictEqual(valid, true);
});

test('License API - Activation rejects unknown or expired keys', async () => {
  const server = await createServer();

  // Unknown key
  const resUnknown = await server.inject({
    method: 'POST',
    url: '/api/v1/licenses/activate',
    payload: {
      licenseKey: 'LAB-UNKNOWN-9999',
      deviceFingerprint: 'mock_fp_unknown',
    },
  });
  assert.strictEqual(resUnknown.statusCode, 404);

  // Expired key
  const resExpired = await server.inject({
    method: 'POST',
    url: '/api/v1/licenses/activate',
    payload: {
      licenseKey: 'LAB-2026-EXPD-0001',
      deviceFingerprint: 'mock_fp_exp',
    },
  });
  assert.strictEqual(resExpired.statusCode, 403);
});

test('License API - Device limit enforcement & reset flow (PC Replacement)', async () => {
  const server = await createServer();

  // LAB-2026-ABCD-1234 has maxDevices: 1.
  // Device 1 was bound in earlier test.
  // Try to activate Device 2 (different PC)
  const resExceeded = await server.inject({
    method: 'POST',
    url: '/api/v1/licenses/activate',
    payload: {
      licenseKey: 'LAB-2026-ABCD-1234',
      deviceFingerprint: 'NEW_PC_FINGERPRINT_9999',
      deviceName: 'New Replacement PC',
    },
  });

  assert.strictEqual(resExceeded.statusCode, 403);
  const errJson = JSON.parse(resExceeded.payload);
  assert.strictEqual(errJson.error, 'DEVICE_LIMIT_REACHED');

  // Now vendor resets device on admin portal
  const licRes = await server.inject({
    method: 'GET',
    url: '/api/v1/admin/licenses',
  });
  const licenses = JSON.parse(licRes.payload);
  const lic = licenses.find((l: any) => l.licenseKey === 'LAB-2026-ABCD-1234');
  assert.ok(lic);
  const deviceIdToReset = lic.devices[0].id;

  const resetRes = await server.inject({
    method: 'POST',
    url: '/api/v1/licenses/reset-device',
    payload: {
      licenseKey: 'LAB-2026-ABCD-1234',
      deviceId: deviceIdToReset,
    },
  });
  assert.strictEqual(resetRes.statusCode, 200);

  // Now the new PC can successfully activate!
  const resNewPc = await server.inject({
    method: 'POST',
    url: '/api/v1/licenses/activate',
    payload: {
      licenseKey: 'LAB-2026-ABCD-1234',
      deviceFingerprint: 'NEW_PC_FINGERPRINT_9999',
      deviceName: 'New Replacement PC',
    },
  });
  assert.strictEqual(resNewPc.statusCode, 200);
  const newPcJson = JSON.parse(resNewPc.payload);
  assert.strictEqual(newPcJson.success, true);
});
