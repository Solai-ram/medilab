import React, { useState, useEffect } from 'react';
import { Bill, AppSettings, PrintFormat } from '@lab/shared-types';
import { formatCurrency } from '@lab/billing-engine';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Copy,
  Check,
  FileText,
  Receipt,
  QrCode,
  ShieldCheck,
  Building2,
  Calendar,
  User as UserIcon,
} from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  settings: AppSettings;
  isReprint?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  bill,
  settings,
  isReprint = false,
}) => {
  const [printFormat, setPrintFormat] = useState<PrintFormat>('THERMAL_80MM');
  const [copied, setCopied] = useState(false);
  const [verificationQr, setVerificationQr] = useState<string>('');

  useEffect(() => {
    if (bill) {
      const payload = `BILL:${bill.billNumber}|PAT:${bill.patient?.patientCode || ''}|AMT:${bill.grandTotal}|DATE:${bill.billDate}`;
      QRCode.toDataURL(payload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then(setVerificationQr)
        .catch(console.error);
    }
  }, [bill]);

  if (!isOpen || !bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBillNumber = () => {
    navigator.clipboard.writeText(bill.billNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Controls Header (no-print) */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/90 no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Tax Invoice Preview:</span>
                <span className="font-mono text-teal-300 font-extrabold">{bill.billNumber}</span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {isReprint ? 'Duplicate Invoice Copy' : 'Original Diagnostic Cash Receipt'}
              </p>
            </div>
            <button
              onClick={handleCopyBillNumber}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 flex items-center gap-1.5 transition ml-2 border border-slate-700"
              title="Copy Bill Number"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Format Toggle Pill */}
            <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setPrintFormat('THERMAL_80MM')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  printFormat === 'THERMAL_80MM'
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>80mm Thermal</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('A4')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  printFormat === 'A4'
                    ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 Page</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-600 hover:from-teal-400 hover:to-emerald-500 rounded-xl shadow-lg shadow-teal-950/50 transition hover:scale-105 active:scale-95 ml-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-950/90 flex justify-center items-start shadow-inner">
          {printFormat === 'THERMAL_80MM' ? (
            /* 80mm Thermal Receipt Layout with Realistic Paper Styling */
            <div className="w-[350px] bg-white text-black p-5 rounded-sm shadow-2xl font-mono text-[12px] leading-tight select-text print:w-full print:p-0 print:shadow-none border-t-8 border-teal-600 relative">
              {isReprint && (
                <div className="text-center font-extrabold text-red-600 border-2 border-red-600 py-1 mb-3 text-xs uppercase tracking-widest bg-red-50">
                  *** DUPLICATE REPRINT ***
                </div>
              )}

              {/* Thermal Receipt Header */}
              <div className="text-center pb-2.5 border-b border-dashed border-gray-400">
                <div className="font-extrabold text-base tracking-wide uppercase">{settings.labName}</div>
                {settings.labTagline && <div className="text-[10px] italic text-gray-700">{settings.labTagline}</div>}
                <div className="text-[10px] mt-1">{settings.labAddress}</div>
                <div className="text-[10px] font-bold">Ph: {settings.labPhone}</div>
                {settings.labGstin && <div className="text-[10px]">GSTIN: {settings.labGstin}</div>}
              </div>

              {/* Invoice & Patient Meta */}
              <div className="py-2.5 border-b border-dashed border-gray-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Bill No: <b className="font-extrabold">{bill.billNumber}</b></span>
                  <span>{new Date(bill.billDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Time: {new Date(bill.billDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>Op: {bill.createdByName || 'Cashier'}</span>
                </div>
                <div className="pt-1.5 border-t border-gray-200 mt-1">
                  <div>Patient: <b className="text-black font-extrabold">{bill.patient?.name || 'Walk-in'}</b></div>
                  <div className="flex justify-between text-gray-700">
                    <span>ID: {bill.patient?.patientCode}</span>
                    <span>Age/Sex: {bill.patient?.age}Y / {bill.patient?.gender}</span>
                  </div>
                  <div>Mobile: {bill.patient?.mobile}</div>
                  {bill.patient?.referralDoctor && (
                    <div>Ref. By: <b className="text-black font-extrabold">{bill.patient.referralDoctor}</b></div>
                  )}
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="py-2.5 border-b border-dashed border-gray-400">
                <div className="flex justify-between font-extrabold text-[11px] pb-1 border-b border-gray-400 uppercase">
                  <span className="w-1/2">Test Description</span>
                  <span className="w-12 text-center">Qty</span>
                  <span className="w-16 text-right">Rate</span>
                  <span className="w-16 text-right">Amount</span>
                </div>
                <div className="pt-1.5 space-y-1.5">
                  {bill.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-[11px]">
                      <span className="w-1/2 font-bold truncate">{item.procedureName}</span>
                      <span className="w-12 text-center font-mono">{item.quantity}</span>
                      <span className="w-16 text-right font-mono">{item.rate.toFixed(2)}</span>
                      <span className="w-16 text-right font-mono font-bold">{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="py-2.5 border-b border-dashed border-gray-400 text-[11px] space-y-1">
                <div className="flex justify-between">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{formatCurrency(bill.subtotal)}</span>
                </div>
                {bill.discount > 0 && (
                  <div className="flex justify-between text-gray-800 font-semibold">
                    <span>Total Discount:</span>
                    <span className="font-mono">- {formatCurrency(bill.discount)}</span>
                  </div>
                )}
                {bill.tax > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-mono">{formatCurrency(bill.tax)}</span>
                  </div>
                )}
                {bill.roundOff !== 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Round Off:</span>
                    <span className="font-mono">{bill.roundOff > 0 ? `+${bill.roundOff}` : bill.roundOff}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-sm pt-1.5 border-t border-gray-400">
                  <span>TOTAL AMOUNT:</span>
                  <span className="font-mono text-base">{formatCurrency(bill.grandTotal)}</span>
                </div>
              </div>

              {/* Settlement Mode */}
              <div className="py-2 border-b border-dashed border-gray-400 text-[11px] space-y-0.5">
                {bill.payments.map((p, i) => (
                  <div key={i} className="flex justify-between font-bold">
                    <span>Settled via {p.paymentMode}:</span>
                    <span className="font-mono">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
                {bill.payments[0]?.referenceNumber && (
                  <div className="text-[10px] text-gray-700 truncate">
                    Ref / UTR: {bill.payments[0].referenceNumber}
                  </div>
                )}
              </div>

              {/* Report Verification QR */}
              {verificationQr && (
                <div className="py-2 flex flex-col items-center justify-center border-b border-dashed border-gray-400">
                  <img src={verificationQr} alt="Verification QR" className="w-18 h-18" />
                  <span className="text-[9px] text-gray-600 font-mono mt-0.5">Scan to Verify Receipt</span>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 text-center text-[10px] text-gray-700 space-y-1">
                <div>{settings.invoiceFooter}</div>
                <div className="font-extrabold text-black pt-1">*** PLEASE BRING THIS RECEIPT FOR REPORT COLLECTION ***</div>
              </div>
            </div>
          ) : (
            /* A4 Full Diagnostic Tax Invoice with Letterhead & Barcode */
            <div className="w-[720px] bg-white text-black p-10 rounded-sm shadow-2xl font-sans text-xs select-text print:w-full print:p-0 print:shadow-none border-t-8 border-teal-600">
              {isReprint && (
                <div className="text-center font-extrabold text-red-600 border border-red-600 py-1 mb-4 text-xs uppercase tracking-widest bg-red-50">
                  Duplicate Tax Invoice Copy
                </div>
              )}

              {/* Prestigious Letterhead Header */}
              <div className="flex justify-between items-start pb-5 border-b-2 border-teal-600">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-teal-900 tracking-tight">{settings.labName}</span>
                  </div>
                  {settings.labTagline && <p className="text-xs text-teal-600 font-semibold mt-0.5">{settings.labTagline}</p>}
                  <p className="text-xs text-gray-600 mt-2 max-w-md leading-relaxed">{settings.labAddress}</p>
                  <p className="text-xs text-gray-600">Ph: <b className="text-gray-900">{settings.labPhone}</b> | Email: {settings.labEmail}</p>
                  {settings.labGstin && <p className="text-xs text-gray-700 font-mono mt-0.5">GSTIN: {settings.labGstin}</p>}
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-teal-50 border border-teal-300 text-teal-900 font-extrabold text-xs uppercase tracking-wider rounded">
                    TAX INVOICE
                  </div>
                  <div className="text-sm font-mono font-extrabold text-teal-800 mt-2">{bill.billNumber}</div>
                  <div className="text-xs text-gray-500 font-mono mt-1">Date: {new Date(bill.billDate).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-500 font-mono">Time: {new Date(bill.billDate).toLocaleTimeString()}</div>
                </div>
              </div>

              {/* Patient Demographics Box */}
              <div className="grid grid-cols-2 gap-4 my-5 p-4 bg-teal-50/40 border border-teal-200/80 rounded-xl">
                <div>
                  <div className="text-teal-900 text-[10px] uppercase font-extrabold tracking-wider">Patient Demographics</div>
                  <div className="font-extrabold text-base text-gray-950 mt-1">{bill.patient?.name}</div>
                  <div className="text-xs text-gray-700 mt-0.5">Patient ID: <span className="font-mono font-bold text-teal-800">{bill.patient?.patientCode}</span></div>
                  <div className="text-xs text-gray-700">Age / Gender: {bill.patient?.age} Years / {bill.patient?.gender}</div>
                  {bill.patient?.referralDoctor && (
                    <div className="text-xs text-teal-900 font-semibold mt-0.5">Ref. Doctor: <b>{bill.patient.referralDoctor}</b></div>
                  )}
                </div>
                <div>
                  <div className="text-teal-900 text-[10px] uppercase font-extrabold tracking-wider">Billing & Contact Details</div>
                  <div className="text-xs text-gray-800 mt-1 font-mono">Mobile: <b>{bill.patient?.mobile}</b></div>
                  <div className="text-xs text-gray-700">Address: {bill.patient?.address || 'N/A'}</div>
                  <div className="text-xs text-gray-700 mt-1">
                    Settlement Status: <span className="font-extrabold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100">PAID</span>
                  </div>
                </div>
              </div>

              {/* Investigations Table */}
              <table className="w-full text-left border-collapse my-4">
                <thead>
                  <tr className="bg-teal-700 text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="py-2.5 px-3 rounded-l">#</th>
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Diagnostic Investigation</th>
                    <th className="py-2.5 px-3 text-right">Tariff</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Disc</th>
                    <th className="py-2.5 px-3 text-right rounded-r">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs">
                  {bill.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/70'}>
                      <td className="py-2.5 px-3 text-gray-500 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800">{item.procedureCode}</td>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{item.procedureName}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-700">{item.rate.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-gray-600">{item.discount > 0 ? item.discount.toFixed(2) : '-'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold text-gray-950">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Calculation Summary Box */}
              <div className="flex justify-between items-start pt-3 border-t-2 border-gray-300">
                <div className="max-w-xs text-[11px] text-gray-600 space-y-1.5">
                  <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="text-gray-900 font-bold">Payment Details:</div>
                    <div className="mt-0.5">Mode: <b>{bill.payments[0]?.paymentMode}</b> ({formatCurrency(bill.payments[0]?.amount || bill.grandTotal)})</div>
                    {bill.payments[0]?.referenceNumber && (
                      <div className="text-gray-600 font-mono text-[10px]">Ref: {bill.payments[0].referenceNumber}</div>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-500 italic pt-1">{settings.invoiceFooter}</div>
                </div>

                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono font-semibold text-gray-900">{formatCurrency(bill.subtotal)}</span>
                  </div>
                  {bill.discount > 0 && (
                    <div className="flex justify-between text-gray-700 font-semibold">
                      <span>Total Discount:</span>
                      <span className="font-mono text-emerald-700">- {formatCurrency(bill.discount)}</span>
                    </div>
                  )}
                  {bill.tax > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>Tax / GST:</span>
                      <span className="font-mono text-gray-900">{formatCurrency(bill.tax)}</span>
                    </div>
                  )}
                  {bill.roundOff !== 0 && (
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span>Round Off:</span>
                      <span className="font-mono">{bill.roundOff > 0 ? `+${bill.roundOff}` : bill.roundOff}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-extrabold text-teal-900 pt-2 border-t-2 border-teal-600">
                    <span>Grand Total:</span>
                    <span className="font-mono">{formatCurrency(bill.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="flex justify-between items-end mt-12 pt-4 border-t border-gray-300 text-xs text-gray-600">
                <div className="flex items-center gap-3">
                  {verificationQr && (
                    <img src={verificationQr} alt="Verification QR" className="w-16 h-16 border border-gray-300 p-0.5 rounded shadow-sm" />
                  )}
                  <div>
                    <p>Billed By: <b className="text-gray-900">{bill.createdByName || 'Front Desk'}</b></p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Automated Electronic Invoice • MediLab System</p>
                    <p className="text-[9px] text-teal-800 font-mono font-bold mt-0.5">Digital Cryptographic Verification</p>
                  </div>
                </div>
                <div className="text-center min-w-[180px]">
                  <div className="w-48 border-b border-gray-400 mb-1.5 mx-auto"></div>
                  {settings.signatoryName && (
                    <p className="text-[11px] font-bold text-gray-900 leading-tight">{settings.signatoryName}</p>
                  )}
                  <p className="text-[11px] font-bold text-gray-800 leading-tight">
                    {settings.signatoryLabel || 'Authorized Signatory'}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    {settings.signatoryDesignation || 'Pathologist / Lab In-Charge'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
