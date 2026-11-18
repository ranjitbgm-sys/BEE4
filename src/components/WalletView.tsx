import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  Copy,
  Gift,
  Plus,
  Trash2,
  Wallet,
} from 'lucide-react';
import { CustomerProfile, GiftCardRecord } from '../types';
import { validateUpiId } from '../utils/customerAccountLogic';
import { formatINR } from '../utils/storeLogic';

interface WalletViewProps {
  currentCustomer: CustomerProfile | null;
  giftCards?: GiftCardRecord[];
  onOpenBuyGiftCardModal?: (mode?: 'personal' | 'bulk') => void;
  onRedeemGiftCard?: (
    code: string,
    pin: string
  ) => Promise<{ ok: boolean; creditedAmount?: number; error?: string }>;
  onUpdateCustomer: (updated: CustomerProfile) => void;
  onNavigateToAccount: () => void;
  onContinueShopping: () => void;
}

export function WalletView({
  currentCustomer,
  giftCards = [],
  onOpenBuyGiftCardModal,
  onRedeemGiftCard,
  onUpdateCustomer,
  onNavigateToAccount,
  onContinueShopping,
}: WalletViewProps) {
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPin, setVoucherPin] = useState('');
  const [redeemingCard, setRedeemingCard] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newUpiInput, setNewUpiInput] = useState('');
  const [upiError, setUpiError] = useState<string | null>(null);
  const [upiToast, setUpiToast] = useState<string | null>(null);

  if (!currentCustomer) {
    return (
      <section className="max-w-[780px] mx-auto px-4 sm:px-6 py-10 space-y-4">
        <div className="glass-surface rounded-2xl p-8 text-center space-y-4">
          <Wallet className="w-10 h-10 mx-auto text-emerald-600" />
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Sign in to access your BEE4 Wallet
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto">
            Check instant wallet balance, redeem BEE4 gift cards, and manage your saved UPI IDs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToAccount}
              className="px-6 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
            >
              Sign In to BEE4
            </button>
            <button
              type="button"
              onClick={onContinueShopping}
              className="px-5 py-2.5 rounded-xl glass-btn-secondary text-sm font-semibold"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </section>
    );
  }

  const myGiftCards = giftCards.filter(
    (g) =>
      g.purchaserUserId === currentCustomer.id ||
      g.redeemedByUserId === currentCustomer.id ||
      (currentCustomer.email &&
        (g.purchaserEmail.toLowerCase() === currentCustomer.email.toLowerCase() ||
          g.recipientEmail.toLowerCase() === currentCustomer.email.toLowerCase()))
  );

  const handleRedeemVoucherSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRedeemFeedback(null);
    if (!onRedeemGiftCard) return;
    setRedeemingCard(true);
    try {
      const res = await onRedeemGiftCard(voucherCode.trim().toUpperCase(), voucherPin.trim());
      if (res.ok) {
        setRedeemFeedback({
          type: 'ok',
          text: `${formatINR(res.creditedAmount ?? 0)} added to your BEE4 Wallet!`,
        });
        setVoucherCode('');
        setVoucherPin('');
      } else {
        setRedeemFeedback({
          type: 'err',
          text: res.error || 'Could not verify gift card code or PIN.',
        });
      }
    } catch (err) {
      setRedeemFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to redeem gift card.',
      });
    } finally {
      setRedeemingCard(false);
    }
  };

  const handleAddUpiId = (e: FormEvent) => {
    e.preventDefault();
    setUpiError(null);
    const check = validateUpiId(newUpiInput);
    if (!check.valid) {
      setUpiError(check.error || 'Invalid UPI ID');
      return;
    }
    const currentUpis = currentCustomer.savedUpiIds ?? [];
    if (currentUpis.includes(check.normalized)) {
      setUpiError('This UPI ID is already saved.');
      return;
    }
    onUpdateCustomer({
      ...currentCustomer,
      savedUpiIds: [check.normalized, ...currentUpis].slice(0, 10),
    });
    setNewUpiInput('');
    setUpiToast(`Saved UPI ID ${check.normalized}.`);
    setTimeout(() => setUpiToast(null), 3000);
  };

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onNavigateToAccount}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Account</span>
        </button>
      </div>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          BEE4 Wallet &amp; Gift Cards
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
          Instant credits for BEE4 toys, custom prints, and saved UPI checkout IDs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 glass-surface rounded-2xl p-6 space-y-5">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/35 bg-amber-50 dark:bg-amber-950/40 p-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
              BEE4 Wallet Balance
            </p>
            <p className="tabular-nums text-4xl font-extrabold text-slate-900 dark:text-white">
              {formatINR(currentCustomer.walletBalance ?? 0)}
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-300">
              Applies automatically at checkout on bee4.in.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-800 dark:text-zinc-100">
              Gift someone creative screen-free play
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onOpenBuyGiftCardModal?.('personal')}
                className="h-10 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                Personal Gift Card
              </button>
              <button
                type="button"
                onClick={() => onOpenBuyGiftCardModal?.('bulk')}
                className="h-10 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5" />
                School / Bulk
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-subtle space-y-1.5 text-xs text-slate-600 dark:text-zinc-300">
            <p className="font-bold text-slate-900 dark:text-white">How to Redeem</p>
            <p>1. Enter your 16-character Gift Card Voucher Code.</p>
            <p>2. Enter the 4-digit security PIN.</p>
            <p>3. Balance credits instantaneously to your BEE4 Wallet with zero fees.</p>
          </div>
        </div>

        <div className="lg:col-span-7 glass-surface rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Add Gift Card to Wallet
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Zero expiry worries · Instant credit
            </p>
          </div>

          {redeemFeedback && (
            <div
              role="status"
              className={`p-3 rounded-xl text-xs font-semibold ${
                redeemFeedback.type === 'ok'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-200'
              }`}
            >
              {redeemFeedback.text}
            </div>
          )}

          <form onSubmit={handleRedeemVoucherSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <input
              type="text"
              required
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="16-char Voucher Code"
              className="sm:col-span-6 h-11 px-3.5 rounded-xl glass-input text-sm font-mono uppercase focus:outline-none"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={voucherPin}
              onChange={(e) => setVoucherPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4-digit PIN"
              className="sm:col-span-3 h-11 px-3.5 rounded-xl glass-input text-sm font-mono tabular-nums focus:outline-none"
            />
            <button
              type="submit"
              disabled={redeemingCard}
              className="sm:col-span-3 h-11 rounded-xl glass-btn-amber text-white text-xs font-bold disabled:opacity-60"
            >
              {redeemingCard ? 'Adding...' : 'Redeem'}
            </button>
          </form>

          {/* Wallet Ledger */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Gift Card &amp; Wallet Transactions
            </h3>
            {(currentCustomer.walletTransactions ?? []).length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                No wallet transactions yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/10">
                {(currentCustomer.walletTransactions ?? []).slice(0, 10).map((tx) => {
                  const isCredit = tx.type !== 'debit_order';
                  return (
                    <li key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{tx.note}</p>
                        <p className="text-[11px] text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <span
                        className={`tabular-nums font-bold ${
                          isCredit
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {isCredit ? '+' : '−'}
                        {formatINR(tx.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {myGiftCards.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                My Issued Gift Cards
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {myGiftCards.map((gc) => (
                  <div key={gc.id} className="p-3 rounded-xl glass-subtle text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">{gc.code}</span>
                      <span className="tabular-nums font-bold">{formatINR(gc.initialAmount)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      PIN: {gc.pin} · {gc.redeemedAt ? 'Redeemed' : 'Active'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(`${gc.code} (PIN: ${gc.pin})`);
                        setCopiedCode(gc.id);
                        setTimeout(() => setCopiedCode(null), 1500);
                      }}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1"
                    >
                      {copiedCode === gc.id ? (
                        <>
                          <Check className="w-3 h-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Voucher
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved UPI IDs */}
      <div className="glass-surface rounded-2xl p-6 space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Saved UPI IDs
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Keep trusted UPI handles handy for Direct UPI, BEE4 Wallet, and Cash on Delivery checkout
          </p>
        </div>

        {upiToast && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4" />
            {upiToast}
          </p>
        )}

        <form onSubmit={handleAddUpiId} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
          <input
            type="text"
            value={newUpiInput}
            onChange={(e) => {
              setNewUpiInput(e.target.value);
              if (upiError) setUpiError(null);
            }}
            placeholder="yourname@okaxis / yourname@ybl"
            className="flex-1 h-10 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 px-4 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add UPI ID
          </button>
        </form>
        {upiError && <p className="text-xs font-semibold text-rose-600">{upiError}</p>}

        {(currentCustomer.savedUpiIds ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {(currentCustomer.savedUpiIds ?? []).map((upi) => (
              <div
                key={upi}
                className="px-3 py-1.5 rounded-xl glass-subtle text-xs font-mono font-semibold inline-flex items-center gap-2"
              >
                <span>{upi}</span>
                <button
                  type="button"
                  aria-label={`Remove UPI ${upi}`}
                  onClick={() =>
                    onUpdateCustomer({
                      ...currentCustomer,
                      savedUpiIds: (currentCustomer.savedUpiIds ?? []).filter((id) => id !== upi),
                    })
                  }
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
