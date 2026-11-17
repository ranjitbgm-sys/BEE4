import { useState } from 'react';
import { Download, Printer, Tag, X } from 'lucide-react';
import type { OrderRecord, Product } from '../../types';
import {
  BEE4_STUDIO_ORIGIN,
  buildGstTaxInvoiceHtml,
  buildShippingLabelHtml,
  calculateGstBreakdown,
} from '../../utils/adminLogic';
import {
  formatINR,
  formatPaymentMethodLabel,
  isCodPaymentMethod,
} from '../../utils/storeLogic';

interface OrderGstInvoiceModalProps {
  order: OrderRecord | null;
  products: Product[];
  supportEmail: string;
  whatsappNumber: string;
  onClose: () => void;
}

export function OrderGstInvoiceModal({
  order,
  products,
  supportEmail,
  whatsappNumber,
  onClose,
}: OrderGstInvoiceModalProps) {
  const [viewMode, setViewMode] = useState<'invoice' | 'label'>('invoice');
  if (!order) return null;

  const isBihar = order.customer.state.trim().toLowerCase() === 'bihar';
  const isCod = isCodPaymentMethod(order.paymentMethod);
  const walletUsed = Math.max(0, Math.round(Number(order.walletAmountUsed ?? 0)));
  const collectAmount = Math.max(0, Math.round(order.total - walletUsed));
  const prodMap = new Map(products.map((p) => [p.id, p]));

  const taxSummary = order.items.reduce(
    (acc, item) => {
      const hsn = prodMap.get(item.productId)?.hsnCode || '3926';
      const gst = calculateGstBreakdown({
        grossInclusiveAmount: item.price * item.quantity,
        destinationState: order.customer.state,
        hsnCode: hsn,
      });
      return {
        taxable: acc.taxable + gst.taxableValue,
        cgst: acc.cgst + gst.cgst,
        sgst: acc.sgst + gst.sgst,
        igst: acc.igst + gst.igst,
      };
    },
    { taxable: 0, cgst: 0, sgst: 0, igst: 0 }
  );

  const triggerDownload = () => {
    const html =
      viewMode === 'invoice'
        ? buildGstTaxInvoiceHtml(order, products, { supportEmail, whatsappNumber })
        : buildShippingLabelHtml(order);
    const filename =
      viewMode === 'invoice'
        ? `BEE4-GST-Invoice-${order.orderNumber}.html`
        : `BEE4-Shipping-Label-${order.orderNumber}.html`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const triggerPrintWindow = () => {
    const html =
      viewMode === 'invoice'
        ? buildGstTaxInvoiceHtml(order, products, { supportEmail, whatsappNumber })
        : buildShippingLabelHtml(order);
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.srcdoc = html;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => document.body.removeChild(frame), 1500);
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tax Invoice and Shipping Label"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto glass-drawer rounded-3xl p-5 sm:p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('invoice')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                viewMode === 'invoice' ? 'glass-btn-ink' : 'glass-btn-secondary'
              }`}
            >
              A4 GST Tax Invoice
            </button>
            <button
              type="button"
              onClick={() => setViewMode('label')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold ${
                viewMode === 'label' ? 'glass-btn-ink' : 'glass-btn-secondary'
              }`}
            >
              A5 Shipping Label
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={triggerDownload}
              className="px-3 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save HTML/PDF</span>
            </button>
            <button
              type="button"
              onClick={triggerPrintWindow}
              className="px-3.5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print {viewMode === 'invoice' ? 'Invoice' : 'Label'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {viewMode === 'invoice' ? (
          <div className="bg-white text-zinc-900 rounded-2xl p-5 sm:p-7 border border-zinc-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-zinc-900 pb-4">
              <div>
                <h3 className="font-display text-xl font-bold">{BEE4_STUDIO_ORIGIN.legalName}</h3>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Origin: {BEE4_STUDIO_ORIGIN.address} (State Code {BEE4_STUDIO_ORIGIN.stateCode})
                </p>
                <p className="text-xs text-zinc-600">Support: {supportEmail}</p>
              </div>
              <div className="sm:text-right">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                  {isBihar ? 'INTRA-STATE · CGST + SGST' : 'INTER-STATE · IGST'}
                </span>
                <p className="mt-1 font-display text-lg font-bold tabular-nums">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-zinc-500 tabular-nums">
                  {order.createdAt.slice(0, 10)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-zinc-500 uppercase">Billed &amp; Shipped To</p>
                <p className="font-bold text-sm mt-1">{order.customer.fullName}</p>
                <p>{order.customer.address}</p>
                <p>
                  {order.customer.city}, {order.customer.state} — {order.customer.pinCode}
                </p>
                <p className="tabular-nums">Phone: {order.customer.phone}</p>
              </div>
              <div>
                <p className="font-bold text-zinc-500 uppercase">Dispatch Details</p>
                <p className="mt-1">
                  Payment: <strong>{formatPaymentMethodLabel(order.paymentMethod)}</strong>
                  {order.paymentStatus ? ` (${order.paymentStatus})` : ''}
                </p>
                <p>Courier: {order.courierPartner || 'Pending Assignment'}</p>
                <p className="tabular-nums">AWB: {order.awbNumber || 'Assigning'}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 border-b border-zinc-200">
                    <th className="py-2 px-2">Item</th>
                    <th className="py-2 px-2">HSN</th>
                    <th className="py-2 px-2 text-right">Qty</th>
                    <th className="py-2 px-2 text-right">Taxable</th>
                    <th className="py-2 px-2 text-right">{isBihar ? 'CGST+SGST' : 'IGST'}</th>
                    <th className="py-2 px-2 text-right">Gross</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {order.items.map((item, idx) => {
                    const hsn = prodMap.get(item.productId)?.hsnCode || '3926';
                    const gross = item.price * item.quantity;
                    const gst = calculateGstBreakdown({
                      grossInclusiveAmount: gross,
                      destinationState: order.customer.state,
                      hsnCode: hsn,
                    });
                    return (
                      <tr key={`${item.productId}-${idx}`}>
                        <td className="py-2 px-2">
                          <strong>{item.title}</strong>
                          <div className="text-[11px] text-zinc-500">{item.variant}</div>
                        </td>
                        <td className="py-2 px-2 tabular-nums">{hsn}</td>
                        <td className="py-2 px-2 text-right tabular-nums">{item.quantity}</td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          ₹{gst.taxableValue.toFixed(2)}
                        </td>
                        <td className="py-2 px-2 text-right tabular-nums">
                          {gst.isIntraState
                            ? `₹${gst.cgst.toFixed(2)} + ₹${gst.sgst.toFixed(2)}`
                            : `₹${gst.igst.toFixed(2)}`}
                        </td>
                        <td className="py-2 px-2 text-right font-bold tabular-nums">
                          {formatINR(gross)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="ml-auto max-w-xs space-y-1.5 text-xs pt-2">
              <div className="flex justify-between">
                <span>Total Taxable Value</span>
                <span className="tabular-nums">₹{taxSummary.taxable.toFixed(2)}</span>
              </div>
              {isBihar ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST (Bihar Code 10)</span>
                    <span className="tabular-nums">₹{taxSummary.cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST (Bihar Code 10)</span>
                    <span className="tabular-nums">₹{taxSummary.sgst.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST (Inter-State)</span>
                  <span className="tabular-nums">₹{taxSummary.igst.toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount ({order.couponCode || 'Promo'})</span>
                  <span className="tabular-nums">-{formatINR(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm border-t-2 border-zinc-900 pt-2">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatINR(order.total)}</span>
              </div>
              {walletUsed > 0 && (
                <>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>BEE4 Wallet Applied</span>
                    <span className="tabular-nums">-{formatINR(walletUsed)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs text-zinc-700">
                    <span>{isCod ? 'Cash to Collect' : 'Net Paid'}</span>
                    <span className="tabular-nums">{formatINR(collectAmount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto bg-white text-zinc-900 rounded-2xl border-2 border-zinc-900 p-5 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-3">
              <div>
                <span className="font-display text-lg font-bold">BEE4.IN</span>
                <p className="text-[11px] text-zinc-500">Banka, Bihar 813103</p>
              </div>
              <span className="font-mono text-sm font-bold tabular-nums">{order.orderNumber}</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border-2 border-zinc-900 text-center text-xs font-extrabold ${
                isCod ? 'bg-amber-100' : 'bg-emerald-100'
              }`}
            >
              {isCod
                ? `COD — COLLECT ${formatINR(collectAmount)}`
                : 'PREPAID — DO NOT COLLECT'}
            </div>

            <div className="text-xs space-y-1">
              <p className="text-[11px] font-bold text-zinc-500 uppercase">Deliver To:</p>
              <p className="text-sm font-bold">{order.customer.fullName}</p>
              <p>{order.customer.address}</p>
              <p className="font-semibold">
                {order.customer.city}, {order.customer.state} — {order.customer.pinCode}
              </p>
              <p className="tabular-nums font-semibold">Phone: {order.customer.phone}</p>
            </div>

            <div className="flex items-center justify-between text-xs border-t border-zinc-200 pt-3">
              <span>Courier: <strong>{order.courierPartner || 'Standard'}</strong></span>
              <span className="font-mono tabular-nums">
                AWB: <strong>{order.awbNumber || 'ASSIGNING'}</strong>
              </span>
            </div>

            <div className="p-2.5 rounded-xl border border-dashed border-amber-700 bg-amber-50 text-[11px] font-bold text-amber-900 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>FRAGILE · KEEP BELOW 55°C (ECO-PLA)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
