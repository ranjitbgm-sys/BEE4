import { useState } from 'react';
import { Moon, ShoppingCart, Sun, User, X } from 'lucide-react';
import { BRAND_LOGO_URL } from '../data/catalog';
import { StorePage, ThemeMode } from '../types';

interface HeaderProps {
  activePage: StorePage;
  cartCount: number;
  announcementText: string;
  announcementEnabled?: boolean;
  customerFirstName?: string | null;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onNavigate: (page: StorePage) => void;
  onOpenCart: () => void;
}

export function Header({
  activePage,
  cartCount,
  announcementText,
  announcementEnabled = true,
  customerFirstName,
  theme,
  onToggleTheme,
  onNavigate,
}: HeaderProps) {
  const desktopNav: { page: StorePage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'shop', label: 'Shop All' },
    { page: 'gifts', label: 'Gifts' },
    { page: 'orders', label: 'My Orders' },
    { page: 'contact', label: 'Support' },
  ];
  const [showBanner, setShowBanner] = useState(true);
  const isAurora = theme === 'aurora';

  return (
    <>
      {announcementEnabled && showBanner && (
        <div className="h-8 bg-slate-900 dark:bg-slate-950 text-slate-100 text-xs flex items-center justify-between px-4 sm:px-8 border-b border-slate-800">
          <div className="w-6 shrink-0 hidden sm:block" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-center font-medium tracking-wide">
            {announcementText}
          </p>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss announcement"
            className="p-1 rounded text-slate-300 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          {/* Left: Crisp BEE4 Brand Logo & Name */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2.5 font-display text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-white border border-slate-200 dark:border-slate-700 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={BRAND_LOGO_URL}
                alt="BEE4 logo"
                className="w-full h-full object-contain"
              />
            </span>
            <span>BEE4</span>
          </button>

          {/* Center (Desktop): Minimal 5 storefront links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
            {desktopNav.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => onNavigate(item.page)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Login / Account icon + Cart icon + Compact Theme toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isAurora ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isAurora ? 'Light Mode' : 'Dark Mode'}
              className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
            >
              {isAurora ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('account')}
              aria-label={customerFirstName ? `Account: ${customerFirstName}` : 'Sign in to BEE4'}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-9 rounded-lg border text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'account'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="max-w-[84px] truncate">
                {customerFirstName ? customerFirstName : 'Sign In'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('cart')}
              aria-label={`Shopping cart with ${cartCount} items`}
              className="relative inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Cart</span>
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded bg-white text-amber-800 text-[11px] font-bold tabular-nums leading-none">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
