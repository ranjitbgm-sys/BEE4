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
        <div className="h-9 bg-zinc-900 text-zinc-100 text-xs flex items-center justify-between px-4 sm:px-8">
          <div className="w-6 shrink-0 hidden sm:block" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-center font-medium tracking-wide">
            {announcementText}
          </p>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss shipping announcement"
            className="p-1 text-zinc-300 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 border-b border-[#E6E4DD] bg-white/95 backdrop-blur-sm">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element brand wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="font-display text-xl font-extrabold tracking-tight text-zinc-900 whitespace-nowrap shrink-0 hover:text-amber-700 transition-colors"
          >
            BEE4
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600"
          >
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => handleNavClick(item.page)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isActive
                      ? 'text-zinc-900 border-amber-600 font-semibold'
                      : 'border-transparent hover:text-zinc-900 hover:border-zinc-300'
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="tabular-nums">Bag ({cartCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2.5 rounded-lg border border-[#E6E4DD] text-zinc-800 hover:bg-[#F7F6F2] transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Mobile navigation"
            className="md:hidden border-t border-[#E6E4DD] bg-white px-4 py-3 flex flex-col gap-1"
          >
            {navItems.map((item) => {
              const isActive = activePage === item.page;
              return (
                <button
                  key={item.page}
                  type="button"
                  onClick={() => handleNavClick(item.page)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#F7F6F2] text-zinc-900 font-semibold'
                      : 'text-zinc-700 hover:bg-[#F7F6F2]'
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
