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
        `Hi BEE4! I have a question about "${activeProduct.title}" (${formatINR(activeProduct.price)}). Is it ready to ship?`,
        whatsappNumber
      )
    : null;

  const giftHelpUrl = buildWhatsAppUrl(
    'Hi BEE4! Can you suggest gift ideas for a birthday or festival under ₹999?',
    whatsappNumber
  );

  const customWhatsAppUrl = buildWhatsAppUrl(
    customMessage.trim() || 'Hi BEE4! I would like to know more about your products.',
    whatsappNumber
  );

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label="WhatsApp quick order and support"
          className="w-[calc(100vw-2rem)] max-w-[340px] bg-white border border-[#E6E4DD] rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="px-4 py-3.5 bg-zinc-900 text-white flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-sm font-bold truncate">BEE4 on WhatsApp</p>
              <p className="text-xs text-zinc-300 tabular-nums truncate">{displayNumber}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp panel"
              className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            <p className="text-xs text-zinc-600 leading-relaxed">
              Order directly, ask about gift wrapping, or get help picking a product in seconds.
            </p>

            <div className="space-y-2">
              {cart.length > 0 && (
                <a
                  href={bagWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E6E4DD] text-zinc-900 text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="truncate">Ask about {activeProduct.title}</span>
                  <ArrowUpRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </a>
              )}

              <a
                href={giftHelpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F6F2] hover:bg-[#EFECE6] border border-[#E6E4DD] text-zinc-900 text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
              >
                <span className="truncate">Get Gift Ideas Under ₹999</span>
                <ArrowUpRight className="w-4 h-4 text-zinc-500 shrink-0" />
              </a>
            </div>

            <div className="pt-2 border-t border-[#F0EFEA] space-y-2">
              <label htmlFor="wa-custom-msg" className="block text-xs font-semibold text-zinc-700">
                Or write a quick message
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="wa-custom-msg"
                  type="text"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Hi, is COD available for..."
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-white border border-[#E6E4DD] rounded-lg focus:border-emerald-700 focus:outline-none"
                />
                <a
                  href={customWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Send message on WhatsApp"
                  className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shrink-0"
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
        className="h-11 px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg inline-flex items-center gap-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
      >
        <MessageCircle className="w-4 h-4 shrink-0" />
        <span>WhatsApp</span>
      </button>
    </div>
  );
}
