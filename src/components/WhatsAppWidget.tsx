import { useEffect, useState } from 'react';
import { ArrowUpRight, MessageCircle, PackageCheck, Send, Sparkles, X } from 'lucide-react';
import { CartItem, Product } from '../types';
import {
  buildWhatsAppUrl,
  calculateCartTotals,
  formatINR,
  formatWhatsAppBagMessage,
  formatWhatsAppDisplay,
} from '../utils/storeLogic';

interface WhatsAppWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber: string;
  cart: CartItem[];
  activeProduct: Product | null;
}

export function WhatsAppWidget({
  isOpen,
  onClose,
  whatsappNumber,
  cart,
  activeProduct,
}: WhatsAppWidgetProps) {
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totals = calculateCartTotals(cart);
  const displayNumber = formatWhatsAppDisplay(whatsappNumber);

  const directChatUrl = buildWhatsAppUrl(
    'Hi BEE4! I would like quick assistance.',
    whatsappNumber
  );

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

  const orderHelpUrl = buildWhatsAppUrl(
    'Hi BEE4 Support! I need help tracking or updating my BEE4 order.',
    whatsappNumber
  );

  const customOrderUrl = buildWhatsAppUrl(
    'Hi BEE4 Studio! I want to place a Custom 3D Order Inquiry (Custom Lithophane / Name Embosser / Gift Kit).',
    whatsappNumber
  );

  const giftHelpUrl = buildWhatsAppUrl(
    'Hi BEE4! Please recommend screen-free brain-training toys between ₹349 and ₹899 for my child.',
    whatsappNumber
  );

  const customWhatsAppUrl = buildWhatsAppUrl(
    customMessage.trim() || 'Hi BEE4! I would like to inquire about a custom 3D printed order.',
    whatsappNumber
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-end justify-end">
      {/* Dismissible backdrop */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close WhatsApp support sheet"
        className="fixed inset-0 bg-slate-950/45"
      />

      {/* Anchored WhatsApp Action Sheet / Modal above bottom bar */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="BEE4 WhatsApp Support & Custom Order Inquiry"
        className="relative z-10 w-full sm:w-[390px] sm:mr-5 mb-[68px] sm:mb-[72px] mx-2 sm:mx-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3.5 bg-slate-900 dark:bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white inline-flex items-center justify-center shrink-0">
              <MessageCircle className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold truncate">BEE4 on WhatsApp</p>
              <p className="text-xs text-slate-300 tabular-nums truncate">{displayNumber}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close WhatsApp panel"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Chat directly with BEE4 Studio for instant order help, custom 3D lithophanes & embossers,
            or age-wise toy recommendations.
          </p>

          <div className="space-y-2">
            <a
              href={directChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>Quick WhatsApp Chat</span>
              </span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </a>

            {cart.length > 0 && (
              <a
                href={bagWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
              >
                <span className="truncate">
                  Send My Cart ({totals.itemCount} · {formatINR(totals.total)})
                </span>
                <ArrowUpRight className="w-4 h-4 shrink-0" />
              </a>
            )}

            {productWhatsAppUrl && activeProduct && (
              <a
                href={productWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
              >
                <span className="truncate">Ask about {activeProduct.title}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              </a>
            )}

            <a
              href={orderHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <PackageCheck className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Order Help & Delivery Tracking</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            </a>

            <a
              href={customOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
            >
              <span className="inline-flex items-center gap-2 truncate">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Custom 3D Order Inquiry</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            </a>

            <a
              href={giftHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-between gap-2 transition-colors"
            >
              <span className="truncate">Get Age-Wise Toy Recommendations</span>
              <ArrowUpRight className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
            </a>
          </div>

          <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <label
              htmlFor="wa-custom-msg"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-200"
            >
              Custom 3D inquiry or direct message
            </label>
            <div className="flex items-center gap-2">
              <input
                id="wa-custom-msg"
                type="text"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Ask about custom lithophanes, bulk kits..."
                className="flex-1 min-w-0 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
              />
              <a
                href={customWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Send message on WhatsApp"
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
