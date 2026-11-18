import { Home, LayoutGrid, Package, ShoppingBag, User } from 'lucide-react';
import { StorePage } from '../../types';

interface MobileBottomNavProps {
  activePage: StorePage;
  activeAccountTab?: string;
  categoriesOpen: boolean;
  cartCount: number;
  isSignedIn: boolean;
  onSelectHome: () => void;
  onOpenCategories: () => void;
  onOpenCart: () => void;
  onSelectOrders: () => void;
  onSelectAccount: () => void;
}

export function MobileBottomNav({
  activePage,
  activeAccountTab,
  categoriesOpen,
  cartCount,
  isSignedIn,
  onSelectHome,
  onOpenCategories,
  onOpenCart,
  onSelectOrders,
  onSelectAccount,
}: MobileBottomNavProps) {
  const isHomeActive = activePage === 'home' && !categoriesOpen;
  const isCategoriesActive = categoriesOpen || activePage === 'shop' || activePage === 'gifts';
  const isOrdersActive = activePage === 'account' && activeAccountTab === 'orders' && !categoriesOpen;
  const isAccountActive =
    activePage === 'account' && activeAccountTab !== 'orders' && !categoriesOpen;

  return (
    <nav
      aria-label="BEE4 Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-bar border-t border-b-0 border-white/75 dark:border-white/12 pwa-safe-bottom select-none-nav"
    >
      <div className="grid grid-cols-5 items-stretch h-14 max-w-lg mx-auto px-1">
        <button
          type="button"
          onClick={onSelectHome}
          aria-current={isHomeActive ? 'page' : undefined}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
            isHomeActive
              ? 'text-amber-700 dark:text-amber-300 font-bold'
              : 'text-zinc-600 dark:text-zinc-300 font-medium'
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none">Home</span>
        </button>

        <button
          type="button"
          onClick={onOpenCategories}
          aria-expanded={categoriesOpen}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
            isCategoriesActive
              ? 'text-amber-700 dark:text-amber-300 font-bold'
              : 'text-zinc-600 dark:text-zinc-300 font-medium'
          }`}
        >
          <LayoutGrid className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none">Categories</span>
        </button>

        <button
          type="button"
          onClick={onOpenCart}
          aria-label={`Cart (${cartCount} items)`}
          className="relative min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-zinc-700 dark:text-zinc-200 font-medium transition-colors whitespace-nowrap"
        >
          <span className="relative inline-flex">
            <ShoppingBag className="w-5 h-5 shrink-0" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-amber-600 text-white text-[10px] font-extrabold tabular-nums inline-flex items-center justify-center shadow-sm">
                {cartCount}
              </span>
            )}
          </span>
          <span className="text-[11px] leading-none">Cart</span>
        </button>

        <button
          type="button"
          onClick={onSelectOrders}
          aria-current={isOrdersActive ? 'page' : undefined}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
            isOrdersActive
              ? 'text-amber-700 dark:text-amber-300 font-bold'
              : 'text-zinc-600 dark:text-zinc-300 font-medium'
          }`}
        >
          <Package className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none">Orders</span>
        </button>

        <button
          type="button"
          onClick={onSelectAccount}
          aria-current={isAccountActive ? 'page' : undefined}
          className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl transition-colors whitespace-nowrap ${
            isAccountActive
              ? 'text-amber-700 dark:text-amber-300 font-bold'
              : 'text-zinc-600 dark:text-zinc-300 font-medium'
          }`}
        >
          <User className="w-5 h-5 shrink-0" />
          <span className="text-[11px] leading-none">{isSignedIn ? 'Account' : 'Login'}</span>
        </button>
      </div>
    </nav>
  );
}
