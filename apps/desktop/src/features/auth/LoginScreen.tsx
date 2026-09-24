import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AppSettings } from '@lab/shared-types';
import {
  TestTubes,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Clock,
  HardDrive,
  Sparkles,
  Zap,
} from 'lucide-react';

interface LoginScreenProps {
  settings?: AppSettings | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ settings }) => {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<{ date: string; time: string }>({
    date: '',
    time: '',
  });

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDateTime({
        date: now.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
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
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const ok = await login(username, password);
      if (!ok) {
        setError('Invalid username or password. Please verify credentials.');
      }
    } catch {
      setError('An error occurred during authentication');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col justify-between bg-slate-950 text-slate-100 select-none overflow-y-auto relative">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header */}
      <header className="h-16 px-8 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-600 rounded-2xl blur-sm opacity-70" />
            <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-teal-500/50 flex items-center justify-center text-teal-400 overflow-hidden p-1">
              {settings?.labLogo ? (
                <img
                  src={settings.labLogo}
                  alt={settings.labName || 'Lab Logo'}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <TestTubes className="w-5 h-5 text-teal-300" />
              )}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-teal-200">
                {settings?.labName || 'MEDILAB DIAGNOSTICS'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-teal-950/80 text-teal-300 border border-teal-800/60">
                v1.0
              </span>
            </div>
            <p className="text-[11px] text-teal-400/90 font-medium">
              Offline Diagnostic Workstation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Clock */}
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-400 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>{currentDateTime.date}</span>
            <span className="text-slate-600">•</span>
            <span className="text-teal-300 font-bold">{currentDateTime.time}</span>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white transition shadow-sm"
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
        </div>
      </header>

      {/* Main Form Center Card */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md bg-slate-900/95 border border-slate-800/90 rounded-3xl p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-xs font-mono font-semibold mb-3">
              <Lock className="w-3 h-3" />
              <span>Workstation Sign In</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Sign In to Workstation
            </h2>
            <p className="text-xs text-slate-400 mt-1.5">
              Enter your laboratory credentials to access billing and management
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / Operator ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (e.g. admin)"
                  required
                  className="w-full bg-slate-950 border border-slate-700/90 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password / PIN
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full bg-slate-950 border border-slate-700/90 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-teal-950/60 transition duration-150 transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to Workstation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-10 px-8 border-t border-slate-800/80 bg-slate-900/40 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
        <div className="flex items-center gap-2">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span>Local SQLite Storage (WAL Mode)</span>
          <span>•</span>
          <span>Station ID: FRONTDESK-01</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Unified Workstation Active</span>
        </div>
      </footer>
    </div>
  );
};
