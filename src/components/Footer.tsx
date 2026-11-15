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
            <span className="font-display text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              BEE4
            </span>
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 max-w-md leading-relaxed">
              D2C studio for East-Asian (Japanese, Korean &amp; Chinese) screen-free brain-training
              toys — precision 3D-printed in Bio-PLA between ₹349 and ₹899 for ages 3–15.
            </p>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Bengaluru 3D-Print Studio · Ships across India, the US &amp; the UK
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-900 dark:text-white mb-3">
              Brain Toys Catalog
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('shop')}
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  All 16 Brain Toys
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('gifts')}
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Return &amp; Birthday Gifts
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Our Story
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  School &amp; Bulk Orders
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-900 dark:text-white mb-3">
              Support &amp; Checkout
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              <li>{supportEmail}</li>
              <li className="tabular-nums">
                <a
                  href={buildWhatsAppUrl(
                    'Hi BEE4! I would like help choosing a brain toy.',
                    whatsappNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-900 dark:hover:text-white underline underline-offset-2"
                >
                  {formatWhatsAppDisplay(whatsappNumber)} (WhatsApp)
                </a>
              </li>
              <li>Razorpay · UPI · Cards · Cash on Delivery</li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('account')}
                  className="text-xs font-semibold text-zinc-900 dark:text-amber-300 hover:text-amber-700 underline underline-offset-4 transition-colors"
                >
                  My Account &amp; Order Tracking
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-zinc-900/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <p>© {new Date().getFullYear()} BEE4 Studio (bee4.in). All rights reserved.</p>
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
