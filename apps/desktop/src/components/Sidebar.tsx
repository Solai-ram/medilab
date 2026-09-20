import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import {
  FileText,
  Receipt,
  Users,
  TestTubes,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  currentTab: 'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings';
  onTabChange: (tab: 'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  currentTab,
  onTabChange,
}) => {
  const { user } = useAuth();

  const handleTabClick = (tab: 'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings') => {
    onTabChange(tab);
  };

  const navItems = [
    {
      id: 'billing' as const,
      label: 'Billing Desk',
      sublabel: 'Counter POS & Checkout',
      icon: FileText,
      shortcut: 'F2',
      section: 'MAIN WORKFLOW',
    },
    {
      id: 'activity' as const,
      label: 'Billing Activity',
      sublabel: 'Invoices & Daily Logs',
      icon: Receipt,
      shortcut: 'F8',
      section: 'MAIN WORKFLOW',
    },
    {
      id: 'patients' as const,
      label: 'Patient Registry',
      sublabel: 'Profiles & Visit History',
      icon: Users,
      shortcut: 'F4',
      section: 'MAIN WORKFLOW',
    },
    {
      id: 'procedures' as const,
      label: 'Diagnostic Tests',
      sublabel: 'Test Master & Catalogs',
      icon: TestTubes,
      shortcut: 'F6',
      section: 'MAIN WORKFLOW',
    },
    {
      id: 'revenue' as const,
      label: 'Revenue Analytics',
      sublabel: 'Collections & Summaries',
      icon: BarChart3,
      shortcut: null,
      section: 'MANAGEMENT',
    },
    {
      id: 'settings' as const,
      label: 'System Settings',
      sublabel: 'Clinic Header & Numbering',
      icon: Settings,
      shortcut: null,
      section: 'MANAGEMENT',
    },
  ];

  return (
    <>
      <aside
        className={`sidebar-panel flex flex-col shrink-0 bg-slate-950/95 border-r border-slate-800/90 text-slate-200 transition-all duration-300 ease-in-out relative z-20 select-none shadow-2xl ${
          isOpen ? 'w-64' : 'w-16'
        }`}
        style={{ willChange: 'width' }}
      >
        {/* Top Header of Sidebar */}
        <div className="h-16 px-3 border-b border-slate-800/80 flex items-center bg-slate-950/90 shrink-0">
          {isOpen ? (
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                    Menu
                  </div>
                  <div className="text-[10px] text-teal-400/90 font-mono">Navigation</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition group"
                title="Collapse Sidebar (Ctrl+B)"
              >
                <PanelLeftClose className="w-4 h-4 group-hover:scale-110 transition duration-150 text-slate-400 group-hover:text-teal-400" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className="w-10 h-10 mx-auto rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-teal-400 hover:text-teal-300 flex items-center justify-center transition-all duration-150 group shadow-sm"
              title="Expand Sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition duration-150" />
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-3">
          {isOpen ? (
            /* Expanded Full Navigation */
            <>
              {/* Core Workflow Section */}
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Core Workflow
                </div>
                <div className="space-y-1">
                  {navItems
                    .filter((item) => item.section === 'MAIN WORKFLOW')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`w-full group flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 ${
                            isActive
                              ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/60 ring-1 ring-teal-400/40'
                              : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent hover:border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg transition ${
                                isActive
                                  ? 'bg-teal-700/60 text-white'
                                  : 'bg-slate-900 text-teal-400 group-hover:bg-slate-800'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold leading-tight truncate">
                                {item.label}
                              </div>
                              <div
                                className={`text-[10px] leading-tight truncate ${
                                  isActive ? 'text-teal-100/90' : 'text-slate-400'
                                }`}
                              >
                                {item.sublabel}
                              </div>
                            </div>
                          </div>

                          {item.shortcut && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold transition ${
                                isActive
                                  ? 'bg-teal-700/80 text-white'
                                  : 'bg-slate-900 text-slate-400 group-hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              {item.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Management Section */}
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                  Management & Reports
                </div>
                <div className="space-y-1">
                  {navItems
                    .filter((item) => item.section === 'MANAGEMENT')
                    .map((item) => {
                      const Icon = item.icon;
                      const isActive = currentTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleTabClick(item.id)}
                          className={`w-full group flex items-center justify-between p-2.5 rounded-xl text-left transition-all duration-150 ${
                            isActive
                              ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/60 ring-1 ring-teal-400/40'
                              : 'text-slate-300 hover:text-white hover:bg-slate-900/80 border border-transparent hover:border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg transition ${
                                isActive
                                  ? 'bg-teal-700/60 text-white'
                                  : 'bg-slate-900 text-teal-400 group-hover:bg-slate-800'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold leading-tight truncate">
                                {item.label}
                              </div>
                              <div
                                className={`text-[10px] leading-tight truncate ${
                                  isActive ? 'text-teal-100/90' : 'text-slate-400'
                                }`}
                              >
                                {item.sublabel}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            /* Collapsed Icon Rail */
            <div className="flex flex-col items-center space-y-2">
              {navItems
                .filter((item) => item.section === 'MAIN WORKFLOW')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/60 ring-1 ring-teal-400/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
                      }`}
                      title={`${item.label} (${item.shortcut}) - ${item.sublabel}`}
                    >
                      <Icon className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" />
                    </button>
                  );
                })}

              {/* Minimal Divider between Workflow and Management */}
              <div className="w-6 h-px bg-slate-800 my-2" />

              {navItems
                .filter((item) => item.section === 'MANAGEMENT')
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 relative group ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md shadow-teal-950/60 ring-1 ring-teal-400/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
                      }`}
                      title={`${item.label} - ${item.sublabel}`}
                    >
                      <Icon className="w-5 h-5 transition-transform duration-150 group-hover:scale-110" />
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Sidebar Bottom Operator Status */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0">
          {isOpen ? (
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                <div className="min-w-0 truncate">
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {user?.fullName || 'Laboratory Operator'}
                  </div>
                  <div className="text-[10px] text-teal-400/90 font-mono uppercase">
                    WORKSTATION ACTIVE
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border text-emerald-400 bg-emerald-950/60 border-emerald-800/60">
                ONLINE
              </div>
            </div>
          ) : (
            <div
              className="w-10 h-10 mx-auto rounded-xl bg-slate-900/90 border border-slate-800/90 flex items-center justify-center cursor-default"
              title={`${user?.fullName || 'Laboratory Operator'} - ONLINE`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
