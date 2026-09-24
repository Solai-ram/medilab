import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/db';
import { Patient, Bill, CreatePatientInput, AppSettings } from '@lab/shared-types';
import { formatCurrency } from '@lab/billing-engine';
import { InvoiceModal } from '../invoice/InvoiceModal';
import {
  Search,
  UserPlus,
  Users,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ChevronRight,
  X,
  UserCheck,
  Activity,
  Copy,
  Check,
  Edit3,
  Printer,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { CalendarPicker } from '../../components/CalendarPicker';

interface PatientsViewProps {
  onStartBill?: (patient: Patient) => void;
}

export const PatientsView: React.FC<PatientsViewProps> = ({ onStartBill }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientBills, setPatientBills] = useState<Bill[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedMobile, setCopiedMobile] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<Bill | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New patient form
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [referralDoctor, setReferralDoctor] = useState('');

  // Edit patient form & modal
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editName, setEditName] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editReferralDoctor, setEditReferralDoctor] = useState('');

  useEffect(() => {
    loadPatients();
    dbService.getSettings().then(setSettings);
  }, []);

  const loadPatients = async () => {
    const data = await dbService.getPatients();
    setPatients(data);
  };

  useEffect(() => {
    if (!search.trim()) {
      loadPatients();
    } else {
      const timer = setTimeout(async () => {
        const results = await dbService.searchPatients(search);
        setPatients(results);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [search]);

  // Load history when a patient is selected
  useEffect(() => {
    if (selectedPatient) {
      dbService.getBills(100).then((allBills) => {
        setPatientBills(allBills.filter((b) => b.patientId === selectedPatient.id));
      });
    } else {
      setPatientBills([]);
    }
  }, [selectedPatient]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !mobile) return;
    const newPat = await dbService.createPatient({
      name,
      age: parseInt(age) || 0,
      gender,
      mobile,
      address,
      referralDoctor: referralDoctor.trim() || undefined,
    });
    setPatients([newPat, ...patients]);
    setSelectedPatient(newPat);
    setShowAddModal(false);
    setName('');
    setAge('');
    setMobile('');
    setAddress('');
    setReferralDoctor('');
    setStatusMessage({
      type: 'success',
      text: `Patient ${newPat.name} (${newPat.patientCode}) registered successfully!`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenEdit = (pat: Patient, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPatient(pat);
    setEditName(pat.name);
    setEditAge(String(pat.age));
    setEditGender(pat.gender);
    setEditMobile(pat.mobile);
    setEditAddress(pat.address || '');
    setEditReferralDoctor(pat.referralDoctor || '');
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient || !editName.trim() || !editAge || !editMobile.trim()) return;

    try {
      const updated = await dbService.updatePatient(editingPatient.id, {
        name: editName.trim(),
        age: parseInt(editAge) || 0,
        gender: editGender,
        mobile: editMobile.trim(),
        address: editAddress.trim(),
        referralDoctor: editReferralDoctor.trim(),
      });

      // Update in patients list
      setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));

      // Update selected patient if it was the one edited
      if (selectedPatient?.id === updated.id) {
        setSelectedPatient(updated);
        // Reload bills for this patient so the drawer's visit list shows updated patient
        const allBills = await dbService.getBills(100);
        setPatientBills(allBills.filter((b) => b.patientId === updated.id));
      }

      setEditingPatient(null);
      setStatusMessage({
        type: 'success',
        text: `Patient ${updated.name} (${updated.patientCode}) updated! All existing bill copies and reprints now reflect the changes.`,
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to update patient details',
      });
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleCopyMobile = (mobile: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(mobile);
    setCopiedMobile(mobile);
    setTimeout(() => setCopiedMobile(null), 2000);
  };

  const filteredPatients = patients.filter((p) => {
    // Gender Filter
    if (genderFilter !== 'ALL' && p.gender !== genderFilter) return false;

    // Date Filter (YYYY-MM-DD match on createdAt)
    if (dateFilter) {
      if (!p.createdAt) return false;
      const patDate = new Date(p.createdAt).toISOString().slice(0, 10);
      if (patDate !== dateFilter) return false;
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 gap-4">
      {/* Top Floating Notification Banner */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium border shadow-lg backdrop-blur-md animate-in fade-in duration-200 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200 shadow-emerald-950/40'
              : 'bg-rose-950/80 border-rose-700/60 text-rose-200 shadow-rose-950/40'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-white ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-md">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-wide">Patient Master & Visit Records</h2>
            <p className="text-xs text-slate-400 font-medium">Diagnostic history, recurring patients, and contact records</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name, mobile, doctor, date..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 shadow-inner"
            />
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-950/50 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ Register Patient</span>
          </button>
        </div>
      </div>

      {/* Filter & Metric Pill Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Gender Filter Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setGenderFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                genderFilter === 'ALL' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({patients.length})
            </button>
            <button
              onClick={() => setGenderFilter('MALE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                genderFilter === 'MALE' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Male ({patients.filter((p) => p.gender === 'MALE').length})
            </button>
            <button
              onClick={() => setGenderFilter('FEMALE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                genderFilter === 'FEMALE' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Female ({patients.filter((p) => p.gender === 'FEMALE').length})
            </button>
          </div>

          {/* Registration Date Filter with interactive Calendar UI */}
          <CalendarPicker
            selectedDate={dateFilter}
            onChange={setDateFilter}
            patientDates={patients.map((p) => p.createdAt || '')}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{filteredPatients.length}</span> records displayed
        </div>
      </div>

      {/* Main Grid: Table & History Drawer */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Patients Table */}
        <div className={`${selectedPatient ? 'col-span-7' : 'col-span-12'} bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-md backdrop-blur-sm transition-all duration-200`}>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Patient Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-500 italic">
                      No registered patients found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((pat) => (
                    <tr
                      key={pat.id}
                      onClick={() => setSelectedPatient(pat)}
                      className={`hover:bg-slate-800/60 cursor-pointer transition ${
                        selectedPatient?.id === pat.id ? 'bg-teal-950/40 border-l-4 border-teal-400' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-teal-400">{pat.patientCode}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] text-teal-300 font-bold border border-slate-700">
                            {pat.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{pat.name}</span>
                        </div>
                        {pat.referralDoctor && (
                          <div className="text-[10px] text-sky-400 font-medium pl-8">
                            Ref: {pat.referralDoctor}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {pat.age} Y / {pat.gender}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-slate-200">
                          <span>{pat.mobile}</span>
                          <button
                            onClick={(e) => handleCopyMobile(pat.mobile, e)}
                            className="text-slate-500 hover:text-white p-0.5 rounded"
                            title="Copy Mobile"
                          >
                            {copiedMobile === pat.mobile ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(pat.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(pat, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition"
                            title="Edit Patient Details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedPatient(pat)}
                            className="text-slate-500 hover:text-teal-300 p-1"
                            title="View Diagnostic Visits"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Patient Diagnostic History Drawer (5 Cols) */}
        {selectedPatient && (
          <div className="col-span-5 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col min-h-0 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-800 text-teal-300 font-bold flex items-center justify-center text-sm shadow-sm">
                  {selectedPatient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm leading-tight">{selectedPatient.name}</h3>
                  <span className="font-mono text-xs text-teal-400 font-semibold">{selectedPatient.patientCode}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedPatient)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 border border-slate-700 transition shadow-sm"
                  title="Edit Patient Details"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                  title="Close Drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Patient Demographic Card */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2 mb-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-200 font-mono">
                  <Phone className="w-3.5 h-3.5 text-teal-400" />
                  <span>{selectedPatient.mobile}</span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                  {selectedPatient.age} Years • {selectedPatient.gender}
                </span>
              </div>
              {selectedPatient.address && (
                <div className="flex items-start gap-2 text-slate-400 pt-1 border-t border-slate-800/60">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span className="truncate">{selectedPatient.address}</span>
                </div>
              )}
              {selectedPatient.referralDoctor && (
                <div className="flex items-center gap-2 text-sky-300 text-[11px] pt-1 border-t border-slate-800/60 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Referred by: <b>{selectedPatient.referralDoctor}</b></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-500 text-[11px] pt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>First visit recorded: {new Date(selectedPatient.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Direct New Bill for this patient action */}
            {onStartBill && (
              <button
                type="button"
                onClick={() => onStartBill(selectedPatient)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 mb-3 bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-950/50 transition hover:scale-[1.01] active:scale-[0.99]"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>+ Create New Bill for {selectedPatient.name.split(' ')[0]}</span>
              </button>
            )}

            {/* Diagnostic Visits Timeline */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Diagnostic Visit History</span>
                <span className="font-mono text-[11px] px-2 py-0.2 rounded-full bg-slate-950 border border-slate-800 text-teal-400">
                  {patientBills.length} invoices
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {patientBills.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs italic">
                    No billing transactions for this patient yet.
                  </div>
                ) : (
                  patientBills.map((b) => (
                    <div
                      key={b.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-2 hover:border-slate-700 transition shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-teal-400">{b.billNumber}</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          {new Date(b.billDate).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Items in this visit */}
                      <div className="divide-y divide-slate-900 border-y border-slate-800/80 py-1 space-y-1">
                        {b.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[11px] pt-1">
                            <span className="text-slate-300 font-medium truncate max-w-[200px]">{it.procedureName}</span>
                            <span className="font-mono font-semibold text-slate-400">{formatCurrency(it.amount)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => setActiveInvoice(b)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-teal-400 hover:text-teal-200 hover:underline transition"
                          title="Print or view invoice copy"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Bill Copy</span>
                        </button>
                        <span className="font-mono font-extrabold text-white text-sm">
                          {formatCurrency(b.grandTotal)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <UserPlus className="w-5 h-5 text-teal-400" />
              Register New Patient
            </h3>

            <form onSubmit={handleCreatePatient} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Patient Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anand Kumar"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="150"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 35"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9848012345"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Flat 204, Metro Residency"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Referral Doctor (Optional)</label>
                <input
                  type="text"
                  value={referralDoctor}
                  onChange={(e) => setReferralDoctor(e.target.value)}
                  placeholder="e.g. Dr. A. K. Sharma / Self"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl shadow"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Patient Modal */}
      {editingPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Patient Record</h3>
                  <span className="font-mono text-xs text-teal-400 font-semibold">{editingPatient.patientCode}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPatient(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-2.5 rounded-xl bg-teal-950/60 border border-teal-800/80 text-[11px] text-teal-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400 mt-0.5" />
              <span>
                Updating patient details will automatically reflect on <b>all existing bill copies and future reprints</b>.
              </span>
            </div>

            <form onSubmit={handleUpdatePatient} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Patient Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Age (Years) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="150"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Gender *</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner font-medium"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Residential Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="e.g. Flat 204, Metro Residency"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Referral Doctor</label>
                <input
                  type="text"
                  value={editReferralDoctor}
                  onChange={(e) => setEditReferralDoctor(e.target.value)}
                  placeholder="e.g. Dr. A. K. Sharma / Self"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingPatient(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl shadow transition"
                >
                  Save & Update All Bills
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Modal for Preview and Reprint */}
      {activeInvoice && settings && (
        <InvoiceModal
          isOpen={!!activeInvoice}
          onClose={() => setActiveInvoice(null)}
          bill={activeInvoice}
          settings={settings}
          isReprint={true}
        />
      )}
    </div>
  );
};
