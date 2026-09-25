import React, { useState, useEffect } from 'react';
import { dbService, isLicenseActive } from './services/db';
import { AppSettings, Patient, LicenseState } from '@lab/shared-types';
import { useAuth } from './features/auth/AuthContext';
import { LoginScreen } from './features/auth/LoginScreen';
import { FirstRunPasswordScreen } from './features/auth/FirstRunPasswordScreen';
import { LicenseActivationScreen } from './features/auth/LicenseActivationScreen';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BillingView } from './features/billing/BillingView';
import { BillingActivityView } from './features/activity/BillingActivityView';
import { PatientsView } from './features/patients/PatientsView';
import { ProceduresView } from './features/procedures/ProceduresView';
import { RevenueView } from './features/revenue/RevenueView';
import { SettingsView } from './features/settings/SettingsView';

export const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'billing' | 'activity' | 'patients' | 'procedures' | 'revenue' | 'settings'>('billing');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('medilab-sidebar-open');
    return saved !== null ? saved === 'true' : true;
  });
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [license, setLicense] = useState<LicenseState | null>(null);
  const [isLicenseLoading, setIsLicenseLoading] = useState(true);
  const [selectedPatientForBilling, setSelectedPatientForBilling] = useState<Patient | null>(null);

  useEffect(() => {
    Promise.all([
      dbService.getSettings(),
      dbService.getLicenseState(),
    ]).then(([s, lic]) => {
      setSettings(s);
      setLicense(lic);
      setIsLicenseLoading(false);
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('medilab-sidebar-open', String(isSidebarOpen));
  }, [isSidebarOpen]);

  if (!settings || isAuthLoading || isLicenseLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-teal-400 font-mono text-sm">
        Initializing MediLab Billing System...
      </div>
    );
  }

  // 1. Commercial License Gate — Mandatory before login, patients, and billing
  if (!isLicenseActive(license)) {
    return (
      <LicenseActivationScreen
        currentLicense={license}
        onActivated={(newLic) => setLicense(newLic)}
      />
    );
  }

  // 2. Workstation Lock Screen if not signed in
  if (!user) {
    return <LoginScreen settings={settings} />;
  }

  // 3. Force first-run password setup if administrator password is still default seed
  if (user.mustChangePassword) {
    return <FirstRunPasswordScreen />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        labName={settings.labName}
        logoUrl={settings.labLogo}
      />

      {/* Body Container: Collapsible Sidebar + Active Module View */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          currentTab={currentTab}
          onTabChange={setCurrentTab}
        />

        {/* Main View Container */}
        <main className="flex-1 min-h-0 overflow-hidden relative">
          {currentTab === 'billing' && (
            <BillingView
              settings={settings}
              initialPatient={selectedPatientForBilling}
              onViewAllActivity={() => setCurrentTab('activity')}
            />
          )}
          {currentTab === 'activity' && (
            <BillingActivityView
              settings={settings}
              onStartNewBill={() => setCurrentTab('billing')}
            />
          )}
          {currentTab === 'patients' && (
            <PatientsView
              onStartBill={(pat) => {
                setSelectedPatientForBilling(pat);
                setCurrentTab('billing');
              }}
            />
          )}
          {currentTab === 'procedures' && <ProceduresView />}
          {currentTab === 'revenue' && <RevenueView />}
          {currentTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSettingsUpdated={(updated) => setSettings(updated)}
            />
          )}
        </main>
      </div>
    </div>
  );
};


