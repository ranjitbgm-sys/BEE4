import { StorePage } from '../types';
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/storeLogic';

interface FooterProps {
  whatsappNumber: string;
  supportEmail: string;
  promoCode: string;
  promoDiscountPercent: number;
  onNavigate: (page: StorePage) => void;
}

export function Footer({
  whatsappNumber,
  supportEmail,
  promoCode,
  promoDiscountPercent,
  onNavigate,
}: FooterProps) {
  return (
    <footer className="glass-surface border-x-0 border-b-0 mt-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <span className="font-display text-xl font-extrabold tracking-tight text-zinc-900">
              BEE4
            </span>
            <p className="mt-3 text-sm text-zinc-600 max-w-sm leading-relaxed">
              Curated everyday essentials, trendy gifts, bottles, handbags, 3D toys, and handmade
              Indian showpieces — designed to delight between ₹199 and ₹999.
            </p>
            <p className="mt-4 text-xs text-zinc-500">
              Bengaluru Dispatch Studio · Ships pan-India in 3–5 business days
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-900 mb-3">
              Store
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-600">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="hover:text-zinc-900 transition-colors"
                >
                  Shop All Products
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('gifts')}
                  className="hover:text-zinc-900 transition-colors"
                >
                  Birthday &amp; Festival Gifts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-zinc-900 transition-colors"
                >
                  Our Story
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-zinc-900 transition-colors"
                >
                  Contact &amp; Bulk Orders
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-900 mb-3">
              Support &amp; Manage
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-600">
              <li>{supportEmail}</li>
              <li className="tabular-nums">
                <a
                  href={buildWhatsAppUrl('Hi BEE4! I would like to chat with your store.', whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-900 underline underline-offset-2"
                >
                  {formatWhatsAppDisplay(whatsappNumber)} (WhatsApp)
                </a>
              </li>
              <li>UPI · Cards · Cash on Delivery</li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="text-xs font-semibold text-zinc-900 hover:text-amber-700 underline underline-offset-4 transition-colors"
                >
                  My Account &amp; Order Tracking
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-900/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} BEE4 India. All rights reserved.</p>
          {promoCode && promoDiscountPercent > 0 && (
            <p>
              Use code {promoCode} at checkout for {promoDiscountPercent}% off your first order.
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
