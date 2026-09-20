import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { dbService } from '../../services/db';
import {
  Patient,
  Procedure,
  Bill,
  PaymentMode,
  AppSettings,
  CreatePatientInput,
} from '@lab/shared-types';
import { calculateBillSummary, formatCurrency } from '@lab/billing-engine';
import { InvoiceModal } from '../invoice/InvoiceModal';
import QRCode from 'qrcode';
import {
  Search,
  Plus,
  Trash2,
  Printer,
  Save,
  UserPlus,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Ban,
  Phone,
  User as UserIcon,
  Sparkles,
  Zap,
  CreditCard,
  Banknote,
  QrCode,
  ArrowRight,
  Receipt,
  FileCheck2,
  Copy,
  Check,
  Percent,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

interface CartItem {
  procedure: Procedure;
  quantity: number;
  rate: number;
  discount: number;
}

interface BillingViewProps {
  settings: AppSettings;
  initialPatient?: Patient | null;
  onViewAllActivity?: () => void;
}

// Popular Quick-Add Tests for fast lab receptionists with Specimen Color Accents
const QUICK_TESTS = [
  { code: 'CBC001', label: 'CBC', name: 'Complete Blood Count (CBC)', price: 350, cat: 'Hematology', specimen: 'EDTA Blood', tagColor: 'bg-purple-950/70 border-purple-800 text-purple-300 hover:border-purple-600' },
  { code: 'LFT001', label: 'LFT', name: 'Liver Function Test (LFT)', price: 650, cat: 'Biochemistry', specimen: 'Serum', tagColor: 'bg-rose-950/70 border-rose-800 text-rose-300 hover:border-rose-600' },
  { code: 'KFT001', label: 'KFT / RFT', name: 'Kidney Function Test', price: 600, cat: 'Biochemistry', specimen: 'Serum', tagColor: 'bg-rose-950/70 border-rose-800 text-rose-300 hover:border-rose-600' },
  { code: 'LIP001', label: 'Lipid Profile', name: 'Lipid Profile', price: 550, cat: 'Biochemistry', specimen: 'Serum', tagColor: 'bg-amber-950/70 border-amber-800 text-amber-300 hover:border-amber-600' },
  { code: 'TSH001', label: 'TSH', name: 'Thyroid Stimulating Hormone', price: 300, cat: 'Hormones', specimen: 'Serum', tagColor: 'bg-teal-950/70 border-teal-800 text-teal-300 hover:border-teal-600' },
  { code: 'GLU001', label: 'FBS Sugar', name: 'Fasting Blood Sugar (FBS)', price: 80, cat: 'Biochemistry', specimen: 'Fluoride Plasma', tagColor: 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500' },
  { code: 'HBA001', label: 'HbA1c', name: 'Glycated Hemoglobin', price: 450, cat: 'Biochemistry', specimen: 'EDTA Blood', tagColor: 'bg-purple-950/70 border-purple-800 text-purple-300 hover:border-purple-600' },
  { code: 'URN001', label: 'Urine Routine', name: 'Urine Routine & Microscopic', price: 150, cat: 'Pathology', specimen: 'Spot Urine', tagColor: 'bg-blue-950/70 border-blue-800 text-blue-300 hover:border-blue-600' },
];

export const BillingView: React.FC<BillingViewProps> = ({ settings, initialPatient, onViewAllActivity }) => {
  const { user, isAdmin } = useAuth();

  // Patients State
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // Procedures & Cart State
  const [procedureSearch, setProcedureSearch] = useState('');
  const [procedureResults, setProcedureResults] = useState<Procedure[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(0);

  // Payment State
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState('');
  const [showQrPreview, setShowQrPreview] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedMobile, setCopiedMobile] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // UI / Status State
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [activeInvoice, setActiveInvoice] = useState<Bill | null>(null);
  const [isInvoiceReprint, setIsInvoiceReprint] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Cancellation Modal State
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // Refs for fast keyboard navigation
  const patientInputRef = useRef<HTMLInputElement>(null);
  const procedureInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    loadRecentBills();
    dbService.getProcedures().then(setAllProcedures);
  }, []);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
    }
  }, [initialPatient]);

  const loadRecentBills = async () => {
    const bills = await dbService.getBills(10);
    setRecentBills(bills);
  };

  // Search Patient debounced
  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await dbService.searchPatients(patientSearch);
      setPatientResults(results);
    }, 120);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Search Procedure debounced
  useEffect(() => {
    if (!procedureSearch.trim()) {
      setProcedureResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const results = await dbService.searchProcedures(procedureSearch);
      setProcedureResults(results);
    }, 80);
    return () => clearTimeout(timer);
  }, [procedureSearch]);

  // Calculations
  const calcSummary = calculateBillSummary(
    cart.map((c) => ({ quantity: c.quantity, rate: c.rate, discount: c.discount })),
    billDiscount,
    taxRate
  );

  // Sync paidAmount with grandTotal by default
  useEffect(() => {
    setPaidAmount(calcSummary.grandTotal);
  }, [calcSummary.grandTotal]);

  // Generate Dynamic UPI QR Code for instant counter scanning
  useEffect(() => {
    if (calcSummary.grandTotal > 0) {
      const upiVpa = 'medilab@icici';
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(settings.labName || 'MediLab Diagnostics')}&am=${calcSummary.grandTotal.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Diagnostic Test Fee')}`;
      QRCode.toDataURL(upiUrl, {
        width: 260,
        margin: 1,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
      })
        .then(setQrCodeDataUrl)
        .catch(console.error);
    } else {
      setQrCodeDataUrl('');
    }
  }, [calcSummary.grandTotal, settings.labName]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleResetForm();
      } else if (e.key === 'F4') {
        e.preventDefault();
        patientInputRef.current?.focus();
      } else if (e.key === 'F6') {
        e.preventDefault();
        procedureInputRef.current?.focus();
      } else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveBill(false);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleSaveBill(true);
      } else if (e.key === 'Escape') {
        setPatientResults([]);
        setProcedureResults([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPatient, cart, paymentMode, paidAmount, paymentRef, billDiscount]);

  // Cart operations
  const handleAddProcedure = (proc: Procedure) => {
    const existingIndex = cart.findIndex((item) => item.procedure.id === proc.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { procedure: proc, quantity: 1, rate: proc.price, discount: 0 }]);
    }
    setProcedureSearch('');
    setProcedureResults([]);
    procedureInputRef.current?.focus();
  };

  const handleQuickAdd = (code: string) => {
    const proc = allProcedures.find((p) => p.code === code);
    if (proc) {
      handleAddProcedure(proc);
    }
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const newCart = [...cart];
    const newQty = Math.max(1, newCart[index].quantity + delta);
    newCart[index].quantity = newQty;
    setCart(newCart);
  };

  const handleUpdateDiscount = (index: number, disc: number) => {
    const newCart = [...cart];
    newCart[index].discount = Math.max(0, disc);
    setCart(newCart);
  };

  const handleRemoveItem = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const handleResetForm = () => {
    setSelectedPatient(null);
    setCart([]);
    setBillDiscount(0);
    setTaxRate(0);
    setPaymentRef('');
    setPaymentMode('CASH');
    setStatusMessage(null);
    patientInputRef.current?.focus();
  };

  // Save Bill
  const handleSaveBill = async (andPrint: boolean) => {
    if (!user) return;
    if (!selectedPatient) {
      setStatusMessage({ type: 'error', text: 'Please select or register a patient' });
      patientInputRef.current?.focus();
      return;
    }
    if (cart.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please add at least one test procedure' });
      procedureInputRef.current?.focus();
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    try {
      const newBill = await dbService.createBill(
        {
          patientId: selectedPatient.id,
          items: cart.map((c) => ({
            procedureId: c.procedure.id,
            quantity: c.quantity,
            rate: c.rate,
            discount: c.discount,
          })),
          billDiscount,
          taxRate,
          payment: {
            paymentMode,
            amount: paidAmount,
            referenceNumber: paymentRef.trim() || undefined,
          },
        },
        user
      );

      setStatusMessage({
        type: 'success',
        text: `Invoice ${newBill.billNumber} created successfully! Total: ${formatCurrency(newBill.grandTotal)}`,
      });

      await loadRecentBills();
      handleResetForm();

      if (andPrint) {
        setActiveInvoice(newBill);
        setIsInvoiceReprint(false);
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save bill' });
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Patient Creation
  const handleCreateNewPatient = async (input: CreatePatientInput) => {
    try {
      const pat = await dbService.createPatient(input);
      setSelectedPatient(pat);
      setShowNewPatientModal(false);
      setPatientSearch('');
      procedureInputRef.current?.focus();
      setStatusMessage({ type: 'success', text: `Patient ${pat.name} (${pat.patientCode}) registered!` });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to register patient' });
    }
  };

  // Cancellation
  const handleConfirmCancellation = async () => {
    if (!cancellingBill || !user || !cancellationReason.trim()) return;
    try {
      await dbService.cancelBill(cancellingBill.id, cancellationReason, user);
      await loadRecentBills();
      setCancellingBill(null);
      setCancellationReason('');
      setStatusMessage({ type: 'success', text: `Bill ${cancellingBill.billNumber} was cancelled.` });
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to cancel bill.' });
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 gap-3">
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
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
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

      {/* Main Billing Grid */}
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Left Column: Patient Selector, Quick Catalog & Cart (8 Cols) */}
        <div className="col-span-8 flex flex-col gap-3 min-h-0">
          {/* Patient Header Card */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span>Patient Demographics (F4)</span>
              </div>
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-sm transition hover:shadow-teal-900/40"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register New Patient</span>
              </button>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center">
              {/* Patient Search Input */}
              <div className="col-span-5 relative">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    ref={patientInputRef}
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Search name, mobile or ID..."
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                  />
                </div>

                {/* Patient Search Dropdown */}
                {patientResults.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-800">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch('');
                          setPatientResults([]);
                          procedureInputRef.current?.focus();
                        }}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800/80 flex items-center justify-between text-xs text-slate-200 transition group"
                      >
                        <div>
                          <span className="font-bold text-white group-hover:text-teal-300">{p.name}</span>{' '}
                          <span className="text-teal-400 font-mono text-[11px] font-semibold">({p.patientCode})</span>
                          {p.referralDoctor && (
                            <span className="text-[10px] text-sky-400 ml-1.5 font-medium">Ref: {p.referralDoctor}</span>
                          )}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">{p.mobile}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Patient Demographic Capsule */}
              <div className="col-span-7 bg-slate-950/80 border border-slate-800/90 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs shadow-inner">
                {selectedPatient ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800/80 text-teal-300 font-bold flex items-center justify-center text-xs shadow-sm">
                        {selectedPatient.gender === 'FEMALE' ? 'F' : 'M'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span>{selectedPatient.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-teal-950 text-teal-300 border border-teal-800/80 rounded font-mono font-bold">
                            {selectedPatient.patientCode}
                          </span>
                          {selectedPatient.referralDoctor && (
                            <span className="text-[10px] px-2 py-0.5 bg-sky-950/80 text-sky-300 border border-sky-800/70 rounded-md font-semibold">
                              Ref: {selectedPatient.referralDoctor}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {selectedPatient.age} Y / {selectedPatient.gender} • <span className="font-mono text-slate-300">{selectedPatient.mobile}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="text-slate-500 hover:text-slate-300 text-[11px] font-medium hover:underline"
                    >
                      Change
                    </button>
                  </>
                ) : (
                  <span className="text-slate-500 italic py-1">No patient selected. Search above or press F4.</span>
                )}
              </div>
            </div>
          </div>

          {/* Procedure Search & Cart Table */}
          <div className="flex-1 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col min-h-0 shadow-md backdrop-blur-sm">
            {/* Search Input Bar */}
            <div className="relative mb-2.5">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                ref={procedureInputRef}
                type="text"
                value={procedureSearch}
                onChange={(e) => setProcedureSearch(e.target.value)}
                placeholder="Search tests (e.g. CBC, LFT, Lipid, Thyroid) or press F6..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner font-medium"
              />

              {/* Procedure Search Results Dropdown */}
              {procedureResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-800">
                  {procedureResults.map((proc) => (
                    <button
                      key={proc.id}
                      type="button"
                      onClick={() => handleAddProcedure(proc)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-800/80 flex items-center justify-between text-xs text-slate-200 transition group"
                    >
                      <div>
                        <div className="font-bold text-white group-hover:text-teal-300 flex items-center gap-2">
                          <span className="font-mono text-teal-400 font-semibold">{proc.code}</span>
                          <span>{proc.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {proc.categoryName} • Sample: {proc.sampleType || 'Standard'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-teal-400 font-mono text-sm">
                          {formatCurrency(proc.price)}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">+ Add to cart</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Test Quick-Add Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Quick:
              </span>
              {QUICK_TESTS.map((t) => (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => handleQuickAdd(t.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all hover:scale-105 active:scale-95 whitespace-nowrap shadow-sm ${t.tagColor}`}
                  title={t.name}
                >
                  <span>{t.label}</span>
                  <span className="ml-1 opacity-75 font-mono text-[10px]">₹{t.price}</span>
                </button>
              ))}
            </div>

            {/* Cart Table Container */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/70 shadow-inner">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Investigation / Test</th>
                    <th className="py-2.5 px-3 text-right">Tariff</th>
                    <th className="py-2.5 px-3 text-center w-28">Quantity</th>
                    <th className="py-2.5 px-3 text-right w-24">Disc (₹)</th>
                    <th className="py-2.5 px-3 text-right">Net Amount</th>
                    <th className="py-2.5 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-500 italic">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Receipt className="w-8 h-8 text-slate-600" />
                          <span>Billing cart is empty. Click a quick test chip above or press F6.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, idx) => {
                      const net = Math.max(0, item.rate * item.quantity - item.discount);
                      return (
                        <tr key={idx} className="hover:bg-slate-900/70 transition">
                          <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono text-teal-400 font-bold">{item.procedure.code}</td>
                          <td className="py-2.5 px-3 text-slate-100 font-semibold">
                            <div>{item.procedure.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{item.procedure.categoryName}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 p-0.5 shadow-inner">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, -1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-mono font-bold text-white text-xs">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(idx, 1)}
                                className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) => handleUpdateDiscount(idx, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right bg-slate-900 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-teal-300">
                            {formatCurrency(net)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
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
        </div>

        {/* Right Column: Checkout, High-Impact Totals, Payments & Today's Activity (4 Cols) */}
        <div className="col-span-4 flex flex-col gap-3 min-h-0">
          {/* Checkout Card */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-md backdrop-blur-sm">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-teal-400" />
                  <span>Invoice Settlement</span>
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-teal-400 font-mono">
                  {cart.length} item(s)
                </span>
              </div>

              {/* Subtotals & Discounts Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-200">{formatCurrency(calcSummary.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span>Bill Discount:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={billDiscount}
                      onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 text-right bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner"
                    />
                  </div>
                </div>

                {/* Quick Discount Presets */}
                <div className="flex items-center justify-end gap-1 pt-0.5">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setBillDiscount(0)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDiscount(50)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 text-[10px] font-mono"
                  >
                    ₹50
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDiscount(100)}
                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-teal-300 text-[10px] font-mono"
                  >
                    ₹100
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillDiscount(Math.round(calcSummary.subtotal * 0.1))}
                    className="px-1.5 py-0.5 rounded bg-teal-950/70 hover:bg-teal-900 border border-teal-800/80 text-teal-300 text-[10px] font-mono"
                  >
                    10%
                  </button>
                </div>

                {calcSummary.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 text-xs font-medium">
                    <span>Total Discount Saved:</span>
                    <span className="font-mono">- {formatCurrency(calcSummary.totalDiscount)}</span>
                  </div>
                )}

                {calcSummary.roundOff !== 0 && (
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Round Off:</span>
                    <span className="font-mono">{calcSummary.roundOff > 0 ? `+${calcSummary.roundOff}` : calcSummary.roundOff}</span>
                  </div>
                )}
              </div>

              {/* Hero Grand Total Box */}
              <div className="my-3 p-3.5 bg-gradient-to-br from-teal-950/70 via-slate-950 to-slate-950 border border-teal-500/40 rounded-2xl text-center shadow-lg shadow-teal-950/30">
                <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-teal-300 animate-pulse" />
                  <span>Grand Total Amount</span>
                </div>
                <div className="text-3xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-300 to-white mt-1">
                  {formatCurrency(calcSummary.grandTotal)}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Includes taxes, round-off and discounts</div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2.5 pt-1 border-t border-slate-800">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('CASH')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                      paymentMode === 'CASH'
                        ? 'bg-gradient-to-b from-teal-600 to-teal-700 border-teal-400 text-white shadow-md ring-1 ring-teal-400/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Banknote className="w-4 h-4 mb-1" />
                    <span className="text-xs font-bold">CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('UPI')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                      paymentMode === 'UPI'
                        ? 'bg-gradient-to-b from-teal-600 to-teal-700 border-teal-400 text-white shadow-md ring-1 ring-teal-400/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <QrCode className="w-4 h-4 mb-1" />
                    <span className="text-xs font-bold">UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('CARD')}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all ${
                      paymentMode === 'CARD'
                        ? 'bg-gradient-to-b from-teal-600 to-teal-700 border-teal-400 text-white shadow-md ring-1 ring-teal-400/30'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 mb-1" />
                    <span className="text-xs font-bold">CARD</span>
                  </button>
                </div>

                {/* UPI QR Trigger & Reference Input */}
                {paymentMode === 'UPI' && (
                  <div className="pt-1.5 space-y-2 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => setShowQrPreview(true)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-teal-950 via-slate-900 to-slate-950 border border-teal-600/50 hover:border-teal-400 rounded-xl text-xs text-teal-300 font-bold transition shadow group"
                    >
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-teal-400 group-hover:scale-110 transition" />
                        <span>Display Counter UPI QR</span>
                      </div>
                      <span className="font-mono text-emerald-400 text-[11px]">
                        {formatCurrency(calcSummary.grandTotal)}
                      </span>
                    </button>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        UPI UTR / Bank Reference No. (Optional)
                      </label>
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="e.g. 6253819082"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono shadow-inner"
                      />
                    </div>
                  </div>
                )}

                {paymentMode === 'CARD' && (
                  <div className="pt-1 animate-in fade-in duration-150">
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Card Transaction Auth ID / Slip No.
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. TXN-89410"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 font-mono shadow-inner"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-2">
              <button
                type="button"
                disabled={isSaving || cart.length === 0}
                onClick={() => handleSaveBill(true)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-400 hover:to-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-teal-950/60 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Printer className="w-4 h-4" />
                <span>Save & Print Invoice (Ctrl+P)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSaving || cart.length === 0}
                  onClick={() => handleSaveBill(false)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save (Ctrl+S)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-semibold text-xs border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset (F2)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Recent Invoices Feed */}
          <div className="flex-1 bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 flex flex-col min-h-0 shadow-md backdrop-blur-sm">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-teal-400" />
                <span>Today's Billing Activity</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-slate-400">{recentBills.length} recorded</span>
                {onViewAllActivity && (
                  <button
                    type="button"
                    onClick={onViewAllActivity}
                    className="text-[10px] font-bold text-teal-400 hover:text-teal-300 hover:underline flex items-center gap-1 transition"
                    title="Open Full Billing Activities Menu (F8)"
                  >
                    <span>Full View (F8)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentBills.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs italic">No bills recorded today.</div>
              ) : (
                recentBills.map((b) => (
                  <div
                    key={b.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                      b.status === 'CANCELLED'
                        ? 'bg-rose-950/20 border-rose-900/40 opacity-60'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-teal-400">{b.billNumber}</span>
                        {b.status === 'CANCELLED' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 rounded font-bold">
                            CANCELLED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-200 font-medium truncate max-w-[140px] mt-0.5">
                        {b.patient?.name || 'Patient'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-mono font-extrabold text-slate-100">{formatCurrency(b.grandTotal)}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {new Date(b.billDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
                        <button
                          onClick={() => {
                            setActiveInvoice(b);
                            setIsInvoiceReprint(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-800 transition"
                          title="Reprint Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {isAdmin && b.status !== 'CANCELLED' && (
                          <button
                            onClick={() => setCancellingBill(b)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                            title="Cancel Bill"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Register New Patient Modal */}
      {showNewPatientModal && (
        <NewPatientInlineModal
          onClose={() => setShowNewPatientModal(false)}
          onCreate={handleCreateNewPatient}
        />
      )}

      {/* Invoice Preview Modal */}
      <InvoiceModal
        isOpen={!!activeInvoice}
        onClose={() => setActiveInvoice(null)}
        bill={activeInvoice}
        settings={settings}
        isReprint={isInvoiceReprint}
      />

      {/* Dynamic Counter UPI QR Modal */}
      {showQrPreview && (
        <UpiCounterQrModal
          isOpen={showQrPreview}
          onClose={() => setShowQrPreview(false)}
          qrDataUrl={qrCodeDataUrl}
          amount={calcSummary.grandTotal}
          labName={settings.labName}
          upiId="medilab@icici"
        />
      )}

      {/* Bill Cancellation Reason Modal */}
      {cancellingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Cancel Invoice {cancellingBill.billNumber}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Cancellation is strictly audited. Please provide a mandatory cancellation reason.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Cancellation Reason *</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Patient cancelled test, wrong investigation billed..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-inner"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setCancellingBill(null)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={!cancellationReason.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Counter Dynamic UPI QR Modal
interface UpiCounterQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrDataUrl: string;
  amount: number;
  labName: string;
  upiId: string;
}

const UpiCounterQrModal: React.FC<UpiCounterQrModalProps> = ({
  isOpen,
  onClose,
  qrDataUrl,
  amount,
  labName,
  upiId,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const link = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(labName)}&am=${amount.toFixed(2)}&cu=INR`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mb-3 shadow-md">
          <QrCode className="w-5 h-5" />
        </div>

        <h3 className="text-base font-extrabold text-white tracking-wide">{labName || 'MediLab Diagnostics'}</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">UPI Counter Direct Instant Payment</p>

        {/* Hero Amount */}
        <div className="my-3 py-2 px-5 rounded-2xl bg-slate-950 border border-teal-500/30 text-center shadow-inner">
          <div className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">Payable Amount</div>
          <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-0.5">
            {formatCurrency(amount)}
          </div>
        </div>

        {/* QR Canvas Box */}
        <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-slate-800 my-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="UPI QR Code" className="w-48 h-48 rounded-lg" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
              Generating QR...
            </div>
          )}
        </div>

        <div className="text-xs text-slate-300 font-mono mt-1">
          UPI ID: <span className="font-bold text-teal-300">{upiId}</span>
        </div>

        {/* App badges */}
        <div className="flex items-center justify-center gap-1.5 mt-2.5 text-[10px] text-slate-400 font-medium">
          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">GPay</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">PhonePe</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">Paytm</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800">BHIM</span>
        </div>

        {/* Actions */}
        <div className="w-full grid grid-cols-2 gap-2 mt-5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold transition shadow-md"
          >
            Payment Received
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline New Patient Modal
interface NewPatientInlineModalProps {
  onClose: () => void;
  onCreate: (data: CreatePatientInput) => void;
}

const NewPatientInlineModal: React.FC<NewPatientInlineModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [referralDoctor, setReferralDoctor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !age || !mobile) return;
    onCreate({
      name,
      age: parseInt(age) || 0,
      gender,
      mobile,
      address,
      referralDoctor: referralDoctor.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
          <UserPlus className="w-5 h-5 text-teal-400" />
          Quick Patient Registration
        </h3>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Patient Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Chandra"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
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
                placeholder="e.g. 42"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-teal-500 shadow-inner"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 shadow-inner"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Residential Address (Optional)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Jubilee Hills, Hyderabad"
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
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 rounded-xl shadow"
            >
              Register & Select
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
