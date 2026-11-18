import { ArrowLeft, ArrowRight, MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { CartItem } from '../types';
import {
  buildWhatsAppUrl,
  calculateCartTotals,
  formatINR,
  formatWhatsAppBagMessage,
} from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface CartPageViewProps {
  items: CartItem[];
  whatsappNumber: string;
  freeShippingThreshold: number;
  standardShippingFee?: number;
  onUpdateQuantity: (productId: string, variant: string, delta: number) => void;
  onRemoveItem: (productId: string, variant: string) => void;
  onProceedToCheckout: () => void;
  onContinueShopping: () => void;
}

export function CartPageView({
  items,
  whatsappNumber,
  freeShippingThreshold,
  standardShippingFee = 49,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onContinueShopping,
}: CartPageViewProps) {
  const totals = calculateCartTotals(items, {
    freeShippingThreshold,
    standardShippingFee,
  });
  const progressPercent =
    freeShippingThreshold <= 0
      ? 100
      : Math.min(100, Math.round((totals.subtotal / freeShippingThreshold) * 100));
  const whatsAppUrl = buildWhatsAppUrl(
    formatWhatsAppBagMessage(items, totals),
    whatsappNumber
  );

  return (
    <section className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <button
        type="button"
        onClick={onContinueShopping}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Continue Shopping</span>
      </button>

      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          Shopping Cart{' '}
          <span className="text-slate-500 dark:text-zinc-400 font-normal tabular-nums text-xl">
            ({totals.itemCount})
          </span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="glass-surface rounded-2xl p-10 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
            <ShoppingBag className="w-7 h-7 text-amber-700 dark:text-amber-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Your BEE4 Cart is empty
          </h2>
          <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto">
            Explore BEE4 embossers, custom lithophanes, wall clocks, and brain-training toys starting at ₹349.
          </p>
          <button
            type="button"
            onClick={onContinueShopping}
            className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold"
          >
            Browse BEE4 Catalog
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Items */}
          <div className="lg:col-span-7 space-y-4">
            <div className="glass-surface rounded-2xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 tabular-nums">
                {totals.amountToFreeShipping === 0 && totals.subtotal > 0
                  ? 'Free India-wide delivery unlocked on this order.'
                  : `Add ${formatINR(totals.amountToFreeShipping)} more to unlock free delivery (orders ${formatINR(freeShippingThreshold)}+).`}
              </p>
              <div className="h-2 w-full bg-slate-200 dark:bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={`${item.productId}::${item.variant}`}
                  className="glass-surface rounded-2xl p-4 flex gap-3.5"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {item.variant}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId, item.variant)}
                        aria-label={`Remove ${item.title}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-xl glass-btn-secondary">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.variant, -1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="p-2 text-slate-700 dark:text-zinc-200"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.variant, 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="p-2 text-slate-700 dark:text-zinc-200"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-5 glass-surface rounded-2xl p-6 space-y-4 lg:sticky lg:top-24">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Price Summary
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Subtotal ({totals.itemCount} items)</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  {formatINR(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-zinc-300">
                <span>Shipping</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">
                  {totals.shippingFee === 0 ? 'FREE' : formatINR(totals.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-white/10">
                <span>Estimated Total</span>
                <span className="tabular-nums">{formatINR(totals.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedToCheckout}
              className="w-full py-3.5 px-5 rounded-xl glass-btn-amber text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl glass-btn-secondary text-slate-800 dark:text-zinc-100 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Order Entire Bag on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
