import React, { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  TestTubes,
  LogOut,
  Clock,
  User,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings';
  onTabChange?: (tab: 'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings') => void;
  labName: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  labName,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentDateTime, setCurrentDateTime] = useState<{ date: string; time: string }>({ date: '', time: '' });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime({
        date: now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }),
        time: now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      });
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const tabLabels: Record<'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings', string> = {
    billing: 'Billing Desk (F2)',
    activity: 'Billing Activity (F8)',
    patients: 'Patient Registry (F4)',
    procedures: 'Diagnostic Tests (F6)',
    revenue: 'Revenue & Analytics',
    settings: 'System Settings',
  };

  return (
    <>
      <header className="h-16 border-b border-slate-800/80 bg-slate-950 px-5 flex items-center justify-between select-none shadow-xl relative z-30">
        {/* Left: Brand Identity & Active Module */}
        <div className="flex items-center gap-5">
          {/* Brand Identity with Glowing Medical Icon */}
          <div
            className="flex items-center gap-3.5 group cursor-pointer"
            onClick={() => onTabChange && onTabChange('billing')}
            title="Return to Billing Desk (F2)"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 rounded-2xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300" />
              <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-teal-500/50 flex items-center justify-center text-teal-400 shadow-inner">
                <TestTubes className="w-5 h-5 text-teal-300 transform group-hover:scale-110 transition duration-200" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-teal-200">
                  {labName || 'MEDILAB DIAGNOSTICS'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-teal-950/80 text-teal-300 border border-teal-800/60 shadow-sm">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-teal-400/90 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Offline Diagnostic Workstation</span>
              </p>
            </div>
          </div>

          {/* Active Module Indicator Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs shadow-inner">
            <span className="text-slate-400 font-medium">Module:</span>
            <span className="text-teal-300 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              {tabLabels[currentTab]}
            </span>
          </div>
        </div>

        {/* Right: Telemetry, Live Clock & Operator Profile */}
        <div className="flex items-center gap-3">
          {/* Live Date & Digital Clock */}
          <div className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800/90 text-xs font-mono text-slate-300 shadow-inner">
            <span className="text-[11px] text-slate-400 font-sans font-medium">{currentDateTime.date}</span>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-teal-300 font-semibold">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{currentDateTime.time || '10:00:00 AM'}</span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-semibold shadow-sm hover:scale-105 active:scale-95 bg-slate-900/90 border-slate-800/90 text-slate-300 hover:text-white group"
            title={theme === 'dark' ? 'Switch to Light Clinic Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition duration-300" />
                <span className="text-[11px] font-medium">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400 group-hover:-rotate-12 transition duration-300" />
                <span className="text-[11px] font-medium">Dark Mode</span>
              </>
            )}
          </button>

          {/* Operator Chip with Quick Switcher */}
          {/* Operator Status Chip & Sign Out */}
          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 text-slate-200 text-xs border border-slate-700/80 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 animate-pulse" />
              <div className="text-left leading-tight">
                <div className="font-bold text-slate-100">
                  {user?.fullName || 'Laboratory Operator'}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono font-semibold uppercase tracking-wider">
                  WORKSTATION ACTIVE
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out of Workstation"
              className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition border border-transparent hover:border-rose-900/60 text-xs font-semibold group shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
