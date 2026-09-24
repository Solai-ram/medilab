import React, { useState, useEffect } from 'react';
import { dbService, DEFAULT_QUICK_TESTS, QUICK_COLOR_OPTIONS, getQuickTagClass } from '../../services/db';
import { AppSettings, LicenseState, Procedure, QuickTestConfig } from '@lab/shared-types';
import { useAuth } from '../auth/AuthContext';
import {
  Settings,
  Building2,
  Receipt,
  Printer,
  Database,
  KeyRound,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  FileSignature,
  Zap,
  Clock,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsUpdated }) => {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState<AppSettings>(settings);
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [copiedFp, setCopiedFp] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'quick' | 'backup' | 'license'>('general');

  // Quick tests configuration state
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcCode, setSelectedProcCode] = useState('');
  const [quickLabel, setQuickLabel] = useState('');
  const [quickColor, setQuickColor] = useState('purple');

  useEffect(() => {
    dbService.getLicenseState().then(setLicense);
    dbService.getProcedures().then(setProcedures);
  }, []);

  // Ensure quickTests is initialized in form
  const currentQuickList: QuickTestConfig[] = form.quickTests && form.quickTests.length > 0
    ? form.quickTests
    : DEFAULT_QUICK_TESTS;

  const handleAddQuickTest = () => {
    if (!selectedProcCode) return;
    if (currentQuickList.some((t) => t.code === selectedProcCode)) {
      setSaveStatus('This test is already in the quick palette.');
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    const proc = procedures.find((p) => p.code === selectedProcCode);
    const label = quickLabel.trim() || proc?.name.split(' ')[0] || selectedProcCode;
    const updated = [...currentQuickList, { code: selectedProcCode, label, color: quickColor }];
    setForm({ ...form, quickTests: updated });
    setSelectedProcCode('');
    setQuickLabel('');
    setQuickColor('purple');
  };

  const handleRemoveQuickTest = (code: string) => {
    const updated = currentQuickList.filter((t) => t.code !== code);
    setForm({ ...form, quickTests: updated });
  };

  const handleMoveQuickTest = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= currentQuickList.length) return;
    const updated = [...currentQuickList];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);
    setForm({ ...form, quickTests: updated });
  };

  const handleUpdateQuickItem = (index: number, field: 'label' | 'color', value: string) => {
    const updated = [...currentQuickList];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, quickTests: updated });
  };

  const handleResetQuickDefaults = () => {
    setForm({ ...form, quickTests: DEFAULT_QUICK_TESTS });
    setSaveStatus('Quick tests reset to default recommended suite.');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSaveQuickTests = async () => {
    if (!isAdmin) return;
    const updated = await dbService.updateSettings({ ...form, quickTests: currentQuickList });
    onSettingsUpdated(updated);
    setSaveStatus('Quick tests bar successfully updated and saved!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const updated = await dbService.updateSettings(form);
    onSettingsUpdated(updated);
    setSaveStatus('Settings successfully saved to local database!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveStatus('Please select a valid image file (PNG, JPG, SVG, WebP).');
      setTimeout(() => setSaveStatus(null), 3500);
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setSaveStatus('Image size exceeds 2.5MB. Please choose a smaller logo.');
      setTimeout(() => setSaveStatus(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((prev) => ({ ...prev, labLogo: base64 }));
      setSaveStatus('Logo attached! Click "Save Lab Information" below to persist changes.');
      setTimeout(() => setSaveStatus(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, labLogo: '' }));
    setSaveStatus('Logo removed. Click "Save Lab Information" to persist changes.');
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleSqliteBackup = async () => {
    try {
      const res = await dbService.createSqliteBackup();
      setSaveStatus(`SQLite .db binary backup completed! Saved to ${res}`);
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setSaveStatus(`Backup failed: ${err?.message || err}`);
    }
  };

  const handleBackupNow = async () => {
    const filename = await dbService.createBackup();
    setSaveStatus(`JSON export file "${filename}" generated!`);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const success = await dbService.restoreBackup(content);
      if (success) {
        setRestoreStatus('Database successfully restored! Reloading state...');
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setRestoreStatus('Failed to restore backup. Invalid format.');
      }
    };
    reader.readAsText(file);
  };

  const handleActivateLicense = async () => {
    if (!licenseKeyInput.trim()) return;
    const activated = await dbService.activateLicense(licenseKeyInput.trim());
    setLicense(activated);
    setLicenseKeyInput('');
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">System Settings & Administration</h2>
            <p className="text-xs text-slate-400">Configure lab branding, invoice numbering, database backups, and licensing</p>
          </div>
        </div>

        {saveStatus && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 select-none">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'general' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Lab Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'billing' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Billing & Printers</span>
        </button>

        <button
          onClick={() => setActiveTab('quick')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'quick' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Tests Setup</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'backup' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Backup & Restore</span>
        </button>

        <button
          onClick={() => setActiveTab('license')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeTab === 'license' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Commercial License</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-5 overflow-y-auto shadow-sm">
        {activeTab === 'general' && (
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Form Column */}
            <form onSubmit={handleSaveSettings} className="col-span-7 space-y-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-400" />
                Laboratory Identity & Letterhead
              </h3>

              {/* Attach Laboratory Logo */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2.5">
                <label className="block text-xs font-semibold text-slate-200">
                  Laboratory Brand Logo
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-dashed border-slate-700 bg-slate-900/90 flex items-center justify-center overflow-hidden flex-shrink-0 relative group">
                    {form.labLogo ? (
                      <img
                        src={form.labLogo}
                        alt="Lab Logo Preview"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-600" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 border border-teal-500/40 text-teal-300 hover:bg-teal-600/30 text-xs font-semibold transition">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{form.labLogo ? 'Change Logo' : 'Attach Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={!isAdmin}
                        />
                      </label>
                      {form.labLogo && isAdmin && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-400 hover:bg-rose-900/40 text-xs font-semibold transition"
                          title="Remove attached logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Displays in software top header, 80mm thermal receipts, and A4 tax invoices. Max 2.5MB (PNG/JPG).
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Laboratory Official Name *</label>
                <input
                  type="text"
                  required
                  value={form.labName}
                  onChange={(e) => setForm({ ...form, labName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline / Motto</label>
                <input
                  type="text"
                  value={form.labTagline || ''}
                  onChange={(e) => setForm({ ...form, labTagline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Clinic / Laboratory Address *</label>
                <textarea
                  rows={2}
                  required
                  value={form.labAddress}
                  onChange={(e) => setForm({ ...form, labAddress: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone Numbers *</label>
                  <input
                    type="text"
                    required
                    value={form.labPhone}
                    onChange={(e) => setForm({ ...form, labPhone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.labEmail || ''}
                    onChange={(e) => setForm({ ...form, labEmail: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN / Tax ID</label>
                  <input
                    type="text"
                    value={form.labGstin || ''}
                    onChange={(e) => setForm({ ...form, labGstin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Operational Timings</label>
                  <input
                    type="text"
                    value={form.labTimings || ''}
                    onChange={(e) => setForm({ ...form, labTimings: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Lab Information</span>
                  </button>
                </div>
              )}
            </form>

            {/* Live Letterhead Preview Card */}
            <div className="col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-teal-400" />
                  <span>Live Letterhead Preview</span>
                </span>
                <span className="text-[10px] text-teal-400 font-mono">Simulated</span>
              </div>

              <div className="bg-white text-black p-4 rounded-xl shadow-md text-center font-sans">
                {form.labLogo && (
                  <div className="flex justify-center mb-2">
                    <img
                      src={form.labLogo}
                      alt="Lab Logo Preview"
                      className="max-h-12 max-w-[140px] object-contain"
                    />
                  </div>
                )}
                <div className="text-base font-extrabold text-teal-900 tracking-tight uppercase">
                  {form.labName || 'YOUR LAB NAME'}
                </div>
                {form.labTagline && (
                  <div className="text-[10px] text-teal-700 italic font-semibold mt-0.5">
                    {form.labTagline}
                  </div>
                )}
                <div className="text-[10px] text-gray-700 mt-1 max-w-xs mx-auto leading-tight">
                  {form.labAddress || '123 Diagnostic Road, Clinic Building'}
                </div>
                <div className="text-[10px] text-gray-900 font-semibold mt-0.5">
                  Ph: {form.labPhone || '+91 98480 12345'}
                </div>
                {form.labGstin && (
                  <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                    GSTIN: {form.labGstin}
                  </div>
                )}
                <div className="mt-4 pt-3 border-t border-dashed border-gray-200 flex justify-end">
                  <div className="text-center min-w-[140px]">
                    <div className="w-32 border-b border-gray-400 mb-1 mx-auto"></div>
                    {form.signatoryName && (
                      <div className="text-[10px] font-bold text-gray-900 leading-tight">{form.signatoryName}</div>
                    )}
                    <div className="text-[9px] font-bold text-gray-800 leading-tight">
                      {form.signatoryLabel || 'Authorized Signatory'}
                    </div>
                    <div className="text-[8px] text-gray-500 leading-tight">
                      {form.signatoryDesignation || 'Pathologist / Lab In-Charge'}
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-dashed border-gray-300 text-[9px] text-gray-400">
                  Thermal Receipt & A4 Invoice Preview
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <form onSubmit={handleSaveSettings} className="max-w-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-teal-400" />
              Invoice Numbering Sequence & Format
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  required
                  value={form.invoicePrefix}
                  onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Financial Year</label>
                <input
                  type="text"
                  required
                  value={form.invoiceFy}
                  onChange={(e) => setForm({ ...form, invoiceFy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Current Sequence Number</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={form.invoiceSequence}
                  onChange={(e) => setForm({ ...form, invoiceSequence: parseInt(e.target.value) || 1 })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
              <span>Next generated bill number format preview: </span>
              <span className="font-mono font-bold text-teal-300">
                {form.invoicePrefix}-{form.invoiceFy.split('-')[0]}-{String(form.invoiceSequence + 1).padStart(6, '0')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Footer Note</label>
              <textarea
                rows={2}
                value={form.invoiceFooter}
                onChange={(e) => setForm({ ...form, invoiceFooter: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Default 80mm Thermal Printer</label>
                <input
                  type="text"
                  value={form.thermalPrinterName || ''}
                  onChange={(e) => setForm({ ...form, thermalPrinterName: e.target.value })}
                  placeholder="e.g. POS-80C Thermal Printer"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Default A4 Standard Printer</label>
                <input
                  type="text"
                  value={form.a4PrinterName || ''}
                  onChange={(e) => setForm({ ...form, a4PrinterName: e.target.value })}
                  placeholder="e.g. HP LaserJet Pro M404"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* Invoice Authorized Signatory & Designation Settings */}
            <div className="pt-4 border-t border-slate-800 space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <FileSignature className="w-4 h-4 text-teal-400" />
                    <span>Authorized Signatory & Designation</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize the signatory heading, medical designation/role, and practitioner credentials printed at the bottom of the bill copy.
                  </p>
                </div>
                <span className="text-[10px] text-teal-400 font-mono px-2 py-0.5 rounded bg-teal-950/70 border border-teal-800">
                  A4 Invoice Footer
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Signatory Heading / Label
                  </label>
                  <input
                    type="text"
                    value={form.signatoryLabel || ''}
                    onChange={(e) => setForm({ ...form, signatoryLabel: e.target.value })}
                    placeholder="e.g. Authorized Signatory"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Default: "Authorized Signatory" (or "Verified By", "Approved By")
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role / Professional Designation
                  </label>
                  <input
                    type="text"
                    value={form.signatoryDesignation || ''}
                    onChange={(e) => setForm({ ...form, signatoryDesignation: e.target.value })}
                    placeholder="e.g. Pathologist / Lab In-Charge"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    Default: "Pathologist / Lab In-Charge"
                  </span>
                </div>
              </div>

              {/* Quick Role / Designation Chips */}
              <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-1">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Quick Presets:</span>
                {[
                  'Pathologist / Lab In-Charge',
                  'Consultant Pathologist',
                  'Chief Biochemist',
                  'Laboratory Director',
                  'Medical Superintendent',
                  'Senior Microbiologist',
                  'Verified by Lab In-Charge',
                ].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm({ ...form, signatoryDesignation: role })}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] transition ${
                      form.signatoryDesignation === role
                        ? 'bg-teal-950 border-teal-600 text-teal-300 font-bold'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Doctor / Signatory Name & Medical Degrees <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={form.signatoryName || ''}
                  onChange={(e) => setForm({ ...form, signatoryName: e.target.value })}
                  placeholder="e.g. Dr. A. K. Verma, MBBS, MD (Pathology)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              {/* Visual Live Signatory Box Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-inner">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
                  <span>Simulated Bill Bottom Signature Preview:</span>
                  <span className="text-teal-400 font-mono text-[10px]">Live Updates</span>
                </div>
                <div className="bg-white text-black p-4 rounded-xl shadow-md max-w-xs mx-auto text-center font-sans border border-gray-200">
                  <div className="w-44 border-b border-gray-400 mb-1.5 mx-auto"></div>
                  {form.signatoryName && (
                    <p className="text-[11px] font-bold text-gray-900 leading-tight">{form.signatoryName}</p>
                  )}
                  <p className="text-[11px] font-bold text-gray-800 leading-tight">
                    {form.signatoryLabel || 'Authorized Signatory'}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {form.signatoryDesignation || 'Pathologist / Lab In-Charge'}
                  </p>
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="pt-3">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Billing Config</span>
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === 'backup' && (
          <div className="max-w-2xl space-y-5">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" />
              Database Management & Disaster Recovery
            </h3>

            {restoreStatus && (
              <div className="p-3 bg-teal-950 border border-teal-800 rounded-lg text-xs text-teal-300">
                {restoreStatus}
              </div>
            )}

            {/* 1. Quick SQLite .db Backup */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                    <span>Quick SQLite Database Backup (.db)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                    Creates an exact binary snapshot of your local database (<code className="text-teal-300">labbilling.db</code>). Highly recommended for flash drive backups.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSqliteBackup}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Quick Backup</span>
                </button>
              </div>
            </div>

            {/* 2. Restore Backup */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Restore Database</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                    Restores data from a previously created <code className="text-slate-300">.db</code> or <code className="text-slate-300">.json</code> backup. Always keep a current backup before restoring.
                  </div>
                </div>
                {isAdmin ? (
                  <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer border border-slate-700 transition shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Restore Backup</span>
                    <input type="file" accept=".json,.db" onChange={handleRestoreFile} className="hidden" />
                  </label>
                ) : (
                  <span className="text-xs text-rose-400 italic">Admin role required</span>
                )}
              </div>
            </div>

            {/* 3. Export Data (JSON) */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs">Export Data (JSON)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                    Exports patient records, procedure master, and bills in human-readable JSON format for audits or spreadsheet reporting.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleBackupNow}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 shadow transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>

            {/* 4. Automatic Backup & Path Details */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-400">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  Automatic Daily Backup:
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Active (On Startup)
                </span>
              </div>
              <div className="text-[11px] space-y-1 font-mono text-slate-400">
                <div>Active DB: <span className="text-teal-400">C:\ProgramData\LabBilling\database\labbilling.db</span></div>
                <div>Backups Directory: <span className="text-slate-300">C:\ProgramData\LabBilling\backups\</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'license' && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-400" />
              Device Commercial License & Binding
            </h3>

            {license && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">License Status:</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {license.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">License Plan:</span>
                  <span className="font-semibold text-slate-200">
                    {license.plan === 'LIFETIME' ? 'Lifetime License' : `${license.plan} Subscription`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Expiration Date:</span>
                  <span className="font-mono text-slate-200 font-semibold">
                    {license.plan === 'LIFETIME' ? (
                      <span className="text-emerald-400">Permanent (Lifetime)</span>
                    ) : license.expiresAt ? (
                      <span>
                        {new Date(license.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > 0 && (
                          <span className="ml-2 text-[10px] text-teal-400 font-normal">
                            ({Math.ceil((new Date(license.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining)
                          </span>
                        )}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active License Key:</span>
                  <span className="font-mono font-bold text-teal-300">{license.licenseKey}</span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-teal-400" />
                      <span>Machine Binding (SHA-256 Hardware Fingerprint):</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (license?.deviceFingerprint) {
                          navigator.clipboard.writeText(license.deviceFingerprint);
                          setCopiedFp(true);
                          setTimeout(() => setCopiedFp(false), 2000);
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono transition"
                    >
                      {copiedFp ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      <span>{copiedFp ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-[10px] text-teal-300 break-all shadow-inner">
                    {license.deviceFingerprint}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Registered machine: {license.deviceName} • Bound
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Activate / Renew License Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={licenseKeyInput}
                  onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
                  placeholder="LAB-XXXX-XXXX-XXXX"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleActivateLicense}
                  disabled={!licenseKeyInput.trim()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow disabled:opacity-50 transition"
                >
                  Activate Device
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'quick' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Top Live Preview of the Reception Billing Counter */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Live Reception Counter Preview</h3>
                </div>
                <span className="text-[11px] text-teal-400 font-mono font-semibold">
                  {currentQuickList.length} test(s) in quick bar
                </span>
              </div>

              {/* Exact Visual Replica of Reception Quick Bar */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center gap-2 overflow-x-auto shadow-inner">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 shrink-0">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Quick:
                </span>
                {currentQuickList.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No quick tests configured. Add tests below.</span>
                ) : (
                  currentQuickList.map((t) => {
                    const proc = procedures.find((p) => p.code === t.code);
                    const tagClass = getQuickTagClass(t.color);
                    return (
                      <div
                        key={t.code}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border whitespace-nowrap shadow-sm select-none ${tagClass}`}
                      >
                        <span>{t.label || proc?.name || t.code}</span>
                        <span className="ml-1 opacity-75 font-mono text-[10px]">₹{proc?.price ?? 0}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                These buttons appear directly above the billing cart on the reception counter. Staff can click any chip to add the test instantly with zero typing.
              </p>
            </div>

            {/* Add Investigation to Quick Palette */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-400" />
                Add Test to Quick Palette
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Diagnostic Investigation *
                  </label>
                  <select
                    value={selectedProcCode}
                    onChange={(e) => {
                      const code = e.target.value;
                      setSelectedProcCode(code);
                      const proc = procedures.find((p) => p.code === code);
                      if (proc) {
                        setQuickLabel(proc.name.split(' ')[0]);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium"
                  >
                    <option value="">-- Choose from Procedure Master --</option>
                    {procedures
                      .filter((p) => p.status === 'ACTIVE')
                      .map((p) => (
                        <option key={p.id} value={p.code}>
                          {p.code} - {p.name} (₹{p.price})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Short Counter Button Label *
                  </label>
                  <input
                    type="text"
                    value={quickLabel}
                    onChange={(e) => setQuickLabel(e.target.value)}
                    placeholder="e.g. CBC, FBS, LFT"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Specimen Color Accent
                  </label>
                  <select
                    value={quickColor}
                    onChange={(e) => setQuickColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium"
                  >
                    {QUICK_COLOR_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddQuickTest}
                    disabled={!selectedProcCode}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Bar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Configured Quick Tests Table */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
              <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Configured Tests & Display Order
                </h3>
                <span className="text-[11px] text-slate-400">
                  Use the arrows to adjust button sequence on the counter
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      <th className="py-2.5 px-3 w-20 text-center">Order</th>
                      <th className="py-2.5 px-3">Test Code & Name</th>
                      <th className="py-2.5 px-3 w-44">Counter Label</th>
                      <th className="py-2.5 px-3 w-44">Specimen Accent</th>
                      <th className="py-2.5 px-3 text-right w-24">Tariff</th>
                      <th className="py-2.5 px-3 text-center w-36">Live Chip</th>
                      <th className="py-2.5 px-3 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {currentQuickList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                          No quick tests configured. Choose an investigation above to add it.
                        </td>
                      </tr>
                    ) : (
                      currentQuickList.map((item, idx) => {
                        const proc = procedures.find((p) => p.code === item.code);
                        const tagClass = getQuickTagClass(item.color);
                        return (
                          <tr key={item.code} className="hover:bg-slate-900/60 transition">
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveQuickTest(idx, -1)}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === currentQuickList.length - 1}
                                  onClick={() => handleMoveQuickTest(idx, 1)}
                                  className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-20 transition"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span className="font-mono text-teal-400 font-semibold">{item.code}</span>
                                <span>{proc?.name || item.label}</span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {proc?.categoryName || 'Diagnostic Investigation'}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => handleUpdateQuickItem(idx, 'label', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500 font-semibold shadow-inner"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <select
                                value={item.color || 'purple'}
                                onChange={(e) => handleUpdateQuickItem(idx, 'color', e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                              >
                                {QUICK_COLOR_OPTIONS.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-teal-400">
                              ₹{proc?.price ?? 0}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border shadow-sm ${tagClass}`}>
                                <span>{item.label}</span>
                                <span className="ml-1 opacity-75 font-mono text-[10px]">₹{proc?.price ?? 0}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveQuickTest(item.code)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                                title="Remove from Quick Bar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Action Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetQuickDefaults}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Recommended Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSaveQuickTests}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-950/60 transition duration-150 transform hover:scale-[1.01] active:scale-[0.99]"
              >
                <Save className="w-4 h-4" />
                <span>Save Quick Tests Bar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
