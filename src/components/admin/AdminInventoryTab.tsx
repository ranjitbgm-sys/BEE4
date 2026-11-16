import { FormEvent, useState } from 'react';
import { History, Minus, Plus, Printer, RefreshCw } from 'lucide-react';
import type {
  FilamentSpool,
  InventoryAdjustmentRecord,
  PrintJobRecord,
  PrintJobStage,
  Product,
} from '../../types';
import { hydrateProductAdminFields } from '../../data/catalog';
import { estimateSpoolRemainingUnits } from '../../utils/adminLogic';
import { formatINR } from '../../utils/storeLogic';

interface AdminInventoryTabProps {
  products: Product[];
  printJobs: PrintJobRecord[];
  spools: FilamentSpool[];
  inventoryAdjustments?: InventoryAdjustmentRecord[];
  onAdjustProductStock: (productId: string, nextQuantity: number) => void;
  onSavePrintJob: (job: PrintJobRecord) => void;
  onSaveFilamentSpool: (spool: FilamentSpool) => void;
}

const JOB_STAGES: PrintJobStage[] = ['Queued', 'Printing', 'Quality Check', 'Ready to Pack'];

export function AdminInventoryTab({
  products,
  printJobs,
  spools,
  inventoryAdjustments = [],
  onAdjustProductStock,
  onSavePrintJob,
  onSaveFilamentSpool,
}: AdminInventoryTabProps) {
  const [newJobProductId, setNewJobProductId] = useState(products[0]?.id ?? '');
  const [newJobQty, setNewJobQty] = useState('4');
  const [newJobOrderNo, setNewJobOrderNo] = useState('');
  const [newJobPrinter, setNewJobPrinter] = useState('Bambu P1S #2 (Banka Lab)');

  const handleQueueBatch = (e: FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.id === newJobProductId) ?? products[0];
    if (!prod) return;
    const qty = Math.max(1, Math.round(Number(newJobQty) || 1));
    const unitGrams = prod.weightGrams ?? 160;
    onSavePrintJob({
      id: `job-${Date.now()}`,
      productId: prod.id,
      productTitle: prod.title,
      orderNumber: newJobOrderNo.trim() || undefined,
      batchQty: qty,
      material: prod.materials || 'Matte Bio-PLA+',
      estimatedGrams: qty * unitGrams,
      stage: 'Queued',
      printerName: newJobPrinter.trim() || 'Bambu P1S (Banka Lab)',
      updatedAt: new Date().toISOString(),
    });
    setNewJobOrderNo('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Quick Inline Stock Editor */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
              Quick Inline Inventory Control
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Adjust live stock counts directly without opening product forms
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
            {products.filter((p) => (p.stockQuantity ?? 10) <= (p.lowStockThreshold ?? 5)).length} low stock SKUs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">SKU & Product</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Inline Stock Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8 text-xs">
              {products.map((raw) => {
                const p = hydrateProductAdminFields(raw);
                const qty = p.stockQuantity ?? 0;
                const threshold = p.lowStockThreshold ?? 5;
                const isLow = qty <= threshold;
                return (
                  <tr key={p.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-zinc-900 dark:text-white">{p.title}</p>
                      <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
                        {p.sku} · Threshold {threshold}
                      </p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            qty === 0
                              ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                              : isLow
                                ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {qty === 0 ? 'Out of Stock' : isLow ? 'Low Stock' : 'Healthy'}
                        </span>
                        {(p.damagedScrapCount ?? 0) > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/12 text-red-700 dark:text-red-300 text-[10px] font-bold tabular-nums">
                            Scrap PLA: {p.damagedScrapCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label={`Decrease stock for ${p.title}`}
                          onClick={() => onAdjustProductStock(p.id, Math.max(0, qty - 1))}
                          className="p-1.5 rounded-lg glass-btn-secondary"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          aria-label={`Stock quantity for ${p.title}`}
                          value={qty}
                          onChange={(e) =>
                            onAdjustProductStock(
                              p.id,
                              Math.max(0, Math.round(Number(e.target.value) || 0))
                            )
                          }
                          className="w-16 px-2 py-1 text-center rounded-lg glass-input text-xs font-bold tabular-nums focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label={`Increase stock for ${p.title}`}
                          onClick={() => onAdjustProductStock(p.id, qty + 1)}
                          className="p-1.5 rounded-lg glass-btn-secondary"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. 3D Print Production Queue & Filament Spool Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Print Production Queue */}
        <div className="lg:col-span-7 glass-surface rounded-3xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                3D Print Production Queue (Banka Lab)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Track active batches from print bed to packaging
              </p>
            </div>
          </div>

          <form onSubmit={handleQueueBatch} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <select
              aria-label="Select product for print batch"
              value={newJobProductId}
              onChange={(e) => setNewJobProductId(e.target.value)}
              className="sm:col-span-5 px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={newJobQty}
              onChange={(e) => setNewJobQty(e.target.value)}
              placeholder="Qty"
              aria-label="Batch quantity"
              className="sm:col-span-2 px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
            />
            <input
              type="text"
              value={newJobPrinter}
              onChange={(e) => setNewJobPrinter(e.target.value)}
              placeholder="Printer"
              aria-label="Printer name"
              className="sm:col-span-3 px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
            />
            <button
              type="submit"
              className="sm:col-span-2 px-3 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold whitespace-nowrap"
            >
              + Queue
            </button>
          </form>

          <div className="space-y-2.5">
            {printJobs.map((job) => (
              <div
                key={job.id}
                className="glass-subtle rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                    {job.productTitle} (Batch ×{job.batchQty})
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                    {job.printerName} · {job.estimatedGrams}g{' '}
                    {job.orderNumber ? `· Order ${job.orderNumber}` : ''}
                  </p>
                </div>

                <select
                  aria-label={`Stage for ${job.productTitle}`}
                  value={job.stage}
                  onChange={(e) =>
                    onSavePrintJob({
                      ...job,
                      stage: e.target.value as PrintJobStage,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="px-3 py-1.5 rounded-xl glass-input text-xs font-semibold focus:outline-none shrink-0"
                >
                  {JOB_STAGES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Filament Spool Tracker */}
        <div className="lg:col-span-5 glass-surface rounded-3xl p-5 space-y-4">
          <div>
            <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
              Eco-PLA Filament Spool Tracker
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Remaining grams, unit estimates, and 1-click spool restock
            </p>
          </div>

          <div className="space-y-3">
            {spools.map((spool) => {
              const pct = Math.min(
                100,
                Math.round((spool.remainingGrams / Math.max(1, spool.capacityGrams)) * 100)
              );
              const estUnits = estimateSpoolRemainingUnits(spool);
              return (
                <div key={spool.id} className="glass-subtle rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-4 h-4 rounded-full border border-white/70 shrink-0"
                        style={{ backgroundColor: spool.colorHex }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                          {spool.name}
                        </p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {spool.material} · {formatINR(spool.costPerKg)}/kg · ~{estUnits} toys left
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        onSaveFilamentSpool({
                          ...spool,
                          remainingGrams: Math.min(spool.capacityGrams, spool.remainingGrams + 1000),
                        })
                      }
                      className="px-2.5 py-1 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1 shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>+1kg</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <div className="h-2 rounded-full bg-zinc-900/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct <= 35 ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-zinc-600 dark:text-zinc-300 tabular-nums font-medium">
                      <span>{spool.remainingGrams}g left</span>
                      <span>
                        {pct}% of {spool.capacityGrams}g
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Inventory Adjustment History (RMA Restocks & Scrap Quarantines) */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900/8 dark:border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                Inventory Adjustment History ({inventoryAdjustments.length})
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Real-time log of RMA QC restocks &amp; damaged PLA scrap entries
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-zinc-900/6 dark:divide-white/8 text-xs">
          {inventoryAdjustments.slice(0, 12).map((entry) => (
            <div
              key={entry.id}
              className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="font-semibold text-zinc-900 dark:text-white truncate">
                  {entry.note}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                  {entry.productTitle} {entry.sku ? `(${entry.sku})` : ''} · Ref {entry.referenceId} ·{' '}
                  {new Date(entry.timestamp).toLocaleString('en-IN')}
                </p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold tabular-nums self-start sm:self-auto shrink-0 ${
                  entry.adjustmentType === 'rma_scrap'
                    ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {entry.delta > 0 ? `+${entry.delta} Sellable` : 'Scrap PLA'}
              </span>
            </div>
          ))}
          {inventoryAdjustments.length === 0 && (
            <p className="p-5 text-xs text-zinc-500 dark:text-zinc-400">
              No RMA restock or scrap adjustments recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
