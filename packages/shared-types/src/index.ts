// ==========================================
// USER & AUTH TYPES
// ==========================================
export type UserRole = 'ADMIN' | 'CASHIER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  token: string;
}

// ==========================================
// PATIENT TYPES
// ==========================================
export type PatientGender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Patient {
  id: string;
  patientCode: string;
  name: string;
  age: number;
  gender: PatientGender;
  mobile: string;
  address?: string;
  referralDoctor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientInput {
  name: string;
  age: number;
  gender: PatientGender;
  mobile: string;
  address?: string;
  referralDoctor?: string;
}

// ==========================================
// PROCEDURE MASTER TYPES
// ==========================================
export type ProcedureStatus = 'ACTIVE' | 'INACTIVE';

export interface ProcedureCategory {
  id: string;
  name: string;
  status: ProcedureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Procedure {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName?: string;
  sampleType?: string;
  department?: string;
  price: number;
  status: ProcedureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProcedureInput {
  code: string;
  name: string;
  categoryId: string;
  sampleType?: string;
  department?: string;
  price: number;
}

// ==========================================
// BILLING & INVOICE TYPES
// ==========================================
export type PaymentStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type BillStatus = 'ACTIVE' | 'CANCELLED';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface BillItem {
  id?: string;
  billId?: string;
  procedureId: string;
  procedureCode: string;
  procedureName: string;
  quantity: number;
  rate: number;
  discount: number;
  amount: number;
}

export interface Payment {
  id?: string;
  billId?: string;
  paymentMode: PaymentMode;
  amount: number;
  referenceNumber?: string;
  paidAt: string;
  createdBy: string;
}

export interface Bill {
  id: string;
  billNumber: string;
  patientId: string;
  patient?: Patient;
  billDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  status: BillStatus;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  items: BillItem[];
  payments: Payment[];
  cancellation?: BillCancellation;
}

export interface CreateBillInput {
  patientId: string;
  items: Array<{
    procedureId: string;
    quantity: number;
    rate: number;
    discount?: number;
  }>;
  billDiscount?: number;
  taxRate?: number;
  payment: {
    paymentMode: PaymentMode;
    amount: number;
    referenceNumber?: string;
  };
}

export interface BillCancellation {
  id: string;
  billId: string;
  reason: string;
  cancelledBy: string;
  cancelledByName?: string;
  cancelledAt: string;
}

// ==========================================
// AUDIT & SETTINGS
// ==========================================
export interface AuditLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export interface AppSettings {
  labName: string;
  labTagline?: string;
  labAddress: string;
  labPhone: string;
  labEmail?: string;
  labGstin?: string;
  labTimings?: string;
  invoicePrefix: string;
  invoiceFy: string;
  invoiceSequence: number;
  invoiceFooter: string;
  thermalPrinterName?: string;
  a4PrinterName?: string;
  autoBackupEnabled: boolean;
  backupIntervalDays: number;
  signatoryLabel?: string;
  signatoryDesignation?: string;
  signatoryName?: string;
}

// ==========================================
// PRINTING & REVENUE REPORT TYPES
// ==========================================
export type PrintFormat = 'THERMAL_80MM' | 'A4';

export interface RevenueMetrics {
  todayRevenue: number;
  todayBillCount: number;
  monthRevenue: number;
  monthBillCount: number;
  filteredRevenue?: number;
  filteredBillCount?: number;
  cashCollection: number;
  upiCollection: number;
  cardCollection: number;
  otherCollection: number;
  filterLabel?: string;
}

export interface DailyCollectionRow {
  date: string;
  billsCount: number;
  revenue: number;
  cashAmount: number;
  upiAmount: number;
  cardAmount: number;
}

export interface ProcedureRevenueRow {
  procedureCode: string;
  procedureName: string;
  categoryName: string;
  count: number;
  totalRevenue: number;
}

// ==========================================
// LICENSING & DEVICE BINDING
// ==========================================
export type LicensePlan = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
export type LicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';

export interface LicenseTokenPayload {
  licenseId: string;
  customerName: string;
  plan: LicensePlan;
  maxDevices: number;
  deviceFingerprint: string;
  expiresAt: string;
  offlineGraceUntil: string;
}

export interface LicenseState {
  isActivated: boolean;
  licenseKey?: string;
  customerName?: string;
  plan?: LicensePlan;
  status: LicenseStatus;
  expiresAt?: string;
  offlineGraceUntil?: string;
  deviceFingerprint?: string;
  deviceName?: string;
  lastValidatedAt?: string;
}
