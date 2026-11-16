import { FormEvent, useState } from 'react';
import { Gift, Plus, Tag, Trash2 } from 'lucide-react';
import {
  CouponDiscountType,
  CouponRecord,
  GiftOccasion,
  StoreSettings,
} from '../../types';
import { DEFAULT_STORE_SETTINGS } from '../../data/catalog';
import { formatINR } from '../../utils/storeLogic';

interface AdminDiscountsTabProps {
  coupons: CouponRecord[];
  settings: StoreSettings;
  onSaveCoupon: (coupon: CouponRecord) => void;
  onDeleteCoupon: (couponId: string) => void;
  onUpdateSettings: (next: StoreSettings) => void;
}

const GIFT_OCCASIONS = Object.values(GiftOccasion).filter(
  (o) => o !== GiftOccasion.ALL
) as Exclude<GiftOccasion, GiftOccasion.ALL>[];

export function AdminDiscountsTab({
  coupons,
  settings,
  onSaveCoupon,
  onDeleteCoupon,
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
    </div>
  );
}
