import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Globe,
  Link2,
  PlugZap,
  RefreshCw,
  Settings2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import type {
  MarketplaceChannel,
  MarketplaceIntegrationConfig,
  OrderRecord,
  Product,
} from '../../types';
import {
  exportMarketplaceOrdersCsv,
  importMarketplaceOrdersFromCsv,
  MARKETPLACE_CHANNELS,
} from '../../utils/omnichannelLogic';
import { formatINR } from '../../utils/storeLogic';

interface AdminIntegrationsTabProps {
  integrations: MarketplaceIntegrationConfig[];
  orders: OrderRecord[];
  products: Product[];
  onSaveIntegration: (config: MarketplaceIntegrationConfig) => void;
  onImportOrders: (orders: OrderRecord[], channel: MarketplaceChannel) => void;
}

const SAMPLE_IMPORT_TEMPLATE =
  'Order ID,SKU,Title,Qty,Total,Buyer Name,Phone,City,State,Pin,Payment,Commission,Shipping Fee,Settlement Payout';

function triggerCsvDownload(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminIntegrationsTab({
  integrations,
  orders,
  products,
  onSaveIntegration,
  onImportOrders,
}: AdminIntegrationsTabProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'website' | 'marketplace' | 'courier'>(
    'all'
  );
  const [editingConn, setEditingConn] = useState<MarketplaceIntegrationConfig | null>(null);
  const [sellerIdDraft, setSellerIdDraft] = useState('');
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [webhookDraft, setWebhookDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [activeDraft, setActiveDraft] = useState(false);

  // Universal CSV/TSV Importer state
  const [importChannel, setImportChannel] = useState<MarketplaceChannel>('Flipkart');
  const [rawCsvText, setRawCsvText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const filteredConnectors = useMemo(
    () =>
      integrations.filter((c) =>
        categoryFilter === 'all' ? true : c.category === categoryFilter
      ),
    [integrations, categoryFilter]
  );

  const previewImport = useMemo(() => {
    if (!rawCsvText.trim()) return { importedOrders: [], errors: [] };
    return importMarketplaceOrdersFromCsv(rawCsvText, importChannel, products);
  }, [rawCsvText, importChannel, products]);

  const openEditor = (conn: MarketplaceIntegrationConfig) => {
    setEditingConn(conn);
    setSellerIdDraft(conn.sellerId);
    setApiKeyDraft(conn.apiKey);
    setWebhookDraft(conn.webhookUrl);
    setNotesDraft(conn.notes ?? '');
    setActiveDraft(conn.active);
  };

  const handleSaveConnector = (e: FormEvent) => {
    e.preventDefault();
    if (!editingConn) return;
    onSaveIntegration({
      ...editingConn,
      active: activeDraft,
      sellerId: sellerIdDraft.trim(),
      apiKey: apiKeyDraft.trim(),
      webhookUrl: webhookDraft.trim(),
      notes: notesDraft.trim(),
      lastSyncedAt: new Date().toISOString(),
    });
    setEditingConn(null);
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRawCsvText(text);
    setImportError('');
    setImportSuccess('');
    e.target.value = '';
  };

  const handleConfirmImport = () => {
    setImportError('');
    setImportSuccess('');
    if (!rawCsvText.trim()) {
      setImportError('Upload a marketplace CSV/TSV file or paste rows first.');
      return;
    }
    if (previewImport.importedOrders.length === 0) {
      setImportError(previewImport.errors[0] || 'No valid order rows detected.');
      return;
    }
    onImportOrders(previewImport.importedOrders, importChannel);
    setImportSuccess(
      `Imported ${previewImport.importedOrders.length} ${importChannel} order(s), deducted master stock across channels & evaluated active automations.`
    );
    setRawCsvText('');
  };

  const activeCount = integrations.filter((c) => c.active).length;

  return (
    <div className="space-y-6">
      {/* Top KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Connected Channels &amp; Couriers</span>
            <PlugZap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {activeCount} / {integrations.length}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
            bee4.in storefront live · Real-time Supabase sync
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Omnichannel Orders Tracked</span>
            <Globe className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {orders.length}
          </p>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            Zero fake orders · Live + CSV imported records only
          </p>
        </div>

        <div className="glass-surface rounded-3xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <span>Universal Settlement &amp; Order Bridge</span>
            <FileSpreadsheet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                triggerCsvDownload('bee4-marketplace-import-template.csv', SAMPLE_IMPORT_TEMPLATE)
              }
              className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV Template</span>
            </button>
            <button
              type="button"
              onClick={() =>
                triggerCsvDownload(
                  `bee4-omnichannel-orders-${new Date().toISOString().slice(0, 10)}.csv`,
                  exportMarketplaceOrdersCsv(orders)
                )
              }
              className="px-3 py-1.5 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Orders CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="glass-surface rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['all', `All Connectors (${integrations.length})`],
              ['website', 'Native Website (1)'],
              ['marketplace', 'Indian Marketplaces (7)'],
              ['courier', 'Couriers & Aggregators (5)'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategoryFilter(key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                categoryFilter === key
                  ? 'glass-btn-ink'
                  : 'glass-subtle text-zinc-700 dark:text-zinc-200 hover:bg-white/80 dark:hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Dual Sync: API / Webhook credentials + 1-Click CSV/TSV Bridge
        </span>
      </div>

      {/* Connector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConnectors.map((conn) => (
          <div key={conn.id} className="glass-surface rounded-3xl p-5 flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl glass-subtle flex items-center justify-center shrink-0">
                    {conn.category === 'courier' ? (
                      <Truck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    ) : conn.category === 'website' ? (
                      <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Link2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {conn.name}
                    </h3>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                      {conn.category}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                    conn.active
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-zinc-900/8 dark:bg-white/10 text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {conn.active ? 'Active' : 'Ready'}
                </span>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {conn.notes}
              </p>

              {conn.sellerId && (
                <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                  Seller / Account ID: {conn.sellerId}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-900/8 dark:border-white/10">
              <button
                type="button"
                onClick={() => openEditor(conn)}
                className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>API / Webhook</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onSaveIntegration({
                    ...conn,
                    active: !conn.active,
                    lastSyncedAt: new Date().toISOString(),
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 ${
                  conn.active
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'glass-btn-amber text-white'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{conn.active ? 'Synced' : 'Activate'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Universal Marketplace CSV/Excel Importer */}
      <div className="glass-surface rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-zinc-900 dark:text-white">
              Universal Marketplace CSV / TSV Order &amp; Settlement Importer
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload or paste seller reports from Flipkart, Amazon, Meesho, Myntra, Ajio, or Snapdeal. Automatically deducts Master Stock (using combo multipliers) and triggers Automations.
            </p>
          </div>
          <label className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shrink-0">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV / TSV File</span>
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <div className="md:col-span-3 space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Source Marketplace
            </label>
            <select
              aria-label="Source Marketplace Channel"
              value={importChannel}
              onChange={(e) => setImportChannel(e.target.value as MarketplaceChannel)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
            >
              {MARKETPLACE_CHANNELS.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Headers auto-matched: Order ID, SKU/ASIN, Qty, Total, Buyer, Phone, City, State, PIN, Payment, Commission, Shipping Fee, Settlement Payout.
            </p>
          </div>

          <div className="md:col-span-9 space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              Paste CSV / TSV Rows
            </label>
            <textarea
              rows={5}
              value={rawCsvText}
              onChange={(e) => {
                setRawCsvText(e.target.value);
                setImportError('');
                setImportSuccess('');
              }}
              placeholder={SAMPLE_IMPORT_TEMPLATE}
              className="w-full px-3.5 py-2.5 rounded-2xl glass-input text-xs font-mono focus:outline-none"
            />
          </div>
        </div>

        {previewImport.importedOrders.length > 0 && (
          <div className="glass-subtle rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-zinc-900 dark:text-white">
              Ready to import {previewImport.importedOrders.length} {importChannel} order(s) · Gross{' '}
              {formatINR(previewImport.importedOrders.reduce((s, o) => s + o.total, 0))}
            </span>
            <button
              type="button"
              onClick={handleConfirmImport}
              className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Import Orders &amp; Sync Master Stock</span>
            </button>
          </div>
        )}

        {importError && (
          <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/25 text-xs font-medium text-red-700 dark:text-red-300">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/12 border border-emerald-500/25 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            {importSuccess}
          </div>
        )}
      </div>

      {/* API / Webhook Configuration Modal */}
      {editingConn && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-zinc-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingConn(null)}
        >
          <form
            onSubmit={handleSaveConnector}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-drawer rounded-3xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                  Configure {editingConn.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Credentials persist securely in Supabase `marketplace_integrations`
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingConn(null)}
                className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="flex items-center justify-between p-3 rounded-2xl glass-subtle text-xs font-semibold text-zinc-900 dark:text-white">
              <span>Channel Active &amp; Sync Enabled</span>
              <input
                type="checkbox"
                checked={activeDraft}
                onChange={(e) => setActiveDraft(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
            </label>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                Seller ID / Merchant Code
              </label>
              <input
                type="text"
                value={sellerIdDraft}
                onChange={(e) => setSellerIdDraft(e.target.value)}
                placeholder="e.g. FK-SELLER-IN-991"
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                API Key / App Token
              </label>
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
                placeholder="Stored in Supabase admin-only RLS table"
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                Webhook / Callback URL
              </label>
              <input
                type="url"
                value={webhookDraft}
                onChange={(e) => setWebhookDraft(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                Sync Notes
              </label>
              <textarea
                rows={2}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingConn(null)}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
              >
                Save Connector Config
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
