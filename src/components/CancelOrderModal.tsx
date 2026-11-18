import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  RefreshCcw,
  Wallet,
  X,
} from 'lucide-react';
import { OrderRecord } from '../types';
import {
  ADMIN_CANCELLATION_REASONS,
  CUSTOMER_CANCELLATION_REASONS,
} from '../utils/giftCardWalletLogic';
import { formatINR, isCodPaymentMethod } from '../utils/storeLogic';

interface CancelOrderModalProps {
  order: OrderRecord;
  mode: 'customer' | 'admin';
  onClose: () => void;
  onConfirm: (payload: {
    reason: string;
    autoRestock: boolean;
    issueRefundCredit: boolean;
  }) => Promise<void> | void;
}

export const CancelOrderModal: React.FC<CancelOrderModalProps> = ({
  order,
  mode,
  onClose,
  onConfirm,
}) => {
  const reasons =
    mode === 'admin' ? ADMIN_CANCELLATION_REASONS : CUSTOMER_CANCELLATION_REASONS;
  const isCod = isCodPaymentMethod(order.paymentMethod);
  const walletUsed = Math.max(0, Math.round(Number(order.walletAmountUsed ?? 0)));
  const prepaidPaidAmount = isCod ? walletUsed : Math.round(order.total);

  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [autoRestock, setAutoRestock] = useState<boolean>(true);
  const [issueRefundCredit, setIssueRefundCredit] = useState<boolean>(
    prepaidPaidAmount > 0
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedReason) {
      setErrorMsg('Please select a cancellation reason before continuing.');
      return;
    }
    const cleanCustom = customNote.trim();
    if (selectedReason === 'Other' && cleanCustom.length < 3) {
      setErrorMsg('Please describe your reason briefly in the note field.');
      return;
    }
    const finalReason =
      selectedReason === 'Other'
        ? cleanCustom
        : cleanCustom
          ? `${selectedReason} — ${cleanCustom}`
          : selectedReason;

    setIsSubmitting(true);
    try {
      await onConfirm({
        reason: finalReason,
        autoRestock: mode === 'customer' ? true : autoRestock,
        issueRefundCredit:
          mode === 'admin' ? issueRefundCredit : prepaidPaidAmount > 0,
      });
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Could not cancel order right now. Please retry.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-order-modal-title"
      onClick={onClose}
    >
      <div
        className="glass-surface w-full max-w-lg rounded-3xl border border-zinc-200/70 bg-white/95 p-6 shadow-2xl dark:border-white/15 dark:bg-zinc-900/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 pb-4 dark:border-white/10">
          <div>
            <p className="text-[11px] font-bold tracking-[0.14em] text-rose-600 uppercase dark:text-rose-400">
              {mode === 'admin' ? 'Admin Studio · Cancel Order' : 'Order Cancellation'}
            </p>
            <h2
              id="cancel-order-modal-title"
              className="mt-1 font-display text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              Cancel {order.orderNumber}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {order.items.reduce((s, it) => s + it.quantity, 0)} item(s) ·{' '}
              <span className="tabular-nums font-semibold text-zinc-700 dark:text-zinc-200">
                {formatINR(order.total)}
              </span>{' '}
              · {isCod ? 'Cash on Delivery (COD)' : order.paymentMethod}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cancel modal"
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-800 dark:text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <fieldset>
            <legend className="mb-2.5 block text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Select Mandatory Cancellation Reason *
            </legend>
            <div className="space-y-2">
              {reasons.map((reasonOption) => {
                const checked = selectedReason === reasonOption;
                return (
                  <label
                    key={reasonOption}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm transition ${
                      checked
                        ? 'border-amber-600/60 bg-amber-500/10 text-zinc-900 dark:border-amber-400/60 dark:bg-amber-400/10 dark:text-zinc-50'
                        : 'border-zinc-200/80 bg-zinc-50/70 text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cancelReason"
                      value={reasonOption}
                      checked={checked}
                      onChange={() => {
                        setSelectedReason(reasonOption);
                        setErrorMsg(null);
                      }}
                      className="h-4 w-4 accent-amber-600"
                    />
                    <span className="font-medium">{reasonOption}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label
              htmlFor="cancel-order-comment"
              className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              {selectedReason === 'Other'
                ? 'Please specify reason *'
                : 'Additional note (optional)'}
            </label>
            <textarea
              id="cancel-order-comment"
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder={
                mode === 'admin'
                  ? 'Internal / customer cancellation note...'
                  : 'e.g. Updated PIN code or custom engraving change...'
              }
              className="glass-input w-full rounded-2xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
            />
          </div>

          {mode === 'admin' ? (
            <div className="space-y-2.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
              <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Auto-Restock Inventory (+
                  {order.items.reduce((s, it) => s + it.quantity, 0)} unit
                  {order.items.reduce((s, it) => s + it.quantity, 0) > 1 ? 's' : ''})
                </span>
                <input
                  type="checkbox"
                  checked={autoRestock}
                  onChange={(e) => setAutoRestock(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
              </label>

              {prepaidPaidAmount > 0 && (
                <label className="flex cursor-pointer items-center justify-between gap-3 border-t border-zinc-200/70 pt-2.5 text-xs font-semibold text-zinc-800 dark:border-white/10 dark:text-zinc-200">
                  <span className="inline-flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Issue Refund / Store Credit ({formatINR(prepaidPaidAmount)})
                  </span>
                  <input
                    type="checkbox"
                    checked={issueRefundCredit}
                    onChange={(e) => setIssueRefundCredit(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                </label>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-900 dark:text-emerald-200">
              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>
                Reserved items will be released immediately back into BEE4 studio stock
                {prepaidPaidAmount > 0
                  ? ` and your ${formatINR(prepaidPaidAmount)} prepaid/wallet balance will be queued for store credit / refund.`
                  : '.'}
              </span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="glass-btn-secondary px-4 py-2.5 text-sm font-medium"
            >
              Keep Order
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Cancelling Order...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
