import { FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Link2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  OrderRecord,
  ReturnItemEntry,
  ReturnReason,
  ReturnRequestRecord,
  ReturnResolutionType,
} from '../types';
import { uploadReturnProofToSupabaseStorage } from '../services/supabaseStoreService';
import { sanitizeRichInput, sanitizeSingleLine } from '../utils/adminLogic';
import {
  calculateStoreCreditAmount,
  computeReturnItemsValue,
  generateRmaNumber,
  RETURN_REASONS,
  RETURN_RESOLUTIONS,
  validateReturnRequestForm,
} from '../utils/rmaLogic';
import { formatINR } from '../utils/storeLogic';

interface CustomerReturnModalProps {
  order: OrderRecord;
  existingReturns: ReturnRequestRecord[];
  onClose: () => void;
  onSubmitReturn: (rma: ReturnRequestRecord) => void;
}

export function CustomerReturnModal({
  order,
  existingReturns,
  onClose,
  onSubmitReturn,
}: CustomerReturnModalProps) {
  const [selectedMap, setSelectedMap] = useState<Record<string, { checked: boolean; quantity: number }>>(
    () => {
      const initial: Record<string, { checked: boolean; quantity: number }> = {};
      order.items.forEach((item, idx) => {
        const key = `${item.productId}::${item.variant}`;
        initial[key] = { checked: idx === 0, quantity: 1 };
      });
      return initial;
    }
  );

  const [reason, setReason] = useState<ReturnReason>('Damaged in Transit');
  const [resolutionType, setResolutionType] = useState<ReturnResolutionType>(
    'Free Instant Replacement'
  );
  const [refundUpiId, setRefundUpiId] = useState('');
  const [refundBankAccount, setRefundBankAccount] = useState('');
  const [refundBankIfsc, setRefundBankIfsc] = useState('');
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadStatusNote, setUploadStatusNote] = useState('');
  const [customerComments, setCustomerComments] = useState('');
  const [errors, setErrors] = useState<{
    items?: string;
    reason?: string;
    payout?: string;
    proof?: string;
  }>({});

  const selectedItems = useMemo<ReturnItemEntry[]>(() => {
    const entries: ReturnItemEntry[] = [];
    for (const item of order.items) {
      const key = `${item.productId}::${item.variant}`;
      const sel = selectedMap[key];
      if (sel?.checked && sel.quantity > 0) {
        entries.push({
          productId: item.productId,
          title: item.title,
          variant: item.variant,
          quantity: Math.min(item.quantity, Math.max(1, sel.quantity)),
          unitPrice: item.price,
          image: item.image,
        });
      }
    }
    return entries;
  }, [order.items, selectedMap]);

  const selectedItemsTotal = useMemo(
    () => computeReturnItemsValue(selectedItems),
    [selectedItems]
  );
  const bonusCreditValue = calculateStoreCreditAmount(selectedItemsTotal);

  const handleToggleItem = (key: string, maxQty: number) => {
    setSelectedMap((prev) => {
      const cur = prev[key] ?? { checked: false, quantity: 1 };
      return {
        ...prev,
        [key]: {
          checked: !cur.checked,
          quantity: Math.min(maxQty, Math.max(1, cur.quantity)),
        },
      };
    });
    if (errors.items) setErrors((prev) => ({ ...prev, items: undefined }));
  };

  const handleStepQty = (key: string, delta: number, maxQty: number) => {
    setSelectedMap((prev) => {
      const cur = prev[key] ?? { checked: true, quantity: 1 };
      const nextQty = Math.min(maxQty, Math.max(1, cur.quantity + delta));
      return {
        ...prev,
        [key]: { checked: true, quantity: nextQty },
      };
    });
  };

  const handleUploadProofFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remainingSlots = Math.max(0, 2 - proofImages.length);
    if (remainingSlots === 0) {
      setUploadStatusNote('Maximum 2 proof photos supported per request.');
      return;
    }

    setUploadingProof(true);
    setUploadStatusNote('');
    try {
      const nextUrls: string[] = [];
      const toUpload = Array.from(files).slice(0, remainingSlots);
      let usedFallback = false;

      for (const file of toUpload) {
        const res = await uploadReturnProofToSupabaseStorage(file, order.orderNumber);
        nextUrls.push(res.url);
        if (res.storageMode === 'local-fallback') usedFallback = true;
      }

      setProofImages((prev) => [...prev, ...nextUrls].slice(0, 2));
      setErrors((prev) => ({ ...prev, proof: undefined }));
      setUploadStatusNote(
        usedFallback
          ? 'Uploaded compressed damage proof (ready for review).'
          : 'Uploaded damage proof to BEE4 returns storage.'
      );
    } catch {
      setUploadStatusNote('Could not process that image file. You can also paste an image URL below.');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleAddProofUrl = () => {
    const cleanUrl = proofUrlInput.trim();
    if (!cleanUrl) return;
    if (!/^https?:\/\/|^\/|^data:image\//i.test(cleanUrl)) {
      setUploadStatusNote('Enter a valid image URL starting with https:// or /.');
      return;
    }
    if (proofImages.length >= 2) {
      setUploadStatusNote('Maximum 2 proof photos supported. Remove one to replace.');
      return;
    }
    setProofImages((prev) => [...prev, cleanUrl]);
    setProofUrlInput('');
    setUploadStatusNote('');
    setErrors((prev) => ({ ...prev, proof: undefined }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateReturnRequestForm({
      selectedItems,
      reason,
      resolutionType,
      orderPaymentMethod: order.paymentMethod,
      refundUpiId,
      refundBankAccount,
      refundBankIfsc,
      proofImages,
      customerComments,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    const nowIso = new Date().toISOString();
    const rmaNumber = generateRmaNumber(existingReturns);
    const rmaRecord: ReturnRequestRecord = {
      id: `rma-${Date.now()}`,
      rmaNumber,
      orderNumber: order.orderNumber,
      customerName: order.customer.fullName,
      customerPhone: order.customer.phone,
      customerEmail: order.customer.email,
      orderPaymentMethod: order.paymentMethod,
      orderTotal: order.total,
      items: selectedItems,
      reason,
      resolutionType,
      customerComments: sanitizeRichInput(customerComments, 800),
      proofImages: proofImages.slice(0, 2),
      refundUpiId:
        resolutionType === 'Refund to Original Payment / UPI ID' && refundUpiId.trim()
          ? sanitizeSingleLine(refundUpiId, 120)
          : undefined,
      refundBankAccount:
        resolutionType === 'Refund to Original Payment / UPI ID' && refundBankAccount.trim()
          ? sanitizeSingleLine(refundBankAccount.replace(/\s+/g, ''), 32)
          : undefined,
      refundBankIfsc:
        resolutionType === 'Refund to Original Payment / UPI ID' && refundBankIfsc.trim()
          ? sanitizeSingleLine(refundBankIfsc, 20).toUpperCase()
          : undefined,
      status: 'Return Requested',
      autoRestockEnabled: false,
      isRestocked: false,
      scrapRecorded: false,
      replacementPrintQueued: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onSubmitReturn(rmaRecord);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Request return or replacement for ${order.orderNumber}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-drawer rounded-3xl p-5 sm:p-7 space-y-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-zinc-900/10 dark:border-white/10">
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              7-Day Return &amp; Replacement Portal · {order.orderNumber}
            </p>
            <h2 className="mt-0.5 font-display text-xl font-bold text-zinc-900 dark:text-white">
              Request Return or Instant Replacement
            </h2>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
              Complete these 4 quick steps — our Banka Studio team reviews requests within 4 working hours.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close return modal"
            className="p-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Step 1: Select Items */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                Step 1 · Select Item(s) &amp; Quantity
              </span>
              <span className="text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                Selected Value: {formatINR(selectedItemsTotal)}
              </span>
            </div>

            {errors.items && (
              <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.items}</span>
              </p>
            )}

            <div className="space-y-2">
              {order.items.map((item) => {
                const key = `${item.productId}::${item.variant}`;
                const sel = selectedMap[key] ?? { checked: false, quantity: 1 };
                return (
                  <div
                    key={key}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      sel.checked
                        ? 'border-amber-500/70 bg-amber-50/55 dark:bg-amber-950/35'
                        : 'glass-subtle'
                    }`}
                  >
                    <label className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={sel.checked}
                        onChange={() => handleToggleItem(key, item.quantity)}
                        className="w-4 h-4 accent-amber-600 shrink-0"
                      />
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-11 h-11 rounded-xl object-cover border border-white/70 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {item.variant} · {formatINR(item.price)} each (Ordered ×{item.quantity})
                        </p>
                      </div>
                    </label>

                    {item.quantity > 1 && (
                      <div className="inline-flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStepQty(key, -1, item.quantity)}
                          className="w-7 h-7 rounded-lg glass-btn-secondary text-xs font-bold"
                          aria-label={`Decrease return quantity for ${item.title}`}
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-bold tabular-nums text-zinc-900 dark:text-white">
                          {sel.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStepQty(key, 1, item.quantity)}
                          className="w-7 h-7 rounded-lg glass-btn-secondary text-xs font-bold"
                          aria-label={`Increase return quantity for ${item.title}`}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Select Reason */}
          <div className="space-y-2">
            <label
              htmlFor="rma-reason-select"
              className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200"
            >
              Step 2 · Reason for Return
            </label>
            <select
              id="rma-reason-select"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value as ReturnReason);
                if (errors.reason) setErrors((prev) => ({ ...prev, reason: undefined }));
              }}
              className="w-full h-11 px-3.5 rounded-xl glass-input text-sm font-medium focus:outline-none"
            >
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.reason && <p className="text-xs text-red-600">{errors.reason}</p>}
          </div>

          {/* Step 3: Preferred Resolution (Smart Retention Flow) */}
          <div className="space-y-2.5">
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
              Step 3 · Preferred Resolution
            </span>

            <div className="space-y-2.5" role="radiogroup" aria-label="Preferred return resolution">
              {RETURN_RESOLUTIONS.map((opt) => {
                const selected = resolutionType === opt.id;
                const isCredit = opt.id === 'Instant Store Credit Coupon (+10% Bonus Value)';
                return (
                  <button
                    key={opt.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setResolutionType(opt.id);
                      if (errors.payout) setErrors((prev) => ({ ...prev, payout: undefined }));
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                      selected
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/45 shadow-sm'
                        : 'glass-subtle hover:bg-white/80 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                          {opt.title}
                        </span>
                        {opt.recommended && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                            <Sparkles className="w-3 h-3" />
                            Recommended
                          </span>
                        )}
                        {opt.bonusBadge && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-bold tabular-nums">
                            {opt.bonusBadge} ({formatINR(bonusCreditValue)} Credit)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">
                        {isCredit
                          ? `Instant coupon worth ${formatINR(bonusCreditValue)} (+10% over ₹${selectedItemsTotal}) with zero waiting.`
                          : opt.subtitle}
                      </p>
                    </div>
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        selected
                          ? 'border-amber-600 bg-amber-600'
                          : 'border-zinc-400 dark:border-zinc-500'
                      }`}
                    >
                      {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* COD Payout Inputs when Refund to UPI/Original is chosen */}
            {resolutionType === 'Refund to Original Payment / UPI ID' &&
              order.paymentMethod === 'cod' && (
                <div className="p-4 rounded-2xl bg-sky-50/70 dark:bg-sky-950/35 border border-sky-200/80 dark:border-sky-500/25 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-sky-900 dark:text-sky-200">
                    <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>
                      Since Order <strong>{order.orderNumber}</strong> was Cash on Delivery (COD), enter your UPI ID (fastest) or Bank Account + IFSC for instant refund payout.
                    </span>
                  </div>

                  {errors.payout && (
                    <p role="alert" className="text-xs font-medium text-red-600">
                      {errors.payout}
                    </p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label htmlFor="rma-cod-upi" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                        Customer UPI ID (recommended)
                      </label>
                      <input
                        id="rma-cod-upi"
                        type="text"
                        value={refundUpiId}
                        onChange={(e) => {
                          setRefundUpiId(e.target.value);
                          if (errors.payout) setErrors((prev) => ({ ...prev, payout: undefined }));
                        }}
                        placeholder="e.g. vikram.seth@okaxis"
                        className="w-full h-10 px-3 rounded-xl glass-input text-xs sm:text-sm focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor="rma-cod-bank" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                        Or Bank Account Number
                      </label>
                      <input
                        id="rma-cod-bank"
                        type="text"
                        inputMode="numeric"
                        value={refundBankAccount}
                        onChange={(e) => {
                          setRefundBankAccount(e.target.value);
                          if (errors.payout) setErrors((prev) => ({ ...prev, payout: undefined }));
                        }}
                        placeholder="Account number (if no UPI)"
                        className="w-full h-10 px-3 rounded-xl glass-input text-xs sm:text-sm tabular-nums focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="rma-cod-ifsc" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                        IFSC Code
                      </label>
                      <input
                        id="rma-cod-ifsc"
                        type="text"
                        maxLength={11}
                        value={refundBankIfsc}
                        onChange={(e) => {
                          setRefundBankIfsc(e.target.value.toUpperCase());
                          if (errors.payout) setErrors((prev) => ({ ...prev, payout: undefined }));
                        }}
                        placeholder="HDFC0001234"
                        className="w-full h-10 px-3 rounded-xl glass-input text-xs sm:text-sm font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
          </div>

          {/* Step 4: Upload Photo Proof & Notes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                Step 4 · Unpacking / Damage Photo Proof (1–2 photos)
              </span>
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tabular-nums">
                {proofImages.length}/2 attached
              </span>
            </div>

            {errors.proof && (
              <p role="alert" className="text-xs font-medium text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errors.proof}</span>
              </p>
            )}

            <div className="p-4 rounded-2xl glass-subtle space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-100 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>{uploadingProof ? 'Uploading...' : 'Upload Photo (returns/)'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={uploadingProof || proofImages.length >= 2}
                    onChange={(e) => void handleUploadProofFiles(e.target.files)}
                    className="sr-only"
                  />
                </label>

                <div className="flex-1 min-w-[200px] flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Link2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      aria-label="Or paste damage photo image URL"
                      value={proofUrlInput}
                      onChange={(e) => setProofUrlInput(e.target.value)}
                      placeholder="Or paste photo URL (https://... or /assets/...)"
                      className="w-full h-9 pl-8 pr-3 rounded-xl glass-input text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProofUrl}
                    className="h-9 px-3 rounded-xl glass-btn-ink text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1"
                  >
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {uploadStatusNote && (
                <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                  {uploadStatusNote}
                </p>
              )}

              {proofImages.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {proofImages.map((imgUrl, idx) => (
                    <div
                      key={`${imgUrl.slice(0, 24)}-${idx}`}
                      className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/70 dark:border-white/15 bg-white/60"
                    >
                      <img
                        src={imgUrl}
                        alt={`Return proof ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remove proof photo ${idx + 1}`}
                        onClick={() =>
                          setProofImages((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-1 right-1 p-1 rounded-lg bg-zinc-900/75 text-white hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label htmlFor="rma-comments" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                  Additional Details / Missing Piece Name (optional)
                </label>
                <textarea
                  id="rma-comments"
                  rows={2}
                  value={customerComments}
                  onChange={(e) => setCustomerComments(e.target.value)}
                  placeholder="Describe the transit damage, missing puzzle part, or heat exposure..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-zinc-900/10 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700 dark:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Return / Replacement Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
