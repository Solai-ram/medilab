import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

export const PatientSchema = z.object({
  name: z.string().min(2, 'Patient name is required').max(100),
  age: z.coerce.number().int().min(0, 'Age cannot be negative').max(150, 'Invalid age'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  mobile: z.string().min(10, 'Valid 10-digit mobile number required').max(15),
  address: z.string().max(255).optional(),
  referralDoctor: z.string().max(150).optional(),
});

export const DepartmentSchema = z.object({
  name: z.string().min(2, 'Department name must be at least 2 characters').max(100),
});

export const ProcedureSchema = z.object({
  code: z.string().min(2, 'Code is required').max(20).toUpperCase(),
  name: z.string().min(2, 'Procedure name is required').max(150),
  categoryId: z.string().min(1, 'Category is required'),
  sampleType: z.string().max(50).optional(),
  department: z.string().max(50).optional(),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
});

export const BillItemSchema = z.object({
  procedureId: z.string().min(1),
  procedureCode: z.string().min(1),
  procedureName: z.string().min(1),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  rate: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).default(0),
});

export const CreateBillSchema = z.object({
  patientId: z.string().min(1, 'Please select or create a patient'),
  items: z.array(BillItemSchema).min(1, 'At least one procedure must be added'),
  billDiscount: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).default(0),
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER']),
  paidAmount: z.coerce.number().min(0),
  paymentReference: z.string().max(100).optional(),
});

export const BillCancellationSchema = z.object({
  billId: z.string().min(1),
  reason: z.string().min(5, 'Please provide a descriptive reason for cancellation (min 5 characters)'),
});

export const LicenseActivationSchema = z.object({
  licenseKey: z.string().regex(/^LAB-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i, 'License key must match format: LAB-XXXX-XXXX-XXXX'),
});

export const AppSettingsSchema = z.object({
  labName: z.string().min(2, 'Lab name is required').max(100),
  labTagline: z.string().max(100).optional(),
  labAddress: z.string().min(5, 'Lab address is required').max(255),
  labPhone: z.string().min(5, 'Contact number is required').max(100),
  labEmail: z.string().email().optional().or(z.literal('')),
  labGstin: z.string().max(20).optional().or(z.literal('')),
  labTimings: z.string().max(100).optional(),
  invoicePrefix: z.string().min(1).max(10).toUpperCase(),
  invoiceFy: z.string().min(4).max(10),
  invoiceSequence: z.coerce.number().int().min(1),
  invoiceFooter: z.string().max(500),
  thermalPrinterName: z.string().optional(),
  a4PrinterName: z.string().optional(),
  autoBackupEnabled: z.boolean().default(true),
  backupIntervalDays: z.coerce.number().int().min(1).default(1),
  signatoryLabel: z.string().max(100).optional(),
  signatoryDesignation: z.string().max(100).optional(),
  signatoryName: z.string().max(100).optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type PatientInput = z.infer<typeof PatientSchema>;
export type DepartmentInput = z.infer<typeof DepartmentSchema>;
export type ProcedureInput = z.infer<typeof ProcedureSchema>;
export type CreateBillFormInput = z.infer<typeof CreateBillSchema>;
export type BillCancellationInput = z.infer<typeof BillCancellationSchema>;
export type LicenseActivationInput = z.infer<typeof LicenseActivationSchema>;
export type AppSettingsInput = z.infer<typeof AppSettingsSchema>;
