import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
  publicKey: string; // PEM-encoded Ed25519 public key
}

// ─────────────────────────────────────────────────────────
// KEY LOADING — persistent across server restarts
// ─────────────────────────────────────────────────────────

function loadOrGenerateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKeyPem = process.env.PRIVATE_KEY_PEM;
  const publicKeyPem = process.env.PUBLIC_KEY_PEM;

  if (privateKeyPem && publicKeyPem) {
    console.log('🔑 Ed25519 keys loaded from environment variables.');
    return {
      privateKey: privateKeyPem.replace(/\\n/g, '\n'),
      publicKey: publicKeyPem.replace(/\\n/g, '\n'),
    };
  }

  // Try loading from a local keys file (dev / self-hosted mode)
  const keysFilePath = path.resolve(process.cwd(), '.keys.json');
  if (fs.existsSync(keysFilePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(keysFilePath, 'utf-8'));
      if (raw.privateKey && raw.publicKey) {
        console.log('🔑 Ed25519 keys loaded from .keys.json (dev mode).');
        return raw;
      }
    } catch (e) {
      console.warn('⚠️  Could not parse .keys.json, regenerating...');
    }
  }

  // Generate a fresh pair and save/print it
  console.warn('⚠️  No persistent Ed25519 keys found. Generating a new pair...');
  const pair = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Save to .keys.json for local dev persistence (git-ignored via .gitignore *.pem / *.key)
  try {
    fs.writeFileSync(keysFilePath, JSON.stringify(pair, null, 2), { mode: 0o600 });
    console.log('✅ New keypair saved to .keys.json (local dev only).');
  } catch {
    // Read-only filesystem (e.g. Cloud Run) — print for operator to copy into secrets
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  NEW Ed25519 KEYPAIR — COPY INTO DEPLOYMENT SECRETS NOW!');
    console.log('  Set these as environment variables on your platform:');
    console.log('');
    console.log('  PRIVATE_KEY_PEM (single-line, \\n escaped):');
    console.log('  ' + pair.privateKey.replace(/\n/g, '\\n'));
    console.log('');
    console.log('  PUBLIC_KEY_PEM (single-line, \\n escaped):');
    console.log('  ' + pair.publicKey.replace(/\n/g, '\\n'));
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  }

  return pair;
}

const keyPair = loadOrGenerateKeyPair();

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
