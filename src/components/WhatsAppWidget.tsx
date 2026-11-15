import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageCircle, Send, X } from 'lucide-react';
import { CartItem, Product } from '../types';
import {
  buildWhatsAppUrl,
  calculateCartTotals,
  formatINR,
  formatWhatsAppBagMessage,
  formatWhatsAppDisplay,
} from '../utils/storeLogic';

interface WhatsAppWidgetProps {
  whatsappNumber: string;
  cart: CartItem[];
  activeProduct: Product | null;
}

export function WhatsAppWidget({
  whatsappNumber,
  cart,
  activeProduct,
}: WhatsAppWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const totals = calculateCartTotals(cart);
  const displayNumber = formatWhatsAppDisplay(whatsappNumber);

  const bagWhatsAppUrl = buildWhatsAppUrl(
    formatWhatsAppBagMessage(cart, totals),
    whatsappNumber
  );

  const productWhatsAppUrl = activeProduct
    ? buildWhatsAppUrl(
        `Hi BEE4! I have a question about "${activeProduct.title}" (${formatINR(activeProduct.price)}, ${activeProduct.ageGroup}). Is it ready to ship?`,
        whatsappNumber
      )
    : null;

  const giftHelpUrl = buildWhatsAppUrl(
    'Hi BEE4! Please recommend screen-free brain-training toys between ₹349 and ₹899 for my child.',
    whatsappNumber
  );

  const customWhatsAppUrl = buildWhatsAppUrl(
    customMessage.trim() || 'Hi BEE4! I would like to know more about your East-Asian brain toys.',
    whatsappNumber
  );

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="WhatsApp quick order and support"
          className="w-[calc(100vw-2rem)] max-w-[340px] glass-drawer rounded-3xl overflow-hidden"
        >
          <div className="px-4 py-3.5 bg-zinc-900/90 backdrop-blur-xl border-b border-white/15 text-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold truncate">BEE4 on WhatsApp</p>
              <p className="text-xs text-zinc-300 tabular-nums truncate">{displayNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp panel"
              className="p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Order directly, get age-based brain toy recommendations, or book school bulk kits in
              seconds.
            </p>

            <div className="space-y-2">
              {cart.length > 0 && (
                <a
                  href={bagWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3.5 py-2.5 rounded-2xl glass-btn-emerald text-white text-xs font-semibold flex items-center justify-between gap-2 transition-all"
                >
                  <span className="truncate">
                    Send My Bag ({totals.itemCount} · {formatINR(totals.total)})
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0" />
                </a>
              )}

              {productWhatsAppUrl && activeProduct && (
                <a
                  href={productWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3.5 py-2.5 rounded-2xl glass-btn-secondary text-zinc-900 dark:text-white text-xs font-semibold flex items-center justify-between gap-2 transition-all"
                >
                  <span className="truncate">Ask about {activeProduct.title}</span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                </a>
              )}

              <a
                href={giftHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-2xl glass-btn-secondary text-zinc-900 dark:text-white text-xs font-semibold flex items-center justify-between gap-2 transition-all"
              >
                <span className="truncate">Get Age-Wise Recommendations</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              </a>
            </div>

            <div className="pt-2 border-t border-zinc-900/10 dark:border-white/10 space-y-2">
              <label
                htmlFor="wa-custom-msg"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Or write a quick message
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="wa-custom-msg"
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Hi, which toy is best for age 7?"
                  className="flex-1 min-w-0 px-3 py-2 text-xs glass-input rounded-xl focus:outline-none"
                />
                <a
                  href={customWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Send message on WhatsApp"
                  className="p-2 rounded-xl glass-btn-emerald text-white transition-all shrink-0"
                >
                  <Send className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close WhatsApp quick order' : 'Chat or order on WhatsApp'}
        aria-expanded={isOpen}
        className="h-11 px-4 rounded-full glass-btn-emerald text-white inline-flex items-center gap-2 text-sm font-semibold transition-all whitespace-nowrap shrink-0"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>WhatsApp</span>
      </button>
    </div>
  );
}
