import React, { useState, useEffect, useMemo } from 'react';
import { dbService } from '../../services/db';
import { RevenueMetrics, DailyCollectionRow, ProcedureRevenueRow } from '@lab/shared-types';
import { formatCurrency } from '@lab/billing-engine';
import { CalendarPicker } from '../../components/CalendarPicker';
import {
  BarChart3,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  TrendingUp,
  Award,
  PieChart,
  ArrowUpRight,
  Wallet,
  Clock,
  Filter,
  RotateCcw,
} from 'lucide-react';

export const RevenueView: React.FC = () => {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [dailyRows, setDailyRows] = useState<DailyCollectionRow[]>([]);
  const [procedureRows, setProcedureRows] = useState<ProcedureRevenueRow[]>([]);
  const [billDates, setBillDates] = useState<string[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'procedures'>('daily');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH'>('TODAY');
  const [customDate, setCustomDate] = useState<string>('');

  useEffect(() => {
    loadRevenueData(activePreset);
  }, []);

  const loadRevenueData = async (filter?: string) => {
    const [m, d, p, dates] = await Promise.all([
      dbService.getRevenueMetrics(filter),
      dbService.getDailyCollections(7, filter),
      dbService.getProcedureRevenue(filter),
      dbService.getBillDates(),
    ]);
    setMetrics(m);
    setDailyRows(d);
    setProcedureRows(p);
    setBillDates(dates);
  };

  const handleSelectPreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH') => {
    setActivePreset(preset);
    setCustomDate('');
    loadRevenueData(preset);
  };

  const handleSelectCustomDate = (date: string) => {
    setCustomDate(date);
    if (date) {
      loadRevenueData(date);
    } else {
      loadRevenueData(activePreset);
    }
  };

  const totalColl = metrics
    ? metrics.cashCollection + metrics.upiCollection + metrics.cardCollection
    : 0;

  const cashPct = totalColl > 0 ? Math.round((metrics!.cashCollection / totalColl) * 100) : 0;
  const upiPct = totalColl > 0 ? Math.round((metrics!.upiCollection / totalColl) * 100) : 0;
  const cardPct = totalColl > 0 ? Math.round((metrics!.cardCollection / totalColl) * 100) : 0;

  const displayRevenue = customDate
    ? (metrics?.filteredRevenue ?? 0)
    : activePreset === 'TODAY'
    ? (metrics?.todayRevenue ?? 0)
    : activePreset === 'THIS_MONTH'
    ? (metrics?.monthRevenue ?? 0)
    : (metrics?.filteredRevenue ?? 0);

  const displayBillCount = customDate
    ? (metrics?.filteredBillCount ?? 0)
    : activePreset === 'TODAY'
    ? (metrics?.todayBillCount ?? 0)
    : activePreset === 'THIS_MONTH'
    ? (metrics?.monthBillCount ?? 0)
    : (metrics?.filteredBillCount ?? 0);

  const card1Title = useMemo(() => {
    if (customDate) {
      const [y, m, d] = customDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return `Billing on ${dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    if (activePreset === 'TODAY') return "Today's Total Billing";
    if (activePreset === 'YESTERDAY') return "Yesterday's Billing";
    if (activePreset === 'LAST_7_DAYS') return "Past 7 Days Billing";
    if (activePreset === 'THIS_MONTH') return "This Month's Billing";
    return "All Time Total Billing";
  }, [customDate, activePreset]);

  const filterDisplayTitle = useMemo(() => {
    if (customDate) {
      const [y, m, d] = customDate.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (activePreset === 'TODAY') return 'Today';
    if (activePreset === 'YESTERDAY') return 'Yesterday';
    if (activePreset === 'LAST_7_DAYS') return 'Last 7 Days';
    if (activePreset === 'THIS_MONTH') return 'This Month';
    return 'All Time';
  }, [customDate, activePreset]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-md">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white tracking-wide">Revenue & Cash Register Analytics</h2>
            <p className="text-xs text-slate-400 font-medium">Real-time collections, cashier shift reconciliation, and test metrics</p>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveSubTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'daily'
                ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daily Shift Logs
          </button>
          <button
            onClick={() => setActiveSubTab('procedures')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeSubTab === 'procedures'
                ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Investigation Ranking
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>Filter Period:</span>
          </span>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[
              { id: 'ALL', label: 'All Time' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  activePreset === preset.id && !customDate
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Interactive Calendar Picker */}
          <div className="flex items-center gap-1.5">
            <CalendarPicker
              selectedDate={customDate}
              onChange={handleSelectCustomDate}
              activityDates={billDates}
              placeholder="Pick Exact Date"
              title="Filter revenue analytics by specific billing date"
              showTodayButton={false}
            />
          </div>
        </div>

        {/* Active Filter Period Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium text-[11px] hidden sm:inline">Active Window:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-teal-950/70 border border-teal-800/80 text-teal-300 font-mono font-bold text-[11px] shadow-sm">
            {filterDisplayTitle}
          </span>
          {customDate && (
            <button
              onClick={() => handleSelectPreset('ALL')}
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 hover:bg-slate-800 px-2 py-0.5 rounded-lg transition"
              title="Clear date and show All Time"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-4 gap-3.5">
        {/* Selected Period's Revenue */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-md backdrop-blur-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">{card1Title}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-800 flex items-center justify-center text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-300 to-white">
              {formatCurrency(displayRevenue)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="font-bold text-teal-400">{displayBillCount}</span>
              <span>invoices generated in {filterDisplayTitle}</span>
            </div>
          </div>
        </div>

        {/* Cash In Register */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">Cash Collection</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-emerald-300">
              {metrics ? formatCurrency(metrics.cashCollection) : '₹0.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Physical cash counter ({cashPct}% of total)
            </div>
          </div>
        </div>

        {/* UPI Collection */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">UPI & QR Collections</span>
            <div className="w-7 h-7 rounded-lg bg-sky-950 border border-sky-800 flex items-center justify-center text-sky-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-sky-300">
              {metrics ? formatCurrency(metrics.upiCollection) : '₹0.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Instant digital bank transfers ({upiPct}% of total)
            </div>
          </div>
        </div>

        {/* Card Collection */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-md backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold uppercase tracking-wider text-[10px]">POS Terminal (Card)</span>
            <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold font-mono text-purple-300">
              {metrics ? formatCurrency(metrics.cardCollection) : '₹0.00'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Debit & Credit card payments ({cardPct}% of total)
            </div>
          </div>
        </div>
      </div>

      {/* Visual Payment Split Progress Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4 shadow-md backdrop-blur-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
            Collections Breakdown by Channel ({filterDisplayTitle})
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Total: {formatCurrency(totalColl)}</span>
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${cashPct}%` }}
            className="bg-emerald-500 h-full transition-all duration-500"
            title={`Cash: ${cashPct}%`}
          />
          <div
            style={{ width: `${upiPct}%` }}
            className="bg-sky-500 h-full transition-all duration-500"
            title={`UPI: ${upiPct}%`}
          />
          <div
            style={{ width: `${cardPct}%` }}
            className="bg-purple-500 h-full transition-all duration-500"
            title={`Card: ${cardPct}%`}
          />
        </div>
        <div className="flex items-center gap-6 text-[11px] pt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-300">Cash: <b className="font-mono text-white">{cashPct}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <span className="text-slate-300">UPI / QR: <b className="font-mono text-white">{upiPct}%</b></span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-slate-300">Card POS: <b className="font-mono text-white">{cardPct}%</b></span>
          </div>
        </div>
      </div>

      {/* Main Tab Table Container */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden flex flex-col min-h-0 shadow-md backdrop-blur-sm">
        {activeSubTab === 'daily' ? (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Billing Date</th>
                  <th className="py-3 px-4 text-center">Invoices Count</th>
                  <th className="py-3 px-4 text-right">Cash Collection</th>
                  <th className="py-3 px-4 text-right">UPI Collection</th>
                  <th className="py-3 px-4 text-right">Card Collection</th>
                  <th className="py-3 px-4 text-right font-extrabold text-teal-300">Net Daily Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {dailyRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-500 italic">
                      No shift records available for {filterDisplayTitle}.
                    </td>
                  </tr>
                ) : (
                  dailyRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-100">
                        {new Date(row.date).toLocaleDateString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-300">{row.billsCount}</td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                        {formatCurrency(row.cashAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-sky-400 font-medium">
                        {formatCurrency(row.upiAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-purple-400 font-medium">
                        {formatCurrency(row.cardAmount)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                        {formatCurrency(row.revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Diagnostic Investigation</th>
                  <th className="py-3 px-4 text-center">Billed Volume</th>
                  <th className="py-3 px-4 text-right font-extrabold text-teal-300">Total Billed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {procedureRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-slate-500 italic">
                      No billed procedures recorded for {filterDisplayTitle}.
                    </td>
                  </tr>
                ) : (
                  procedureRows.map((proc, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/60 transition">
                      <td className="py-3 px-4">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-300 font-mono">
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-400">{proc.procedureCode}</td>
                      <td className="py-3 px-4 font-bold text-slate-100">{proc.procedureName}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">{proc.count} tests</td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-white text-sm">
                        {formatCurrency(proc.totalRevenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
