import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { StorePage } from '../types';

interface HeaderProps {
  activePage: StorePage;
  cartCount: number;
  announcementText: string;
  customerFirstName?: string | null;
  onNavigate: (page: StorePage) => void;
  onOpenCart: () => void;
}

export function Header({
  activePage,
  cartCount,
  announcementText,
  customerFirstName,
  onNavigate,
  onOpenCart,
}: HeaderProps) {
  const navItems: { page: StorePage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'shop', label: 'Shop' },
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
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="font-display text-xl font-extrabold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 hover:text-amber-700 transition-colors"
          >
            BEE4
          </button>

          {/* Zone 2: 5 concise single-line navigation links inside subtle frosted track */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl glass-subtle text-sm font-medium text-zinc-600"
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
                      ? 'bg-white/90 text-zinc-900 font-semibold shadow-sm border border-white'
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-white/55'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenCart}
              aria-label={`Open shopping bag, ${cartCount} items`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">Bag ({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2.5 rounded-xl glass-btn-secondary text-zinc-800 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-white/60 bg-white/75 backdrop-blur-2xl px-4 py-3 flex flex-col gap-1.5 shadow-lg"
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
                      ? 'bg-white/90 text-zinc-900 font-semibold shadow-sm border border-white'
                      : 'text-zinc-700 hover:bg-white/60'
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
