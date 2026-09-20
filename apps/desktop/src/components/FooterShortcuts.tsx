import React from 'react';
import { Keyboard, Cpu, HardDrive, Zap } from 'lucide-react';

export const FooterShortcuts: React.FC = () => {
  return (
    <footer className="h-9 border-t border-slate-800/80 bg-slate-950 px-5 flex items-center justify-between text-xs text-slate-400 select-none shadow-inner relative z-20">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5 text-teal-400 font-bold uppercase tracking-wider text-[10px]">
          <Keyboard className="w-3.5 h-3.5" />
          <span>Shortcuts:</span>
        </div>
        <div className="flex items-center gap-3.5 font-mono text-[11px]">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-teal-300 font-bold shadow-sm">F2</kbd>
            <span className="text-slate-300">New Bill</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-teal-300 font-bold shadow-sm">F4</kbd>
            <span className="text-slate-300">Patient Search</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-teal-300 font-bold shadow-sm">F6</kbd>
            <span className="text-slate-300">Test Search</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-teal-300 font-bold shadow-sm">F8</kbd>
            <span className="text-slate-300">Activity</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-emerald-300 font-bold shadow-sm">Ctrl + S</kbd>
            <span className="text-slate-300">Save</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-emerald-300 font-bold shadow-sm">Ctrl + P</kbd>
            <span className="text-slate-300">Print</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded-md text-slate-400 font-bold shadow-sm">Esc</kbd>
            <span className="text-slate-400">Close</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          <span>Local SQLite (WAL)</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-medium font-mono text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Response: 0.1ms</span>
        </div>
      </div>
    </footer>
  );
};
