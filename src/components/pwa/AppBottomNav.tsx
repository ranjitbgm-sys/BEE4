import { useState } from 'react';
import { Home, MessageCircle, ShoppingCart, User, Wallet } from 'lucide-react';
import { CartItem, Product, StorePage } from '../../types';
import { WhatsAppWidget } from '../WhatsAppWidget';

interface AppBottomNavProps {
  activePage: StorePage;
  cartCount: number;
  whatsappNumber: string;
  cart?: CartItem[];
  activeProduct?: Product | null;
  onNavigate: (page: StorePage) => void;
}

export function AppBottomNav({
  activePage,
  cartCount,
  whatsappNumber,
  cart = [],
  activeProduct = null,
  onNavigate,
}: AppBottomNavProps) {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  const isHome =
    activePage === 'home' ||
    activePage === 'shop' ||
    activePage === 'gifts' ||
    activePage === 'product';
  const isMe =
    activePage === 'account' ||
    activePage === 'orders' ||
    activePage === 'order-detail';
  const isWallet = activePage === 'wallet';
  const isCart = activePage === 'cart' || activePage === 'checkout';

  const handleNav = (page: StorePage) => {
    setIsWhatsAppOpen(false);
    onNavigate(page);
  };

  return (
    <>
      <WhatsAppWidget
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        whatsappNumber={whatsappNumber}
        cart={cart}
        activeProduct={activeProduct}
      />

      <nav
        aria-label="Primary app navigation bar"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-2px_10px_rgba(15,23,42,0.06)] pwa-safe-bottom select-none-nav"
      >
        <div className="max-w-[760px] mx-auto grid grid-cols-5 h-14 items-center">
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => handleNav('home')}
            aria-current={isHome && !isWhatsAppOpen ? 'page' : undefined}
            className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              isHome && !isWhatsAppOpen
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Home className={`w-5 h-5 ${isHome && !isWhatsAppOpen ? 'stroke-[2.3]' : 'stroke-[1.9]'}`} />
            <span>Home</span>
          </button>

          {/* 2. Me */}
          <button
            type="button"
            onClick={() => handleNav('account')}
            aria-current={isMe && !isWhatsAppOpen ? 'page' : undefined}
            className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              isMe && !isWhatsAppOpen
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className={`w-5 h-5 ${isMe && !isWhatsAppOpen ? 'stroke-[2.3]' : 'stroke-[1.9]'}`} />
            <span>Me</span>
          </button>

          {/* 3. Wallet */}
          <button
            type="button"
            onClick={() => handleNav('wallet')}
            aria-current={isWallet && !isWhatsAppOpen ? 'page' : undefined}
            className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              isWallet && !isWhatsAppOpen
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className={`w-5 h-5 ${isWallet && !isWhatsAppOpen ? 'stroke-[2.3]' : 'stroke-[1.9]'}`} />
            <span>Wallet</span>
          </button>

          {/* 4. Cart */}
          <button
            type="button"
            onClick={() => handleNav('cart')}
            aria-current={isCart && !isWhatsAppOpen ? 'page' : undefined}
            className={`relative h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              isCart && !isWhatsAppOpen
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="relative inline-flex items-center justify-center">
              <ShoppingCart className={`w-5 h-5 ${isCart && !isWhatsAppOpen ? 'stroke-[2.3]' : 'stroke-[1.9]'}`} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums leading-none">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </span>
            <span>Cart</span>
          </button>

          {/* 5. WhatsApp Support & Custom 3D Order Inquiry (far right) */}
          <button
            type="button"
            onClick={() => setIsWhatsAppOpen((prev) => !prev)}
            aria-expanded={isWhatsAppOpen}
            aria-label="Open BEE4 WhatsApp chat, order help, and custom 3D inquiry"
            className={`h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
              isWhatsAppOpen
                ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30'
                : 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300'
            }`}
          >
            <MessageCircle className={`w-5 h-5 ${isWhatsAppOpen ? 'stroke-[2.3]' : 'stroke-[2]'}`} />
            <span>WhatsApp</span>
          </button>
        </div>
      </nav>
    </>
  );
}
