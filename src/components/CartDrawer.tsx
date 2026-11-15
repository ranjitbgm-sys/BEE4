import { useEffect } from 'react';
import { ArrowRight, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { CartItem } from '../types';
import {
  buildWhatsAppUrl,
  calculateCartTotals,
  formatINR,
  formatWhatsAppBagMessage,
  FREE_SHIPPING_THRESHOLD,
} from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  whatsappNumber: string;
  freeShippingThreshold: number;
  onClose: () => void;
  onUpdateQuantity: (productId: string, variant: string, delta: number) => void;
  onRemoveItem: (productId: string, variant: string) => void;
  onProceedToCheckout: () => void;
  onBrowseShop: () => void;
}

export function CartDrawer({
  isOpen,
  items,
  whatsappNumber,
  freeShippingThreshold,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onBrowseShop,
}: CartDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totals = calculateCartTotals(items, { freeShippingThreshold });
  const progressPercent =
    freeShippingThreshold <= 0
      ? 100
      : Math.min(100, Math.round((totals.subtotal / freeShippingThreshold) * 100));
  const whatsAppUrl = buildWhatsAppUrl(
    formatWhatsAppBagMessage(items, totals),
    whatsappNumber
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping Bag">
      <div
        className="fixed inset-0 bg-zinc-900/25 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 w-full max-w-md glass-drawer border-y-0 border-r-0 h-full flex flex-col">
        <div className="px-6 py-5 border-b border-white/75 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full glass-orb flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-amber-600" />
            </div>
            <h2 className="font-display text-lg font-bold text-zinc-900">
              Your Bag <span className="text-zinc-500 font-normal tabular-nums">({totals.itemCount})</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-white/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping progress */}
        <div className="px-6 py-3.5 glass-subtle border-x-0 border-t-0">
          <p className="text-xs font-medium text-zinc-700 tabular-nums">
            {totals.amountToFreeShipping === 0 && totals.subtotal > 0
              ? 'Free India-wide delivery unlocked on this order.'
              : `Add ${formatINR(totals.amountToFreeShipping)} more to unlock free delivery (orders ${formatINR(freeShippingThreshold)}+).`}
          </p>
          <div className="mt-2 h-2 w-full bg-zinc-900/10 rounded-full overflow-hidden p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 rounded-full glass-orb flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-amber-700/80" />
              </div>
              <h3 className="font-display text-base font-semibold text-zinc-900">Your bag is empty</h3>
              <p className="mt-1.5 text-sm text-zinc-600 max-w-[240px]">
                Explore trendy gifts, water bottles, handbags, and 3D toys starting at ₹199.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBrowseShop();
                }}
                className="mt-6 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
              >
                Browse Products
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={`${item.productId}::${item.variant}`} className="p-3 rounded-2xl glass-subtle flex gap-3.5">
                  <div className="w-20 h-16 rounded-xl bg-white/50 overflow-hidden shrink-0 border border-white/75">
                    <ProductImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900 line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.variant}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.productId, item.variant)}
                        aria-label={`Remove ${item.title}`}
                        className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-xl glass-btn-secondary">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.variant, -1)}
                          aria-label={`Decrease quantity of ${item.title}`}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold tabular-nums text-zinc-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.productId, item.variant, 1)}
                          aria-label={`Increase quantity of ${item.title}`}
                          className="p-1.5 text-zinc-600 hover:text-zinc-900"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-zinc-900 tabular-nums">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-white/75 glass-subtle border-x-0 border-b-0 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-zinc-900">
                  {formatINR(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping</span>
                <span className="tabular-nums font-medium text-zinc-900">
                  {totals.shippingFee === 0 ? 'FREE' : formatINR(totals.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-zinc-900/10">
                <span>Estimated Total</span>
                <span className="tabular-nums">{formatINR(totals.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full py-3 px-5 rounded-xl glass-btn-amber text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl glass-btn-secondary text-zinc-800 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>Order Entire Bag on WhatsApp</span>
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}
