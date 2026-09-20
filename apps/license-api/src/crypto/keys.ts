import crypto from 'node:crypto';

export interface LicenseTokenPayload {
  licenseId: string;
  licenseKey: string;
  customerName: string;
  plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  deviceFingerprint: string;
  issuedAt: string;
  expiresAt: string | null;
  offlineGraceUntil: string;
}

export interface SignedLicenseToken {
  payload: LicenseTokenPayload;
  signature: string; // Base64-encoded Ed25519 signature
  publicKey: string; // Base64-encoded Ed25519 public key
}

// Generate persistent or runtime keypair
let keyPair: crypto.KeyPairSyncResult<string, string>;

try {
  keyPair = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
} catch (e) {
  console.error('Failed to generate Ed25519 keys:', e);
  throw e;
}

export const getPublicKeyPem = (): string => keyPair.publicKey;

/**
 * Signs a license token payload with the server's private Ed25519 key.
 */
export function signLicensePayload(payload: LicenseTokenPayload): SignedLicenseToken {
  const dataToSign = Buffer.from(JSON.stringify(payload));
  const signatureBuffer = crypto.sign(null, dataToSign, keyPair.privateKey);

  return {
    payload,
    signature: signatureBuffer.toString('base64'),
    publicKey: keyPair.publicKey,
  };
}

/**
 * Verifies an Ed25519 signature using the server's public key.
 */
export function verifyLicenseSignature(
  payload: LicenseTokenPayload,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const data = Buffer.from(JSON.stringify(payload));
    const signature = Buffer.from(signatureBase64, 'base64');
    return crypto.verify(null, data, publicKeyPem, signature);
  } catch {
    return false;
  }
}

/**
 * Normalizes and hashes machine hardware attributes into SHA-256 fingerprint.
 */
export function computeFingerprintHash(rawAttributes: string): string {
  return crypto.createHash('sha256').update(rawAttributes.trim().toLowerCase()).digest('hex');
}
