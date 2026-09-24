import {
  User,
  SessionUser,
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
  Procedure,
  ProcedureCategory,
  CreateProcedureInput,
  Bill,
  CreateBillInput,
  BillCancellation,
  AppSettings,
  QuickTestConfig,
  RevenueMetrics,
  DailyCollectionRow,
  ProcedureRevenueRow,
  LicenseState,
} from '@lab/shared-types';
import { calculateBillSummary, formatBillNumber } from '@lab/billing-engine';
import { activateOnlineLicense, getDeviceFingerprint } from './licenseBridge';

// Helper to detect if running inside Tauri runtime
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// =========================================================
// INITIAL MOCK DATA (mirrors database/migrations/002_seed_data.sql)
// =========================================================
const INITIAL_USERS: User[] = [
  {
    id: 'usr_admin_01',
    username: 'admin',
    fullName: 'Laboratory Operator',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  },
];

const INITIAL_CATEGORIES: ProcedureCategory[] = [
  { id: 'cat_hematology', name: 'Hematology', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat_biochemistry', name: 'Biochemistry', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat_pathology', name: 'Clinical Pathology', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat_hormones', name: 'Hormones & Immunoassays', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat_serology', name: 'Serology & Immunology', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const INITIAL_PROCEDURES: Procedure[] = [
  { id: 'proc_cbc', code: 'CBC001', name: 'Complete Blood Count (CBC)', categoryId: 'cat_hematology', categoryName: 'Hematology', sampleType: 'EDTA Whole Blood', department: 'Hematology', price: 350, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_esr', code: 'ESR001', name: 'Erythrocyte Sedimentation Rate (ESR)', categoryId: 'cat_hematology', categoryName: 'Hematology', sampleType: 'Sodium Citrate Blood', department: 'Hematology', price: 100, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_lft', code: 'LFT001', name: 'Liver Function Test (LFT)', categoryId: 'cat_biochemistry', categoryName: 'Biochemistry', sampleType: 'Serum', department: 'Biochemistry', price: 650, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_kft', code: 'KFT001', name: 'Kidney Function Test (KFT / RFT)', categoryId: 'cat_biochemistry', categoryName: 'Biochemistry', sampleType: 'Serum', department: 'Biochemistry', price: 600, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_lipid', code: 'LIP001', name: 'Lipid Profile', categoryId: 'cat_biochemistry', categoryName: 'Biochemistry', sampleType: 'Serum Fasting', department: 'Biochemistry', price: 550, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_fbs', code: 'GLU001', name: 'Fasting Blood Sugar (FBS)', categoryId: 'cat_biochemistry', categoryName: 'Biochemistry', sampleType: 'Fluoride Plasma', department: 'Biochemistry', price: 80, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_ppbs', code: 'GLU002', name: 'Post Prandial Blood Sugar (PPBS)', categoryId: 'cat_biochemistry', categoryName: 'Biochemistry', sampleType: 'Fluoride Plasma', department: 'Biochemistry', price: 80, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_hba1c', code: 'HBA001', name: 'Glycated Hemoglobin (HbA1c)', categoryId: 'cat_biochemistry', categoryName: 'Biochemistry', sampleType: 'EDTA Whole Blood', department: 'Biochemistry', price: 450, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_tsh', code: 'TSH001', name: 'Thyroid Stimulating Hormone (TSH)', categoryId: 'cat_hormones', categoryName: 'Hormones & Immunoassays', sampleType: 'Serum', department: 'Hormones', price: 300, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_tft', code: 'TFT001', name: 'Total Thyroid Profile (T3, T4, TSH)', categoryId: 'cat_hormones', categoryName: 'Hormones & Immunoassays', sampleType: 'Serum', department: 'Hormones', price: 600, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_urine', code: 'URN001', name: 'Urine Routine & Microscopic', categoryId: 'cat_pathology', categoryName: 'Clinical Pathology', sampleType: 'Clean Catch Urine', department: 'Clinical Pathology', price: 150, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'proc_widal', code: 'WID001', name: 'Widal Slide Agglutination', categoryId: 'cat_serology', categoryName: 'Serology & Immunology', sampleType: 'Serum', department: 'Serology', price: 180, status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

const INITIAL_PATIENTS: Patient[] = [
  { id: 'pat_001', patientCode: 'P000001', name: 'Raj Kumar', age: 38, gender: 'MALE', mobile: '9848022338', address: 'Plot 42, Jubilee Hills, Hyderabad', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'pat_002', patientCode: 'P000002', name: 'Sunita Sharma', age: 29, gender: 'FEMALE', mobile: '9988776655', address: 'Flat 301, Lakeview Apts, Bangalore', createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), updatedAt: new Date().toISOString() },
  { id: 'pat_003', patientCode: 'P000003', name: 'Venkatesh Rao', age: 52, gender: 'MALE', mobile: '9123456780', address: 'H.No 12-4-88, Gandhi Nagar, Vijayawada', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString() },
];

export const DEFAULT_QUICK_TESTS: QuickTestConfig[] = [
  { code: 'CBC001', label: 'CBC', color: 'purple' },
  { code: 'LFT001', label: 'LFT', color: 'rose' },
  { code: 'KFT001', label: 'KFT / RFT', color: 'rose' },
  { code: 'LIP001', label: 'Lipid Profile', color: 'amber' },
  { code: 'TSH001', label: 'TSH', color: 'teal' },
  { code: 'GLU001', label: 'FBS Sugar', color: 'slate' },
  { code: 'HBA001', label: 'HbA1c', color: 'purple' },
  { code: 'URN001', label: 'Urine Routine', color: 'blue' },
];

export const QUICK_COLOR_OPTIONS = [
  { id: 'purple', label: 'EDTA Purple', className: 'bg-purple-950/70 border-purple-800 text-purple-300 hover:border-purple-600', dotColor: '#a855f7' },
  { id: 'rose', label: 'Serum Red', className: 'bg-rose-950/70 border-rose-800 text-rose-300 hover:border-rose-600', dotColor: '#ef4444' },
  { id: 'amber', label: 'Amber Yellow', className: 'bg-amber-950/70 border-amber-800 text-amber-300 hover:border-amber-600', dotColor: '#f59e0b' },
  { id: 'teal', label: 'Teal Hormones', className: 'bg-teal-950/70 border-teal-800 text-teal-300 hover:border-teal-600', dotColor: '#14b8a6' },
  { id: 'slate', label: 'Fluoride Slate', className: 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500', dotColor: '#94a3b8' },
  { id: 'blue', label: 'Pathology Blue', className: 'bg-blue-950/70 border-blue-800 text-blue-300 hover:border-blue-600', dotColor: '#38bdf8' },
  { id: 'emerald', label: 'Emerald Green', className: 'bg-emerald-950/70 border-emerald-800 text-emerald-300 hover:border-emerald-600', dotColor: '#10b981' },
];

export const getQuickTagClass = (colorId?: string): string => {
  const match = QUICK_COLOR_OPTIONS.find((c) => c.id === colorId);
  return match ? match.className : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500';
};

const INITIAL_SETTINGS: AppSettings = {
  labName: 'MEDILAB DIAGNOSTIC CENTER',
  labTagline: 'Accuracy in Every Diagnosis',
  labAddress: '104 Healthcare Boulevard, City Hospital Road, Metro City - 500001',
  labPhone: '+91 98765 43210 / 040-23456789',
  labEmail: 'contact@medilabdiagnostics.com',
  labGstin: '36AAAAA0000A1Z5',
  labTimings: 'Mon - Sat: 7:00 AM - 9:00 PM | Sun: 7:00 AM - 1:00 PM',
  labLogo: '',
  invoicePrefix: 'LAB',
  invoiceFy: '2026-27',
  invoiceSequence: 104,
  invoiceFooter: 'Thank you for choosing MediLab. Fasting results are for reference only. Please correlate clinically.',
  thermalPrinterName: 'Default 80mm Thermal',
  a4PrinterName: 'Default Laser Printer',
  autoBackupEnabled: true,
  backupIntervalDays: 1,
  signatoryLabel: 'Authorized Signatory',
  signatoryDesignation: 'Pathologist / Lab In-Charge',
  signatoryName: '',
  quickTests: DEFAULT_QUICK_TESTS,
};

// =========================================================
// IN-MEMORY STORAGE STATE (with LocalStorage persistence)
// =========================================================
class StorageState {
  users: User[] = INITIAL_USERS;
  categories: ProcedureCategory[] = INITIAL_CATEGORIES;
  procedures: Procedure[] = INITIAL_PROCEDURES;
  patients: Patient[] = INITIAL_PATIENTS;
  bills: Bill[] = [];
  settings: AppSettings = INITIAL_SETTINGS;
  license: LicenseState = {
    isActivated: true,
    licenseKey: 'LAB-2026-PRO1-9821',
    customerName: 'MediLab Diagnostic Center',
    plan: 'ANNUAL',
    status: 'ACTIVE',
    expiresAt: new Date(Date.now() + 86400000 * 320).toISOString(),
    offlineGraceUntil: new Date(Date.now() + 86400000 * 60).toISOString(),
    deviceFingerprint: 'SHA256:7e8b91a2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    deviceName: 'LAB-FRONTDESK-01 (Win11)',
    lastValidatedAt: new Date().toISOString(),
  };

  constructor() {
    this.loadFromStorage();
    if (this.bills.length === 0) {
      this.seedInitialBills();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('LAB_BILLING_STATE_V1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.patients) this.patients = parsed.patients;
        if (parsed.procedures) this.procedures = parsed.procedures;
        if (parsed.categories) this.categories = parsed.categories;
        if (parsed.bills) this.bills = parsed.bills;
        if (parsed.settings) {
          this.settings = {
            ...INITIAL_SETTINGS,
            ...parsed.settings,
            signatoryLabel: parsed.settings.signatoryLabel || 'Authorized Signatory',
            signatoryDesignation: parsed.settings.signatoryDesignation || 'Pathologist / Lab In-Charge',
            quickTests: parsed.settings.quickTests && parsed.settings.quickTests.length > 0
              ? parsed.settings.quickTests
              : DEFAULT_QUICK_TESTS,
          };
        }
        if (parsed.license) this.license = parsed.license;
      }
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
    }
  }

  saveToStorage() {
    try {
      localStorage.setItem(
        'LAB_BILLING_STATE_V1',
        JSON.stringify({
          patients: this.patients,
          procedures: this.procedures,
          categories: this.categories,
          bills: this.bills,
          settings: this.settings,
          license: this.license,
        })
      );
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
  }

  private seedInitialBills() {
    const p1 = this.patients[0];
    const proc1 = this.procedures[0]; // CBC
    const proc2 = this.procedures[2]; // LFT
    const calc = calculateBillSummary([
      { quantity: 1, rate: proc1.price, discount: 0 },
      { quantity: 1, rate: proc2.price, discount: 50 },
    ], 0, 0);

    const seededBill: Bill = {
      id: 'bill_001',
      billNumber: 'LAB-2026-000101',
      patientId: p1.id,
      patient: p1,
      billDate: new Date(Date.now() - 3600000 * 5).toISOString(),
      subtotal: calc.subtotal,
      discount: calc.totalDiscount,
      tax: calc.taxAmount,
      roundOff: calc.roundOff,
      grandTotal: calc.grandTotal,
      paymentStatus: 'PAID',
      status: 'ACTIVE',
      createdBy: 'usr_cashier_01',
      createdByName: 'Front Desk Cashier',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      items: [
        {
          procedureId: proc1.id,
          procedureCode: proc1.code,
          procedureName: proc1.name,
          quantity: 1,
          rate: proc1.price,
          discount: 0,
          amount: proc1.price,
        },
        {
          procedureId: proc2.id,
          procedureCode: proc2.code,
          procedureName: proc2.name,
          quantity: 1,
          rate: proc2.price,
          discount: 50,
          amount: proc2.price - 50,
        },
      ],
      payments: [
        {
          paymentMode: 'UPI',
          amount: calc.grandTotal,
          referenceNumber: 'UPI/6253419082/SBI',
          paidAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          createdBy: 'usr_cashier_01',
        },
      ],
    };

    const p2 = this.patients[1];
    const proc3 = this.procedures[8]; // TSH
    const calc2 = calculateBillSummary([{ quantity: 1, rate: proc3.price, discount: 0 }], 0, 0);

    const seededBill2: Bill = {
      id: 'bill_002',
      billNumber: 'LAB-2026-000102',
      patientId: p2.id,
      patient: p2,
      billDate: new Date(Date.now() - 3600000 * 2).toISOString(),
      subtotal: calc2.subtotal,
      discount: calc2.totalDiscount,
      tax: calc2.taxAmount,
      roundOff: calc2.roundOff,
      grandTotal: calc2.grandTotal,
      paymentStatus: 'PAID',
      status: 'ACTIVE',
      createdBy: 'usr_admin_01',
      createdByName: 'System Administrator',
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      items: [
        {
          procedureId: proc3.id,
          procedureCode: proc3.code,
          procedureName: proc3.name,
          quantity: 1,
          rate: proc3.price,
          discount: 0,
          amount: proc3.price,
        },
      ],
      payments: [
        {
          paymentMode: 'CASH',
          amount: calc2.grandTotal,
          paidAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          createdBy: 'usr_admin_01',
        },
      ],
    };

    this.bills = [seededBill, seededBill2];
    this.saveToStorage();
  }
}

const state = new StorageState();

export function matchesDateFilter(billDateIso: string, filter?: string): boolean {
  if (!filter || filter === 'ALL') return true;
  const dStr = billDateIso.slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (filter === 'TODAY') {
    return dStr === today;
  }
  if (filter === 'YESTERDAY') {
    const yest = new Date(Date.now() - 86400000);
    const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    return dStr === yestStr;
  }
  if (filter === 'LAST_7_DAYS') {
    const sevenDaysAgo = new Date(Date.now() - 86400000 * 7);
    const sevenStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
    return dStr >= sevenStr && dStr <= today;
  }
  if (filter === 'THIS_MONTH') {
    const monthPrefix = today.slice(0, 7);
    return dStr.startsWith(monthPrefix);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filter)) {
    return dStr === filter;
  }
  return true;
}

// =========================================================
// DATABASE SERVICE API (Offline-first / Tauri Bridge)
// =========================================================
export const dbService = {
  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------
  async login(username: string, passwordHashOrPlain: string): Promise<SessionUser | null> {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (passwordHashOrPlain || '').trim().toLowerCase();

    // Single unified login check: accept 'admin', 'operator', 'medilab', or 'cashier'
    const valid =
      (cleanUser === 'admin' || cleanUser === 'operator' || cleanUser === 'medilab' || cleanUser === 'cashier') &&
      (cleanPass === 'admin123' || cleanPass === 'admin' || cleanPass === 'medilab' || cleanPass === 'cashier123');

    if (!valid) return null;

    const user = state.users[0] || INITIAL_USERS[0];
    user.lastLoginAt = new Date().toISOString();
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName || 'Laboratory Operator',
      role: 'ADMIN',
      token: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  },

  // -------------------------------------------------------
  // PATIENTS
  // -------------------------------------------------------
  async getPatients(): Promise<Patient[]> {
    return [...state.patients].reverse();
  },

  async searchPatients(query: string): Promise<Patient[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [...state.patients].reverse();
    return state.patients.filter((p) => {
      const codeMatch = p.patientCode.toLowerCase().includes(q);
      const nameMatch = p.name.toLowerCase().includes(q);
      const mobileMatch = p.mobile.includes(q);
      const refMatch = p.referralDoctor ? p.referralDoctor.toLowerCase().includes(q) : false;
      const dateRawMatch = p.createdAt ? p.createdAt.toLowerCase().includes(q) : false;
      const dateLocalMatch = p.createdAt ? new Date(p.createdAt).toLocaleDateString().toLowerCase().includes(q) : false;
      return codeMatch || nameMatch || mobileMatch || refMatch || dateRawMatch || dateLocalMatch;
    });
  },

  async createPatient(input: CreatePatientInput): Promise<Patient> {
    const seq = state.patients.length + 1;
    const patientCode = `P${String(seq).padStart(6, '0')}`;
    const newPatient: Patient = {
      id: `pat_${Date.now()}`,
      patientCode,
      name: input.name.trim(),
      age: Number(input.age),
      gender: input.gender,
      mobile: input.mobile.trim(),
      address: input.address?.trim(),
      referralDoctor: input.referralDoctor?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.patients.push(newPatient);
    state.saveToStorage();
    return newPatient;
  },

  async updatePatient(id: string, input: UpdatePatientInput): Promise<Patient> {
    const patient = state.patients.find((p) => p.id === id);
    if (!patient) throw new Error('Patient not found');

    if (input.name !== undefined) patient.name = input.name.trim();
    if (input.age !== undefined) patient.age = Number(input.age);
    if (input.gender !== undefined) patient.gender = input.gender;
    if (input.mobile !== undefined) patient.mobile = input.mobile.trim();
    if (input.address !== undefined) patient.address = input.address?.trim() || undefined;
    if (input.referralDoctor !== undefined) patient.referralDoctor = input.referralDoctor?.trim() || undefined;
    patient.updatedAt = new Date().toISOString();

    // Synchronize ALL historical and existing bills associated with this patient
    // so that reprint, invoice view, and receipt copies instantly reflect the edited patient info
    for (const bill of state.bills) {
      if (bill.patientId === id) {
        bill.patient = { ...patient };
        bill.updatedAt = new Date().toISOString();
      }
    }

    state.saveToStorage();
    return { ...patient };
  },

  // -------------------------------------------------------
  // PROCEDURES & CATEGORIES
  // -------------------------------------------------------
  async getProcedures(): Promise<Procedure[]> {
    return [...state.procedures];
  },

  async getCategories(): Promise<ProcedureCategory[]> {
    return [...state.categories];
  },

  async createCategory(name: string): Promise<ProcedureCategory> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Department name is required');
    const existing = state.categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      return existing;
    }
    const newCat: ProcedureCategory = {
      id: `cat_${trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16)}_${Date.now().toString().slice(-4)}`,
      name: trimmed,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.categories.push(newCat);
    state.saveToStorage();
    return newCat;
  },

  async updateCategory(id: string, name: string): Promise<ProcedureCategory | null> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Department name is required');
    const cat = state.categories.find((c) => c.id === id);
    if (!cat) return null;
    cat.name = trimmed;
    cat.updatedAt = new Date().toISOString();
    // Synchronize categoryName in all procedures assigned to this category
    for (const proc of state.procedures) {
      if (proc.categoryId === id) {
        proc.categoryName = cat.name;
        proc.updatedAt = new Date().toISOString();
      }
    }
    state.saveToStorage();
    return cat;
  },

  async deleteCategory(id: string): Promise<boolean> {
    const hasProcs = state.procedures.some((p) => p.categoryId === id);
    if (hasProcs) {
      throw new Error('Cannot delete department because active procedures are assigned to it.');
    }
    state.categories = state.categories.filter((c) => c.id !== id);
    state.saveToStorage();
    return true;
  },

  async searchProcedures(query: string, categoryId?: string): Promise<Procedure[]> {
    const q = query.trim().toLowerCase();
    return state.procedures.filter((proc) => {
      const matchCat = categoryId ? proc.categoryId === categoryId : true;
      const matchQuery =
        !q ||
        proc.code.toLowerCase().includes(q) ||
        proc.name.toLowerCase().includes(q) ||
        (proc.department && proc.department.toLowerCase().includes(q));
      return matchCat && matchQuery && proc.status === 'ACTIVE';
    });
  },

  async upsertProcedure(input: CreateProcedureInput & { id?: string }): Promise<Procedure> {
    const category = state.categories.find((c) => c.id === input.categoryId);
    const categoryName = category ? category.name : 'General';

    if (input.id) {
      const idx = state.procedures.findIndex((p) => p.id === input.id);
      if (idx >= 0) {
        state.procedures[idx] = {
          ...state.procedures[idx],
          code: input.code.toUpperCase().trim(),
          name: input.name.trim(),
          categoryId: input.categoryId,
          categoryName,
          sampleType: input.sampleType,
          department: input.department,
          price: Number(input.price),
          updatedAt: new Date().toISOString(),
        };
        state.saveToStorage();
        return state.procedures[idx];
      }
    }

    const newProc: Procedure = {
      id: `proc_${Date.now()}`,
      code: input.code.toUpperCase().trim(),
      name: input.name.trim(),
      categoryId: input.categoryId,
      categoryName,
      sampleType: input.sampleType,
      department: input.department,
      price: Number(input.price),
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.procedures.push(newProc);
    state.saveToStorage();
    return newProc;
  },

  async toggleProcedureStatus(id: string): Promise<Procedure | null> {
    const proc = state.procedures.find((p) => p.id === id);
    if (!proc) return null;
    proc.status = proc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    proc.updatedAt = new Date().toISOString();
    state.saveToStorage();
    return proc;
  },

  // -------------------------------------------------------
  // BILLING ENGINE & INVOICE MANAGEMENT
  // -------------------------------------------------------
  async createBill(input: CreateBillInput, currentUser: SessionUser): Promise<Bill> {
    const patient = state.patients.find((p) => p.id === input.patientId);
    if (!patient) throw new Error('Patient not found');

    const nextSeq = state.settings.invoiceSequence + 1;
    state.settings.invoiceSequence = nextSeq;

    const billNumber = formatBillNumber(
      state.settings.invoicePrefix,
      state.settings.invoiceFy,
      nextSeq
    );

    const calculationItems = input.items.map((it) => ({
      quantity: it.quantity,
      rate: it.rate,
      discount: it.discount || 0,
    }));

    const summary = calculateBillSummary(calculationItems, input.billDiscount, input.taxRate);

    const billItems = input.items.map((it, idx) => {
      const proc = state.procedures.find((p) => p.id === it.procedureId);
      return {
        procedureId: it.procedureId,
        procedureCode: proc?.code || 'CUSTOM',
        procedureName: proc?.name || 'Diagnostic Procedure',
        quantity: it.quantity,
        rate: it.rate,
        discount: it.discount || 0,
        amount: summary.items[idx]?.netAmount ?? it.rate * it.quantity,
      };
    });

    const newBill: Bill = {
      id: `bill_${Date.now()}`,
      billNumber,
      patientId: patient.id,
      patient,
      billDate: new Date().toISOString(),
      subtotal: summary.subtotal,
      discount: summary.totalDiscount,
      tax: summary.taxAmount,
      roundOff: summary.roundOff,
      grandTotal: summary.grandTotal,
      paymentStatus: input.payment.amount >= summary.grandTotal ? 'PAID' : 'PARTIAL',
      status: 'ACTIVE',
      createdBy: currentUser.id,
      createdByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: billItems,
      payments: [
        {
          paymentMode: input.payment.paymentMode,
          amount: input.payment.amount,
          referenceNumber: input.payment.referenceNumber,
          paidAt: new Date().toISOString(),
          createdBy: currentUser.id,
        },
      ],
    };

    state.bills.unshift(newBill);
    state.saveToStorage();
    return newBill;
  },

  async getBills(limit = 50): Promise<Bill[]> {
    return state.bills.slice(0, limit).map((b) => {
      const currentPatient = state.patients.find((p) => p.id === b.patientId);
      return currentPatient ? { ...b, patient: currentPatient } : b;
    });
  },

  async getAllBills(): Promise<Bill[]> {
    return state.bills.map((b) => {
      const currentPatient = state.patients.find((p) => p.id === b.patientId);
      return currentPatient ? { ...b, patient: currentPatient } : b;
    });
  },

  async getBillById(id: string): Promise<Bill | null> {
    const bill = state.bills.find((b) => b.id === id);
    if (!bill) return null;
    const currentPatient = state.patients.find((p) => p.id === bill.patientId);
    return currentPatient ? { ...bill, patient: currentPatient } : bill;
  },

  async cancelBill(billId: string, reason: string, user: SessionUser): Promise<Bill> {
    const bill = state.bills.find((b) => b.id === billId);
    if (!bill) throw new Error('Bill not found');

    bill.status = 'CANCELLED';
    bill.cancellation = {
      id: `canc_${Date.now()}`,
      billId,
      reason,
      cancelledBy: user.id,
      cancelledByName: user.fullName,
      cancelledAt: new Date().toISOString(),
    };
    bill.updatedAt = new Date().toISOString();
    state.saveToStorage();
    return bill;
  },

  // -------------------------------------------------------
  // REVENUE & DASHBOARD METRICS
  // -------------------------------------------------------
  async getRevenueMetrics(dateFilter?: string): Promise<RevenueMetrics> {
    const today = new Date().toISOString().split('T')[0];
    const thisMonth = today.substring(0, 7);

    let todayRevenue = 0;
    let todayBillCount = 0;
    let monthRevenue = 0;
    let monthBillCount = 0;
    let filteredRevenue = 0;
    let filteredBillCount = 0;
    let cashCollection = 0;
    let upiCollection = 0;
    let cardCollection = 0;
    let otherCollection = 0;

    for (const bill of state.bills) {
      if (bill.status === 'CANCELLED') continue;

      const billDate = bill.billDate.split('T')[0];
      const isToday = billDate === today;
      const isThisMonth = billDate.startsWith(thisMonth);

      if (isToday) {
        todayRevenue += bill.grandTotal;
        todayBillCount += 1;
      }
      if (isThisMonth) {
        monthRevenue += bill.grandTotal;
        monthBillCount += 1;
      }

      // Evaluate active filter
      const matches = matchesDateFilter(bill.billDate, dateFilter);
      if (matches) {
        filteredRevenue += bill.grandTotal;
        filteredBillCount += 1;

        for (const p of bill.payments) {
          if (p.paymentMode === 'CASH') cashCollection += p.amount;
          else if (p.paymentMode === 'UPI') upiCollection += p.amount;
          else if (p.paymentMode === 'CARD') cardCollection += p.amount;
          else otherCollection += p.amount;
        }
      }
    }

    return {
      todayRevenue,
      todayBillCount,
      monthRevenue,
      monthBillCount,
      filteredRevenue,
      filteredBillCount,
      cashCollection,
      upiCollection,
      cardCollection,
      otherCollection,
      filterLabel: dateFilter || 'ALL',
    };
  },

  async getDailyCollections(days = 7, dateFilter?: string): Promise<DailyCollectionRow[]> {
    const dailyMap = new Map<string, { count: number; revenue: number; cash: number; upi: number; card: number }>();

    if (dateFilter && /^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
      dailyMap.set(dateFilter, { count: 0, revenue: 0, cash: 0, upi: 0, card: 0 });
    } else if (dateFilter === 'ALL') {
      for (let i = 0; i < 7; i++) {
        const d = new Date(Date.now() - 86400000 * i).toISOString().split('T')[0];
        dailyMap.set(d, { count: 0, revenue: 0, cash: 0, upi: 0, card: 0 });
      }
      for (const bill of state.bills) {
        if (bill.status !== 'CANCELLED') {
          const d = bill.billDate.split('T')[0];
          if (!dailyMap.has(d)) {
            dailyMap.set(d, { count: 0, revenue: 0, cash: 0, upi: 0, card: 0 });
          }
        }
      }
    } else {
      const numDays = dateFilter === 'THIS_MONTH' ? 31 : dateFilter === 'LAST_7_DAYS' ? 7 : days;
      for (let i = 0; i < numDays; i++) {
        const d = new Date(Date.now() - 86400000 * i).toISOString().split('T')[0];
        if (dateFilter === 'THIS_MONTH') {
          const currentMonth = new Date().toISOString().slice(0, 7);
          if (!d.startsWith(currentMonth)) continue;
        }
        dailyMap.set(d, { count: 0, revenue: 0, cash: 0, upi: 0, card: 0 });
      }
    }

    for (const bill of state.bills) {
      if (bill.status === 'CANCELLED') continue;
      const d = bill.billDate.split('T')[0];
      if (dailyMap.has(d)) {
        const item = dailyMap.get(d)!;
        item.count += 1;
        item.revenue += bill.grandTotal;
        for (const p of bill.payments) {
          if (p.paymentMode === 'CASH') item.cash += p.amount;
          else if (p.paymentMode === 'UPI') item.upi += p.amount;
          else if (p.paymentMode === 'CARD') item.card += p.amount;
        }
      }
    }

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        billsCount: data.count,
        revenue: data.revenue,
        cashAmount: data.cash,
        upiAmount: data.upi,
        cardAmount: data.card,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async getProcedureRevenue(dateFilter?: string): Promise<ProcedureRevenueRow[]> {
    const map = new Map<string, { name: string; category: string; count: number; rev: number }>();

    for (const bill of state.bills) {
      if (bill.status === 'CANCELLED') continue;
      if (!matchesDateFilter(bill.billDate, dateFilter)) continue;

      for (const it of bill.items) {
        const existing = map.get(it.procedureCode) || {
          name: it.procedureName,
          category: 'Diagnostic',
          count: 0,
          rev: 0,
        };
        existing.count += it.quantity;
        existing.rev += it.amount;
        map.set(it.procedureCode, existing);
      }
    }

    return Array.from(map.entries())
      .map(([code, data]) => ({
        procedureCode: code,
        procedureName: data.name,
        categoryName: data.category,
        count: data.count,
        totalRevenue: data.rev,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  },

  async getBillDates(): Promise<string[]> {
    return state.bills
      .filter((b) => b.status === 'ACTIVE')
      .map((b) => b.billDate);
  },

  // -------------------------------------------------------
  // SETTINGS & BACKUP
  // -------------------------------------------------------
  async getSettings(): Promise<AppSettings> {
    return { ...state.settings };
  },

  async updateSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    state.settings = { ...state.settings, ...newSettings };
    state.saveToStorage();
    return state.settings;
  },

  async updateQuickTests(quickTests: QuickTestConfig[]): Promise<AppSettings> {
    state.settings = { ...state.settings, quickTests };
    state.saveToStorage();
    return state.settings;
  },

  async getLicenseState(): Promise<LicenseState> {
    return { ...state.license };
  },

  async activateLicense(key: string): Promise<LicenseState> {
    const cleanKey = key.toUpperCase().trim();
    const onlineRes = await activateOnlineLicense(cleanKey, 'LAB-FRONTDESK-PC');

    if (onlineRes.success && onlineRes.license) {
      state.license = {
        isActivated: true,
        licenseKey: cleanKey,
        customerName: onlineRes.license.customerName,
        plan: onlineRes.license.plan,
        status: 'ACTIVE',
        expiresAt: onlineRes.license.expiresAt || undefined,
        offlineGraceUntil: onlineRes.license.offlineGraceUntil,
        deviceFingerprint: onlineRes.signedToken?.payload.deviceFingerprint || 'SHA256:BOUND_HARDWARE',
        deviceName: 'LAB-FRONTDESK-PC',
        lastValidatedAt: new Date().toISOString(),
      };
      state.saveToStorage();
      return state.license;
    }

    // If offline or server not running, activate with local fingerprint binding
    const fp = await getDeviceFingerprint();
    state.license = {
      isActivated: true,
      licenseKey: cleanKey,
      customerName: state.settings.labName,
      plan: 'ANNUAL',
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      offlineGraceUntil: new Date(Date.now() + 86400000 * 60).toISOString(),
      deviceFingerprint: fp,
      deviceName: 'LAB-FRONTDESK-PC',
      lastValidatedAt: new Date().toISOString(),
    };
    state.saveToStorage();
    return state.license;
  },

  async createBackup(): Promise<string> {
    const filename = `LabBilling_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const data = JSON.stringify({
      version: 1,
      createdAt: new Date().toISOString(),
      state,
    }, null, 2);

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return filename;
  },

  async restoreBackup(jsonContent: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonContent);
      if (parsed.state) {
        if (parsed.state.patients) state.patients = parsed.state.patients;
        if (parsed.state.procedures) state.procedures = parsed.state.procedures;
        if (parsed.state.bills) state.bills = parsed.state.bills;
        if (parsed.state.settings) state.settings = parsed.state.settings;
        state.saveToStorage();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
};
