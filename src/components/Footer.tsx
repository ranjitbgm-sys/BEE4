import { useRef } from 'react';
import { Smartphone } from 'lucide-react';
import { BRAND_LOGO_URL } from '../data/catalog';
import { StorePage } from '../types';
import { buildWhatsAppUrl, formatWhatsAppDisplay } from '../utils/storeLogic';

interface FooterProps {
  whatsappNumber: string;
  supportEmail: string;
  promoCode: string;
  promoDiscountPercent: number;
  showInstallApp?: boolean;
  onInstallApp?: () => void;
  onNavigate: (page: StorePage) => void;
  onOpenGiftCardModal?: () => void;
}

export function Footer({
  whatsappNumber,
  supportEmail,
  showInstallApp = false,
  onInstallApp,
  onNavigate,
}: FooterProps) {
  const secretTapRef = useRef<{ count: number; lastTapMs: number }>({
    count: 0,
    lastTapMs: 0,
  });

  const handleCopyrightTap = () => {
    const now = Date.now();
    const withinWindow = now - secretTapRef.current.lastTapMs <= 2500;
    const nextCount = withinWindow ? secretTapRef.current.count + 1 : 1;
    secretTapRef.current = { count: nextCount, lastTapMs: now };
    if (nextCount >= 5) {
      secretTapRef.current = { count: 0, lastTapMs: 0 };
      onNavigate('manager');
    }
  };

  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-14">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-24 sm:pb-24">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
              <img src={BRAND_LOGO_URL} alt="BEE4 logo" className="w-full h-full object-contain" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-slate-900 dark:text-white">BEE4</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                3D Crafts, Toys &amp; Custom Studio · Banka, Bihar
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              About BEE4
            </button>
            <button
              type="button"
              onClick={() => onNavigate('contact')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Contact Support
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal-terms')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal-privacy')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal-returns')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Returns
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal-shipping')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Shipping
            </button>
            <button
              type="button"
              onClick={() => onNavigate('legal-copyright')}
              className="hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
            >
              Copyright
            </button>
            {showInstallApp && onInstallApp && (
              <button
                type="button"
                onClick={onInstallApp}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
              >
                <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Install App</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <p onClick={handleCopyrightTap} className="select-none">
            © {new Date().getFullYear()} BEE4 Studio (bee4.in). All rights reserved.
          </p>
          <p className="tabular-nums">
            Support: {supportEmail} ·{' '}
            <a
              href={buildWhatsAppUrl('Hi BEE4! I need help with an order.', whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-slate-800 dark:hover:text-white"
            >
              WhatsApp {formatWhatsAppDisplay(whatsappNumber)}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
