import { useState } from 'react';
import {
  ArrowUpRight,
  Box,
  ChevronLeft,
  ChevronRight,
  Cloud,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquareText,
  Moon,
  PackageCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sun,
  Tag,
  Users,
  X,
} from 'lucide-react';
import type { AdminModuleRoute, ThemeMode } from '../../types';

interface AdminShellProps {
  activeModule: AdminModuleRoute;
  theme: ThemeMode;
  pendingDispatchCount: number;
  pendingReturnsCount?: number;
  messagesReviewsBadgeCount?: number;
  lowStockCount: number;
  totalOrdersCount: number;
  totalProductsCount: number;
  cloudAdminEmail?: string | null;
  cloudSignedInEmail?: string | null;
  supabaseConfigured?: boolean;
  cloudSyncLoading?: boolean;
  statusNotice?: string;
  onSelectModule: (module: AdminModuleRoute) => void;
  onToggleTheme: () => void;
  onOpenCommandPalette: () => void;
  onNewProduct: () => void;
  onBackToStore: () => void;
  onLockAdmin: () => void;
  onConnectCloudAdmin?: () => Promise<void>;
  onSyncCatalogToCloud?: () => Promise<void>;
  children: React.ReactNode;
}

const MODULE_META: Record<AdminModuleRoute, { title: string; group: string }> = {
  dashboard: { title: 'Executive Dashboard', group: 'Command' },
  orders: { title: 'Orders & Fulfillment', group: 'Operations' },
  returns: { title: 'Returns & Refunds (RMA)', group: 'Operations' },
  products: { title: 'Product Catalog', group: 'Catalog' },
  inventory: { title: 'Inventory & 3D Print Lab', group: 'Operations' },
  discounts: { title: 'Discounts & Gifting', group: 'Growth' },
  customers: { title: 'Customers & CRM', group: 'Growth' },
  'messages-reviews': { title: 'Messages & Reviews', group: 'Growth' },
  settings: { title: 'Storefront CMS & Security', group: 'System' },
};

export function AdminShell({
  activeModule,
  theme,
  pendingDispatchCount,
  pendingReturnsCount = 0,
  messagesReviewsBadgeCount = 0,
  lowStockCount,
  totalOrdersCount,
  totalProductsCount,
  cloudAdminEmail,
  cloudSignedInEmail,
  supabaseConfigured = false,
  cloudSyncLoading = false,
  statusNotice,
  onSelectModule,
  onToggleTheme,
  onOpenCommandPalette,
  onNewProduct,
  onBackToStore,
  onLockAdmin,
  onConnectCloudAdmin,
  onSyncCatalogToCloud,
  children,
}: AdminShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navGroups: {
    group: string;
    items: {
      id: AdminModuleRoute;
      label: string;
      icon: typeof LayoutDashboard;
      badge?: number;
      badgeTone?: 'amber' | 'red' | 'neutral';
    }[];
  }[] = [
    {
      group: 'Command',
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      group: 'Operations',
      items: [
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingBag,
          badge: pendingDispatchCount || totalOrdersCount,
          badgeTone: pendingDispatchCount > 0 ? 'amber' : 'neutral',
        },
        {
          id: 'returns',
          label: 'Returns & Refunds',
          icon: RotateCcw,
          badge: pendingReturnsCount > 0 ? pendingReturnsCount : undefined,
          badgeTone: pendingReturnsCount > 0 ? 'amber' : 'neutral',
        },
        {
          id: 'inventory',
          label: 'Inventory & Lab',
          icon: PackageCheck,
          badge: lowStockCount > 0 ? lowStockCount : undefined,
          badgeTone: lowStockCount > 0 ? 'red' : 'neutral',
        },
      ],
    },
    {
      group: 'Merchandising',
      items: [
        {
          id: 'products',
          label: 'Products',
          icon: Box,
          badge: totalProductsCount,
          badgeTone: 'neutral',
        },
        { id: 'discounts', label: 'Discounts & Gifts', icon: Tag },
        { id: 'customers', label: 'Customers CRM', icon: Users },
        {
          id: 'messages-reviews',
          label: 'Messages & Reviews',
          icon: MessageSquareText,
          badge: messagesReviewsBadgeCount > 0 ? messagesReviewsBadgeCount : undefined,
          badgeTone: messagesReviewsBadgeCount > 0 ? 'amber' : 'neutral',
        },
      ],
    },
    {
      group: 'Storefront & System',
      items: [{ id: 'settings', label: 'CMS & Settings', icon: Settings }],
    },
  ];

  const renderNavContent = (compact: boolean) => (
    <div className="flex flex-col h-full">
      {/* Studio Brand Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-zinc-900/8 dark:border-white/10">
        <button
          type="button"
          onClick={() => onSelectModule('dashboard')}
          className="flex items-center gap-2.5 min-w-0 text-left"
        >
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-11-16_at_11.18.26_AM_4fe8444e.jpeg"
            alt="BEE4 Studio"
            className="w-8 h-8 rounded-xl object-cover border border-white/70 dark:border-white/15 shrink-0"
          />
          {!compact && (
            <div className="min-w-0">
              <div className="font-display text-sm font-bold text-zinc-900 dark:text-white tracking-tight truncate">
                BEE4 Studio Admin
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                bee4.in · Banka, Bihar
              </div>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((c) => !c)}
          aria-label={compact ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:inline-flex p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10"
        >
          {compact ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Groups */}
      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            {!compact && (
              <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    onSelectModule(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl text-xs font-semibold transition-transform whitespace-nowrap ${
                    active
                      ? 'glass-btn-ink'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-white/65 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </span>
                  {!compact && item.badge !== undefined && (
                    <span
                      className={`text-[11px] tabular-nums font-bold px-2 py-0.5 rounded-full ${
                        active
                          ? 'bg-amber-400/20 text-amber-300 dark:bg-zinc-900/20 dark:text-zinc-900'
                          : item.badgeTone === 'red'
                            ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                            : item.badgeTone === 'amber'
                              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                              : 'bg-zinc-900/8 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Store Switcher & Cloud Status */}
      <div className="p-2.5 border-t border-zinc-900/8 dark:border-white/10 space-y-2">
        {!compact && (
          <div className="px-3 py-2 rounded-2xl glass-subtle text-[11px] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-white">
              {cloudAdminEmail ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">Supabase Live</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">
                    {cloudSignedInEmail
                      ? 'Switch Admin Account'
                      : supabaseConfigured
                        ? 'Supabase Ready'
                        : 'Studio Local Mode'}
                  </span>
                </>
              )}
            </div>
            {cloudAdminEmail && onSyncCatalogToCloud ? (
              <button
                type="button"
                disabled={cloudSyncLoading}
                onClick={() => void onSyncCatalogToCloud()}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${cloudSyncLoading ? 'animate-spin' : ''}`} />
                <span>{cloudSyncLoading ? 'Syncing...' : 'Sync to Supabase'}</span>
              </button>
            ) : supabaseConfigured && onConnectCloudAdmin ? (
              <button
                type="button"
                disabled={cloudSyncLoading}
                onClick={() => void onConnectCloudAdmin()}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
              >
                Connect Supabase OAuth
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSelectModule('settings');
                  setMobileMenuOpen(false);
                }}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
              >
                Supabase SQL Setup →
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onBackToStore}
          className="w-full px-3 py-2.5 rounded-2xl glass-btn-secondary text-zinc-800 dark:text-zinc-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
          {!compact && <span>View Live Storefront → bee4.in</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-transparent">
      {/* Desktop Collapsible Glass Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen p-3 transition-all ${
          sidebarCollapsed ? 'w-24' : 'w-68'
        }`}
      >
        <div className="flex-1 glass-surface rounded-3xl overflow-hidden">
          {renderNavContent(sidebarCollapsed)}
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[82vw] h-full glass-drawer p-3 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end pb-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{renderNavContent(false)}</div>
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Glass Top Bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-6 pt-3">
          <div className="glass-surface rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
                className="lg:hidden p-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200 shrink-0"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  BEE4 Admin <span aria-hidden="true">/</span> {MODULE_META[activeModule].group}
                </p>
                <h1 className="font-display text-base sm:text-lg font-bold text-zinc-900 dark:text-white truncate">
                  {MODULE_META[activeModule].title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="px-3 py-2 rounded-xl glass-btn-secondary text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden md:inline px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-900/8 dark:bg-white/10">
                  ⌘K
                </kbd>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle Daylight or Dark Aurora theme"
                className="p-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200 shrink-0"
              >
                {theme === 'aurora' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={onNewProduct}
                className="px-3 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Product</span>
              </button>

              <button
                type="button"
                onClick={onLockAdmin}
                aria-label="Lock Admin Session"
                className="px-3 py-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Lock</span>
              </button>
            </div>
          </div>
        </header>

        {/* Body Content */}
        <div className="flex-1 p-4 sm:p-6 space-y-5 max-w-[1440px] w-full mx-auto">
          {statusNotice && (
            <div className="px-4 py-3 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {statusNotice}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
