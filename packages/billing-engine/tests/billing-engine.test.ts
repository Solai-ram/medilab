import { test } from 'node:test';
import assert from 'node:assert';
import {
  calculateItemAmount,
  calculateBillSummary,
  formatBillNumber,
  formatCurrency,
} from '../dist/index.js';

test('calculateItemAmount calculates gross and net amount correctly', () => {
  const res = calculateItemAmount(350, 2, 50);
  assert.strictEqual(res.grossAmount, 700);
  assert.strictEqual(res.netAmount, 650);
});

test('calculateItemAmount clamps negative or excessive discount', () => {
  const res = calculateItemAmount(100, 1, 150);
  assert.strictEqual(res.grossAmount, 100);
  assert.strictEqual(res.netAmount, 0); // Cannot be negative
});

test('calculateBillSummary aggregates items, discounts, roundoff, and grand total', () => {
  const items = [
    { quantity: 1, rate: 350, discount: 0 }, // Complete CBC: 350
    { quantity: 1, rate: 600, discount: 50 }, // LFT: 550
    { quantity: 1, rate: 300, discount: 0 }, // TSH: 300
  ];

  const summary = calculateBillSummary(items, 50, 0); // 50 extra bill discount, 0% tax

  assert.strictEqual(summary.subtotal, 1250);
  assert.strictEqual(summary.itemDiscounts, 50);
  assert.strictEqual(summary.billDiscount, 50);
  assert.strictEqual(summary.totalDiscount, 100);
  assert.strictEqual(summary.taxableAmount, 1150);
  assert.strictEqual(summary.taxAmount, 0);
  assert.strictEqual(summary.roundOff, 0);
  assert.strictEqual(summary.grandTotal, 1150);
});

test('calculateBillSummary calculates fractional taxes and nearest integer round-off', () => {
  const items = [
    { quantity: 1, rate: 105.50, discount: 0 },
  ];

  // 18% tax on 105.50 = 18.99. Raw total = 124.49. Rounded = 124. Roundoff = -0.49
  const summary = calculateBillSummary(items, 0, 18);

  assert.strictEqual(summary.subtotal, 105.50);
  assert.strictEqual(summary.taxAmount, 18.99);
  assert.strictEqual(summary.grandTotal, 124);
  assert.strictEqual(summary.roundOff, -0.49);
});

test('formatBillNumber formats sequence properly', () => {
  assert.strictEqual(formatBillNumber('LAB', '2026-27', 1), 'LAB-2026-000001');
  assert.strictEqual(formatBillNumber('DIAG', '2026-27', 123), 'DIAG-2026-000123');
});

test('formatCurrency formats Indian Rupee correctly', () => {
  const str = formatCurrency(1250);
  assert.ok(str.includes('1,250.00'));
});
