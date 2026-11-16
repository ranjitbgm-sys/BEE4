import { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Gift,
  MessageCircle,
  RotateCcw,
  Search,
  Truck,
  X,
} from 'lucide-react';
import type {
  FulfillmentStage,
  OrderChannel,
  OrderRecord,
  Product,
  ReturnRequestRecord,
} from '../../types';
import {
  buildAdminWhatsAppTemplate,
  getEffectiveFulfillmentStage,
  getEffectiveOrderChannel,
  mapFulfillmentStageToOrderStatus,
  WhatsAppTemplateKind,
} from '../../utils/adminLogic';
import { getOrderRmaStatusBadge } from '../../utils/rmaLogic';
import { formatINR } from '../../utils/storeLogic';
import { OrderGstInvoiceModal } from './OrderGstInvoiceModal';

interface AdminOrdersTabProps {
  orders: OrderRecord[];
  products: Product[];
  returns?: ReturnRequestRecord[];
  supportEmail: string;
  whatsappNumber: string;
  initialSelectedOrderNumber?: string | null;
  onClearInitialSelection?: () => void;
  onInspectRma?: (rmaNumber: string) => void;
  onUpdateOrderLogistics: (
    orderNumber: string,
    updates: {
      fulfillmentStage: FulfillmentStage;
      courierPartner?: string;
      awbNumber?: string;
      trackingUrl?: string;
      internalNotes?: string;
    }
  ) => void;
}

const STAGES: FulfillmentStage[] = [
  'New / Unverified',
  'Confirmed',
  'Printing / Packing',
  'Shipped',
  'Delivered',
  'Cancelled',
  'RTO / Return',
];

const CHANNELS: OrderChannel[] = ['UPI / Prepaid', 'COD', 'WhatsApp Order'];
const COURIERS = ['Delhivery', 'Shiprocket', 'India Post', 'BlueDart'];

function stageBadgeClass(stage: FulfillmentStage): string {
  switch (stage) {
    case 'Delivered':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    case 'Shipped':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
    case 'Cancelled':
    case 'RTO / Return':
      return 'bg-red-500/15 text-red-700 dark:text-red-300';
    case 'Printing / Packing':
      return 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300';
    default:
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
  }
}

export function AdminOrdersTab({
  orders,
  products,
  returns = [],
  supportEmail,
  whatsappNumber,
  initialSelectedOrderNumber,
  onClearInitialSelection,
  onInspectRma,
  onUpdateOrderLogistics,
}: AdminOrdersTabProps) {
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<FulfillmentStage | 'All'>('All');
  const [channelFilter, setChannelFilter] = useState<OrderChannel | 'All'>('All');
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(
    initialSelectedOrderNumber || null
  );
  const [invoiceOrder, setInvoiceOrder] = useState<OrderRecord | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.orderNumber === selectedOrderNumber) ?? null,
    [orders, selectedOrderNumber]
  );

  // Logistics form draft synced when selecting an order
  const [stageDraft, setStageDraft] = useState<FulfillmentStage>('Confirmed');
  const [courierDraft, setCourierDraft] = useState('');
  const [awbDraft, setAwbDraft] = useState('');
  const [trackingUrlDraft, setTrackingUrlDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');

  useEffect(() => {
    if (initialSelectedOrderNumber) {
      setSelectedOrderNumber(initialSelectedOrderNumber);
      onClearInitialSelection?.();
    }
  }, [initialSelectedOrderNumber, onClearInitialSelection]);

  useEffect(() => {
    if (!selectedOrder) return;
    setStageDraft(getEffectiveFulfillmentStage(selectedOrder));
    setCourierDraft(selectedOrder.courierPartner ?? '');
    setAwbDraft(selectedOrder.awbNumber ?? '');
    setTrackingUrlDraft(selectedOrder.trackingUrl ?? '');
    setNotesDraft(selectedOrder.internalNotes ?? '');
  }, [selectedOrder]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((order) => {
      const stage = getEffectiveFulfillmentStage(order);
      const channel = getEffectiveOrderChannel(order);
      if (stageFilter !== 'All' && stage !== stageFilter) return false;
      if (channelFilter !== 'All' && channel !== channelFilter) return false;
      if (!q) return true;
      return [
        order.orderNumber,
        order.customer.fullName,
        order.customer.phone,
        order.customer.city,
        order.customer.state,
        order.awbNumber || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [orders, search, stageFilter, channelFilter]);

  const handleSaveLogistics = () => {
    if (!selectedOrder) return;
    onUpdateOrderLogistics(selectedOrder.orderNumber, {
      fulfillmentStage: stageDraft,
      courierPartner: courierDraft.trim(),
      awbNumber: awbDraft.trim(),
      trackingUrl: trackingUrlDraft.trim(),
      internalNotes: notesDraft.trim(),
    });
  };

  const whatsappTemplates: { kind: WhatsAppTemplateKind; label: string }[] = [
    { kind: 'confirm_cod', label: '1. Confirm & COD Verify' },
    { kind: 'printing', label: '2. 3D Crafting & Packing' },
    { kind: 'dispatch', label: '3. Dispatch + Tracking Link' },
    { kind: 'feedback_repeat', label: '4. Feedback + SMARTKID15' },
  ];

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="glass-surface rounded-3xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Order #, phone, customer name, city, or AWB..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm glass-input rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by payment channel"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as OrderChannel | 'All')}
              className="px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Channels</option>
              {CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums px-2">
              {filteredOrders.length} orders
            </span>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...STAGES] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                stageFilter === st
                  ? 'glass-btn-ink'
                  : 'glass-subtle text-zinc-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Orders Table */}
      <div className="hidden md:block glass-surface rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer & Location</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Courier / AWB</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8 text-xs">
              {filteredOrders.map((order) => {
                const stage = getEffectiveFulfillmentStage(order);
                const channel = getEffectiveOrderChannel(order);
                const rmaBadge = getOrderRmaStatusBadge(order.orderNumber, returns);
                return (
                  <tr
                    key={order.orderNumber}
                    className="hover:bg-white/45 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedOrderNumber(order.orderNumber)}
                        className="font-bold text-zinc-900 dark:text-white hover:text-amber-700 dark:hover:text-amber-300 tabular-nums"
                      >
                        {order.orderNumber}
                      </button>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {order.createdAt.slice(0, 10)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
                        <span>{order.customer.fullName}</span>
                        {order.giftWrap && (
                          <span title="Gift wrapped" className="inline-flex">
                            <Gift className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {order.customer.phone} · {order.customer.city}, {order.customer.state}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-zinc-700 dark:text-zinc-300">
                      {channel}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${stageBadgeClass(stage)}`}
                        >
                          {stage}
                        </span>
                        {rmaBadge && (
                          <button
                            type="button"
                            onClick={() => onInspectRma?.(rmaBadge.rma.rmaNumber)}
                            title={`Inspect ${rmaBadge.rma.rmaNumber} in Returns`}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold hover:opacity-85 ${rmaBadge.toneClass}`}
                          >
                            {rmaBadge.shortLabel}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap tabular-nums text-zinc-600 dark:text-zinc-300">
                      {order.courierPartner ? (
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {order.courierPartner}
                          </div>
                          <div className="text-[11px] font-mono">{order.awbNumber || 'Pending AWB'}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Not assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold tabular-nums text-zinc-900 dark:text-white whitespace-nowrap">
                      {formatINR(order.total)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderNumber(order.orderNumber)}
                          className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
                        >
                          Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          aria-label={`Open GST Invoice for ${order.orderNumber}`}
                          className="p-1.5 rounded-xl glass-btn-secondary text-amber-700 dark:text-amber-300"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-zinc-500 dark:text-zinc-400">
                    <p className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-200">
                      {orders.length === 0
                        ? '0 Live Orders Yet — Waiting for your first checkout on bee4.in'
                        : 'No orders match your current search or stage filters.'}
                    </p>
                    <p className="mt-1 text-xs">
                      Real customer orders placed on bee4.in appear here automatically in real time.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Touch-Friendly Order Cards */}
      <div className="md:hidden space-y-3">
        {filteredOrders.map((order) => {
          const stage = getEffectiveFulfillmentStage(order);
          const rmaBadge = getOrderRmaStatusBadge(order.orderNumber, returns);
          return (
            <div key={order.orderNumber} className="glass-surface rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white tabular-nums">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {order.customer.fullName} · {order.customer.city}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${stageBadgeClass(stage)}`}>
                    {stage}
                  </span>
                  {rmaBadge && (
                    <button
                      type="button"
                      onClick={() => onInspectRma?.(rmaBadge.rma.rmaNumber)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rmaBadge.toneClass}`}
                    >
                      {rmaBadge.shortLabel}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-900/8 dark:border-white/10">
                <span className="font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatINR(order.total)} · {getEffectiveOrderChannel(order)}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInvoiceOrder(order)}
                    className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
                  >
                    GST Invoice
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderNumber(order.orderNumber)}
                    className="px-3 py-1.5 rounded-xl glass-btn-ink text-xs font-semibold"
                  >
                    Fulfill
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filteredOrders.length === 0 && (
          <div className="glass-surface rounded-3xl p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            <p className="font-display text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {orders.length === 0
                ? '0 Live Orders Yet — Waiting for your first checkout on bee4.in'
                : 'No orders match your current filters.'}
            </p>
          </div>
        )}
      </div>

      {/* Order Detail & Logistics Drawer */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage order ${selectedOrder.orderNumber}`}
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/55 backdrop-blur-sm"
          onClick={() => setSelectedOrderNumber(null)}
        >
          <div
            className="w-full max-w-xl h-full overflow-y-auto glass-drawer p-5 sm:p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-zinc-900/10 dark:border-white/10 pb-4">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Order Command Drawer · {getEffectiveOrderChannel(selectedOrder)}
                </p>
                <h2 className="mt-0.5 font-display text-xl font-bold text-zinc-900 dark:text-white tabular-nums">
                  {selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  Placed {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderNumber(null)}
                aria-label="Close drawer"
                className="p-2 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Delivery Address */}
            <div className="glass-subtle rounded-2xl p-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  {selectedOrder.customer.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => setInvoiceOrder(selectedOrder)}
                  className="px-3 py-1.5 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>GST Invoice &amp; A5 Label</span>
                </button>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 tabular-nums">
                {selectedOrder.customer.phone} · {selectedOrder.customer.email || 'No email'}
              </p>
              <p className="text-zinc-600 dark:text-zinc-300">
                {selectedOrder.customer.address}, {selectedOrder.customer.city},{' '}
                {selectedOrder.customer.state} — {selectedOrder.customer.pinCode}
              </p>
              {selectedOrder.giftWrap && (
                <p className="mt-2 p-2.5 rounded-xl bg-amber-500/12 text-amber-900 dark:text-amber-200 font-medium">
                  Gift Wrap Note: &ldquo;{selectedOrder.giftMessage || 'No gift message'}&rdquo;
                </p>
              )}
              {(() => {
                const drawerRmaBadge = getOrderRmaStatusBadge(selectedOrder.orderNumber, returns);
                if (!drawerRmaBadge) return null;
                return (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">
                        {drawerRmaBadge.rma.rmaNumber}: {drawerRmaBadge.shortLabel}
                      </span>
                    </div>
                    {onInspectRma && (
                      <button
                        type="button"
                        onClick={() => {
                          onInspectRma(drawerRmaBadge.rma.rmaNumber);
                          setSelectedOrderNumber(null);
                        }}
                        className="px-2.5 py-1 rounded-lg glass-btn-amber text-white text-[11px] font-semibold"
                      >
                        Manage Return →
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Itemized Cart */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Itemized Cart
              </h3>
              <div className="glass-subtle rounded-2xl divide-y divide-zinc-900/8 dark:divide-white/10">
                {selectedOrder.items.map((item, idx) => (
                  <div key={`${item.productId}-${idx}`} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/60"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900 dark:text-white truncate">{item.title}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.variant} × {item.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold tabular-nums text-zinc-900 dark:text-white shrink-0">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
                <div className="p-3 space-y-1 text-xs tabular-nums">
                  {selectedOrder.couponCode && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                      <span>Coupon ({selectedOrder.couponCode})</span>
                      <span>-{formatINR(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                    <span>Shipping &amp; Gift Wrap</span>
                    <span>{formatINR(selectedOrder.shippingFee + selectedOrder.giftWrapFee)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-zinc-900 dark:text-white pt-1">
                    <span>Grand Total</span>
                    <span>{formatINR(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Courier & Fulfillment Stage Editor */}
            <div className="space-y-3 glass-subtle rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  Courier &amp; Fulfillment Manager
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ord-stage" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Fulfillment Stage
                  </label>
                  <select
                    id="ord-stage"
                    value={stageDraft}
                    onChange={(e) => setStageDraft(e.target.value as FulfillmentStage)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    {STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ord-courier" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Courier Partner
                  </label>
                  <select
                    id="ord-courier"
                    value={courierDraft}
                    onChange={(e) => setCourierDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Courier</option>
                    {COURIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ord-awb" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    AWB Tracking Number
                  </label>
                  <input
                    id="ord-awb"
                    type="text"
                    value={awbDraft}
                    onChange={(e) => setAwbDraft(e.target.value)}
                    placeholder="e.g. DLV490128734"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ord-track-url" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Tracking URL
                  </label>
                  <input
                    id="ord-track-url"
                    type="url"
                    value={trackingUrlDraft}
                    onChange={(e) => setTrackingUrlDraft(e.target.value)}
                    placeholder="https://www.delhivery.com/track/..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="ord-notes" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Internal Studio Notes (XSS Sanitized)
                  </label>
                  <textarea
                    id="ord-notes"
                    rows={2}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Packing checklist or COD verification notes..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveLogistics}
                className="w-full py-2.5 rounded-xl glass-btn-ink text-xs font-semibold"
              >
                Save Fulfillment &amp; Tracking ({mapFulfillmentStageToOrderStatus(stageDraft)})
              </button>
            </div>

            {/* 1-Click WhatsApp Customer Notification Generator */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  1-Click WhatsApp Customer Notifications
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {whatsappTemplates.map((tpl) => {
                  const previewOrder: OrderRecord = {
                    ...selectedOrder,
                    courierPartner: courierDraft || selectedOrder.courierPartner,
                    awbNumber: awbDraft || selectedOrder.awbNumber,
                    trackingUrl: trackingUrlDraft || selectedOrder.trackingUrl,
                  };
                  const built = buildAdminWhatsAppTemplate(previewOrder, tpl.kind);
                  return (
                    <a
                      key={tpl.kind}
                      href={built.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl glass-btn-emerald text-white text-xs font-semibold inline-flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{tpl.label}</span>
                      <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Tax Invoice & Shipping Label Modal */}
      <OrderGstInvoiceModal
        order={invoiceOrder}
        products={products}
        supportEmail={supportEmail}
        whatsappNumber={whatsappNumber}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
}
