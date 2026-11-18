import { useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Download,
  MapPin,
  MessageCircle,
  Package,
  RotateCcw,
  Star,
  Wallet,
} from 'lucide-react';
import {
  CartItem,
  CustomerPanelControls,
  CustomerProfile,
  OrderRecord,
  ProductReviewRecord,
  ReturnRequestRecord,
} from '../types';
import { normalizeCustomerPanelControls } from '../utils/customerAccountLogic';
import { canCustomerCancelOrder } from '../utils/giftCardWalletLogic';
import { canCustomerReviewProduct } from '../utils/reviewsPolicyLogic';
import {
  CUSTOMER_RETURN_TRACKER_STEPS,
  buildCustomerReturnStepIndex,
  getOrderRmaStatusBadge,
  isOrderEligibleForReturn,
} from '../utils/rmaLogic';
import {
  ORDER_TRACKING_STEPS,
  buildWhatsAppUrl,
  downloadOrderInvoice,
  formatINR,
  formatPaymentMethodLabel,
  getCustomerOrders,
  getOrderTrackingStepIndex,
} from '../utils/storeLogic';
import { CancelOrderModal } from './CancelOrderModal';
import { CustomerReturnModal } from './CustomerReturnModal';
import { ProductImage } from './ProductImage';

interface OrderDetailViewProps {
  orderNumber: string;
  currentCustomer: CustomerProfile | null;
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  whatsappNumber: string;
  supportEmail?: string;
  customerPanelControls?: CustomerPanelControls;
  onBackToOrders: () => void;
  onSelectProduct: (productId: string) => void;
  onReorderItems: (items: CartItem[]) => void;
  onCancelOrder: (orderNumber: string, reason?: string) => Promise<void> | void;
  onCreateReturnRequest?: (rma: ReturnRequestRecord) => void;
  onSubmitProductReview?: (review: ProductReviewRecord) => void;
}

export function OrderDetailView({
  orderNumber,
  currentCustomer,
  orders,
  returns = [],
  whatsappNumber,
  supportEmail = 'hello@bee4.in',
  customerPanelControls,
  onBackToOrders,
  onSelectProduct,
  onReorderItems,
  onCancelOrder,
  onCreateReturnRequest,
  onSubmitProductReview,
}: OrderDetailViewProps) {
  const controls = normalizeCustomerPanelControls({ customerPanelControls });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [starRatings, setStarRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, boolean>>({});

  const myOrders = currentCustomer ? getCustomerOrders(orders, currentCustomer) : [];
  const order = myOrders.find(
    (o) => o.orderNumber.toLowerCase() === orderNumber.trim().toLowerCase()
  );

  if (!order) {
    return (
      <section className="max-w-[780px] mx-auto px-4 sm:px-6 py-10 space-y-4">
        <button
          type="button"
          onClick={onBackToOrders}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Orders</span>
        </button>

        <div className="glass-surface rounded-2xl p-8 text-center space-y-3">
          <Package className="w-9 h-9 mx-auto text-amber-600" />
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Order not found
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            We could not find order {orderNumber} under your signed-in BEE4 account.
          </p>
        </div>
      </section>
    );
  }

  const stepIdx = getOrderTrackingStepIndex(order.status);
  const rmaMatch = returns.find((r) => r.orderNumber === order.orderNumber);
  const canReturn =
    isOrderEligibleForReturn(order, returns).eligible &&
    !rmaMatch &&
    Boolean(onCreateReturnRequest);
  const canCancel =
    controls.enableSelfServiceCancel && canCustomerCancelOrder(order.status);
  const needsPrepaidConfirm =
    order.status !== 'Cancelled' &&
    order.paymentMethod === 'UPI / Prepaid' &&
    order.paymentStatus !== 'Paid' &&
    order.paymentStatus !== 'Refunded';

  return (
    <section className="max-w-[920px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
      <button
        type="button"
        onClick={onBackToOrders}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to My Orders</span>
      </button>

      {toastMsg && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
        >
          <BadgeCheck className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Order Header Summary */}
      <div className="glass-surface rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Order ID</p>
            <h1 className="font-mono text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {order.orderNumber}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                order.status === 'Delivered'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                  : order.status === 'Cancelled'
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300'
              }`}
            >
              {order.status}
            </span>
            <p className="mt-1 text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
              {formatINR(order.total)}
            </p>
          </div>
        </div>

        {needsPrepaidConfirm && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              UPI payment verification pending for {order.orderNumber}.
            </span>
            <a
              href={buildWhatsAppUrl(
                `Hi BEE4! Sharing UPI payment confirmation for Order ${order.orderNumber} (${formatINR(order.total)}).`,
                whatsappNumber
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-amber-800 dark:text-amber-300 inline-flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Share UTR on WhatsApp
            </a>
          </div>
        )}

        {/* 5-Stage Tracking Progress Bar */}
        {order.status !== 'Cancelled' ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {ORDER_TRACKING_STEPS.map((step, idx) => (
              <div
                key={step}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-center ${
                  idx <= stepIdx
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-zinc-400'
                }`}
              >
                {step}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/30 text-xs font-medium text-rose-700 dark:text-rose-200">
            Cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ''}
            {order.cancellationReason ? ` · ${order.cancellationReason}` : ''}
          </div>
        )}

        {rmaMatch && (
          <div className="p-4 rounded-xl glass-subtle space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                Return / Replacement {rmaMatch.rmaNumber}
              </span>
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {getOrderRmaStatusBadge(order.orderNumber, returns)?.shortLabel ??
                  rmaMatch.status}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {CUSTOMER_RETURN_TRACKER_STEPS.map((st, idx) => (
                <div
                  key={st}
                  className={`p-1.5 rounded-lg text-[10px] font-semibold text-center ${
                    idx <= buildCustomerReturnStepIndex(rmaMatch.status)
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                  }`}
                >
                  {st}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Items Ordered (ZERO SKUs!) */}
      <div className="glass-surface rounded-2xl p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Items in this Order ({order.items.length})
        </h2>

        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {order.items.map((item) => {
            const canRateItem =
              order.status === 'Delivered' &&
              currentCustomer &&
              canCustomerReviewProduct(orders, currentCustomer, item.productId);
            const itemStars = starRatings[item.productId] ?? 5;
            const rated = submittedReviews[item.productId];

            return (
              <div key={`${item.productId}::${item.variant}`} className="py-3.5 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelectProduct(item.productId)}
                      className="text-sm font-semibold text-slate-900 dark:text-white hover:text-amber-700 dark:hover:text-amber-300 text-left line-clamp-2"
                    >
                      {item.title}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      {item.variant} · Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </div>

                {canRateItem && currentCustomer && (
                  <div className="p-3 rounded-xl glass-subtle space-y-2">
                    {rated ? (
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4" />
                        <span>Verified review submitted!</span>
                      </p>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                            Rate &amp; Review this delivered product
                          </span>
                          <div className="flex items-center gap-0.5">
                            {([1, 2, 3, 4, 5] as const).map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() =>
                                  setStarRatings((prev) => ({ ...prev, [item.productId]: star }))
                                }
                                aria-label={`Rate ${star} stars for ${item.title}`}
                                className="p-1"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= itemStars
                                      ? 'fill-amber-500 text-amber-500'
                                      : 'text-slate-300 dark:text-zinc-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={reviewComments[item.productId] ?? ''}
                            onChange={(e) =>
                              setReviewComments((prev) => ({
                                ...prev,
                                [item.productId]: e.target.value,
                              }))
                            }
                            placeholder="Share feedback for other parents (optional)..."
                            className="flex-1 min-w-0 h-9 px-3 rounded-lg glass-input text-xs focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date().toISOString();
                              onSubmitProductReview?.({
                                id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                                productId: item.productId,
                                productName: item.title,
                                customerName: currentCustomer.fullName,
                                customerContact: currentCustomer.phone || currentCustomer.email,
                                rating: itemStars as 1 | 2 | 3 | 4 | 5,
                                comment:
                                  (reviewComments[item.productId] ?? '').trim() ||
                                  `Rated ${itemStars}/5 stars after verified delivery.`,
                                verifiedBuyer: true,
                                featuredOnHomepage: false,
                                status: 'Pending',
                                createdAt: now,
                                updatedAt: now,
                              });
                              setSubmittedReviews((prev) => ({
                                ...prev,
                                [item.productId]: true,
                              }));
                              setToastMsg(`Thank you! Review submitted for ${item.title}.`);
                            }}
                            className="h-9 px-4 rounded-lg glass-btn-amber text-white text-xs font-semibold shrink-0"
                          >
                            Submit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery Address & Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-surface rounded-2xl p-5 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 inline-flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            Delivery Address
          </h2>
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            {order.customer.fullName}
          </p>
          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
            {order.customer.address}, {order.customer.city}, {order.customer.state} –{' '}
            <span className="tabular-nums font-semibold">{order.customer.pinCode}</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-zinc-300 tabular-nums">
            Phone: {order.customer.phone}
          </p>
        </div>

        <div className="glass-surface rounded-2xl p-5 space-y-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 inline-flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            Price &amp; Payment Summary
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600 dark:text-zinc-300">
              <span>Payment Method</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {formatPaymentMethodLabel(order.paymentMethod)} ({order.paymentStatus || 'Pending'})
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-zinc-300">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatINR(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>Discount</span>
                <span className="tabular-nums">−{formatINR(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 dark:text-zinc-300">
              <span>Shipping</span>
              <span className="tabular-nums">
                {order.shippingFee === 0 ? 'FREE' : formatINR(order.shippingFee)}
              </span>
            </div>
            {(order.walletAmountUsed ?? 0) > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>BEE4 Wallet Used</span>
                <span className="tabular-nums">−{formatINR(order.walletAmountUsed ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-white/10">
              <span>Order Total</span>
              <span className="tabular-nums">{formatINR(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="glass-surface rounded-2xl p-5 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => downloadOrderInvoice(order, { supportEmail, whatsappNumber })}
          className="px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Download GST Invoice
        </button>
        <button
          type="button"
          onClick={() => onReorderItems(order.items)}
          className="px-4 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Buy Again
        </button>
        {canReturn && (
          <button
            type="button"
            onClick={() => setShowReturnModal(true)}
            className="px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-semibold text-amber-700 dark:text-amber-300"
          >
            Return / Replace (7 Days)
          </button>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-semibold text-rose-700 dark:text-rose-300"
          >
            Cancel Order
          </button>
        )}
      </div>

      {showCancelModal && (
        <CancelOrderModal
          order={order}
          mode="customer"
          onClose={() => setShowCancelModal(false)}
          onConfirm={async ({ reason }) => {
            await onCancelOrder(order.orderNumber, reason);
            setShowCancelModal(false);
            setToastMsg(`Order ${order.orderNumber} cancelled.`);
          }}
        />
      )}

      {showReturnModal && onCreateReturnRequest && (
        <CustomerReturnModal
          order={order}
          existingReturns={returns}
          onClose={() => setShowReturnModal(false)}
          onSubmitReturn={(rma) => {
            onCreateReturnRequest(rma);
            setShowReturnModal(false);
            setToastMsg(`Return request ${rma.rmaNumber} submitted.`);
          }}
        />
      )}
    </section>
  );
}
