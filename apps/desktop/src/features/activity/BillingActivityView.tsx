import React, { useState, useEffect, useMemo } from 'react';
import { dbService, matchesDateFilter } from '../../services/db';
import { Bill, AppSettings, Patient } from '@lab/shared-types';
import { formatCurrency } from '@lab/billing-engine';
import { CalendarPicker } from '../../components/CalendarPicker';
import { InvoiceModal } from '../invoice/InvoiceModal';
import { useAuth } from '../auth/AuthContext';
import {
  Receipt,
  Search,
  Printer,
  Ban,
  Eye,
  Download,
  RotateCcw,
  Plus,
  FileText,
  Clock,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldAlert,
  AlertTriangle,
  X,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Calendar as CalendarIcon,
} from 'lucide-react';

interface BillingActivityViewProps {
  settings: AppSettings;
  onStartNewBill?: () => void;
}

export const BillingActivityView: React.FC<BillingActivityViewProps> = ({
  settings,
  onStartNewBill,
}) => {
  const { user, isAdmin } = useAuth();

  const [bills, setBills] = useState<Bill[]>([]);
  const [billDates, setBillDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH'>('TODAY');
  const [customDate, setCustomDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [paymentModeFilter, setPaymentModeFilter] = useState<'ALL' | 'CASH' | 'UPI' | 'CARD'>('ALL');

  // Modal states
  const [activeReprintInvoice, setActiveReprintInvoice] = useState<Bill | null>(null);
  const [inspectedBill, setInspectedBill] = useState<Bill | null>(null);
  const [cancellingBill, setCancellingBill] = useState<Bill | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');

  const loadBills = async () => {
    setIsLoading(true);
    try {
      const [allBills, dates] = await Promise.all([
        dbService.getAllBills(),
        dbService.getBillDates(),
      ]);
      setBills(allBills);
      setBillDates(dates);
    } catch (err) {
      console.error('Failed to load billing activity:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
  }, []);

  const handleSelectPreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH') => {
    setActivePreset(preset);
    setCustomDate('');
  };

  const handleSelectCustomDate = (date: string) => {
    setCustomDate(date);
    if (date) {
      setActivePreset('ALL');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActivePreset('TODAY');
    setCustomDate('');
    setStatusFilter('ALL');
    setPaymentModeFilter('ALL');
  };

  // Filtered bills calculation
  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const effectiveDateFilter = customDate ? customDate : activePreset;

    return bills.filter((b) => {
      // Date Filter
      if (effectiveDateFilter && !matchesDateFilter(b.billDate, effectiveDateFilter)) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && b.status !== statusFilter) {
        return false;
      }

      // Payment Mode Filter
      if (paymentModeFilter !== 'ALL') {
        const hasMode = b.payments?.some((p) => p.paymentMode === paymentModeFilter);
        if (!hasMode) return false;
      }

      // Search Query
      if (q) {
        const billNum = b.billNumber.toLowerCase();
        const patName = b.patient?.name?.toLowerCase() || '';
        const patCode = b.patient?.patientCode?.toLowerCase() || '';
        const patMobile = b.patient?.mobile || '';
        const patDoctor = b.patient?.referralDoctor?.toLowerCase() || '';
        const operator = b.createdByName?.toLowerCase() || '';
        const procNames = b.items?.map((it) => it.procedureName.toLowerCase()).join(' ') || '';

        const matches =
          billNum.includes(q) ||
          patName.includes(q) ||
          patCode.includes(q) ||
          patMobile.includes(q) ||
          patDoctor.includes(q) ||
          operator.includes(q) ||
          procNames.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [bills, searchQuery, activePreset, customDate, statusFilter, paymentModeFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let activeCount = 0;
    let cancelledCount = 0;
    let cancelledAmount = 0;

    for (const b of filteredBills) {
      if (b.status === 'CANCELLED') {
        cancelledCount++;
        cancelledAmount += b.grandTotal;
      } else {
        activeCount++;
        totalRevenue += b.grandTotal;
        for (const p of b.payments || []) {
          if (p.paymentMode === 'CASH') cashTotal += p.amount;
          else if (p.paymentMode === 'UPI') upiTotal += p.amount;
          else if (p.paymentMode === 'CARD') cardTotal += p.amount;
        }
      }
    }

    return {
      totalRevenue,
      cashTotal,
      upiTotal,
      cardTotal,
      activeCount,
      cancelledCount,
      cancelledAmount,
      totalCount: filteredBills.length,
    };
  }, [filteredBills]);

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredBills.length === 0) return;

    const headers = [
      'Bill Number',
      'Bill Date',
      'Time',
      'Patient Code',
      'Patient Name',
      'Patient Age',
      'Patient Gender',
      'Patient Mobile',
      'Referral Doctor',
      'Billed Items',
      'Items Count',
      'Subtotal (INR)',
      'Discount (INR)',
      'Grand Total (INR)',
      'Payment Mode',
      'Status',
      'Billed By',
      'Cancellation Reason',
    ];

    const rows = filteredBills.map((b) => {
      const d = new Date(b.billDate);
      const dateStr = d.toLocaleDateString('en-GB');
      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const itemsList = b.items.map((i) => `${i.procedureName} (x${i.quantity})`).join('; ');
      const paymentModes = b.payments?.map((p) => p.paymentMode).join(', ') || 'CASH';

      return [
        `"${b.billNumber}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${b.patient?.patientCode || ''}"`,
        `"${b.patient?.name || ''}"`,
        `"${b.patient?.age || ''}"`,
        `"${b.patient?.gender || ''}"`,
        `"${b.patient?.mobile || ''}"`,
        `"${b.patient?.referralDoctor || ''}"`,
        `"${itemsList.replace(/"/g, '""')}"`,
        b.items.length,
        b.subtotal,
        b.discount,
        b.grandTotal,
        `"${paymentModes}"`,
        `"${b.status}"`,
        `"${b.createdByName || ''}"`,
        `"${b.cancellation?.reason?.replace(/"/g, '""') || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Billing_Activity_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initiate Bill Cancellation
  const handleInitiateCancel = (bill: Bill) => {
    setCancellingBill(bill);
    setCancellationReason('');
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingBill || !cancellationReason.trim() || !user) return;
    try {
      await dbService.cancelBill(cancellingBill.id, cancellationReason.trim(), user);
      setCancellingBill(null);
      setCancellationReason('');
      await loadBills();
    } catch (err) {
      console.error('Failed to cancel bill:', err);
      alert('Could not cancel invoice. Please verify connection.');
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* 1. Header Toolbar */}
      <div className="h-16 px-6 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Receipt className="w-5 h-5 text-teal-300" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold text-white tracking-wide">
                Billing Activity & Invoices
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-950/80 text-teal-300 border border-teal-800/60">
                {filteredBills.length} Invoices
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live transaction feed, invoice reprints, and audit logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh */}
          <button
            type="button"
            onClick={loadBills}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition shadow-sm"
            title="Reload Activity Feed"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredBills.length === 0}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition shadow-sm disabled:opacity-50"
            title="Download CSV report of filtered invoices"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export CSV</span>
          </button>

          {/* Start New Bill */}
          {onStartNewBill && (
            <button
              type="button"
              onClick={onStartNewBill}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-teal-950/50 transition duration-150 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top KPI Metrics Ribbon */}
      <div className="px-6 py-3 border-b border-slate-800/60 bg-slate-950/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 shrink-0">
        {/* Total Volume */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Billed</div>
            <div className="text-base font-extrabold text-teal-400 mt-0.5">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
              {stats.activeCount} active bills
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Receipt className="w-4 h-4" />
          </div>
        </div>

        {/* Cash Collections */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Cash Counter</div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">
              {formatCurrency(stats.cashTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Physical cash</div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Banknote className="w-4 h-4" />
          </div>
        </div>

        {/* UPI / QR Collections */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">UPI / QR Pay</div>
            <div className="text-base font-extrabold text-sky-400 mt-0.5">
              {formatCurrency(stats.upiTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Digital instant</div>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>

        {/* Card Collections */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Card / POS</div>
            <div className="text-base font-extrabold text-purple-400 mt-0.5">
              {formatCurrency(stats.cardTotal)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Debit / Credit</div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        {/* Cancelled Bills */}
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-rose-400">Cancelled / Void</div>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">
              {stats.cancelledCount} Bills
            </div>
            <div className="text-[11px] text-rose-400/80 mt-0.5 font-mono">
              {formatCurrency(stats.cancelledAmount)} voided
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Ban className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Bar */}
      <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-900/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Quick Timeframe Presets & CalendarPicker */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800/80 rounded-xl">
            {(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'THIS_MONTH', 'ALL'] as const).map((preset) => {
              const isActive = activePreset === preset && !customDate;
              const labels = {
                TODAY: 'Today',
                YESTERDAY: 'Yesterday',
                LAST_7_DAYS: '7 Days',
                THIS_MONTH: 'This Month',
                ALL: 'All Time',
              };
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          {/* Dedicated CalendarPicker Popover */}
          <CalendarPicker
            selectedDate={customDate}
            onChange={handleSelectCustomDate}
            activityDates={billDates}
          />
        </div>

        {/* Right: Search, Status, and Payment Mode */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end min-w-[320px]">
          {/* Search Box */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bill #, patient, phone, doctor, test..."
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-9 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active (Paid)</option>
            <option value="CANCELLED">Cancelled / Void</option>
          </select>

          {/* Payment Mode Filter */}
          <select
            value={paymentModeFilter}
            onChange={(e) => setPaymentModeFilter(e.target.value as any)}
            className="bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Card</option>
          </select>

          {/* Reset Filters */}
          {(searchQuery || customDate || activePreset !== 'TODAY' || statusFilter !== 'ALL' || paymentModeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg bg-slate-900 border border-slate-800 transition"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 4. Table / Feed of Invoices */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
            <RotateCcw className="w-6 h-6 animate-spin text-teal-400" />
            <span className="text-xs font-mono">Loading billing records...</span>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <Receipt className="w-10 h-10 text-slate-600 mb-2" />
            <h3 className="text-sm font-bold text-slate-300">No Billing Activities Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {searchQuery || customDate || statusFilter !== 'ALL' || paymentModeFilter !== 'ALL'
                ? 'No invoices match your selected search criteria or date filters.'
                : 'No invoices have been billed for this period yet.'}
            </p>
            <div className="flex items-center gap-3 mt-4">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Reset Filters
              </button>
              {onStartNewBill && (
                <button
                  type="button"
                  onClick={onStartNewBill}
                  className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition"
                >
                  + New Bill
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Invoice # & Status</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Investigations Billed</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4">Operator</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredBills.map((b) => {
                  const isCancelled = b.status === 'CANCELLED';
                  const billDate = new Date(b.billDate);
                  const primaryPayment = b.payments?.[0];

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isCancelled ? 'bg-rose-950/15 opacity-75' : ''
                      }`}
                    >
                      {/* 1. Invoice Number & Status */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-teal-400 text-xs">
                            {b.billNumber}
                          </span>
                        </div>
                        <div className="mt-1">
                          {isCancelled ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                              <Ban className="w-2.5 h-2.5" />
                              <span>CANCELLED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>PAID</span>
                            </span>
                          )}
                        </div>
                        {isCancelled && b.cancellation && (
                          <div className="text-[10px] text-rose-400/90 font-mono mt-1 max-w-[150px] truncate" title={b.cancellation.reason}>
                            Why: {b.cancellation.reason}
                          </div>
                        )}
                      </td>

                      {/* 2. Date & Time */}
                      <td className="py-3 px-4 align-top font-mono text-[11px] text-slate-300">
                        <div className="font-semibold text-slate-200">
                          {billDate.toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-400 flex items-center gap-1 mt-0.5 text-[10px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {billDate.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </td>

                      {/* 3. Patient Details */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{b.patient?.name || 'Walk-in Patient'}</span>
                          {b.patient?.age && (
                            <span className="text-[10px] font-normal text-slate-400">
                              ({b.patient.age}y / {b.patient.gender?.[0] || '?'})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="text-teal-400/90">{b.patient?.patientCode || ''}</span>
                          {b.patient?.mobile && <span>• {b.patient.mobile}</span>}
                        </div>
                        {b.patient?.referralDoctor && (
                          <div className="inline-block mt-1 text-[9px] font-semibold text-sky-300 bg-sky-950/60 border border-sky-800/60 px-1.5 py-0.2 rounded">
                            Ref: Dr. {b.patient.referralDoctor.replace(/^dr\.?\s*/i, '')}
                          </div>
                        )}
                      </td>

                      {/* 4. Investigations Billed */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {b.items.slice(0, 3).map((it, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 rounded px-1.5 py-0.5 truncate max-w-[140px]"
                              title={it.procedureName}
                            >
                              {it.procedureName}
                            </span>
                          ))}
                          {b.items.length > 3 && (
                            <span className="text-[9px] font-mono bg-teal-950 text-teal-300 border border-teal-800 rounded px-1.5 py-0.5">
                              +{b.items.length - 3} more
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-1">
                          {b.items.length} investigation{b.items.length > 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* 5. Payment Mode */}
                      <td className="py-3 px-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border ${
                            primaryPayment?.paymentMode === 'UPI'
                              ? 'bg-sky-950/60 text-sky-300 border-sky-800'
                              : primaryPayment?.paymentMode === 'CARD'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {primaryPayment?.paymentMode || 'CASH'}
                        </span>
                        {primaryPayment?.referenceNumber && (
                          <div className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-[90px]" title={primaryPayment.referenceNumber}>
                            Ref: {primaryPayment.referenceNumber}
                          </div>
                        )}
                      </td>

                      {/* 6. Grand Total */}
                      <td className="py-3 px-4 align-top text-right">
                        <div className={`font-mono font-extrabold text-sm ${isCancelled ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                          {formatCurrency(b.grandTotal)}
                        </div>
                        {b.discount > 0 && (
                          <div className="text-[10px] text-amber-400 font-mono">
                            Disc: -{formatCurrency(b.discount)}
                          </div>
                        )}
                      </td>

                      {/* 7. Operator */}
                      <td className="py-3 px-4 align-top">
                        <div className="text-[11px] text-slate-300 font-medium truncate max-w-[110px]">
                          {b.createdByName || 'Front Desk'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">Operator</div>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3 px-4 align-top text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Reprint Bill */}
                          <button
                            type="button"
                            onClick={() => setActiveReprintInvoice(b)}
                            className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-800 rounded-lg transition"
                            title="Reprint Bill (A4 / Thermal)"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Inspect Bill Details */}
                          <button
                            type="button"
                            onClick={() => setInspectedBill(b)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition"
                            title="View Itemized Breakdown"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Cancel Bill (If Active) */}
                          {!isCancelled && (
                            <button
                              type="button"
                              onClick={() => handleInitiateCancel(b)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                              title="Cancel / Void Invoice"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Invoice Reprint Modal (Thermal / A4) */}
      {activeReprintInvoice && (
        <InvoiceModal
          isOpen={!!activeReprintInvoice}
          onClose={() => setActiveReprintInvoice(null)}
          bill={activeReprintInvoice}
          settings={settings}
          isReprint={true}
        />
      )}

      {/* MODAL 2: Bill Itemized Inspection Drawer / Modal */}
      {inspectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white font-mono">
                      {inspectedBill.billNumber}
                    </h3>
                    {inspectedBill.status === 'CANCELLED' ? (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                        CANCELLED
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                        PAID
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Itemized Diagnostics Breakdown
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedBill(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              {/* Demographics Card */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Patient</span>
                  <div className="font-bold text-slate-100">{inspectedBill.patient?.name}</div>
                  <div className="text-[11px] font-mono text-teal-400">
                    {inspectedBill.patient?.patientCode} • {inspectedBill.patient?.mobile}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Doctor & Timestamp</span>
                  <div className="text-slate-200">
                    {inspectedBill.patient?.referralDoctor ? `Ref: Dr. ${inspectedBill.patient.referralDoctor}` : 'Self / Direct'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {new Date(inspectedBill.billDate).toLocaleString('en-GB')}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-[10px] uppercase font-mono text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Test Name</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Rate</th>
                      <th className="py-2.5 px-3 text-right">Disc</th>
                      <th className="py-2.5 px-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {inspectedBill.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-200">{it.procedureName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{it.procedureCode}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(it.rate)}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                          {it.discount > 0 ? `-${formatCurrency(it.discount)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                          {formatCurrency(it.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Settlement Summary */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal Gross:</span>
                  <span>{formatCurrency(inspectedBill.subtotal)}</span>
                </div>
                {inspectedBill.discount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Discount Applied:</span>
                    <span>-{formatCurrency(inspectedBill.discount)}</span>
                  </div>
                )}
                {inspectedBill.tax > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Taxes:</span>
                    <span>{formatCurrency(inspectedBill.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-slate-800">
                  <span>Grand Total Net:</span>
                  <span className="text-teal-400">{formatCurrency(inspectedBill.grandTotal)}</span>
                </div>
              </div>

              {/* Cancellation Audit Box (if cancelled) */}
              {inspectedBill.status === 'CANCELLED' && inspectedBill.cancellation && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/60 text-xs">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancellation Audit Trail</span>
                  </div>
                  <p className="text-rose-200 mt-1">
                    <strong className="text-rose-300">Reason:</strong> {inspectedBill.cancellation.reason}
                  </p>
                  <p className="text-[11px] text-rose-400/80 mt-0.5 font-mono">
                    Cancelled by {inspectedBill.cancellation.cancelledByName} on{' '}
                    {new Date(inspectedBill.cancellation.cancelledAt).toLocaleString('en-GB')}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setActiveReprintInvoice(inspectedBill);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Reprint Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectedBill(null)}
                className="px-4 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Bill Cancellation Reason Dialog */}
      {cancellingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Cancel Invoice {cancellingBill.billNumber}
            </h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Cancellation is irreversible and audited. Please provide a mandatory cancellation reason.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cancellation Reason *
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Patient cancelled test, incorrect investigation billed, duplicate entry..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-inner"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCancellingBill(null);
                  setCancellationReason('');
                }}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl"
              >
                Keep Active
              </button>
              <button
                type="button"
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
