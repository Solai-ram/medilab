import { LicenseState, LicenseTokenPayload } from '@lab/shared-types';

const RAW_API_URL = (import.meta as any).env?.VITE_LICENSE_API_URL || 'http://localhost:4000';
const LICENSE_API_URL = `${RAW_API_URL.replace(/\/$/, '')}/api/v1/licenses`;

/**
 * Computes a deterministic client device fingerprint.
 * In Tauri: reads the real Windows Machine GUID via Rust (most stable).
 * In browser dev: hashes browser/screen attributes as a fallback.
 */
export async function getDeviceFingerprint(): Promise<string> {
  // Try Tauri hardware fingerprint first (real hardware ID)
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const fp = await invoke<string>('get_hardware_fingerprint');
      if (fp && fp.startsWith('SHA256:')) return fp;
    } catch {
      // Fall through to browser fallback
    }
  }

  // Browser fallback (dev mode only)
  const components = [
    navigator.userAgent,
    navigator.language,
    (navigator as any).hardwareConcurrency || 4,
    (navigator as any).deviceMemory || 4,
    screen.width + 'x' + screen.height,
  ].join('###');

  const encoder = new TextEncoder();
  const data = encoder.encode(components);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return `SHA256:${hashHex}`;
}


export interface ActivationResponse {
  success: boolean;
  message: string;
  license?: {
    customerName: string;
    plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
    expiresAt: string | null;
    offlineGraceUntil: string;
    deviceId: string;
  };
  signedToken?: {
    payload: LicenseTokenPayload;
    signature: string;
    publicKey: string;
  };
  error?: string;
}

/**
 * Communicates with cloud license server to bind and activate device.
 */
export async function activateOnlineLicense(
  licenseKey: string,
  deviceName: string = 'Windows Frontdesk PC'
): Promise<ActivationResponse> {
  const fingerprint = await getDeviceFingerprint();

  try {
    const res = await fetch(`${LICENSE_API_URL}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: licenseKey.trim().toUpperCase(),
        deviceFingerprint: fingerprint,
        deviceName,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        message: data.message || 'License activation failed',
        error: data.error || 'ACTIVATION_ERROR',
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      message: 'Could not connect to license server. Check internet connection for initial activation.',
      error: 'NETWORK_ERROR',
    };
  }
}

/**
 * Validates active license with server during scheduled background checks (e.g. every 30-60 days).
 */
export async function validateOnlineLicense(licenseKey: string): Promise<{ valid: boolean; offlineGraceUntil?: string; message?: string }> {
  const fingerprint = await getDeviceFingerprint();

  try {
    const res = await fetch(`${LICENSE_API_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: licenseKey.trim().toUpperCase(),
        deviceFingerprint: fingerprint,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { valid: false, message: data.message };
    }

    const data = await res.json();
    return { valid: true, offlineGraceUntil: data.offlineGraceUntil };
  } catch {
    // If offline, validation silently passes as long as offlineGraceUntil is in future!
    return { valid: true };
  }
}
