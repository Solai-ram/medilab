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
  HelpCircle,
  RefreshCw,
  Building2,
  MapPin,
  Send,
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
  const [centerNameInput, setCenterNameInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedDetails, setCopiedDetails] = useState(false);
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

  const handleCopyDetails = () => {
    if (!fingerprint || fingerprint === 'Detecting hardware...') return;
    const text = [
      '--- MediLab Diagnostic Workstation Registration ---',
      `Center Name: ${centerNameInput.trim() || '[Not specified]'}`,
      `City / Location: ${locationInput.trim() || '[Not specified]'}`,
      `Hardware Fingerprint: ${fingerprint}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
    setCopiedDetails(true);
    setTimeout(() => setCopiedDetails(false), 2500);
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
      const res = await dbService.activateLicense(clean, {
        centerName: centerNameInput.trim(),
        location: locationInput.trim(),
      });
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

      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl relative z-10 space-y-5">
        {/* Header Icon & Title */}
        <div className="flex flex-col items-center text-center space-y-1.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide">
            {isExpired ? 'Commercial License Expired' : 'Commercial License Registration'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm">
            {isExpired
              ? 'Your MediLab subscription has expired. Enter a renewal key to reactivate billing and patient records.'
              : 'Register this workstation to lock your commercial license to this computer.'}
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

        {/* Step 1: Center Details & Fingerprint Card */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Step 1: Your Laboratory Details</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Center / Lab Name</label>
              <input
                type="text"
                value={centerNameInput}
                onChange={(e) => setCenterNameInput(e.target.value)}
                placeholder="e.g. Star Diagnostic Center"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">City / Location</label>
              <input
                type="text"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Chennai - Anna Nagar"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 flex items-center gap-1.5 text-[11px] font-medium">
                <Cpu className="w-3.5 h-3.5 text-teal-400" />
                Workstation Hardware Fingerprint:
              </span>
            </div>
            <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[10px] text-teal-300 break-all select-all">
              {fingerprint}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyDetails}
            className="w-full flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 font-semibold border border-slate-700 transition"
          >
            {copiedDetails ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5" />}
            <span>{copiedDetails ? 'Registration Details Copied!' : 'Copy Details to Send to Software Vendor'}</span>
          </button>
        </div>

        {/* Step 2: Enter Issued Key */}
        <form onSubmit={handleActivate} className="space-y-3 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-teal-400" />
            <span>Step 2: Enter Vendor License Key</span>
          </div>

          <div>
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
              placeholder="Paste Key (e.g. LAB-2026-STAR-8F42)"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-teal-500 tracking-wider text-center font-bold"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !licenseKeyInput.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-teal-950/60 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Activating Workstation...</span>
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
