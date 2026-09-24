import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Users,
  ShieldCheck,
  RotateCcw,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
} from 'lucide-react';

interface Device {
  id: string;
  licenseId: string;
  fingerprintHash: string;
  deviceName: string;
  activatedAt: string;
  lastSeenAt: string;
  status: 'ACTIVE' | 'RESET';
}

interface License {
  id: string;
  customerId: string;
  customerName: string;
  licenseKey: string;
  plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
  maxDevices: number;
  activeDevicesCount: number;
  expiresAt: string | null;
  createdAt: string;
  devices: Device[];
}

interface Customer {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  status: string;
}

const RAW_API_URL = (import.meta as any).env?.VITE_LICENSE_API_URL || 'http://localhost:4000';
const API_BASE = `${RAW_API_URL.replace(/\/$/, '')}/api/v1/admin`;
const LICENSE_RESET_URL = `${RAW_API_URL.replace(/\/$/, '')}/api/v1/licenses/reset-device`;

// ─────────────────────────────────────────────────────────
// Admin Key Auth Gate
// ─────────────────────────────────────────────────────────
const AdminKeyGate: React.FC<{ onAuth: (key: string) => void }> = ({ onAuth }) => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    // Quick validation: try a real API call
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        headers: { 'X-Admin-Key': keyInput.trim() },
      });
      if (res.ok) {
        sessionStorage.setItem('ADMIN_API_KEY', keyInput.trim());
        onAuth(keyInput.trim());
      } else {
        setError('Invalid admin key. Check your ADMIN_API_KEY environment variable.');
      }
    } catch {
      setError('Cannot connect to license API. Is the server running?');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Admin Portal</h1>
            <p className="text-[11px] text-slate-400">MediLab License Management</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Admin API Key</label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your ADMIN_API_KEY..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              autoFocus
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  const [adminKey, setAdminKey] = useState<string>(() => sessionStorage.getItem('ADMIN_API_KEY') || '');
  const [licenses, setLicenses] = useState<License[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'licenses' | 'customers'>('licenses');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resetModalData, setResetModalData] = useState<{ licenseKey: string; device: Device } | null>(null);

  // New License Form
  const [newCustomerId, setNewCustomerId] = useState('');
  const [newPlan, setNewPlan] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME'>('ANNUAL');
  const [newMaxDevices, setNewMaxDevices] = useState(1);

  const authHeaders = { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey };

  useEffect(() => {
    if (adminKey) loadData();
  }, [adminKey]);

  if (!adminKey) {
    return <AdminKeyGate onAuth={setAdminKey} />;
  }

  const loadData = async () => {
    try {
      const [licRes, custRes] = await Promise.all([
        fetch(`${API_BASE}/licenses`, { headers: authHeaders }),
        fetch(`${API_BASE}/customers`, { headers: authHeaders }),
      ]);
      if (licRes.status === 401) {
        // Key was invalidated on server — clear and re-prompt
        sessionStorage.removeItem('ADMIN_API_KEY');
        setAdminKey('');
        return;
      }
      if (licRes.ok && custRes.ok) {
        const lics = await licRes.json();
        const custs = await custRes.json();
        setLicenses(lics);
        setCustomers(custs);
        if (custs.length > 0 && !newCustomerId) {
          setNewCustomerId(custs[0].id);
        }
      }
    } catch {
      console.warn('Could not reach license API. Check server status.');
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/licenses`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          customerId: newCustomerId,
          plan: newPlan,
          maxDevices: Number(newMaxDevices),
        }),
      });
      if (res.ok) {
        await loadData();
        setShowCreateModal(false);
      } else {
        console.error('Failed to create license:', await res.text());
      }
    } catch (err) {
      console.error('Network error creating license:', err);
    }
  };

  const handleConfirmDeviceReset = async () => {
    if (!resetModalData) return;
    try {
      await fetch(LICENSE_RESET_URL, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          licenseKey: resetModalData.licenseKey,
          deviceId: resetModalData.device.id,
        }),
      });
    } catch { /* silent — local state update happens below */ }

    // Update state locally
    const updated = licenses.map((l) => {
      if (l.licenseKey === resetModalData.licenseKey) {
        return {
          ...l,
          activeDevicesCount: Math.max(0, l.activeDevicesCount - 1),
          devices: l.devices.filter((d) => d.id !== resetModalData.device.id),
        };
      }
      return l;
    });
    setLicenses(updated);
    setResetModalData(null);
  };

  const filteredLicenses = licenses.filter(
    (l) =>
      l.licenseKey.toLowerCase().includes(search.toLowerCase()) ||
      l.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Vendor Nav Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <KeyRound className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-white">
              MediLab Software — Commercial License Management Portal
            </h1>
            <span className="text-[10px] text-teal-400 font-mono">Ed25519 Cryptographic Cloud Server</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Vendor Console: <b className="text-slate-200">Admin Operator</b></span>
          <div className="h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
          <button
            onClick={() => { sessionStorage.removeItem('ADMIN_API_KEY'); setAdminKey(''); }}
            className="text-xs text-slate-500 hover:text-rose-400 transition px-2 py-1 rounded hover:bg-rose-950/40"
            title="Sign out"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* KPI Metric Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Customer Labs</div>
            <div className="text-2xl font-bold text-white mt-1">{customers.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Issued Commercial Licenses</div>
            <div className="text-2xl font-bold text-teal-400 mt-1">{licenses.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Bound Devices</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {licenses.reduce((acc, l) => acc + l.activeDevicesCount, 0)}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cryptographic Engine</div>
            <div className="text-xs font-mono text-slate-300 mt-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Ed25519 Asymmetric</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('licenses')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'licenses' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Licenses & Registered Devices
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'customers' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Customer Accounts
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search key or lab..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New License</span>
            </button>
          </div>
        </div>

        {/* Content View */}
        {activeTab === 'licenses' ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">License Key</th>
                  <th className="py-3 px-4">Customer Laboratory</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4 text-center">Bound Devices</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions (PC Replacement)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLicenses.map((lic) => (
                  <tr key={lic.id} className="hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-400">{lic.licenseKey}</span>
                        <button
                          onClick={() => handleCopy(lic.licenseKey)}
                          className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800"
                          title="Copy Key"
                        >
                          {copiedKey === lic.licenseKey ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{lic.customerName}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium">{lic.plan}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                        {lic.activeDevicesCount} / {lic.maxDevices}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {lic.expiresAt ? new Date(lic.expiresAt).toLocaleDateString() : 'LIFETIME'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 border border-emerald-800 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        ACTIVE
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {lic.devices && lic.devices.length > 0 ? (
                        <button
                          onClick={() => setResetModalData({ licenseKey: lic.licenseKey, device: lic.devices[0] })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded-lg hover:bg-amber-900/60 transition"
                          title="Reset hardware binding for replacement PC"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Device</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No device bound</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-semibold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Laboratory Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-100">{c.name}</td>
                    <td className="py-3 px-4 text-slate-300">{c.contactName}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{c.email}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{c.phone}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Create License Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <KeyRound className="w-5 h-5 text-teal-400" />
              Issue Commercial License
            </h3>

            <form onSubmit={handleCreateLicense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Lab *</label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Plan Duration *</label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="ANNUAL">Annual (1 Year)</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="LIFETIME">Lifetime</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Devices *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newMaxDevices}
                    onChange={(e) => setNewMaxDevices(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow"
                >
                  Generate & Issue Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PC Replacement / Reset Device Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-amber-400 flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Reset Hardware Binding (PC Replacement)
            </h3>
            <p className="text-xs text-slate-300 mt-2">
              The customer is replacing their old PC. Resetting this binding will immediately release the seat and allow activation on their new computer.
            </p>

            <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1 font-mono">
              <div className="text-slate-400">License: <span className="text-teal-400 font-bold">{resetModalData.licenseKey}</span></div>
              <div className="text-slate-400">Device Name: <span className="text-white">{resetModalData.device.deviceName}</span></div>
              <div className="text-[10px] text-slate-500 break-all">Fingerprint: {resetModalData.device.fingerprintHash}</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setResetModalData(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeviceReset}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow"
              >
                Confirm Device Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
