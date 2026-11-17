import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  IndianRupee,
  Package,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import type {
  AdminModuleRoute,
  FilamentSpool,
  OrderRecord,
  Product,
  ReturnRequestRecord,
} from '../../types';
import {
  buildExecutiveDashboardSummary,
  DashboardPeriod,
  estimateSpoolRemainingUnits,
  getEffectiveFulfillmentStage,
} from '../../utils/adminLogic';
import { formatINR } from '../../utils/storeLogic';

interface AdminDashboardTabProps {
  orders: OrderRecord[];
  products: Product[];
  spools: FilamentSpool[];
  returns?: ReturnRequestRecord[];
  onNavigateModule: (module: AdminModuleRoute) => void;
  onInspectOrder: (orderNumber: string) => void;
}

export function AdminDashboardTab({
  orders,
  products,
  spools,
  returns = [],
  onNavigateModule,
  onInspectOrder,
}: AdminDashboardTabProps) {
  const [period, setPeriod] = useState<DashboardPeriod>('all');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const summary = useMemo(
    () => buildExecutiveDashboardSummary({ orders, products, returns, period }),
    [orders, products, returns, period]
  );

  const lowSpools = useMemo(
    () => spools.filter((s) => s.remainingGrams <= 450),
    [spools]
  );

  const hasLiveOrders = orders.length > 0 && summary.dailySeries.length > 0;
  const chartSeries = hasLiveOrders
    ? summary.dailySeries
    : [
        { dateLabel: 'Day 1', revenue: 0, orders: 0 },
        { dateLabel: 'Day 2', revenue: 0, orders: 0 },
        { dateLabel: 'Today', revenue: 0, orders: 0 },
      ];

  const maxRev = Math.max(...chartSeries.map((d) => d.revenue), 100);
  const svgWidth = 640;
  const svgHeight = 200;
  const padX = 28;
  const padY = 20;

  const chartPoints = chartSeries.map((pt, i) => {
    const x =
      chartSeries.length === 1
        ? svgWidth / 2
        : padX + (i / (chartSeries.length - 1)) * (svgWidth - padX * 2);
    const y = svgHeight - padY - (pt.revenue / maxRev) * (svgHeight - padY * 2);
    return { ...pt, x, y };
  });

  const linePath = chartPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    chartPoints.length > 0
      ? `${linePath} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${svgHeight - padY} L ${chartPoints[0].x.toFixed(1)} ${svgHeight - padY} Z`
      : '';

  const totalCatRevenue = Math.max(
    summary.categoryRevenue.reduce((s, c) => s + c.revenue, 0),
    1
  );

  return (
    <div className="space-y-6">
      {/* Period Selector Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            Executive Store Performance
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Banka 3D Lab & Live Storefront Metrics (bee4.in)
          </p>
        </div>

        <div
          role="group"
          aria-label="Dashboard time period"
          className="inline-flex p-1 rounded-2xl glass-subtle gap-1 self-start sm:self-auto"
        >
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7d', label: '7D' },
              { id: '30d', label: '30D' },
              { id: 'all', label: 'All-Time' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                period === item.id
                  ? 'glass-btn-ink'
                  : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {orders.length === 0 && (
        <div className="glass-surface rounded-3xl p-4 sm:p-5 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl glass-orb flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                ₹0 Total Revenue • Waiting for your first live order on bee4.in
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Live production mode is clean. Real customer checkouts, verified accounts, and returns sync automatically from Supabase.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold self-start sm:self-auto whitespace-nowrap">
            100% Live Data
          </span>
        </div>
      )}

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Net Revenue &amp; Est. Profit</span>
            <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {formatINR(summary.netRevenue)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-xs tabular-nums">
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
              Net Profit ~ {formatINR(summary.netProfitEstimate)}
            </span>
            {summary.refundsIssued > 0 ? (
              <button
                type="button"
                onClick={() => onNavigateModule('returns')}
                className="text-red-600 dark:text-red-400 font-semibold hover:underline"
              >
                -{formatINR(summary.refundsIssued)} refunds
              </button>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                <TrendingUp className="w-3 h-3" />+{summary.revenueTrendPercent}%
              </span>
            )}
          </div>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Total Orders & AOV</span>
            <ShoppingBag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {summary.totalOrders}
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
            Avg Order Value:{' '}
            <strong className="text-zinc-900 dark:text-white">
              {formatINR(summary.averageOrderValue)}
            </strong>
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Prepaid vs COD Split</span>
            <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {summary.prepaidSharePercent}% Prepaid
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
            {summary.prepaidCount} UPI/Card · {summary.codCount} COD orders
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Pending Dispatch Queue</span>
            <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {summary.pipeline.pendingConfirmation + summary.pipeline.inProduction}
          </p>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-300 tabular-nums">
            {summary.pipeline.shipped} in transit · {summary.pipeline.delivered} delivered
          </p>
        </div>
      </div>

      {/* Fulfillment Pipeline Strip */}
      <div className="glass-surface rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
            Fulfillment Pipeline
          </h3>
          <button
            type="button"
            onClick={() => onNavigateModule('orders')}
            className="text-xs font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1 hover:underline"
          >
            <span>Open Orders Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Pending Confirm', val: summary.pipeline.pendingConfirmation, tone: 'text-amber-700 dark:text-amber-300' },
            { label: '3D Print / Pack', val: summary.pipeline.inProduction, tone: 'text-indigo-700 dark:text-indigo-300' },
            { label: 'Shipped', val: summary.pipeline.shipped, tone: 'text-sky-700 dark:text-sky-300' },
            { label: 'Delivered', val: summary.pipeline.delivered, tone: 'text-emerald-700 dark:text-emerald-300' },
            { label: 'RTO / Cancelled', val: summary.pipeline.rtoOrCancelled, tone: 'text-red-600 dark:text-red-400' },
          ].map((stage) => (
            <div key={stage.label} className="glass-subtle rounded-2xl p-3">
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{stage.label}</p>
              <p className={`mt-1 font-display text-xl font-bold tabular-nums ${stage.tone}`}>
                {stage.val}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Revenue & Order Volume Area Chart */}
        <div className="lg:col-span-7 glass-surface rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                Revenue & Order Volume Trend
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Daily net checkout volume across UPI, BEE4 Wallet &amp; COD
              </p>
            </div>
            {hoveredIdx !== null && chartPoints[hoveredIdx] && (
              <div className="px-3 py-1.5 rounded-xl glass-subtle text-xs font-semibold tabular-nums text-zinc-900 dark:text-white">
                {chartPoints[hoveredIdx].dateLabel}: {formatINR(chartPoints[hoveredIdx].revenue)} (
                {chartPoints[hoveredIdx].orders} orders)
              </div>
            )}
          </div>

          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-52 select-none"
              role="img"
              aria-label="Revenue trend area chart"
            >
              <defs>
                <linearGradient id="bee4AreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity="0.38" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = svgHeight - padY - ratio * (svgHeight - padY * 2);
                return (
                  <line
                    key={ratio}
                    x1={padX}
                    x2={svgWidth - padX}
                    y1={y}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeDasharray="4 4"
                  />
                );
              })}
              {areaPath && <path d={areaPath} fill="url(#bee4AreaGrad)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth={2.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {chartPoints.map((pt, idx) => (
                <g key={pt.dateLabel}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredIdx === idx ? 6 : 4}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={2}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className="cursor-pointer transition-all"
                  />
                  <text
                    x={pt.x}
                    y={svgHeight - 4}
                    textAnchor="middle"
                    className="fill-zinc-500 dark:fill-zinc-400 text-[10px]"
                  >
                    {pt.dateLabel}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Category Performance Breakdown */}
        <div className="lg:col-span-5 glass-surface rounded-3xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
              Category Performance
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Brain-Training Toys vs 3D Home Decor vs Flasks
            </p>
          </div>

          <div className="space-y-3.5">
            {summary.categoryRevenue.map((cat) => {
              const pct = Math.round((cat.revenue / totalCatRevenue) * 100);
              return (
                <div key={cat.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cat.label}
                    </span>
                    <span className="tabular-nums text-zinc-600 dark:text-zinc-300 font-semibold">
                      {formatINR(cat.revenue)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-zinc-900/8 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all"
                      style={{ width: `${Math.max(cat.revenue > 0 ? 6 : 0, pct)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {cat.orders} orders in selected period
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Center Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Orders Requiring Immediate Dispatch */}
        <div className="glass-surface rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                Orders Requiring Immediate Dispatch
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {summary.immediateDispatchOrders.length} awaiting confirmation or packing
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('orders')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-zinc-900/6 dark:divide-white/8">
            {summary.immediateDispatchOrders.slice(0, 4).map((ord) => (
              <div
                key={ord.orderNumber}
                className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/45 dark:hover:bg-white/5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white tabular-nums">
                    {ord.orderNumber} · {ord.customer.fullName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {ord.customer.city}, {ord.customer.state} · {getEffectiveFulfillmentStage(ord)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onInspectOrder(ord.orderNumber)}
                  className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap shrink-0"
                >
                  Fulfill · {formatINR(ord.total)}
                </button>
              </div>
            ))}
            {summary.immediateDispatchOrders.length === 0 && (
              <p className="p-5 text-xs text-zinc-500 dark:text-zinc-400">
                {orders.length === 0
                  ? '0 live orders yet. Immediate dispatch queue activates once your first checkout completes.'
                  : 'All paid & verified orders have been dispatched.'}
              </p>
            )}
          </div>
        </div>

        {/* Low Stock & Filament Restock Alerts */}
        <div className="glass-surface rounded-3xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                  Low Stock (≤5) & Filament Spool Alerts
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {summary.lowStockProducts.length} SKUs low · {lowSpools.length} spools below 450g
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigateModule('inventory')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap"
            >
              Open 3D Lab →
            </button>
          </div>
          <div className="divide-y divide-zinc-900/6 dark:divide-white/8">
            {summary.lowStockProducts.slice(0, 4).map((prod) => (
              <div
                key={prod.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                    {prod.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    SKU {prod.sku} · Threshold {prod.lowStockThreshold ?? 5}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-700 dark:text-red-300 text-xs font-bold tabular-nums shrink-0">
                  {prod.stockQuantity ?? 0} left
                </span>
              </div>
            ))}
            {lowSpools.map((spool) => (
              <div
                key={spool.id}
                className="px-5 py-3 flex items-center justify-between gap-3 bg-amber-500/5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/60 shrink-0"
                    style={{ backgroundColor: spool.colorHex }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {spool.name}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      ~{estimateSpoolRemainingUnits(spool)} toys remaining
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-bold tabular-nums shrink-0">
                  {spool.remainingGrams}g left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
