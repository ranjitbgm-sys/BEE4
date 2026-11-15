import { useState } from 'react';
import { Menu, Moon, ShoppingBag, Sun, X } from 'lucide-react';
import { StorePage, ThemeMode } from '../types';

interface HeaderProps {
  activePage: StorePage;
  cartCount: number;
  announcementText: string;
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
  customerFirstName,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenCart,
}: HeaderProps) {
  const navItems: { page: StorePage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'shop', label: 'Shop All' },
    { page: 'gifts', label: 'Gift Ideas' },
    { page: 'contact', label: 'Contact' },
    { page: 'account', label: customerFirstName ? customerFirstName : 'Account' },
  ];
  const [showBanner, setShowBanner] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (page: StorePage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
  };

  const isAurora = theme === 'aurora';

  return (
    <>
      {showBanner && (
        <div className="h-9 glass-banner text-zinc-100 text-xs flex items-center justify-between px-4 sm:px-8">
          <div className="w-6 shrink-0 hidden sm:block" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-center font-medium tracking-wide">
            {announcementText}
          </p>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss shipping announcement"
            className="p-1 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 glass-bar">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="font-display text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            BEE4
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl glass-subtle text-sm font-medium text-zinc-600 dark:text-zinc-300"
          >
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => handleNavClick(item.page)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'bg-white/95 dark:bg-amber-500 text-zinc-900 dark:text-zinc-950 font-semibold shadow-sm border border-white dark:border-amber-400'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/55 dark:hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle + Bag + Mobile menu trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isAurora ? 'Switch to Daylight theme' : 'Switch to Dark Aurora theme'}
              title={isAurora ? 'Daylight Theme' : 'Dark Aurora Theme'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-100 whitespace-nowrap shrink-0"
            >
              {isAurora ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="hidden sm:inline">Daylight</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                  <span className="hidden sm:inline">Aurora</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping bag, ${cartCount} items`}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span className="tabular-nums">Bag ({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 rounded-xl glass-btn-secondary text-zinc-800 dark:text-zinc-100 transition-colors shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/95 backdrop-blur-2xl px-4 py-3 flex flex-col gap-1.5 shadow-lg"
          >
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => handleNavClick(item.page)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/95 dark:bg-amber-500 text-zinc-900 font-semibold shadow-sm border border-white'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>
    </>
  );
}
