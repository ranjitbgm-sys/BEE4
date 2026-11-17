import { FormEvent, useState } from 'react';
import { Check, Copy, CreditCard, Gift, Plus, Tag, Trash2 } from 'lucide-react';
import {
  CouponDiscountType,
  CouponRecord,
  GiftCardRecord,
  GiftOccasion,
  StoreSettings,
} from '../../types';
import { DEFAULT_STORE_SETTINGS } from '../../data/catalog';
import { formatINR } from '../../utils/storeLogic';

interface AdminDiscountsTabProps {
  coupons: CouponRecord[];
  giftCards?: GiftCardRecord[];
  settings: StoreSettings;
  onSaveCoupon: (coupon: CouponRecord) => void;
  onDeleteCoupon: (couponId: string) => void;
  onCreateGiftCard?: (input: {
    amount: number;
    recipientName: string;
    recipientEmail: string;
    message: string;
    issuedBy?: 'Customer' | 'Admin';
  }) => Promise<GiftCardRecord> | GiftCardRecord;
  onToggleGiftCardActive?: (card: GiftCardRecord) => void;
  onUpdateSettings: (next: StoreSettings) => void;
}

const GIFT_OCCASIONS = Object.values(GiftOccasion).filter(
  (o) => o !== GiftOccasion.ALL
) as Exclude<GiftOccasion, GiftOccasion.ALL>[];

export function AdminDiscountsTab({
  coupons,
  giftCards = [],
  settings,
  onSaveCoupon,
  onDeleteCoupon,
  onCreateGiftCard,
  onToggleGiftCardActive,
  onUpdateSettings,
}: AdminDiscountsTabProps) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<CouponDiscountType>('percentage');
  const [value, setValue] = useState('15');
  const [minOrderValue, setMinOrderValue] = useState('349');
  const [usageLimit, setUsageLimit] = useState('250');
  const [expiresAt, setExpiresAt] = useState('2027-03-31');
  const [prepaidOnly, setPrepaidOnly] = useState(false);

  // Admin Gift Card issuance state
  const [gcAmount, setGcAmount] = useState('500');
  const [gcRecipientName, setGcRecipientName] = useState('');
  const [gcRecipientEmail, setGcRecipientEmail] = useState('');
  const [gcMessage, setGcMessage] = useState('BEE4 Studio Goodwill / Promo Gift Card');
  const [gcBusy, setGcBusy] = useState(false);
  const [gcError, setGcError] = useState('');
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);

  const [giftWrapEnabled, setGiftWrapEnabled] = useState(
    settings.giftWrapEnabled ?? DEFAULT_STORE_SETTINGS.giftWrapEnabled
  );
  const [giftWrapFee, setGiftWrapFee] = useState(
    String(settings.giftWrapFee ?? DEFAULT_STORE_SETTINGS.giftWrapFee)
  );
  const [weights, setWeights] = useState<Record<Exclude<GiftOccasion, GiftOccasion.ALL>, number>>(
    () =>
      settings.giftFinderWeights ?? DEFAULT_STORE_SETTINGS.giftFinderWeights
  );

  const handleCreateCoupon = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (cleanCode.length < 3) return;
    onSaveCoupon({
      id: `cpn-${cleanCode.toLowerCase()}-${Date.now().toString().slice(-4)}`,
      code: cleanCode,
      description:
        description.trim() ||
        `${discountType === 'percentage' ? `${value}%` : `₹${value}`} off campaign`,
      discountType,
      value: Math.max(1, Math.round(Number(value) || 10)),
      minOrderValue: Math.max(0, Math.round(Number(minOrderValue) || 0)),
      prepaidOnly,
      usageLimit: Math.max(0, Math.round(Number(usageLimit) || 100)),
      usedCount: 0,
      expiresAt: expiresAt || '2027-03-31',
      active: true,
    });
    setCode('');
    setDescription('');
  };

  const handleSaveGiftingConfig = (e: FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      giftWrapEnabled,
      giftWrapFee: Math.max(0, Math.round(Number(giftWrapFee) || 0)),
      giftFinderWeights: weights,
    });
  };

  const handleIssueAdminGiftCard = async (e: FormEvent) => {
    e.preventDefault();
    if (!onCreateGiftCard) return;
    setGcError('');
    const numAmt = Math.round(Number(gcAmount) || 0);
    if (numAmt < 50) {
      setGcError('Gift card value must be at least ₹50.');
      return;
    }
    if (gcRecipientName.trim().length < 2) {
      setGcError('Enter recipient name (or customer name).');
      return;
    }
    setGcBusy(true);
    try {
      await onCreateGiftCard({
        amount: numAmt,
        recipientName: gcRecipientName.trim(),
        recipientEmail: gcRecipientEmail.trim().toLowerCase() || 'customer@bee4.in',
        message: gcMessage.trim(),
        issuedBy: 'Admin',
      });
      setGcRecipientName('');
      setGcRecipientEmail('');
    } catch (err) {
      setGcError(err instanceof Error ? err.message : 'Failed to issue gift card.');
    } finally {
      setGcBusy(false);
    }
  };

  const handleCopyGiftCard = async (card: GiftCardRecord) => {
    const txt = `BEE4 Gift Card (${formatINR(card.initialAmount)})\nCode: ${card.code}\nPIN: ${card.pin}\nRedeem in My Account -> Gift Cards & Wallet on bee4.in`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopiedCardId(card.id);
      window.setTimeout(() => setCopiedCardId(null), 1800);
    } catch {
      // Ignore clipboard error
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Coupon Form */}
      <form onSubmit={handleCreateCoupon} className="glass-surface rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
            Create Promo Coupon
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label htmlFor="cpn-code" className="block text-[11px] font-semibold mb-1">
              Coupon Code
            </label>
            <input
              id="cpn-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="DIWALI20"
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono uppercase focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cpn-type" className="block text-[11px] font-semibold mb-1">
              Type
            </label>
            <select
              id="cpn-type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              <option value="percentage">% Off</option>
              <option value="flat">Flat ₹ Off</option>
            </select>
          </div>

          <div>
            <label htmlFor="cpn-val" className="block text-[11px] font-semibold mb-1">
              Discount Value
            </label>
            <input
              id="cpn-val"
              type="number"
              min={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cpn-mov" className="block text-[11px] font-semibold mb-1">
              Min Order (₹)
            </label>
            <input
              id="cpn-mov"
              type="number"
              min={0}
              value={minOrderValue}
              onChange={(e) => setMinOrderValue(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cpn-limit" className="block text-[11px] font-semibold mb-1">
              Usage Limit
            </label>
            <input
              id="cpn-limit"
              type="number"
              min={0}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cpn-exp" className="block text-[11px] font-semibold mb-1">
              Expiry Date
            </label>
            <input
              id="cpn-exp"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Campaign description shown internally (optional)..."
              className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold px-2">
            <input
              type="checkbox"
              checked={prepaidOnly}
              onChange={(e) => setPrepaidOnly(e.target.checked)}
              className="w-4 h-4 accent-amber-600"
            />
            <span>UPI/Prepaid Only</span>
          </label>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Coupon</span>
          </button>
        </div>
      </form>

      {/* Active & Paused Coupons Table */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10">
          <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
            Live Promo Coupons ({coupons.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Offer</th>
                <th className="py-3 px-4">Rules</th>
                <th className="py-3 px-4 text-center">Redemptions</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
              {coupons.map((cpn) => (
                <tr key={cpn.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                  <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                    {cpn.code}
                    <div className="font-sans font-normal text-[11px] text-zinc-500 dark:text-zinc-400">
                      {cpn.description}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {cpn.discountType === 'percentage' ? `${cpn.value}% OFF` : `${formatINR(cpn.value)} OFF`}
                  </td>
                  <td className="py-3 px-4 tabular-nums text-zinc-600 dark:text-zinc-300">
                    MOV {formatINR(cpn.minOrderValue)} · Exp {cpn.expiresAt}
                    {cpn.prepaidOnly && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 text-[10px] font-bold">
                        Prepaid Only
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums">
                    {cpn.usedCount} / {cpn.usageLimit || '∞'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => onSaveCoupon({ ...cpn, active: !cpn.active })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        cpn.active
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {cpn.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      aria-label={`Delete coupon ${cpn.code}`}
                      onClick={() => onDeleteCoupon(cpn.id)}
                      className="p-2 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gift Wrap & Gift Finder Ranking Weights */}
      <form onSubmit={handleSaveGiftingConfig} className="glass-surface rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <div>
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
              Gift Wrap Fee &amp; Gift Finder Occasion Weights
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Synchronizes directly with bee4.in Checkout Gift Wrap option &amp; Gift Ideas sorting
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <label className="inline-flex items-center gap-2 text-xs font-semibold">
            <input
              type="checkbox"
              checked={giftWrapEnabled}
              onChange={(e) => setGiftWrapEnabled(e.target.checked)}
              className="w-4 h-4 accent-amber-600"
            />
            <span>Enable Gift Wrapping at Checkout</span>
          </label>

          <div>
            <label htmlFor="gift-wrap-fee" className="block text-[11px] font-semibold mb-1">
              Gift Wrap Fee (₹)
            </label>
            <input
              id="gift-wrap-fee"
              type="number"
              min={0}
              value={giftWrapFee}
              onChange={(e) => setGiftWrapFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {GIFT_OCCASIONS.map((occ) => (
            <div key={occ} className="glass-subtle rounded-2xl p-3">
              <label
                htmlFor={`weight-${occ}`}
                className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1 truncate"
              >
                {occ}
              </label>
              <input
                id={`weight-${occ}`}
                type="number"
                min={1}
                max={20}
                value={weights[occ] ?? 5}
                onChange={(e) =>
                  setWeights((prev) => ({
                    ...prev,
                    [occ]: Math.max(1, Math.min(20, Number(e.target.value) || 5)),
                  }))
                }
                className="w-full px-2.5 py-1.5 rounded-xl glass-input text-xs font-bold tabular-nums focus:outline-none"
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="submit" className="px-5 py-2.5 rounded-xl glass-btn-ink text-xs font-semibold">
            Save Gifting &amp; Coupon Rules
          </button>
        </div>
      </form>

      {/* Admin Digital Gift Cards Manager */}
      <div className="glass-surface rounded-3xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                Digital Gift Cards &amp; Store Credit Manager ({giftCards.length})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Issue promotional or refund store-credit gift cards (16-char code + 4-digit PIN) synced with Supabase.
              </p>
            </div>
          </div>
        </div>

        {onCreateGiftCard && (
          <form onSubmit={handleIssueAdminGiftCard} className="glass-subtle rounded-2xl p-4 space-y-3">
            {gcError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {gcError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label htmlFor="admin-gc-amount" className="block text-[11px] font-semibold mb-1">
                  Amount (₹)
                </label>
                <input
                  id="admin-gc-amount"
                  type="number"
                  min={50}
                  step={50}
                  value={gcAmount}
                  onChange={(e) => setGcAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold tabular-nums focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="admin-gc-name" className="block text-[11px] font-semibold mb-1">
                  Recipient Name *
                </label>
                <input
                  id="admin-gc-name"
                  type="text"
                  required
                  value={gcRecipientName}
                  onChange={(e) => setGcRecipientName(e.target.value)}
                  placeholder="Customer Name"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="admin-gc-email" className="block text-[11px] font-semibold mb-1">
                  Recipient Email
                </label>
                <input
                  id="admin-gc-email"
                  type="email"
                  value={gcRecipientEmail}
                  onChange={(e) => setGcRecipientEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="admin-gc-note" className="block text-[11px] font-semibold mb-1">
                  Note / Campaign
                </label>
                <input
                  id="admin-gc-note"
                  type="text"
                  value={gcMessage}
                  onChange={(e) => setGcMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={gcBusy}
                  className="w-full px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{gcBusy ? 'Issuing...' : 'Issue Gift Card'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="overflow-x-auto rounded-2xl border border-zinc-900/8 dark:border-white/10">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">Code &amp; PIN</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4 text-right">Balance / Initial</th>
                <th className="py-3 px-4">Issued</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
              {giftCards.map((card) => (
                <tr key={card.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                  <td className="py-3 px-4 font-mono">
                    <div className="font-bold text-zinc-900 dark:text-white">{card.code}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      PIN: <strong>{card.pin}</strong> · {card.issuedReason || 'Purchased'}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-zinc-900 dark:text-white">{card.recipientName}</div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{card.recipientEmail}</div>
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      {formatINR(card.balance)}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400"> / {formatINR(card.initialAmount)}</span>
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {card.createdAt.slice(0, 10)}
                    {card.redeemedAt && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                        Redeemed {card.redeemedAt.slice(0, 10)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {onToggleGiftCardActive ? (
                      <button
                        type="button"
                        onClick={() => onToggleGiftCardActive(card)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          card.balance <= 0
                            ? 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300'
                            : card.active
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        {card.balance <= 0 ? 'Redeemed' : card.active ? 'Active' : 'Disabled'}
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold">
                        {card.balance <= 0 ? 'Redeemed' : card.active ? 'Active' : 'Disabled'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => void handleCopyGiftCard(card)}
                      className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      {copiedCardId === card.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {giftCards.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-zinc-500 dark:text-zinc-400">
                    No digital gift cards issued yet. Customers buying gift cards or admin store credits appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
