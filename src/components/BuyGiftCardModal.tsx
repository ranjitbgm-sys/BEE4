import React, { useState } from 'react';
import {
  Building2,
  Check,
  Copy,
  Download,
  Gift,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { CustomerProfile, GiftCardRecord } from '../types';
import { validateGiftCardPurchaseInput } from '../utils/giftCardWalletLogic';
import { formatINR } from '../utils/storeLogic';

interface BuyGiftCardModalProps {
  currentCustomer: CustomerProfile | null;
  initialMode?: 'personal' | 'bulk';
  onClose: () => void;
  onIssueGiftCard: (input: {
    amount: number;
    recipientName: string;
    recipientEmail: string;
    message: string;
  }) => Promise<GiftCardRecord> | GiftCardRecord;
  onRedeemImmediately?: (code: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
}

const PRESET_AMOUNTS = [250, 500, 1000, 2000] as const;
const OCCASIONS = ['Birthday', 'Festival', 'Thank You', 'School / Corporate'] as const;

export const BuyGiftCardModal: React.FC<BuyGiftCardModalProps> = ({
  currentCustomer,
  initialMode = 'personal',
  onClose,
  onIssueGiftCard,
  onRedeemImmediately,
}) => {
  const [purchaseType, setPurchaseType] = useState<'personal' | 'bulk'>(initialMode);
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]>(
    initialMode === 'bulk' ? 'School / Corporate' : 'Birthday'
  );
  const [amount, setAmount] = useState<number>(500);
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [bulkQuantity, setBulkQuantity] = useState<number>(10);
  const [message, setMessage] = useState<string>(
    'Enjoy screen-free play & mindful crafting at BEE4 Studio!'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [issuedCard, setIssuedCard] = useState<GiftCardRecord | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [redeemFeedback, setRedeemFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const check = validateGiftCardPurchaseInput({
      amount,
      recipientName,
      recipientEmail,
    });
    if (!check.valid) {
      setErrorMsg(check.error || 'Please check gift card details.');
      return;
    }

    const composedMessage =
      purchaseType === 'bulk'
        ? `[${occasion} · Bulk Lot (${bulkQuantity} cards)] ${message.trim()}`.trim()
        : `[${occasion}] ${message.trim()}`.trim();

    setIsSubmitting(true);
    try {
      const created = await onIssueGiftCard({
        amount,
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim().toLowerCase(),
        message: composedMessage,
      });
      setIssuedCard(created);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to generate gift card.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!issuedCard) return;
    const text = `BEE4 Digital Gift Card (${occasion})\nValue: ${formatINR(issuedCard.initialAmount)}\nCode: ${issuedCard.code}\n4-Digit PIN: ${issuedCard.pin}\nRedeem at: https://bee4.in (Account -> Gift Card & BEE4 Wallet)`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const handleDownloadVoucher = () => {
    if (!issuedCard) return;
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>BEE4 Gift Card ${issuedCard.code}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:32px;background:#f8fafc;color:#18181b}
  .card{max-width:520px;margin:0 auto;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:2px solid #d97706;border-radius:20px;padding:28px}
  .code{font-family:monospace;font-size:20px;font-weight:800;letter-spacing:0.06em;background:#fff;padding:10px 14px;border-radius:10px;border:1px dashed #d97706;margin-top:14px}
</style></head>
<body>
  <div class="card">
    <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;color:#b45309">BEE4.IN · DIGITAL E-GIFT CARD (${occasion.toUpperCase()})</div>
    <h1 style="margin:8px 0 4px;font-size:32px">${formatINR(issuedCard.initialAmount)}</h1>
    <p style="margin:0;font-size:14px;color:#52525b">For: <strong>${issuedCard.recipientName}</strong> (${issuedCard.recipientEmail})</p>
    ${issuedCard.message ? `<p style="margin:14px 0 0;font-style:italic;color:#27272a">&ldquo;${issuedCard.message}&rdquo;</p>` : ''}
    <div class="code">CODE: ${issuedCard.code}<br/>PIN: ${issuedCard.pin}</div>
    <p style="margin:14px 0 0;font-size:12px;color:#71717a">Redeem inside your BEE4 Account Wallet at bee4.in · Valid for 12 months.</p>
  </div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BEE4-Gift-Card-${issuedCard.code}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleInstantRedeemToMyWallet = async () => {
    if (!issuedCard || !onRedeemImmediately) return;
    const res = await onRedeemImmediately(issuedCard.code, issuedCard.pin);
    if (res.ok) {
      setRedeemFeedback(
        `${formatINR(issuedCard.initialAmount)} credited directly to your BEE4 Wallet!`
      );
      setIssuedCard({ ...issuedCard, balance: 0, redeemedAt: new Date().toISOString() });
    } else {
      setRedeemFeedback(res.error || 'Could not redeem card.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buy-gift-card-title"
      onClick={onClose}
    >
      <div
        className="glass-surface w-full max-w-xl rounded-3xl border border-zinc-200/70 bg-white/95 p-6 shadow-2xl dark:border-white/15 dark:bg-zinc-900/95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200/70 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-amber-700 uppercase dark:text-amber-300">
                BEE4 Gift Cards &amp; Wallet
              </p>
              <h2
                id="buy-gift-card-title"
                className="font-display text-xl font-bold text-zinc-900 dark:text-zinc-50"
              >
                {issuedCard ? 'Digital Gift Card Issued!' : 'Buy a BEE4 Digital Gift Card'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gift card modal"
            className="rounded-xl border border-zinc-200 bg-white p-2 text-zinc-500 hover:bg-zinc-100 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {issuedCard ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-3xl border border-amber-500/35 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-yellow-500/5 p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-amber-800 uppercase dark:text-amber-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  BEE4 E-Gift Card · {occasion}
                </span>
                <span className="tabular-nums text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                  {formatINR(issuedCard.initialAmount)}
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                Recipient: <strong>{issuedCard.recipientName}</strong> ·{' '}
                {issuedCard.recipientEmail}
              </p>
              <div className="mt-4 grid gap-2 rounded-2xl border border-amber-500/30 bg-white/80 p-3.5 dark:bg-zinc-950/60 sm:grid-cols-2">
                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    16-Character Gift Code
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {issuedCard.code}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                    4-Digit Security PIN
                  </span>
                  <span className="mt-0.5 block font-mono text-sm font-bold text-zinc-900 dark:text-zinc-50">
                    {issuedCard.pin}
                  </span>
                </div>
              </div>
              {issuedCard.message && (
                <p className="mt-3 text-xs italic text-zinc-700 dark:text-zinc-300">
                  &ldquo;{issuedCard.message}&rdquo;
                </p>
              )}
            </div>

            {redeemFeedback && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                {redeemFeedback}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="glass-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy Code &amp; PIN
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadVoucher}
                  className="glass-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl"
                >
                  <Download className="h-3.5 w-3.5" />
                  Save Gift Card
                </button>
                {currentCustomer &&
                  onRedeemImmediately &&
                  issuedCard.balance > 0 && (
                    <button
                      type="button"
                      onClick={handleInstantRedeemToMyWallet}
                      className="glass-btn-secondary inline-flex items-center gap-1.5 border-emerald-500/40 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 rounded-xl"
                    >
                      <Wallet className="h-3.5 w-3.5" />
                      Add to My Wallet Now
                    </button>
                  )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="glass-btn-primary px-5 py-2 text-sm font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {/* Personal vs Corporate/School Mode */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-zinc-100/90 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10">
              <button
                type="button"
                onClick={() => setPurchaseType('personal')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                  purchaseType === 'personal'
                    ? 'bg-white dark:bg-amber-600 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Personal Gift Card</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPurchaseType('bulk');
                  setOccasion('School / Corporate');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all ${
                  purchaseType === 'bulk'
                    ? 'bg-white dark:bg-amber-600 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>School / Corporate</span>
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-700 dark:text-rose-200"
              >
                {errorMsg}
              </div>
            )}

            {/* Occasion Selector */}
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Select Occasion
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OCCASIONS.map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasion(occ)}
                    className={`rounded-xl border px-2.5 py-2 text-xs font-semibold transition ${
                      occasion === occ
                        ? 'border-amber-600 bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        : 'border-zinc-200 dark:border-white/10 text-zinc-600 dark:text-zinc-300'
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Choose Gift Card Value *
              </span>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map((preset) => {
                  const active = amount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`tabular-nums rounded-2xl border py-2.5 text-sm font-bold transition ${
                        active
                          ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-amber-500/60 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200'
                      }`}
                    >
                      {formatINR(preset)}
                    </button>
                  );
                })}
              </div>
            </div>

            {purchaseType === 'bulk' && (
              <div>
                <label
                  htmlFor="gift-bulk-qty"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  Batch Count (School / Team Distribution)
                </label>
                <input
                  id="gift-bulk-qty"
                  type="number"
                  min={2}
                  max={500}
                  value={bulkQuantity}
                  onChange={(e) => setBulkQuantity(Math.max(2, Number(e.target.value) || 2))}
                  className="glass-input w-full rounded-xl px-3.5 py-2 text-sm tabular-nums text-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="gift-recipient-name"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  {purchaseType === 'bulk' ? 'Coordinator / Organization *' : 'Recipient Full Name *'}
                </label>
                <input
                  id="gift-recipient-name"
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={purchaseType === 'bulk' ? 'e.g. DPS Science Club' : 'e.g. Ananya Roy'}
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label
                  htmlFor="gift-recipient-email"
                  className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
                >
                  {purchaseType === 'bulk' ? 'Delivery Email *' : 'Recipient Email *'}
                </label>
                <input
                  id="gift-recipient-email"
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="gift-personal-message"
                className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
              >
                Personal Message (optional)
              </label>
              <textarea
                id="gift-personal-message"
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="glass-input w-full rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Highlights & 3-Step Redemption Guide */}
            <div className="rounded-2xl bg-zinc-50/90 dark:bg-white/5 border border-zinc-200/70 dark:border-white/10 p-3.5 space-y-2 text-[11px] text-zinc-600 dark:text-zinc-300">
              <div className="flex flex-wrap gap-x-4 gap-y-1 font-semibold text-zinc-800 dark:text-zinc-100">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Zero Expiry Worries
                </span>
                <span>· Valid Across All 3D Toys &amp; Custom Decor</span>
                <span>· Instant Code &amp; PIN</span>
              </div>
              <p>
                <strong>How to Redeem:</strong> 1. Sign in to BEE4 Account → 2. Open Gift Card &amp; Wallet → 3. Enter 16-char Voucher Code &amp; 4-digit PIN.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Instant 16-char code + 4-digit PIN valid for 12 months.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="glass-btn-amber inline-flex shrink-0 items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              >
                <Gift className="h-4 w-4" />
                {isSubmitting ? 'Issuing Card...' : `Issue ${formatINR(amount)} Gift Card`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
