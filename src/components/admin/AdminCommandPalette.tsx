import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Box,
  LayoutDashboard,
  RotateCcw,
  Search,
  ShoppingBag,
  Tag,
  Users,
  X,
} from 'lucide-react';
import type {
  AdminModuleRoute,
  CouponRecord,
  OrderRecord,
  Product,
  ReturnRequestRecord,
} from '../../types';
import { formatINR } from '../../utils/storeLogic';
import type { CrmCustomerSummary } from '../../utils/adminLogic';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  products: Product[];
  coupons: CouponRecord[];
  customers: CrmCustomerSummary[];
  onNavigateModule: (module: AdminModuleRoute) => void;
  onSelectOrder: (orderNumber: string) => void;
  onSelectRma?: (rmaNumber: string) => void;
  onSelectProduct: (product: Product) => void;
}

export function AdminCommandPalette({
  isOpen,
  onClose,
  orders,
  returns = [],
  products,
  coupons,
  customers,
  onNavigateModule,
  onSelectOrder,
  onSelectRma,
  onSelectProduct,
}: AdminCommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return;
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedOrders = orders
      .filter((o) =>
        !q
          ? true
          : [o.orderNumber, o.customer.fullName, o.customer.phone, o.customer.city, o.awbNumber || '']
              .join(' ')
              .toLowerCase()
              .includes(q)
      )
      .slice(0, 4);

    const matchedProducts = products
      .filter((p) =>
        !q
          ? true
          : [p.title, p.sku || '', p.category, p.id].join(' ').toLowerCase().includes(q)
      )
      .slice(0, 4);

    const matchedCoupons = coupons
      .filter((c) => (!q ? true : [c.code, c.description].join(' ').toLowerCase().includes(q)))
      .slice(0, 3);

    const matchedCustomers = customers
      .filter((c) =>
        !q ? true : [c.fullName, c.phone, c.city, c.email].join(' ').toLowerCase().includes(q)
      )
      .slice(0, 3);

    const matchedReturns = returns
      .filter((r) =>
        !q
          ? true
          : [r.rmaNumber, r.orderNumber, r.customerName, r.customerPhone, r.reason]
              .join(' ')
              .toLowerCase()
              .includes(q)
      )
      .slice(0, 3);

    return { matchedOrders, matchedProducts, matchedCoupons, matchedCustomers, matchedReturns };
  }, [query, orders, returns, products, coupons, customers]);

  if (!isOpen) return null;

  const quickRoutes: { id: AdminModuleRoute; label: string; hint: string }[] = [
    { id: 'dashboard', label: 'Executive Dashboard', hint: 'KPIs & revenue trends' },
    { id: 'orders', label: 'Orders & GST Fulfillment', hint: 'Courier, AWB, WhatsApp & Invoices' },
    { id: 'returns', label: 'Returns & Refunds (RMA)', hint: 'RMAs, Reverse Pickups, QC & Refunds' },
    { id: 'products', label: 'Product Catalog Manager', hint: 'Edit SKUs, Margins & 3-Angle Media' },
    { id: 'inventory', label: 'Inventory & 3D Print Lab', hint: 'Stock, Print Queue & Spools' },
    { id: 'discounts', label: 'Discounts & Gifting', hint: 'Coupons & Gift Wrap fee' },
    { id: 'customers', label: 'Customers & CRM', hint: 'LTV, RTO flags & CSV export' },
    { id: 'settings', label: 'Storefront CMS & Security', hint: 'Hero copy, payments & audit logs' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global admin search"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-14 sm:pt-20 bg-zinc-950/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl glass-drawer rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-900/10 dark:border-white/10">
          <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Order ID, customer phone, SKU, coupon code, or jump to module..."
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {/* Quick Module Navigation */}
          <div>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Quick Navigation
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {quickRoutes
                .filter((r) => !query.trim() || r.label.toLowerCase().includes(query.trim().toLowerCase()))
                .map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => {
                      onNavigateModule(route.id);
                      onClose();
                    }}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-white/75 dark:hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
                        <LayoutDashboard className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">{route.label}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">{route.hint}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  </button>
                ))}
            </div>
          </div>

          {results.matchedReturns.length > 0 && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Returns &amp; Refunds (RMA)
              </p>
              <div className="space-y-1">
                {results.matchedReturns.map((rma) => (
                  <button
                    key={rma.id}
                    type="button"
                    onClick={() => {
                      if (onSelectRma) {
                        onSelectRma(rma.rmaNumber);
                      } else {
                        onNavigateModule('returns');
                      }
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/75 dark:hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate tabular-nums">
                          {rma.rmaNumber} · {rma.orderNumber} · {rma.customerName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {rma.status}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.matchedOrders.length > 0 && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Orders
              </p>
              <div className="space-y-1">
                {results.matchedOrders.map((order) => (
                  <button
                    key={order.orderNumber}
                    type="button"
                    onClick={() => {
                      onSelectOrder(order.orderNumber);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/75 dark:hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShoppingBag className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate tabular-nums">
                          {order.orderNumber} · {order.customer.fullName}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate tabular-nums">
                          {order.customer.phone} · {order.customer.city}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white tabular-nums shrink-0">
                      {formatINR(order.total)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.matchedProducts.length > 0 && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Products & SKUs
              </p>
              <div className="space-y-1">
                {results.matchedProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onSelectProduct(product);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-white/75 dark:hover:bg-white/10 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Box className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {product.title}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate tabular-nums">
                          SKU {product.sku || product.id} · Stock {product.stockQuantity ?? 10}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white tabular-nums shrink-0">
                      {formatINR(product.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(results.matchedCoupons.length > 0 || results.matchedCustomers.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.matchedCoupons.length > 0 && (
                <div>
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Coupons
                  </p>
                  {results.matchedCoupons.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onNavigateModule('discounts');
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/75 dark:hover:bg-white/10 text-left"
                    >
                      <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {c.code}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {results.matchedCustomers.length > 0 && (
                <div>
                  <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Customers
                  </p>
                  {results.matchedCustomers.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => {
                        onNavigateModule('customers');
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/75 dark:hover:bg-white/10 text-left"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {cust.fullName} · {cust.city}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
