import { useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Package,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import {
  CustomerProfile,
  OrderRecord,
  ProductReviewRecord,
  ReturnRequestRecord,
} from '../types';
import { canCustomerReviewProduct } from '../utils/reviewsPolicyLogic';
import { getCustomerOrders } from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface OrdersListViewProps {
  currentCustomer: CustomerProfile | null;
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  onOpenOrderDetail: (orderNumber: string) => void;
  onSubmitProductReview?: (review: ProductReviewRecord) => void;
  onNavigateToAccount: () => void;
  onContinueShopping: () => void;
  onRefreshOrders?: () => Promise<void>;
}

export function OrdersListView({
  currentCustomer,
  orders,
  returns = [],
  onOpenOrderDetail,
  onSubmitProductReview,
  onNavigateToAccount,
  onContinueShopping,
  onRefreshOrders,
}: OrdersListViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>(
    'all'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inlineStars, setInlineStars] = useState<Record<string, number>>({});
  const [inlineNotes, setInlineNotes] = useState<Record<string, string>>({});
  const [submittedKeys, setSubmittedKeys] = useState<Record<string, boolean>>({});
  const [expandedReviewKey, setExpandedReviewKey] = useState<string | null>(null);

  if (!currentCustomer) {
    return (
      <section className="max-w-[780px] mx-auto px-4 sm:px-6 py-10 space-y-4">
        <div className="glass-surface rounded-2xl p-8 text-center space-y-4">
          <Package className="w-10 h-10 mx-auto text-amber-600" />
          <h1 className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
            Sign in to view your BEE4 Orders
          </h1>
          <p className="text-sm text-slate-600 dark:text-zinc-300 max-w-md mx-auto">
            Track deliveries, download GST invoices, request replacements, and rate delivered toys.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onNavigateToAccount}
              className="px-6 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
            >
              Sign In / Track Order
            </button>
            <button
              type="button"
              onClick={onContinueShopping}
              className="px-5 py-2.5 rounded-xl glass-btn-secondary text-sm font-semibold"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </section>
    );
  }

  const myOrders = getCustomerOrders(orders, currentCustomer);
  const filteredOrders = myOrders.filter((order) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      order.items.some((item) => item.title.toLowerCase().includes(q)) ||
      order.orderNumber.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (statusFilter === 'delivered') return order.status === 'Delivered';
    if (statusFilter === 'cancelled') return order.status === 'Cancelled';
    if (statusFilter === 'active') {
      return order.status !== 'Delivered' && order.status !== 'Cancelled';
    }
    return true;
  });

  const getOrderStatusLabel = (order: OrderRecord) => {
    if (order.status === 'Delivered') {
      const formatted = new Date(order.deliveredAt || order.createdAt).toLocaleDateString(
        'en-IN',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }
      );
      return `Delivered on ${formatted}`;
    }
    if (order.status === 'Cancelled') {
      return 'Cancelled';
    }
    return order.status;
  };

  const handleRateOrderProduct = (
    orderNumber: string,
    productId: string,
    productTitle: string
  ) => {
    if (!canCustomerReviewProduct(orders, currentCustomer, productId)) {
      return;
    }
    const key = `${orderNumber}::${productId}`;
    const rating = (inlineStars[key] ?? 5) as 1 | 2 | 3 | 4 | 5;
    const comment =
      (inlineNotes[key] ?? '').trim() ||
      `Rated ${rating}/5 stars on ${productTitle} after verified delivery.`;
    const now = new Date().toISOString();
    onSubmitProductReview?.({
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId,
      productName: productTitle,
      customerName: currentCustomer.fullName,
      customerContact: currentCustomer.phone || currentCustomer.email,
      rating,
      comment,
      verifiedBuyer: true,
      featuredOnHomepage: false,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    });
    setSubmittedKeys((prev) => ({ ...prev, [key]: true }));
    setExpandedReviewKey(null);
  };

  return (
    <section className="max-w-[920px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onNavigateToAccount}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Account</span>
        </button>

        {onRefreshOrders && (
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => {
              setIsRefreshing(true);
              void onRefreshOrders().finally(() => setIsRefreshing(false));
            }}
            className="px-3.5 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Orders</span>
          </button>
        )}
      </div>

      <div className="space-y-1">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          My Orders
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
          Tap any order to view delivery details, payment summary, or GST invoice
        </p>
      </div>

      {/* Search & Status Filters */}
      <div className="glass-surface rounded-2xl p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your order by product name..."
            className="w-full h-10 pl-10 pr-3.5 rounded-xl glass-input text-sm focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['all', 'active', 'delivered', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-amber-600 text-white'
                  : 'glass-btn-secondary text-slate-700 dark:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Minimal Order List — Strictly Thumbnail + Full Product Name (ZERO SKUs) + Status + Chevron + Delivered-Only Stars */}
      {filteredOrders.length === 0 ? (
        <div className="glass-surface rounded-2xl p-10 text-center space-y-3">
          <Package className="w-9 h-9 mx-auto text-amber-600" />
          <p className="text-sm font-semibold text-slate-700 dark:text-zinc-200">
            No matching BEE4 orders found.
          </p>
          <button
            type="button"
            onClick={onContinueShopping}
            className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
          >
            Browse BEE4 Store
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const firstItem = order.items[0];
            if (!firstItem) return null;
            const extraCount = order.items.length - 1;
            const productTitle =
              extraCount > 0
                ? `${firstItem.title} + ${extraCount} more`
                : firstItem.title;
            const isDelivered = order.status === 'Delivered';
            const canReview =
              isDelivered &&
              canCustomerReviewProduct(orders, currentCustomer, firstItem.productId);
            const reviewKey = `${order.orderNumber}::${firstItem.productId}`;
            const selectedStars = inlineStars[reviewKey] ?? 0;
            const isRated = Boolean(submittedKeys[reviewKey]);
            const rmaMatch = returns.find((r) => r.orderNumber === order.orderNumber);

            return (
              <article
                key={order.orderNumber}
                className="glass-surface rounded-2xl overflow-hidden transition-colors hover:border-amber-400"
              >
                <button
                  type="button"
                  onClick={() => onOpenOrderDetail(order.orderNumber)}
                  className="w-full p-4 flex items-center gap-3.5 text-left"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                    <ProductImage
                      src={firstItem.image}
                      alt={firstItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p
                      className={`text-xs font-bold ${
                        order.status === 'Delivered'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : order.status === 'Cancelled'
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {getOrderStatusLabel(order)}
                      {rmaMatch ? ` · Return ${rmaMatch.status}` : ''}
                    </p>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                      {productTitle}
                    </h2>
                  </div>

                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </button>

                {/* Inline Rate & Review — Strictly on Delivered Orders ONLY */}
                {canReview && (
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/40">
                    {isRated ? (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4 shrink-0" />
                        <span>Thank you! Verified rating submitted.</span>
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                            Rate &amp; Review this product
                          </span>
                          <div className="flex items-center gap-0.5">
                            {([1, 2, 3, 4, 5] as const).map((star) => (
                              <button
                                key={star}
                                type="button"
                                aria-label={`Rate ${star} stars for ${firstItem.title}`}
                                onClick={() => {
                                  setInlineStars((prev) => ({ ...prev, [reviewKey]: star }));
                                  setExpandedReviewKey(reviewKey);
                                }}
                                className="p-1 rounded-lg hover:bg-amber-500/10"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= selectedStars
                                      ? 'fill-amber-500 text-amber-500'
                                      : 'text-slate-300 dark:text-zinc-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {expandedReviewKey === reviewKey && selectedStars > 0 && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={inlineNotes[reviewKey] ?? ''}
                              onChange={(e) =>
                                setInlineNotes((prev) => ({
                                  ...prev,
                                  [reviewKey]: e.target.value,
                                }))
                              }
                              placeholder="Write your experience with this BEE4 product (optional)..."
                              className="flex-1 min-w-0 h-9 px-3 rounded-lg glass-input text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRateOrderProduct(
                                  order.orderNumber,
                                  firstItem.productId,
                                  firstItem.title
                                )
                              }
                              className="h-9 px-4 rounded-lg glass-btn-amber text-white text-xs font-semibold shrink-0"
                            >
                              Submit Rating
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
