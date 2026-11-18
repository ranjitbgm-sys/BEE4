import { FormEvent, useMemo, useState } from 'react';
import {
  AlertTriangle,
  IndianRupee,
  Landmark,
  Plus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type {
  MarketplaceChannel,
  MonthlyAdSpendRecord,
  OrderRecord,
  OrderSettlementRecord,
  Product,
  ReturnRequestRecord,
} from '../../types';
import {
  calculateReconciliationReport,
  getEffectiveSourceChannel,
  MARKETPLACE_CHANNELS,
  ReconciliationPeriod,
} from '../../utils/omnichannelLogic';
import { formatINR } from '../../utils/storeLogic';

interface AdminReconciliationTabProps {
  orders: OrderRecord[];
  products: Product[];
  returns: ReturnRequestRecord[];
  adSpends: MonthlyAdSpendRecord[];
  onSaveAdSpend: (entry: MonthlyAdSpendRecord) => void;
  onUpdateOrderSettlement: (orderNumber: string, settlement: OrderSettlementRecord) => void;
}

export function AdminReconciliationTab({
  orders,
  products,
  returns,
  adSpends,
  onSaveAdSpend,
  onUpdateOrderSettlement,
}: AdminReconciliationTabProps) {
  const [period, setPeriod] = useState<ReconciliationPeriod>('30d');
  const [channelFilter, setChannelFilter] = useState<MarketplaceChannel | 'All'>('All');

  // Ad Spend Input Form
  const [adMonth, setAdMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [adChannel, setAdChannel] = useState<MarketplaceChannel | 'All Channels'>('All Channels');
  const [adAmount, setAdAmount] = useState('');
  const [adNotes, setAdNotes] = useState('');

  // Quick Order Settlement Entry Modal
  const [editingOrder, setEditingOrder] = useState<OrderRecord | null>(null);
  const [commFeeDraft, setCommFeeDraft] = useState('0');
  const [pgFeeDraft, setPgFeeDraft] = useState('0');
  const [shipFeeDraft, setShipFeeDraft] = useState('0');
  const [chargedWtDraft, setChargedWtDraft] = useState('0');
  const [settledAmtDraft, setSettledAmtDraft] = useState('0');
  const [utrDraft, setUtrDraft] = useState('');

  const report = useMemo(
    () =>
      calculateReconciliationReport({
        orders,
        products,
        returns,
        adSpends,
        period,
        channelFilter,
      }),
    [orders, products, returns, adSpends, period, channelFilter]
  );

  const handleLogAdSpend = (e: FormEvent) => {
    e.preventDefault();
    const val = Math.max(0, Math.round(Number(adAmount) || 0));
    if (val <= 0) return;
    onSaveAdSpend({
      id: `ad-${adMonth}-${adChannel.replace(/\W+/g, '').toLowerCase()}-${Date.now()}`,
      month: adMonth,
      channel: adChannel,
      amount: val,
      notes: adNotes.trim(),
      updatedAt: new Date().toISOString(),
    });
    setAdAmount('');
    setAdNotes('');
  };

  const openSettlementModal = (order: OrderRecord) => {
    setEditingOrder(order);
    setCommFeeDraft(String(order.settlement?.commissionFee ?? 0));
    setPgFeeDraft(String(order.settlement?.paymentGatewayFee ?? 0));
    setShipFeeDraft(String(order.settlement?.shippingCharged ?? order.shippingFee ?? 0));
    setChargedWtDraft(String(order.settlement?.chargedWeightGrams ?? 0));
    setSettledAmtDraft(String(order.settlement?.actualSettlementReceived ?? 0));
    setUtrDraft(order.settlement?.utrNumber ?? '');
  };

  const handleSaveOrderSettlement = (e: FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const comm = Math.max(0, Number(commFeeDraft) || 0);
    const pg = Math.max(0, Number(pgFeeDraft) || 0);
    const ship = Math.max(0, Number(shipFeeDraft) || 0);
    const actual = Math.max(0, Number(settledAmtDraft) || 0);
    const wt = Math.max(0, Number(chargedWtDraft) || 0);
    const expectedPayout = Math.max(0, Math.round(editingOrder.total - comm - pg - ship));
    onUpdateOrderSettlement(editingOrder.orderNumber, {
      commissionFee: comm,
      paymentGatewayFee: pg,
      shippingCharged: ship,
      chargedWeightGrams: wt > 0 ? wt : undefined,
      expectedPayout,
      actualSettlementReceived: actual,
      utrNumber: utrDraft.trim(),
      settledAt: actual > 0 ? new Date().toISOString() : undefined,
      bankDeposited: actual > 0,
    });
    setEditingOrder(null);
  };

  return (
    <div className="space-y-6">
      {/* Period & Channel Controls */}
      <div className="glass-surface rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['7d', 'Last 7 Days'],
              ['30d', 'Last 30 Days'],
              ['90d', 'Last 90 Days'],
              ['all', 'All Time'],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setPeriod(val)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                period === val
                  ? 'glass-btn-ink'
                  : 'glass-subtle text-zinc-700 dark:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter reconciliation by channel"
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value as MarketplaceChannel | 'All')}
          className="px-3.5 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
        >
          <option value="All">All Channels Combined</option>
          {MARKETPLACE_CHANNELS.map((ch) => (
            <option key={ch} value={ch}>
              {ch}
            </option>
          ))}
        </select>
      </div>

      {/* 8-Step True Profit Waterfall Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-surface rounded-3xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Gross Sales</p>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {formatINR(report.grossSales)}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Before returns &amp; deductions</p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Returns &amp; RTO Deductions</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">
            -{formatINR(report.returnsAndRtoDeduction)}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            Net Sales: <strong>{formatINR(report.netSales)}</strong>
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>COGS + Marketplace Fees + Ads</span>
            <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {formatINR(
              report.totalCogs + report.marketplaceAndShippingFees + report.adSpendTotal
            )}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
            COGS {formatINR(report.totalCogs)} · Fees {formatINR(report.marketplaceAndShippingFees)} · Ads{' '}
            {formatINR(report.adSpendTotal)}
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>True Net Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p
            className={`mt-2 font-display text-2xl font-bold tabular-nums ${
              report.trueNetProfit >= 0
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatINR(report.trueNetProfit)}
          </p>
          <p className="mt-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
            True Margin: {report.trueMarginPercent}% · Bank Settled{' '}
            {formatINR(report.actualBankReceivedTotal)}
          </p>
        </div>
      </div>

      {/* Settlement Variance & Monthly Ad Spend Logger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 glass-surface rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                Monthly Ad &amp; Marketing Spend Logger
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Meta, Flipkart PLA &amp; Amazon Ads deducted into True Net Profit
              </p>
            </div>
          </div>

          <form onSubmit={handleLogAdSpend} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="month"
              value={adMonth}
              onChange={(e) => setAdMonth(e.target.value)}
              aria-label="Ad spend month"
              className="px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            />
            <select
              aria-label="Ad spend channel"
              value={adChannel}
              onChange={(e) =>
                setAdChannel(e.target.value as MarketplaceChannel | 'All Channels')
              }
              className="px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              <option value="All Channels">All Channels</option>
              {MARKETPLACE_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={adAmount}
              onChange={(e) => setAdAmount(e.target.value)}
              placeholder="Amount ₹ (e.g. 2500)"
              className="px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
            <button
              type="submit"
              className="px-3 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Ad Spend</span>
            </button>
          </form>

          {adSpends.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
              No monthly ad spend entries logged yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {adSpends.map((ad) => (
                <div
                  key={ad.id}
                  className="glass-subtle rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {ad.month} · {ad.channel}
                  </span>
                  <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
                    {formatINR(ad.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courier Weight Overcharge & Unpaid Order Discrepancy Detector */}
        <div className="lg:col-span-7 glass-surface rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                  Courier Weight Overcharge &amp; Settlement Discrepancy Detector
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Flags billed weight vs catalog weight mismatches &amp; delivered orders unpaid &gt;15 days
                </p>
              </div>
            </div>
            <span className="text-xs font-bold tabular-nums px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300">
              {report.discrepancies.length} Alerts
            </span>
          </div>

          {report.discrepancies.length === 0 ? (
            <div className="glass-subtle rounded-2xl p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Zero settlement shortfalls, unpaid &gt;15d orders, or courier weight overcharges detected.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {report.discrepancies.map((d, i) => (
                <div
                  key={`${d.orderNumber}-${d.issueType}-${i}`}
                  className="glass-subtle rounded-2xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-zinc-900 dark:text-white">
                      {d.orderNumber} ({d.channel}) · {d.issueType}
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">{d.detail}</p>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400 tabular-nums shrink-0">
                    -{formatINR(d.impactAmount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product-Wise P&L Table (16 Real SKUs) */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
              Product-Wise True P&amp;L ({report.productPnl.length} SKUs)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Real unit sales, COGS, fees, returns loss &amp; net margin across channels
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
            Settlement Gap: {formatINR(report.settlementVariance)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">SKU &amp; Product</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Gross Rev</th>
                <th className="py-3 px-4 text-right">COGS</th>
                <th className="py-3 px-4 text-right">Fees</th>
                <th className="py-3 px-4 text-right">Returns Loss</th>
                <th className="py-3 px-4 text-right">Net Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
              {report.productPnl.map((row) => {
                const matchedProd = products.find((p) => p.id === row.productId);
                return (
                  <tr key={row.productId} className="hover:bg-white/40 dark:hover:bg-white/5">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900 dark:text-white">{row.title}</p>
                      <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{row.sku}</p>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{row.unitsSold}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatINR(row.grossRevenue)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      <div>{formatINR(row.cogsTotal)}</div>
                      {matchedProd?.filamentCostInr ? (
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          3D PLA ₹{matchedProd.filamentCostInr}/u
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatINR(row.feesAndShipping)}</td>
                    <td className="py-3 px-4 text-right tabular-nums text-red-600 dark:text-red-400">
                      {formatINR(row.returnsLoss)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                      {formatINR(row.netProfit)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">
                      {row.marginPercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order-Level Bank Settlement Ledger */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10">
          <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
            Order Settlement &amp; UTR Bank Reconciliation Ledger
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Log marketplace commissions, courier billed weight, actual bank settlement &amp; UTR per order
          </p>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No live orders yet. Once customers place orders or marketplace CSV sheets are imported, settlement payouts appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                  <th className="py-3 px-4">Order # &amp; Channel</th>
                  <th className="py-3 px-4 text-right">Order Total</th>
                  <th className="py-3 px-4 text-right">Expected Payout</th>
                  <th className="py-3 px-4 text-right">Bank Received</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
                {orders.slice(0, 25).map((o) => (
                  <tr key={o.orderNumber}>
                    <td className="py-3 px-4">
                      <p className="font-bold text-zinc-900 dark:text-white">{o.orderNumber}</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {getEffectiveSourceChannel(o)} · {o.status}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatINR(o.total)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {formatINR(o.settlement?.expectedPayout ?? o.total)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold">
                      {formatINR(o.settlement?.actualSettlementReceived ?? 0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openSettlementModal(o)}
                        className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
                      >
                        Log Payout
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Settlement Modal */}
      {editingOrder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-950/55 flex items-center justify-center p-4"
          onClick={() => setEditingOrder(null)}
        >
          <form
            onSubmit={handleSaveOrderSettlement}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-drawer rounded-3xl p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              Settlement Audit · {editingOrder.orderNumber}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Commission ₹</label>
                <input
                  type="number"
                  value={commFeeDraft}
                  onChange={(e) => setCommFeeDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">PG Fee ₹</label>
                <input
                  type="number"
                  value={pgFeeDraft}
                  onChange={(e) => setPgFeeDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Shipping Charged ₹</label>
                <input
                  type="number"
                  value={shipFeeDraft}
                  onChange={(e) => setShipFeeDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Courier Weight (g)</label>
                <input
                  type="number"
                  value={chargedWtDraft}
                  onChange={(e) => setChargedWtDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Actual Bank Settled ₹</label>
                <input
                  type="number"
                  value={settledAmtDraft}
                  onChange={(e) => setSettledAmtDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Bank UTR Ref</label>
                <input
                  type="text"
                  value={utrDraft}
                  onChange={(e) => setUtrDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
              >
                Save Settlement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
