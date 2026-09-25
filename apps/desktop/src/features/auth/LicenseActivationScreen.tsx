import React, { useState, useEffect } from 'react';
import { dbService, isLicenseActive } from '../../services/db';
import { getDeviceFingerprint } from '../../services/licenseBridge';
import { LicenseState } from '@lab/shared-types';
import {
  KeyRound,
  ShieldAlert,
  Cpu,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface LicenseActivationScreenProps {
  currentLicense: LicenseState | null;
  onActivated: (newLicense: LicenseState) => void;
}

export const LicenseActivationScreen: React.FC<LicenseActivationScreenProps> = ({
  currentLicense,
  onActivated,
}) => {
  const [fingerprint, setFingerprint] = useState<string>('Detecting hardware...');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedFp, setCopiedFp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDeviceFingerprint().then((fp) => {
      setFingerprint(fp);
    });
  }, []);

  const isExpired = currentLicense?.status === 'EXPIRED' || (
    currentLicense?.isActivated &&
    currentLicense?.plan !== 'LIFETIME' &&
    currentLicense?.expiresAt &&
    new Date(currentLicense.expiresAt).getTime() < Date.now()
  );

  const handleCopy = () => {
    if (!fingerprint || fingerprint === 'Detecting hardware...') return;
    navigator.clipboard.writeText(fingerprint);
    setCopiedFp(true);
    setTimeout(() => setCopiedFp(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = licenseKeyInput.trim();
    if (!clean) {
      setError('Please enter your license key.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await dbService.activateLicense(clean);
      if (res.success && res.license && isLicenseActive(res.license)) {
        onActivated(res.license);
      } else {
        setError(res.message || 'License activation failed. Please check the key and internet connection.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error communicating with license server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center bg-slate-950 text-slate-100 select-none p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1 shadow-inner">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {isExpired ? 'Commercial License Expired' : 'Commercial License Required'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            {isExpired
              ? 'Your MediLab subscription has expired. Please enter a valid renewal key to reactivate billing and patient records.'
              : 'MediLab Diagnostic Billing operates as a commercial licensed workstation. Activate this device to proceed.'}
          </p>
        </div>

        {/* Status Warning Banner */}
        {error ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-xs text-rose-200 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        ) : isExpired ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-950/60 border border-amber-800/80 text-xs text-amber-200">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Expired on {new Date(currentLicense!.expiresAt!).toLocaleDateString()}. Workstation is locked.
            </span>
          </div>
        ) : null}

        {/* Machine Fingerprint Card */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              Workstation Hardware Fingerprint:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-mono transition border border-slate-700"
            >
              {copiedFp ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFp ? 'Copied!' : 'Copy Fingerprint'}</span>
            </button>
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl font-mono text-[11px] text-teal-300 break-all select-all shadow-inner">
            {fingerprint}
          </div>
          <p className="text-[10px] text-slate-500">
            Licenses are bound cryptographically to this workstation's motherboard and Windows Machine GUID.
          </p>
        </div>

        {/* 3-Step Simple Guide */}
        <div className="p-3 bg-slate-950/50 border border-slate-800/60 rounded-xl space-y-1.5 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 text-xs flex items-center gap-1.5 mb-1">
            <HelpCircle className="w-3.5 h-3.5 text-teal-400" />
            <span>How to activate:</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-teal-400 flex items-center justify-center shrink-0">1</span>
            <span>Copy your Workstation Hardware Fingerprint above.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-teal-400 flex items-center justify-center shrink-0">2</span>
            <span>Provide it to your software vendor via WhatsApp or Email.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-teal-400 flex items-center justify-center shrink-0">3</span>
            <span>Paste your issued License Key below and click <strong>Activate Workstation</strong>.</span>
          </div>
        </div>

        {/* Activation Form */}
        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Enter License Key
            </label>
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
              placeholder="LAB-XXXX-XXXX-XXXX"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 tracking-wider"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !licenseKeyInput.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-teal-950/60 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Verifying License...</span>
              </>
            ) : (
              <>
                <span>Activate Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
