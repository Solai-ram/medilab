export interface CalculationItemInput {
  quantity: number;
  rate: number;
  discount?: number;
}

export interface CalculatedItem {
  quantity: number;
  rate: number;
  discount: number;
  grossAmount: number;
  netAmount: number;
}

export interface BillCalculationResult {
  items: CalculatedItem[];
  subtotal: number;
  itemDiscounts: number;
  billDiscount: number;
  totalDiscount: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  roundOff: number;
  grandTotal: number;
}

/**
 * Calculates a single line item's gross and net amount.
 * Clamped so netAmount cannot fall below 0.
 */
export function calculateItemAmount(rate: number, quantity: number, discount: number = 0): { grossAmount: number; netAmount: number } {
  const safeQty = Math.max(1, Math.floor(quantity || 1));
  const safeRate = Math.max(0, rate || 0);
  const grossAmount = Math.round(safeRate * safeQty * 100) / 100;
  const safeDiscount = Math.min(grossAmount, Math.max(0, discount || 0));
  const netAmount = Math.round((grossAmount - safeDiscount) * 100) / 100;
  return { grossAmount, netAmount };
}

/**
 * Deterministic calculation engine for lab invoices.
 * Matches client and Rust-side validation logic.
 */
export function calculateBillSummary(
  items: CalculationItemInput[],
  billDiscount: number = 0,
  taxRatePercent: number = 0
): BillCalculationResult {
  let subtotal = 0;
  let itemDiscounts = 0;

  const calculatedItems: CalculatedItem[] = items.map((item) => {
    const { grossAmount, netAmount } = calculateItemAmount(item.rate, item.quantity, item.discount);
    subtotal += grossAmount;
    itemDiscounts += (item.discount || 0);
    return {
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount || 0,
      grossAmount,
      netAmount,
    };
  });

  subtotal = Math.round(subtotal * 100) / 100;
  itemDiscounts = Math.round(itemDiscounts * 100) / 100;

  const safeBillDiscount = Math.max(0, billDiscount || 0);
  const totalDiscount = Math.min(subtotal, Math.round((itemDiscounts + safeBillDiscount) * 100) / 100);

  const taxableAmount = Math.max(0, Math.round((subtotal - totalDiscount) * 100) / 100);

  const safeTaxRate = Math.max(0, taxRatePercent || 0);
  const taxAmount = Math.round(((taxableAmount * safeTaxRate) / 100) * 100) / 100;

  const rawTotal = taxableAmount + taxAmount;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;
  const grandTotal = Math.max(0, roundedTotal);

  return {
    items: calculatedItems,
    subtotal,
    itemDiscounts,
    billDiscount: safeBillDiscount,
    totalDiscount,
    taxableAmount,
    taxRate: safeTaxRate,
    taxAmount,
    roundOff,
    grandTotal,
  };
}

/**
 * Formats an invoice number predictably (e.g. LAB-2026-000001).
 */
export function formatBillNumber(prefix: string, financialYear: string, sequence: number): string {
  const paddedSeq = String(Math.max(1, sequence)).padStart(6, '0');
  const cleanPrefix = (prefix || 'LAB').trim().toUpperCase();
  const cleanFy = (financialYear || '2026-27').split('-')[0];
  return `${cleanPrefix}-${cleanFy}-${paddedSeq}`;
}

/**
 * Formats a number as Indian Rupee or standard currency.
 */
export function formatCurrency(amount: number, symbol: string = '₹'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = safeAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
