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
  logoUrl?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  labName,
  logoUrl,
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
    billing: 'Billing Desk',
    activity: 'Billing Activity',
    patients: 'Patient Registry',
    procedures: 'Diagnostic Tests',
    revenue: 'Revenue & Analytics',
    settings: 'System Settings',
  };

  return (
    <>
      <header className="h-14 border-b border-slate-800/80 bg-slate-950 px-5 flex items-center justify-between select-none shadow-md relative z-30">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onTabChange && onTabChange('billing')}
            title="Billing Desk"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-teal-500/40 flex items-center justify-center text-teal-400 shadow-sm transition group-hover:border-teal-400 overflow-hidden p-1">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={labName || 'Lab Logo'}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <TestTubes className="w-4 h-4 text-teal-300" />
              )}
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-wide text-white">
                {labName || 'MEDILAB DIAGNOSTICS'}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Live Clock, Theme Toggle & Operator Profile */}
        <div className="flex items-center gap-3">
          {/* Live Date & Digital Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs font-mono text-slate-300">
            <span className="text-[11px] text-slate-400 font-sans">{currentDateTime.date}</span>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5 text-teal-300 font-medium">
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>{currentDateTime.time || '10:00:00 AM'}</span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-xs font-medium bg-slate-900/90 border-slate-800/90 text-slate-300 hover:text-white"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px]">Dark</span>
              </>
            )}
          </button>

          {/* Operator Status Chip & Sign Out */}
          <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 text-slate-200 text-xs border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              <span className="font-semibold text-slate-200 text-xs">
                {user?.fullName || 'Laboratory Operator'}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 px-2.5 py-1 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-900 transition border border-transparent hover:border-rose-900/40 text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
