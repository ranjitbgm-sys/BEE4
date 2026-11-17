import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  IndianRupee,
  MessageCircle,
  PackageCheck,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';
import type {
  CrmCustomerFlag,
  FilamentSpool,
  MarketplaceChannel,
  OrderRecord,
  Product,
  RefundMode,
  ReturnBucket,
  ReturnRequestRecord,
  ReturnRequestStatus,
  ReturnResolutionType,
} from '../../types';
import type { CrmCustomerSummary } from '../../utils/adminLogic';
import {
  buildSpfClaimDossierCsv,
  calculateReturnOverdueDays,
  getReturnBucket,
  isReturnOverdueUnreceived,
  MARKETPLACE_CHANNELS,
  RETURN_BUCKETS,
} from '../../utils/omnichannelLogic';
import {
  buildRmaWhatsAppTemplate,
  calculateReturnKpis,
  calculateStoreCreditAmount,
  computeReturnItemsValue,
  getOrderRmaStatusBadge,
  REJECTION_REASON_PRESETS,
  REVERSE_COURIERS,
  RMA_WORKFLOW_STATUSES,
  RmaTransitionUpdates,
  RmaWhatsAppTemplateKind,
} from '../../utils/rmaLogic';
import { formatINR, normalizeIndianPhone10 } from '../../utils/storeLogic';

interface AdminReturnsTabProps {
  returns: ReturnRequestRecord[];
  orders: OrderRecord[];
  products: Product[];
  crmCustomers: CrmCustomerSummary[];
  spools: FilamentSpool[];
  initialSelectedRmaNumber?: string | null;
  onClearInitialSelection?: () => void;
  onUpdateReturnRequest: (
    prevReturn: ReturnRequestRecord,
    nextUpdates: RmaTransitionUpdates,
    options?: { forceQueuePrint?: boolean; receivedAtHub?: boolean; claimFiled?: boolean; claimReferenceId?: string; qcOutcome?: ReturnRequestRecord['qcOutcome'] }
  ) => void;
  onInspectOrder: (orderNumber: string) => void;
}

function crmBadgeStyle(flag: CrmCustomerFlag): string {
  switch (flag) {
    case 'VIP':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30';
    case 'High-Risk RTO':
      return 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30';
    default:
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25';
  }
}

export function AdminReturnsTab({
  returns,
  orders,
  products,
  crmCustomers,
  spools,
  initialSelectedRmaNumber,
  onClearInitialSelection,
  onUpdateReturnRequest,
  onInspectOrder,
}: AdminReturnsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReturnRequestStatus | 'All'>('All');
  const [bucketFilter, setBucketFilter] = useState<ReturnBucket | 'All'>('All');
  const [channelFilter, setChannelFilter] = useState<MarketplaceChannel | 'All'>('All');
  const [overdueFilter, setOverdueFilter] = useState<'all' | 10 | 20 | 30>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [resolutionFilter, setResolutionFilter] = useState<ReturnResolutionType | 'All'>('All');
  const [selectedRmaNumber, setSelectedRmaNumber] = useState<string | null>(
    initialSelectedRmaNumber || null
  );
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedRmaNumber) {
      setSelectedRmaNumber(initialSelectedRmaNumber);
      onClearInitialSelection?.();
    }
  }, [initialSelectedRmaNumber, onClearInitialSelection]);

  const kpis = useMemo(() => calculateReturnKpis(returns), [returns]);

  const crmFlagByPhone = useMemo(() => {
    const map = new Map<string, CrmCustomerFlag>();
    for (const c of crmCustomers) {
      const p10 = normalizeIndianPhone10(c.phone);
      if (p10) map.set(p10, c.flag);
      if (c.email) map.set(c.email.toLowerCase(), c.flag);
    }
    return map;
  }, [crmCustomers]);

  const resolveCustomerFlag = (rma: ReturnRequestRecord): CrmCustomerFlag => {
    const p10 = normalizeIndianPhone10(rma.customerPhone);
    return (
      (p10 && crmFlagByPhone.get(p10)) ||
      (rma.customerEmail && crmFlagByPhone.get(rma.customerEmail.toLowerCase())) ||
      'Standard'
    );
  };

  const selectedRma = useMemo(
    () => returns.find((r) => r.rmaNumber === selectedRmaNumber) ?? null,
    [returns, selectedRmaNumber]
  );

  // Action Drawer Form State
  const [statusDraft, setStatusDraft] = useState<ReturnRequestStatus>('Return Requested');
  const [reverseCourierDraft, setReverseCourierDraft] = useState('');
  const [reverseAwbDraft, setReverseAwbDraft] = useState('');
  const [replacementAwbDraft, setReplacementAwbDraft] = useState('');
  const [autoRestockDraft, setAutoRestockDraft] = useState(false);
  const [rejectionReasonDraft, setRejectionReasonDraft] = useState('');
  const [refundAmountDraft, setRefundAmountDraft] = useState('');
  const [refundModeDraft, setRefundModeDraft] = useState<RefundMode>('UPI Transfer');
  const [refundUtrDraft, setRefundUtrDraft] = useState('');
  const [adminNoteDraft, setAdminNoteDraft] = useState('');

  useEffect(() => {
    if (!selectedRma) return;
    setStatusDraft(selectedRma.status);
    setReverseCourierDraft(selectedRma.reverseCourier ?? '');
    setReverseAwbDraft(selectedRma.reverseAwb ?? '');
    setReplacementAwbDraft(selectedRma.replacementAwb ?? '');
    setAutoRestockDraft(Boolean(selectedRma.autoRestockEnabled));
    setRejectionReasonDraft(selectedRma.rejectionReason ?? '');
    const defaultVal =
      typeof selectedRma.refundAmount === 'number'
        ? selectedRma.refundAmount
        : computeReturnItemsValue(selectedRma.items);
    setRefundAmountDraft(String(defaultVal));
    setRefundModeDraft(
      selectedRma.refundMode ??
        (selectedRma.resolutionType === 'Instant Store Credit Coupon (+10% Bonus Value)'
          ? 'Store Credit Coupon'
          : selectedRma.orderPaymentMethod.trim().toLowerCase() === 'cod' ||
              selectedRma.orderPaymentMethod.trim().toLowerCase().includes('cash on delivery')
            ? 'UPI Transfer'
            : 'Original Source')
    );
    setRefundUtrDraft(selectedRma.refundUtr ?? '');
    setAdminNoteDraft(selectedRma.adminNote ?? '');
  }, [selectedRma]);

  const overdue10Count = useMemo(
    () => returns.filter((r) => isReturnOverdueUnreceived(r, 10)).length,
    [returns]
  );
  const overdue20Count = useMemo(
    () => returns.filter((r) => isReturnOverdueUnreceived(r, 20)).length,
    [returns]
  );
  const overdue30Count = useMemo(
    () => returns.filter((r) => isReturnOverdueUnreceived(r, 30)).length,
    [returns]
  );

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return returns.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (bucketFilter !== 'All' && getReturnBucket(r) !== bucketFilter) return false;
      if (channelFilter !== 'All' && (r.sourceChannel || 'bee4.in') !== channelFilter) return false;
      if (overdueFilter !== 'all' && !isReturnOverdueUnreceived(r, overdueFilter)) return false;
      if (dateFrom && r.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.createdAt.slice(0, 10) > dateTo) return false;
      if (resolutionFilter !== 'All' && r.resolutionType !== resolutionFilter) return false;
      if (!q) return true;
      return [
        r.rmaNumber,
        r.orderNumber,
        r.customerName,
        r.customerPhone,
        r.reason,
        r.reverseAwb || '',
        r.replacementAwb || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [
    returns,
    search,
    statusFilter,
    bucketFilter,
    channelFilter,
    overdueFilter,
    dateFrom,
    dateTo,
    resolutionFilter,
  ]);

  const handleExportSpfDossier = () => {
    const targetList =
      overdueFilter !== 'all'
        ? filteredReturns
        : returns.filter((r) => !r.receivedAtHub || r.qcOutcome === 'Damaged_Unsellable');
    const csv = buildSpfClaimDossierCsv(targetList, orders);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BEE4-SPF-Claim-Dossier-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildDraftUpdates = (): RmaTransitionUpdates => ({
    status: statusDraft,
    rejectionReason: rejectionReasonDraft.trim(),
    adminNote: adminNoteDraft.trim(),
    reverseCourier: reverseCourierDraft.trim(),
    reverseAwb: reverseAwbDraft.trim(),
    replacementAwb: replacementAwbDraft.trim(),
    autoRestockEnabled: autoRestockDraft,
    refundAmount: Math.max(0, Math.round(Number(refundAmountDraft) || 0)),
    refundMode: refundModeDraft,
    refundUtr: refundUtrDraft.trim(),
  });

  const handleSaveRma = () => {
    if (!selectedRma) return;
    onUpdateReturnRequest(selectedRma, buildDraftUpdates());
  };

  const handleQuickQcDecision = (outcome: 'ok' | 'damaged') => {
    if (!selectedRma) return;
    const base = buildDraftUpdates();
    if (outcome === 'ok') {
      onUpdateReturnRequest(
        selectedRma,
        {
          ...base,
          status: 'QC Passed — Restocked to Inventory',
          autoRestockEnabled: true,
        },
        { receivedAtHub: true, qcOutcome: 'OK_Sellable' }
      );
      setStatusDraft('QC Passed — Restocked to Inventory');
      setAutoRestockDraft(true);
    } else {
      onUpdateReturnRequest(
        selectedRma,
        {
          ...base,
          status: 'QC Failed — Damaged / Scrap PLA (Do Not Restock)',
          autoRestockEnabled: false,
        },
        { receivedAtHub: true, qcOutcome: 'Damaged_Unsellable' }
      );
      setStatusDraft('QC Failed — Damaged / Scrap PLA (Do Not Restock)');
      setAutoRestockDraft(false);
    }
  };

  const handleSendTo3dPrintQueue = () => {
    if (!selectedRma) return;
    const updates = buildDraftUpdates();
    onUpdateReturnRequest(selectedRma, updates, { forceQueuePrint: true });
  };

  const whatsappKinds: { kind: RmaWhatsAppTemplateKind; label: string }[] = [
    { kind: 'approved_pickup', label: '1. Approved & Reverse Pickup' },
    { kind: 'replacement_shipped', label: '2. Replacement Shipped' },
    { kind: 'refund_processed', label: '3. Refund Processed (UTR)' },
    { kind: 'declined', label: '4. Return Declined Politely' },
  ];

  const parentOrder = selectedRma
    ? orders.find((o) => o.orderNumber === selectedRma.orderNumber)
    : undefined;
  const totalQtySelected = selectedRma
    ? selectedRma.items.reduce((s, it) => s + Math.max(1, it.quantity), 0)
    : 0;
  const primaryProduct =
    selectedRma?.items[0] && products.find((p) => p.id === selectedRma.items[0].productId);
  const topSpool = spools[0];

  return (
    <div className="space-y-6">
      {/* 4 Return KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Pending Return Requests</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {kpis.pendingCount}
          </p>
          <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300 font-semibold">
            {kpis.pendingCount > 0 ? 'Needs studio inspection' : 'All requests reviewed'}
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Active Reverse Pickups</span>
            <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {kpis.activePickupsCount}
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            In transit or awaiting QC at Banka Hub
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Total Refunded Value</span>
            <IndianRupee className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {formatINR(kpis.totalRefundedValue)}
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300">
            Auto-deducted from Net Dashboard Revenue
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Saved Revenue Ratio</span>
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {kpis.savedRevenueRatioPercent}%
          </p>
          <p className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums">
            {kpis.savedRevenueCount}/{kpis.resolvedOrActiveCount} via Replacement / Store Credit
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-surface rounded-3xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search RMA #, Order #, customer, phone, or AWB..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm glass-input rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter returns by channel"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as MarketplaceChannel | 'All')}
              className="px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Channels</option>
              {MARKETPLACE_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by preferred resolution"
              value={resolutionFilter}
              onChange={(e) =>
                setResolutionFilter(e.target.value as ReturnResolutionType | 'All')
              }
              className="px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Resolutions</option>
              <option value="Free Instant Replacement">Free Instant Replacement</option>
              <option value="Instant Store Credit Coupon (+10% Bonus Value)">
                Store Credit (+10% Bonus)
              </option>
              <option value="Refund to Original Payment / UPI ID">Refund to UPI / Original</option>
            </select>

            <button
              type="button"
              onClick={handleExportSpfDossier}
              className="px-3.5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export SPF Claim Dossier</span>
            </button>

            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums px-2">
              {filteredReturns.length} RMAs
            </span>
          </div>
        </div>

        {/* 10/20/30-Day Unreceived Overdue Pills + Custom Date Range */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-900/8 dark:border-white/10">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOverdueFilter('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                overdueFilter === 'all' ? 'glass-btn-ink' : 'glass-subtle text-zinc-700 dark:text-zinc-300'
              }`}
            >
              All Ages
            </button>
            <button
              type="button"
              onClick={() => setOverdueFilter(10)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold tabular-nums ${
                overdueFilter === 10
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-amber-500/12 text-amber-800 dark:text-amber-300'
              }`}
            >
              10+ Days Overdue ({overdue10Count})
            </button>
            <button
              type="button"
              onClick={() => setOverdueFilter(20)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold tabular-nums ${
                overdueFilter === 20
                  ? 'bg-orange-500 text-white font-bold'
                  : 'bg-orange-500/12 text-orange-800 dark:text-orange-300'
              }`}
            >
              20+ Days Overdue ({overdue20Count})
            </button>
            <button
              type="button"
              onClick={() => setOverdueFilter(30)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold tabular-nums ${
                overdueFilter === 30
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-red-500/15 text-red-700 dark:text-red-300'
              }`}
            >
              30+ Days Overdue ({overdue30Count})
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              aria-label="Returns from date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-2.5 py-1 rounded-xl glass-input text-[11px]"
            />
            <span className="text-zinc-400">to</span>
            <input
              type="date"
              aria-label="Returns to date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-2.5 py-1 rounded-xl glass-input text-[11px]"
            />
          </div>
        </div>

        {/* 6 Base.com Operational Return Buckets */}
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...RETURN_BUCKETS] as const).map((bkt) => (
            <button
              key={bkt}
              type="button"
              onClick={() => setBucketFilter(bkt)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                bucketFilter === bkt
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'glass-subtle text-zinc-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/10'
              }`}
            >
              {bkt}
            </button>
          ))}
        </div>

        {/* Detailed Workflow Status Pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['All', ...RMA_WORKFLOW_STATUSES] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'glass-btn-ink'
                  : 'glass-subtle text-zinc-700 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop RMAs Table */}
      <div className="hidden md:block glass-surface rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">RMA / Order</th>
                <th className="py-3 px-4">Customer &amp; CRM Tag</th>
                <th className="py-3 px-4">Items &amp; Reason</th>
                <th className="py-3 px-4">Resolution</th>
                <th className="py-3 px-4">Workflow Stage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8 text-xs">
              {filteredReturns.map((rma) => {
                const badge = getOrderRmaStatusBadge(rma.orderNumber, [rma]);
                const crmFlag = resolveCustomerFlag(rma);
                const rmaValue = computeReturnItemsValue(rma.items);
                return (
                  <tr
                    key={rma.id}
                    className="hover:bg-white/45 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedRmaNumber(rma.rmaNumber)}
                        className="font-bold text-zinc-900 dark:text-white hover:text-amber-700 dark:hover:text-amber-300 tabular-nums"
                      >
                        {rma.rmaNumber}
                      </button>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {rma.orderNumber} · {rma.createdAt.slice(0, 10)}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-zinc-900 dark:text-white">
                          {rma.customerName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${crmBadgeStyle(crmFlag)}`}
                        >
                          {crmFlag}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {rma.customerPhone} · {rma.orderPaymentMethod.toUpperCase()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="font-semibold text-zinc-900 dark:text-white truncate">
                        {rma.items.map((it) => `${it.title} ×${it.quantity}`).join(', ')}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {rma.reason}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {rma.resolutionType.startsWith('Free')
                          ? 'Replacement'
                          : rma.resolutionType.startsWith('Instant')
                            ? 'Store Credit +10%'
                            : 'Refund'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        Value {formatINR(rmaValue)}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {badge && (
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${badge.toneClass}`}
                        >
                          {badge.shortLabel}
                        </span>
                      )}
                      {(() => {
                        const overdueDays = calculateReturnOverdueDays(rma);
                        if (!rma.receivedAtHub && overdueDays >= 10) {
                          return (
                            <div className="text-[10px] font-bold text-red-600 dark:text-red-400 mt-1 tabular-nums">
                              {overdueDays}d Overdue (Not Recvd)
                            </div>
                          );
                        }
                        return null;
                      })()}
                      {rma.isRestocked && (
                        <div className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                          Restocked ✓
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedRmaNumber(rma.rmaNumber)}
                        className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
                      >
                        Inspect RMA
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No return requests match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Touch Cards */}
      <div className="md:hidden space-y-3">
        {filteredReturns.map((rma) => {
          const badge = getOrderRmaStatusBadge(rma.orderNumber, [rma]);
          const crmFlag = resolveCustomerFlag(rma);
          return (
            <div key={rma.id} className="glass-surface rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-sm text-zinc-900 dark:text-white tabular-nums">
                    {rma.rmaNumber} · {rma.orderNumber}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {rma.customerName} ({crmFlag})
                  </p>
                </div>
                {badge && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${badge.toneClass}`}>
                    {badge.shortLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">{rma.reason}</p>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-900/8 dark:border-white/10 text-xs">
                <span className="font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatINR(computeReturnItemsValue(rma.items))}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRmaNumber(rma.rmaNumber)}
                  className="px-3 py-1.5 rounded-xl glass-btn-ink text-xs font-semibold"
                >
                  Inspect &amp; Sync
                </button>
              </div>
            </div>
          );
        })}
        {filteredReturns.length === 0 && (
          <div className="glass-surface rounded-3xl p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {returns.length === 0
              ? '0 return or replacement requests yet. Submitted 7-day RMAs appear here.'
              : 'No return requests match your current search or filter.'}
          </div>
        )}
      </div>

      {/* Slide-Over Return Inspection & Action Drawer */}
      {selectedRma && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Inspect return ${selectedRma.rmaNumber}`}
          className="fixed inset-0 z-50 flex justify-end bg-zinc-950/55 backdrop-blur-sm"
          onClick={() => setSelectedRmaNumber(null)}
        >
          <div
            className="w-full max-w-2xl h-full overflow-y-auto glass-drawer p-5 sm:p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-zinc-900/10 dark:border-white/10 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    RMA Command Inspection
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${crmBadgeStyle(resolveCustomerFlag(selectedRma))}`}
                  >
                    CRM: {resolveCustomerFlag(selectedRma)}
                  </span>
                </div>
                <h2 className="mt-1 font-display text-xl font-bold text-zinc-900 dark:text-white tabular-nums">
                  {selectedRma.rmaNumber} · Order {selectedRma.orderNumber}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  Requested {new Date(selectedRma.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRmaNumber(null)}
                aria-label="Close RMA drawer"
                className="p-2 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order & Customer Details */}
            <div className="glass-subtle rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-sm text-zinc-900 dark:text-white">
                    {selectedRma.customerName}
                  </span>
                  <span className="ml-2 text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {selectedRma.customerPhone} · {selectedRma.orderPaymentMethod.toUpperCase()} Order
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onInspectOrder(selectedRma.orderNumber);
                    setSelectedRmaNumber(null);
                  }}
                  className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1"
                >
                  <span>Open Order</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {parentOrder && (
                <p className="text-zinc-600 dark:text-zinc-300">
                  Shipped to: {parentOrder.customer.address}, {parentOrder.customer.city},{' '}
                  {parentOrder.customer.state} ({parentOrder.customer.pinCode})
                </p>
              )}

              <div className="pt-2 border-t border-zinc-900/8 dark:border-white/10 space-y-1">
                <p>
                  <strong className="text-zinc-900 dark:text-white">Reason:</strong>{' '}
                  {selectedRma.reason}
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-white">Requested Resolution:</strong>{' '}
                  {selectedRma.resolutionType}
                </p>
                {selectedRma.customerComments && (
                  <p className="p-2.5 rounded-xl bg-white/60 dark:bg-white/5 text-zinc-700 dark:text-zinc-200 italic">
                    &ldquo;{selectedRma.customerComments}&rdquo;
                  </p>
                )}
              </div>

              {(selectedRma.refundUpiId || selectedRma.refundBankAccount) && (
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 tabular-nums">
                  <strong>Customer Payout Details:</strong>{' '}
                  {selectedRma.refundUpiId
                    ? `UPI: ${selectedRma.refundUpiId}`
                    : `A/C: ${selectedRma.refundBankAccount} · IFSC: ${selectedRma.refundBankIfsc}`}
                </div>
              )}
            </div>

            {/* Returned Items & Damage Proof Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-subtle rounded-2xl p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Returned Items ({totalQtySelected})
                </p>
                {selectedRma.items.map((item) => (
                  <div key={`${item.productId}-${item.variant}`} className="flex items-center gap-2.5 text-xs">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-white/60"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900 dark:text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {item.variant} × {item.quantity} · {formatINR(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
                {primaryProduct && (
                  <p className="pt-1 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    Live Stock: <strong>{primaryProduct.stockQuantity ?? 0}</strong> · Scrap PLA:{' '}
                    <strong>{primaryProduct.damagedScrapCount ?? 0}</strong>
                  </p>
                )}
              </div>

              <div className="glass-subtle rounded-2xl p-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Damage / Unpacking Proof Photos (Click to Zoom)
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {selectedRma.proofImages.map((url, idx) => (
                    <button
                      key={`${url.slice(0, 20)}-${idx}`}
                      type="button"
                      onClick={() => setZoomedImageUrl(url)}
                      aria-label={`Zoom damage proof photo ${idx + 1}`}
                      className="group relative w-20 h-20 rounded-xl overflow-hidden border border-white/70 dark:border-white/15"
                    >
                      <img
                        src={url}
                        alt={`Proof ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-zinc-950/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <ZoomIn className="w-4 h-4" />
                      </span>
                    </button>
                  ))}
                  {selectedRma.proofImages.length === 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      No proof photos attached.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Workflow Controls & Smart Sync Actions */}
            <div className="glass-subtle rounded-2xl p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span>RMA Workflow, QC &amp; Settlement Sync</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  {selectedRma.isRestocked && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                      Restocked ✓
                    </span>
                  )}
                  {selectedRma.scrapRecorded && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 text-[10px] font-bold">
                      Scrap PLA Logged
                    </span>
                  )}
                </div>
              </div>

              {/* 1-Click Hub Receipt & QC Resolution Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickQcDecision('ok')}
                  className="px-3 py-2 rounded-xl glass-btn-emerald text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark OK (Sellable)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickQcDecision('damaged')}
                  className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mark Damaged (P&amp;L)</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateReturnRequest(selectedRma, buildDraftUpdates(), {
                      claimFiled: true,
                      claimReferenceId: `SPF-${selectedRma.rmaNumber}`,
                    })
                  }
                  className="px-3 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>{selectedRma.claimFiled ? 'SPF Filed ✓' : 'File SPF Claim'}</span>
                </button>
              </div>

              <div>
                <label htmlFor="rma-status-select" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Return Stage
                </label>
                <select
                  id="rma-status-select"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as ReturnRequestStatus)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                >
                  {RMA_WORKFLOW_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {statusDraft === 'Rejected' && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 space-y-2">
                  <label htmlFor="rma-reject-reason" className="block text-[11px] font-bold text-red-800 dark:text-red-200">
                    Rejection Reason (Shown to Customer)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {REJECTION_REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectionReasonDraft(preset)}
                        className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 text-[11px] font-medium text-zinc-800 dark:text-zinc-200 hover:bg-white"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    id="rma-reject-reason"
                    type="text"
                    value={rejectionReasonDraft}
                    onChange={(e) => setRejectionReasonDraft(e.target.value)}
                    placeholder="Enter specific reason for declining this return..."
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>
              )}

              {/* Reverse Pickup & Replacement Dispatch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="rma-rev-courier" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Reverse Courier
                  </label>
                  <select
                    id="rma-rev-courier"
                    value={reverseCourierDraft}
                    onChange={(e) => setReverseCourierDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    <option value="">Select Courier</option>
                    {REVERSE_COURIERS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="rma-rev-awb" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Reverse Pickup AWB
                  </label>
                  <input
                    id="rma-rev-awb"
                    type="text"
                    value={reverseAwbDraft}
                    onChange={(e) => setReverseAwbDraft(e.target.value)}
                    placeholder="e.g. DRP7810293"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="rma-rep-awb" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Replacement Ship AWB
                  </label>
                  <input
                    id="rma-rep-awb"
                    type="text"
                    value={replacementAwbDraft}
                    onChange={(e) => setReplacementAwbDraft(e.target.value)}
                    placeholder="e.g. DLV9001244"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              {/* 3D Print Lab Replacement Trigger + Auto-Restock Checkbox */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/55 dark:bg-white/5 border border-zinc-900/8 dark:border-white/10">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRestockDraft}
                    disabled={selectedRma.isRestocked}
                    onChange={(e) => setAutoRestockDraft(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>
                    {selectedRma.isRestocked
                      ? `Already restocked +${totalQtySelected} unit(s) to Inventory ✓`
                      : `Auto-Restock returned qty (+${totalQtySelected}) to sellable Product Inventory`}
                  </span>
                </label>

                <button
                  type="button"
                  disabled={Boolean(selectedRma.replacementPrintQueued)}
                  onClick={handleSendTo3dPrintQueue}
                  className="px-3 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-600" />
                  <span>
                    {selectedRma.replacementPrintQueued
                      ? 'Queued in 3D Print Lab ✓'
                      : `Send to 3D Print Queue${topSpool ? ` (${topSpool.remainingGrams}g spool)` : ''}`}
                  </span>
                </button>
              </div>

              {/* Refund Financial Settlement */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label htmlFor="rma-refund-amt" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Refund Amount (₹)
                  </label>
                  <input
                    id="rma-refund-amt"
                    type="number"
                    min={0}
                    value={refundAmountDraft}
                    onChange={(e) => setRefundAmountDraft(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-bold tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="rma-refund-mode" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Refund Mode
                  </label>
                  <select
                    id="rma-refund-mode"
                    value={refundModeDraft}
                    onChange={(e) => setRefundModeDraft(e.target.value as RefundMode)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    <option value="UPI Transfer">UPI Transfer</option>
                    <option value="Original Source">Original Source</option>
                    <option value="Store Credit Coupon">Store Credit Coupon (+10%)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="rma-refund-utr" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                    Refund UTR / Reference
                  </label>
                  <input
                    id="rma-refund-utr"
                    type="text"
                    value={refundUtrDraft}
                    onChange={(e) => setRefundUtrDraft(e.target.value)}
                    placeholder="e.g. UTR501928374"
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              {refundModeDraft === 'Store Credit Coupon' && (
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Completing refund as Store Credit will auto-issue a 1-time flat coupon worth{' '}
                  {formatINR(calculateStoreCreditAmount(Number(refundAmountDraft) || 0))} (+10% Bonus).
                  {selectedRma.issuedCouponCode ? ` Issued Code: ${selectedRma.issuedCouponCode}` : ''}
                </p>
              )}

              <div>
                <label htmlFor="rma-admin-note" className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                  Studio / QC Inspection Note (XSS Sanitized)
                </label>
                <textarea
                  id="rma-admin-note"
                  rows={2}
                  value={adminNoteDraft}
                  onChange={(e) => setAdminNoteDraft(e.target.value)}
                  placeholder="Add QC findings, replacement batch notes, or pickup timing..."
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              {statusDraft === 'QC Failed — Damaged / Scrap PLA (Do Not Restock)' && (
                <div className="p-2.5 rounded-xl bg-amber-500/12 border border-amber-500/25 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Damaged/Scrap PLA will be logged separately without adding defective units back to sellable stock.
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveRma}
                className="w-full py-2.5 rounded-xl glass-btn-ink text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Save RMA Update &amp; Sync Store</span>
              </button>
            </div>

            {/* 4 1-Click WhatsApp Return Notifications */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-200">
                  1-Click WhatsApp Return Notifications
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {whatsappKinds.map((tpl) => {
                  const previewRma: ReturnRequestRecord = {
                    ...selectedRma,
                    status: statusDraft,
                    reverseCourier: reverseCourierDraft || selectedRma.reverseCourier,
                    reverseAwb: reverseAwbDraft || selectedRma.reverseAwb,
                    replacementAwb: replacementAwbDraft || selectedRma.replacementAwb,
                    refundAmount: Number(refundAmountDraft) || selectedRma.refundAmount,
                    refundMode: refundModeDraft,
                    refundUtr: refundUtrDraft || selectedRma.refundUtr,
                    rejectionReason: rejectionReasonDraft || selectedRma.rejectionReason,
                  };
                  const built = buildRmaWhatsAppTemplate(previewRma, tpl.kind);
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

      {/* Damage Photo Proof Lightbox Modal */}
      {zoomedImageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Zoomed damage photo proof"
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden glass-drawer p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              aria-label="Close photo zoom"
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-950/75 text-white hover:bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={zoomedImageUrl}
              alt="Customer return damage proof"
              className="max-h-[78vh] w-auto rounded-2xl object-contain"
            />
            <div className="px-3 py-2 flex items-center justify-between text-xs text-zinc-700 dark:text-zinc-200">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Verified Customer Return Proof
              </span>
              <button
                type="button"
                onClick={() => setZoomedImageUrl(null)}
                className="font-semibold hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
