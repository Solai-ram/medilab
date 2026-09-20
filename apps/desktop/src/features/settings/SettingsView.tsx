import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { AppSettings, LicenseState } from '@lab/shared-types';
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
  const [activeTab, setActiveTab] = useState<'general' | 'billing' | 'backup' | 'license'>('general');

  useEffect(() => {
    dbService.getLicenseState().then(setLicense);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const updated = await dbService.updateSettings(form);
    onSettingsUpdated(updated);
    setSaveStatus('Settings successfully saved to local database!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleBackupNow = async () => {
    const filename = await dbService.createBackup();
    setSaveStatus(`Backup file "${filename}" downloaded successfully!`);
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
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
          <div className="max-w-2xl space-y-6">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Database className="w-4 h-4 text-teal-400" />
              Local SQLite Database Safety & Disaster Recovery
            </h3>

            {restoreStatus && (
              <div className="p-3 bg-teal-950 border border-teal-800 rounded-lg text-xs text-teal-300">
                {restoreStatus}
              </div>
            )}

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs">Create Instant Database Backup</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Exports active patients, procedure catalog, invoices, and settings to a portable timestamped file.
                  </div>
                </div>
                <button
                  onClick={handleBackupNow}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Backup Now</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-rose-300 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    Restore Database from Backup
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 max-w-md">
                    Restoring replaces current local records. Always take a manual backup before performing a restore.
                  </div>
                </div>
                {isAdmin ? (
                  <label className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer border border-slate-700 transition">
                    <Upload className="w-4 h-4" />
                    <span>Select Backup File</span>
                    <input type="file" accept=".json,.db" onChange={handleRestoreFile} className="hidden" />
                  </label>
                ) : (
                  <span className="text-xs text-rose-400 italic">Admin role required</span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1 text-slate-400">
              <div className="font-semibold text-slate-300">Windows Storage Path:</div>
              <div className="font-mono text-[11px] text-teal-400">C:\ProgramData\LabBilling\database\labbilling.db</div>
              <div className="text-[11px] text-slate-500">Backups folder: C:\ProgramData\LabBilling\backups\</div>
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
                  <span className="text-slate-400">Active License Key:</span>
                  <span className="font-mono font-bold text-teal-300">{license.licenseKey}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">License Plan:</span>
                  <span className="font-semibold text-slate-200">{license.plan} Subscription</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Expiration Date:</span>
                  <span className="font-mono text-slate-200">
                    {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString() : 'Lifetime'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Offline Operation Grace Until:</span>
                  <span className="font-mono text-emerald-400">
                    {license.offlineGraceUntil ? new Date(license.offlineGraceUntil).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-teal-400" />
                      <span>Bound Hardware Machine Fingerprint (SHA-256):</span>
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
                    Registered device: {license.deviceName}
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
      </div>
    </div>
  );
};
