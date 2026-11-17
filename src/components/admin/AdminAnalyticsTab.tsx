import { useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet, MapPin } from 'lucide-react';
import type { MarketplaceChannel, OrderRecord, Product, ReturnRequestRecord } from '../../types';
import {
  buildAnnualMonthlyMatrix,
  buildGstHsnReport,
  buildStateAnalytics,
  exportGstHsnCsv,
  MARKETPLACE_CHANNELS,
} from '../../utils/omnichannelLogic';
import { formatINR } from '../../utils/storeLogic';

interface AdminAnalyticsTabProps {
  orders: OrderRecord[];
  products: Product[];
  returns: ReturnRequestRecord[];
}

export function AdminAnalyticsTab({ orders, products, returns }: AdminAnalyticsTabProps) {
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [matrixChannel, setMatrixChannel] = useState<MarketplaceChannel | 'All'>('All');

  const stateRows = useMemo(
    () => buildStateAnalytics(orders, products, returns),
    [orders, products, returns]
  );

  const monthlyRows = useMemo(
    () => buildAnnualMonthlyMatrix(orders, products, selectedYear, matrixChannel),
    [orders, products, selectedYear, matrixChannel]
  );

  const gstRows = useMemo(() => buildGstHsnReport(orders, products, 'Bihar'), [orders, products]);

  const maxStateRev = Math.max(1, ...stateRows.map((s) => s.grossRevenue));

  const handleDownloadGstr1 = () => {
    const csv = exportGstHsnCsv(gstRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BEE4-GSTR1-HSN-Summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. State-Wise Indian Region Breakdown */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                State-Wise / Pan-India Region Analytics
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Real customer demand, RTO / return rate &amp; net contribution by Indian State
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
            {stateRows.length} Active States
          </span>
        </div>

        {stateRows.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            No regional sales recorded yet. Orders from bee4.in &amp; marketplaces populate pan-India state heat metrics automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                  <th className="py-3 px-4">State / UT</th>
                  <th className="py-3 px-4">Share</th>
                  <th className="py-3 px-4 text-right">Orders</th>
                  <th className="py-3 px-4 text-right">Gross Revenue</th>
                  <th className="py-3 px-4 text-right">Return %</th>
                  <th className="py-3 px-4 text-right">Est. Net Profit</th>
                  <th className="py-3 px-4 text-right">Top Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
                {stateRows.map((row) => (
                  <tr key={row.state}>
                    <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">{row.state}</td>
                    <td className="py-3 px-4 w-40">
                      <div className="h-2 rounded-full bg-zinc-900/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.round((row.grossRevenue / maxStateRev) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{row.ordersCount}</td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">
                      {formatINR(row.grossRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{row.returnRatePercent}%</td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-300">
                      {formatINR(row.estimatedNetProfit)}
                    </td>
                    <td className="py-3 px-4 text-right">{row.topChannel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Month-by-Month Jan-Dec Matrix */}
      <div className="glass-surface rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <div>
              <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                Month-by-Month Annual P&amp;L Matrix ({selectedYear})
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Jan – Dec seasonal sales &amp; net margin breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Matrix channel"
              value={matrixChannel}
              onChange={(e) => setMatrixChannel(e.target.value as MarketplaceChannel | 'All')}
              className="px-3 py-1.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              <option value="All">All Channels</option>
              {MARKETPLACE_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={2024}
              max={2030}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value) || 2026)}
              aria-label="Annual matrix year"
              className="w-20 px-2.5 py-1.5 rounded-xl glass-input text-xs font-bold tabular-nums focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {monthlyRows.map((m) => (
            <div key={m.monthLabel} className="glass-subtle rounded-2xl p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                <span>{m.monthLabel}</span>
                <span className="tabular-nums">{m.ordersCount} ord</span>
              </div>
              <p className="font-display text-sm font-bold text-zinc-900 dark:text-white tabular-nums">
                {formatINR(m.grossRevenue)}
              </p>
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                Net {formatINR(m.netProfit)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. GSTR-1 / HSN Tax Summary Report */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                1-Click GST / HSN Tax Summary (Origin: Banka, Bihar)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                HSN 3926 (12% 3D Toys &amp; Decor), 7323 (18% Steel Flasks), 4202 (18% Bags/Wallets) · Splits Bihar CGST+SGST vs Inter-State IGST
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadGstr1}
            className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export GSTR-1 HSN CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">HSN Code</th>
                <th className="py-3 px-4 text-right">GST Rate</th>
                <th className="py-3 px-4 text-right">Taxable Value</th>
                <th className="py-3 px-4 text-right">Bihar CGST</th>
                <th className="py-3 px-4 text-right">Bihar SGST</th>
                <th className="py-3 px-4 text-right">Inter-State IGST</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8">
              {gstRows.map((r) => (
                <tr key={r.hsnCode}>
                  <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-white">
                    HSN {r.hsnCode}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">{r.gstRatePercent}%</td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{r.taxableValue.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{r.cgstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{r.sgstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    ₹{r.igstAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums font-bold text-zinc-900 dark:text-white">
                    {formatINR(r.invoiceTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
