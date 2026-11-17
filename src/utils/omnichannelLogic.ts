import type {
  AutomationRule,
  CartItem,
  HsnCode,
  MarketplaceChannel,
  MarketplaceIntegrationConfig,
  MonthlyAdSpendRecord,
  OperationalOrderBucket,
  OrderRecord,
  PrintJobRecord,
  Product,
  ReturnBucket,
  ReturnRequestRecord,
} from '../types';
import { getEffectiveFulfillmentStage } from './adminLogic';
import { computeReturnItemsValue } from './rmaLogic';

export const MARKETPLACE_CHANNELS: MarketplaceChannel[] = [
  'bee4.in',
  'Flipkart',
  'Amazon',
  'Meesho',
  'Myntra',
  'Ajio',
  'Snapdeal',
  'WhatsApp',
];

export const OPERATIONAL_ORDER_BUCKETS: OperationalOrderBucket[] = [
  'New / Upcoming',
  'Ready for Process',
  'Pending Label Generation',
  'Pending Courier Handover',
  'Shipped / In Transit',
  'Delivered',
  'Cancelled / RTO',
];

export const RETURN_BUCKETS: ReturnBucket[] = [
  'New Returns',
  'In Transit to Warehouse',
  'Cancelled Returns',
  'Cancelled After Label Print',
  'Received & QC Done',
  'Claim Filed (SPF)',
];

export const DEFAULT_MARKETPLACE_INTEGRATIONS: MarketplaceIntegrationConfig[] = [
  {
    id: 'conn-bee4-web',
    key: 'bee4_web',
    name: 'BEE4 Official Website (bee4.in)',
    category: 'website',
    active: true,
    sellerId: 'BEE4-D2C-BANKA',
    apiKey: '',
    webhookUrl: 'https://bee4.in/api/orders/notify',
    notes: 'Native live D2C storefront synced directly with Supabase Postgres.',
  },
  {
    id: 'conn-flipkart',
    key: 'flipkart',
    name: 'Flipkart Seller Hub',
    category: 'marketplace',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Supports API Token or 1-Click Flipkart Orders / Returns / Settlement CSV.',
  },
  {
    id: 'conn-amazon',
    key: 'amazon_in',
    name: 'Amazon India Seller Central',
    category: 'marketplace',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'SP-API Seller ID + ASIN SKU mapper & TSV settlement bridge.',
  },
  {
    id: 'conn-meesho',
    key: 'meesho',
    name: 'Meesho Supplier Panel',
    category: 'marketplace',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Zero-commission SKU sync & Meesho Excel/CSV order + return sheet import.',
  },
  {
    id: 'conn-myntra',
    key: 'myntra',
    name: 'Myntra Partner Portal',
    category: 'marketplace',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'PPMP / Omni catalog and dispatch SLA bridge.',
  },
  {
    id: 'conn-ajio',
    key: 'ajio',
    name: 'Ajio Business',
    category: 'marketplace',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'B2B / B2C order & return CSV bridge.',
  },
  {
    id: 'conn-snapdeal',
    key: 'snapdeal',
    name: 'Snapdeal Seller Zone',
    category: 'marketplace',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Multi-channel inventory & label manifest sync.',
  },
  {
    id: 'conn-whatsapp',
    key: 'whatsapp_shop',
    name: 'WhatsApp / Instagram Shop',
    category: 'marketplace',
    active: true,
    sellerId: 'BEE4-WA-BIZ',
    apiKey: '',
    webhookUrl: '',
    notes: 'Direct Meta / WhatsApp catalog orders & manual concierge checkout.',
  },
  {
    id: 'conn-shiprocket',
    key: 'shiprocket',
    name: 'Shiprocket Aggregator',
    category: 'courier',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Auto-AWB assignment, 4x6 thermal labels & courier weight audit.',
  },
  {
    id: 'conn-delhivery',
    key: 'delhivery',
    name: 'Delhivery Direct',
    category: 'courier',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Express surface/air AWB tracking & Banka Bihar hub pickups.',
  },
  {
    id: 'conn-bluedart',
    key: 'bluedart',
    name: 'BlueDart Express',
    category: 'courier',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Priority air dispatch for prepaid STEM kits.',
  },
  {
    id: 'conn-indiapost',
    key: 'india_post',
    name: 'India Post Speed Post',
    category: 'courier',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Deep rural & pan-India pin code coverage from Banka.',
  },
  {
    id: 'conn-xpressbees',
    key: 'xpressbees',
    name: 'Xpressbees Logistics',
    category: 'courier',
    active: false,
    sellerId: '',
    apiKey: '',
    webhookUrl: '',
    notes: 'Reverse pickup & COD remittance reconciliation.',
  },
];

export const DEFAULT_AUTOMATION_RULE_TEMPLATES: AutomationRule[] = [
  {
    id: 'rule-prepaid-auto-accept',
    name: 'Auto-Accept Prepaid Website Orders & Ready GST Label',
    enabled: false,
    trigger: 'new_order_placed',
    conditionField: 'payment_method_eq',
    conditionValue: 'upi',
    actionType: 'auto_accept_order',
    actionValue: 'Ready for Process',
    executionCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rule-high-value-delhivery',
    name: 'Assign Delhivery Courier for Orders ≥ ₹999',
    enabled: false,
    trigger: 'new_order_placed',
    conditionField: 'order_total_gte',
    conditionValue: '999',
    actionType: 'assign_courier',
    actionValue: 'Delhivery',
    executionCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rule-damaged-return-print',
    name: 'Queue Urgent 3D Replacement Print on Damaged Returns',
    enabled: false,
    trigger: 'return_initiated',
    conditionField: 'reason_contains',
    conditionValue: 'Damaged',
    actionType: 'send_to_print_queue',
    actionValue: 'Urgent Replacement Print',
    executionCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

// ============================================================================
// 1. Multi-Marketplace Stock Sync, Combo Deduction & Channel Throttling
// ============================================================================

export function calculateChannelAvailableStock(
  product: Product,
  channel: MarketplaceChannel
): number {
  const masterStock = Math.max(0, Math.round(product.stockQuantity ?? (product.inStock ? 10 : 0)));
  const reserve = Math.max(0, Math.round(product.reserveForWebsite ?? 0));
  const listing = (product.marketplaceListings ?? []).find((l) => l.channel === channel);

  if (listing && listing.active === false) {
    return 0;
  }

  const multiplier = Math.max(1, Math.round(listing?.packMultiplier ?? 1));
  const rawAvailable =
    channel === 'bee4.in' || channel === 'WhatsApp'
      ? masterStock
      : Math.max(0, masterStock - reserve);

  const packAvailable = Math.floor(rawAvailable / multiplier);
  if (typeof listing?.channelStockOverride === 'number' && listing.channelStockOverride >= 0) {
    return Math.min(packAvailable, Math.round(listing.channelStockOverride));
  }
  return packAvailable;
}

export function deductMasterInventoryForItems(
  products: Product[],
  items: CartItem[],
  sourceChannel: MarketplaceChannel = 'bee4.in'
): {
  updatedProducts: Product[];
  deductions: { productId: string; title: string; unitsDeducted: number; nextStock: number }[];
} {
  const deductionsByProductId = new Map<string, number>();

  for (const item of items) {
    const prod = products.find(
      (p) =>
        p.id === item.productId ||
        (p.sku && p.sku.toLowerCase() === item.productId.toLowerCase()) ||
        (p.marketplaceListings ?? []).some(
          (l) => l.remoteSkuOrAsin.toLowerCase() === item.productId.toLowerCase()
        )
    );
    if (!prod) continue;
    const matchedListing = (prod.marketplaceListings ?? []).find(
      (l) =>
        l.channel === sourceChannel ||
        l.remoteSkuOrAsin.toLowerCase() === item.productId.toLowerCase()
    );
    const multiplier = Math.max(1, Math.round(matchedListing?.packMultiplier ?? 1));
    const units = Math.max(1, Math.round(item.quantity || 1)) * multiplier;
    deductionsByProductId.set(prod.id, (deductionsByProductId.get(prod.id) ?? 0) + units);
  }

  const deductions: { productId: string; title: string; unitsDeducted: number; nextStock: number }[] =
    [];

  const updatedProducts = products.map((p) => {
    const deduct = deductionsByProductId.get(p.id) ?? 0;
    if (deduct <= 0) return p;
    const current = Math.max(0, Math.round(p.stockQuantity ?? (p.inStock ? 10 : 0)));
    const nextStock = Math.max(0, current - deduct);
    deductions.push({
      productId: p.id,
      title: p.title,
      unitsDeducted: deduct,
      nextStock,
    });
    return {
      ...p,
      stockQuantity: nextStock,
      inStock: nextStock > 0,
    };
  });

  return { updatedProducts, deductions };
}

// ============================================================================
// 2. Base.com Operational Order Buckets & SLA Breach Countdown
// ============================================================================

export function getEffectiveSourceChannel(order: OrderRecord): MarketplaceChannel {
  if (order.sourceChannel) return order.sourceChannel;
  if (order.orderChannel === 'WhatsApp Order') return 'WhatsApp';
  return 'bee4.in';
}

export function getOperationalOrderBucket(order: OrderRecord): OperationalOrderBucket {
  if (order.operationalBucket) return order.operationalBucket;
  const stage = getEffectiveFulfillmentStage(order);
  if (stage === 'Cancelled' || stage === 'RTO / Return' || order.status === 'Cancelled') {
    return 'Cancelled / RTO';
  }
  if (stage === 'Delivered' || order.status === 'Delivered') {
    return 'Delivered';
  }
  if (stage === 'Shipped' || order.status === 'Shipped') {
    return 'Shipped / In Transit';
  }
  if (stage === 'New / Unverified') {
    return 'New / Upcoming';
  }
  if (stage === 'Confirmed' && !order.labelGeneratedAt) {
    return 'Ready for Process';
  }
  if (stage === 'Printing / Packing' && !order.labelGeneratedAt) {
    return 'Pending Label Generation';
  }
  if (order.labelGeneratedAt && !order.awbNumber) {
    return 'Pending Courier Handover';
  }
  if (order.awbNumber && (stage === 'Confirmed' || stage === 'Printing / Packing')) {
    return 'Pending Courier Handover';
  }
  return 'Ready for Process';
}

export function getOrderSlaDeadlineIso(order: OrderRecord): string {
  if (order.slaDispatchBy) return order.slaDispatchBy;
  const created = new Date(order.createdAt).getTime();
  const baseMs = Number.isFinite(created) ? created : Date.now();
  const channel = getEffectiveSourceChannel(order);
  // Marketplaces typically have 24h SLA; D2C website 36h SLA
  const hours = channel === 'Flipkart' || channel === 'Amazon' || channel === 'Meesho' ? 24 : 36;
  return new Date(baseMs + hours * 3600 * 1000).toISOString();
}

export function getOrderSlaStatus(
  order: OrderRecord,
  nowMs: number = Date.now()
): {
  label: string;
  tone: 'done' | 'safe' | 'warning' | 'breached';
  hoursRemaining: number;
} {
  const bucket = getOperationalOrderBucket(order);
  if (bucket === 'Shipped / In Transit' || bucket === 'Delivered' || bucket === 'Cancelled / RTO') {
    return {
      label: bucket === 'Cancelled / RTO' ? 'Closed' : 'Dispatched on time',
      tone: 'done',
      hoursRemaining: 0,
    };
  }
  const deadlineMs = new Date(getOrderSlaDeadlineIso(order)).getTime();
  const diffHours = (deadlineMs - nowMs) / (1000 * 3600);
  if (diffHours <= 0) {
    const overdueH = Math.max(1, Math.round(Math.abs(diffHours)));
    return {
      label: `SLA Breached (${overdueH}h ago)`,
      tone: 'breached',
      hoursRemaining: diffHours,
    };
  }
  if (diffHours <= 6) {
    return {
      label: `Dispatch in ${Math.max(1, Math.round(diffHours))}h (Urgent)`,
      tone: 'warning',
      hoursRemaining: diffHours,
    };
  }
  return {
    label: `${Math.round(diffHours)}h left to ship`,
    tone: 'safe',
    hoursRemaining: diffHours,
  };
}

// ============================================================================
// 3. Bulk 4x6 Thermal Label / GST Invoice & Picklist Generators
// ============================================================================

function escHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateBulkThermalLabelsHtml(
  orders: OrderRecord[],
  paperSize: '4x6' | 'A5' = '4x6'
): string {
  const pageDims = paperSize === '4x6' ? '4in 6in' : '148mm 210mm';
  const cards = orders
    .map((order) => {
      const channel = getEffectiveSourceChannel(order);
      const isCod = order.paymentMethod === 'cod';
      return `
      <section class="label-card">
        <header class="row">
          <div>
            <strong>BEE4 Studio · Banka, Bihar</strong>
            <div class="muted">GSTIN: 10BEE4LAB2026Z1 · bee4.in</div>
          </div>
          <div class="badge">${escHtml(channel)}</div>
        </header>
        <hr />
        <div class="ship-to">
          <div class="muted">SHIP TO:</div>
          <div class="name">${escHtml(order.customer.fullName)}</div>
          <div>${escHtml(order.customer.address)}</div>
          <div>${escHtml(order.customer.city)}, ${escHtml(order.customer.state)} - <strong>${escHtml(order.customer.pinCode)}</strong></div>
          <div>Ph: ${escHtml(order.customer.phone)}</div>
        </div>
        <hr />
        <div class="row metrics">
          <div>
            <div class="muted">ORDER #</div>
            <strong>${escHtml(order.orderNumber)}</strong>
          </div>
          <div>
            <div class="muted">PAYMENT</div>
            <strong>${isCod ? `COD COLLECT ₹${Math.round(order.total)}` : 'PREPAID'}</strong>
          </div>
          <div>
            <div class="muted">COURIER / AWB</div>
            <strong>${escHtml(order.courierPartner || 'Assign')} ${escHtml(order.awbNumber || 'Pending')}</strong>
          </div>
        </div>
        <hr />
        <table>
          <thead><tr><th>SKU / Item</th><th>Variant</th><th align="right">Qty</th></tr></thead>
          <tbody>
            ${order.items
              .map(
                (it) =>
                  `<tr><td>${escHtml(it.title)}</td><td>${escHtml(it.variant)}</td><td align="right">${it.quantity}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>BEE4 Bulk Shipping Labels (${orders.length})</title>
<style>
  @page { size: ${pageDims}; margin: 6mm; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #111827; margin: 0; padding: 12px; }
  .label-card { border: 1.5px solid #111827; border-radius: 8px; padding: 12px; margin-bottom: 14px; page-break-after: always; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .badge { border: 1px solid #111827; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .muted { font-size: 10px; color: #4b5563; text-transform: uppercase; }
  .name { font-size: 15px; font-weight: 800; margin: 2px 0; }
  .metrics { font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
  th, td { border-bottom: 1px solid #e5e7eb; padding: 4px 2px; text-align: left; }
  hr { border: none; border-top: 1px dashed #9ca3af; margin: 8px 0; }
</style>
</head>
<body>${cards}</body>
</html>`;
}

export function generateBulkPicklistCsv(orders: OrderRecord[], products: Product[]): string {
  const agg = new Map<string, { sku: string; title: string; variant: string; qty: number; orders: string[] }>();
  for (const order of orders) {
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      const sku = prod?.sku || item.productId;
      const key = `${sku}::${item.variant}`;
      const existing = agg.get(key);
      if (existing) {
        existing.qty += item.quantity;
        if (!existing.orders.includes(order.orderNumber)) {
          existing.orders.push(order.orderNumber);
        }
      } else {
        agg.set(key, {
          sku,
          title: item.title,
          variant: item.variant,
          qty: item.quantity,
          orders: [order.orderNumber],
        });
      }
    }
  }
  const rows = [
    ['SKU', 'Product Title', 'Variant', 'Total Pick Qty', 'Order Numbers'],
    ...Array.from(agg.values()).map((r) => [
      r.sku,
      r.title,
      r.variant,
      String(r.qty),
      r.orders.join(' | '),
    ]),
  ];
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
}

// ============================================================================
// 4. Automatic Order Actions Engine (IF Trigger + Condition -> THEN Action)
// ============================================================================

export function doesConditionMatch(
  rule: AutomationRule,
  ctx: {
    order?: OrderRecord;
    returnReq?: ReturnRequestRecord;
  }
): boolean {
  if (rule.conditionField === 'always') return true;
  if (rule.conditionField === 'payment_method_eq' && ctx.order) {
    return ctx.order.paymentMethod.toLowerCase() === rule.conditionValue.trim().toLowerCase();
  }
  if (rule.conditionField === 'source_channel_eq') {
    const ch = ctx.order
      ? getEffectiveSourceChannel(ctx.order)
      : ctx.returnReq?.sourceChannel || 'bee4.in';
    return ch.toLowerCase() === rule.conditionValue.trim().toLowerCase();
  }
  if (rule.conditionField === 'order_total_gte' && ctx.order) {
    return ctx.order.total >= (Number(rule.conditionValue) || 0);
  }
  if (rule.conditionField === 'state_eq' && ctx.order) {
    return ctx.order.customer.state.toLowerCase() === rule.conditionValue.trim().toLowerCase();
  }
  if (rule.conditionField === 'reason_contains' && ctx.returnReq) {
    return ctx.returnReq.reason.toLowerCase().includes(rule.conditionValue.trim().toLowerCase());
  }
  return false;
}

export function evaluateOrderAutomations(
  order: OrderRecord,
  rules: AutomationRule[],
  trigger: AutomationRule['trigger']
): {
  updatedOrder: OrderRecord;
  updatedRules: AutomationRule[];
  triggeredLogs: string[];
  queuedPrintJobs: PrintJobRecord[];
} {
  let currentOrder = { ...order };
  const triggeredLogs: string[] = [];
  const queuedPrintJobs: PrintJobRecord[] = [];
  const nowIso = new Date().toISOString();

  const updatedRules = rules.map((rule) => {
    if (!rule.enabled || rule.trigger !== trigger) return rule;
    if (!doesConditionMatch(rule, { order: currentOrder })) return rule;

    if (rule.actionType === 'auto_accept_order') {
      currentOrder = {
        ...currentOrder,
        fulfillmentStage: 'Confirmed',
        operationalBucket: 'Ready for Process',
        status: 'Confirmed',
      };
    } else if (rule.actionType === 'assign_courier' && rule.actionValue.trim()) {
      currentOrder = {
        ...currentOrder,
        courierPartner: rule.actionValue.trim(),
      };
    } else if (rule.actionType === 'generate_gst_label_ready') {
      currentOrder = {
        ...currentOrder,
        labelGeneratedAt: nowIso,
        operationalBucket: currentOrder.awbNumber
          ? 'Pending Courier Handover'
          : 'Pending Label Generation',
      };
    } else if (rule.actionType === 'send_to_print_queue') {
      const firstItem = currentOrder.items[0];
      queuedPrintJobs.push({
        id: `job-auto-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId: firstItem?.productId || 'custom',
        productTitle: firstItem?.title || 'Order Print Job',
        orderNumber: currentOrder.orderNumber,
        batchQty: firstItem?.quantity || 1,
        material: 'Matte Bio-PLA+',
        estimatedGrams: (firstItem?.quantity || 1) * 160,
        stage: 'Queued',
        printerName: 'Bambu A1 Mini #1 (Auto-Rule)',
        updatedAt: nowIso,
      });
    }

    triggeredLogs.push(`${rule.name} -> ${rule.actionType} (${rule.actionValue || 'Executed'})`);
    return {
      ...rule,
      executionCount: rule.executionCount + 1,
      lastExecutedAt: nowIso,
    };
  });

  return {
    updatedOrder: currentOrder,
    updatedRules,
    triggeredLogs,
    queuedPrintJobs,
  };
}

// ============================================================================
// 5. Universal Marketplace CSV/TSV Order, Return & Settlement Bridge
// ============================================================================

function parseCsvLines(rawText: string): string[][] {
  const delimiter = rawText.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  const lines = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    if (delimiter === '\t') {
      rows.push(line.split('\t').map((c) => c.trim().replace(/^"|"$/g, '')));
      continue;
    }
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    rows.push(cells);
  }
  return rows;
}

export function importMarketplaceOrdersFromCsv(
  rawText: string,
  defaultChannel: MarketplaceChannel,
  products: Product[]
): { importedOrders: OrderRecord[]; errors: string[] } {
  const rows = parseCsvLines(rawText);
  if (rows.length < 2) {
    return { importedOrders: [], errors: ['CSV/TSV requires a header row and at least 1 data row.'] };
  }
  const headers = rows[0].map((h) => h.toLowerCase().trim());
  const findCol = (candidates: string[]) =>
    headers.findIndex((h) => candidates.some((c) => h.includes(c)));

  const idxOrderId = findCol(['order id', 'order_id', 'order_number', 'sub order no', 'amazon-order-id']);
  const idxSku = findCol(['sku', 'asin', 'fsn', 'product_id']);
  const idxTitle = findCol(['title', 'product name', 'item', 'product']);
  const idxQty = findCol(['qty', 'quantity']);
  const idxTotal = findCol(['total', 'amount', 'selling price', 'price', 'gross']);
  const idxBuyer = findCol(['buyer', 'customer', 'recipient', 'name']);
  const idxPhone = findCol(['phone', 'mobile', 'contact']);
  const idxCity = findCol(['city', 'town']);
  const idxState = findCol(['state', 'region']);
  const idxPin = findCol(['pin', 'postal', 'zip']);
  const idxPay = findCol(['payment', 'cod', 'prepaid', 'mode']);
  const idxDate = findCol(['date', 'created', 'order_date']);
  const idxCommission = findCol(['commission', 'marketplace fee']);
  const idxShipping = findCol(['shipping fee', 'shipping charged', 'logistics']);
  const idxSettled = findCol(['settlement', 'payout', 'net payout']);

  const importedOrders: OrderRecord[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    const extId = idxOrderId >= 0 ? cols[idxOrderId] : `IMP-${Date.now()}-${r}`;
    if (!extId) {
      errors.push(`Row ${r + 1}: Missing Order ID.`);
      continue;
    }
    const skuCell = idxSku >= 0 ? cols[idxSku] : '';
    const titleCell = idxTitle >= 0 ? cols[idxTitle] : '';
    const qty = Math.max(1, Math.round(Number(idxQty >= 0 ? cols[idxQty] : 1) || 1));
    const matchedProduct =
      products.find(
        (p) =>
          (skuCell &&
            (p.id.toLowerCase() === skuCell.toLowerCase() ||
              (p.sku && p.sku.toLowerCase() === skuCell.toLowerCase()) ||
              (p.marketplaceListings ?? []).some(
                (l) => l.remoteSkuOrAsin.toLowerCase() === skuCell.toLowerCase()
              ))) ||
          (titleCell && p.title.toLowerCase().includes(titleCell.toLowerCase()))
      ) ?? products[0];

    const rawTotal = Number((idxTotal >= 0 ? cols[idxTotal] : '0').replace(/[^\d.]/g, '')) || 0;
    const orderTotal = rawTotal > 0 ? rawTotal : (matchedProduct?.price ?? 449) * qty;
    const payText = (idxPay >= 0 ? cols[idxPay] : 'prepaid').toLowerCase();
    const paymentMethod: OrderRecord['paymentMethod'] = payText.includes('cod') ? 'cod' : 'upi';

    const commissionFee =
      idxCommission >= 0 ? Math.max(0, Number(cols[idxCommission].replace(/[^\d.]/g, '')) || 0) : 0;
    const shippingCharged =
      idxShipping >= 0 ? Math.max(0, Number(cols[idxShipping].replace(/[^\d.]/g, '')) || 0) : 0;
    const settledAmt =
      idxSettled >= 0 ? Math.max(0, Number(cols[idxSettled].replace(/[^\d.]/g, '')) || 0) : 0;

    const createdAtRaw = idxDate >= 0 ? cols[idxDate] : '';
    const parsedDate = createdAtRaw && !Number.isNaN(Date.parse(createdAtRaw))
      ? new Date(createdAtRaw).toISOString()
      : new Date().toISOString();

    const expectedPayout = Math.max(0, orderTotal - commissionFee - shippingCharged);

    importedOrders.push({
      orderNumber: extId.startsWith('BEE4-') ? extId : `${defaultChannel.slice(0, 3).toUpperCase()}-${extId}`,
      externalOrderId: extId,
      sourceChannel: defaultChannel,
      createdAt: parsedDate,
      items: [
        {
          productId: matchedProduct?.id || skuCell || 'bee4-item',
          title: matchedProduct?.title || titleCell || 'BEE4 Brain Toy',
          price: Math.round(orderTotal / qty),
          image: matchedProduct?.image || '/assets/images/toy_engineering_front_1794767911598.jpg',
          variant: 'Standard Edition',
          quantity: qty,
          category: matchedProduct?.category || 'Engineering',
        },
      ],
      subtotal: orderTotal,
      discount: 0,
      shippingFee: 0,
      giftWrapFee: 0,
      total: orderTotal,
      paymentMethod,
      orderChannel: paymentMethod === 'cod' ? 'COD' : 'UPI / Prepaid',
      customer: {
        fullName: (idxBuyer >= 0 ? cols[idxBuyer] : '') || `${defaultChannel} Customer`,
        phone: ((idxPhone >= 0 ? cols[idxPhone] : '') || '9800000000').replace(/\D/g, '').slice(-10) || '9800000000',
        email: '',
        address: 'Marketplace Order Address',
        city: (idxCity >= 0 ? cols[idxCity] : '') || 'Patna',
        state: (idxState >= 0 ? cols[idxState] : '') || 'Bihar',
        pinCode: (idxPin >= 0 ? cols[idxPin] : '') || '800001',
      },
      giftWrap: false,
      giftMessage: '',
      status: 'Confirmed',
      fulfillmentStage: 'Confirmed',
      operationalBucket: 'New / Upcoming',
      settlement: {
        commissionFee,
        paymentGatewayFee: 0,
        shippingCharged,
        expectedPayout,
        actualSettlementReceived: settledAmt,
        bankDeposited: settledAmt > 0,
      },
    });
  }

  return { importedOrders, errors };
}

export function exportMarketplaceOrdersCsv(orders: OrderRecord[]): string {
  const header = [
    'Order Number',
    'Channel',
    'External Order ID',
    'Created At',
    'Stage',
    'Customer Name',
    'Phone',
    'City',
    'State',
    'PIN',
    'Payment',
    'Total INR',
    'Courier',
    'AWB',
    'Settled Payout INR',
  ];
  const rows = orders.map((o) => [
    o.orderNumber,
    getEffectiveSourceChannel(o),
    o.externalOrderId || o.orderNumber,
    o.createdAt.slice(0, 10),
    getOperationalOrderBucket(o),
    o.customer.fullName,
    o.customer.phone,
    o.customer.city,
    o.customer.state,
    o.customer.pinCode,
    o.paymentMethod.toUpperCase(),
    String(Math.round(o.total)),
    o.courierPartner || '',
    o.awbNumber || '',
    String(Math.round(o.settlement?.actualSettlementReceived ?? 0)),
  ]);
  return [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

// ============================================================================
// 6. Advanced Returns Tracker (10/20/30-Day Overdue Unreceived & SPF Claims)
// ============================================================================

export function getReturnBucket(rma: ReturnRequestRecord): ReturnBucket {
  if (rma.claimFiled) return 'Claim Filed (SPF)';
  if (rma.cancelledAfterLabel) return 'Cancelled After Label Print';
  if (rma.status === 'Rejected') return 'Cancelled Returns';
  if (
    rma.receivedAtHub ||
    rma.status === 'Item Received at Banka Hub (Pending QC)' ||
    rma.status === 'QC Passed — Restocked to Inventory' ||
    rma.status === 'QC Failed — Damaged / Scrap PLA (Do Not Restock)' ||
    rma.status === 'Refund Completed'
  ) {
    return 'Received & QC Done';
  }
  if (
    rma.status === 'Approved — Reverse Pickup Scheduled' ||
    rma.status === 'Replacement Dispatched'
  ) {
    return 'In Transit to Warehouse';
  }
  return 'New Returns';
}

export function calculateReturnOverdueDays(
  rma: ReturnRequestRecord,
  nowMs: number = Date.now()
): number {
  if (rma.receivedAtHub || rma.status === 'Rejected') return 0;
  const createdMs = new Date(rma.createdAt).getTime();
  if (!Number.isFinite(createdMs)) return 0;
  return Math.max(0, Math.floor((nowMs - createdMs) / (1000 * 3600 * 24)));
}

export function isReturnOverdueUnreceived(
  rma: ReturnRequestRecord,
  minDays: 10 | 20 | 30,
  nowMs: number = Date.now()
): boolean {
  if (rma.receivedAtHub) return false;
  if (rma.status === 'Rejected' || rma.status === 'QC Passed — Restocked to Inventory') return false;
  return calculateReturnOverdueDays(rma, nowMs) >= minDays;
}

export function buildSpfClaimDossierCsv(
  overdueReturns: ReturnRequestRecord[],
  orders: OrderRecord[]
): string {
  const header = [
    'RMA Number',
    'Channel',
    'Order Number',
    'Created Date',
    'Days Overdue (Not Received)',
    'AWB / Reverse Tracking',
    'Courier Partner',
    'Customer',
    'Return Value INR',
    'Packing Photo Evidence URL',
    'Claim Status',
  ];
  const rows = overdueReturns.map((r) => {
    const parent = orders.find((o) => o.orderNumber === r.orderNumber);
    return [
      r.rmaNumber,
      r.sourceChannel || 'bee4.in',
      r.orderNumber,
      r.createdAt.slice(0, 10),
      String(calculateReturnOverdueDays(r)),
      r.reverseAwb || parent?.awbNumber || 'MISSING',
      r.reverseCourier || parent?.courierPartner || 'Unknown',
      r.customerName,
      String(computeReturnItemsValue(r.items)),
      parent?.packingProof?.photoUrl || r.proofImages[0] || 'Attach Hub Video/Photo',
      r.claimFiled ? `Filed (${r.claimReferenceId || 'Submitted'})` : 'Ready for SPF Dispute',
    ];
  });
  return [header, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

// ============================================================================
// 7. Payment Reconciliation, True Product P&L & Discrepancy Detector
// ============================================================================

export type ReconciliationPeriod = '7d' | '30d' | '90d' | 'all';

export interface ProductPnlRow {
  productId: string;
  sku: string;
  title: string;
  unitsSold: number;
  grossRevenue: number;
  cogsTotal: number;
  returnsLoss: number;
  feesAndShipping: number;
  netProfit: number;
  marginPercent: number;
}

export interface SettlementDiscrepancy {
  orderNumber: string;
  channel: MarketplaceChannel;
  issueType: 'Courier Weight Overcharge' | 'Unpaid Delivered Order (>15d)' | 'Settlement Shortfall';
  detail: string;
  impactAmount: number;
}

export interface ReconciliationSummary {
  grossSales: number;
  returnsAndRtoDeduction: number;
  netSales: number;
  totalCogs: number;
  marketplaceAndShippingFees: number;
  adSpendTotal: number;
  expectedSettlementTotal: number;
  actualBankReceivedTotal: number;
  settlementVariance: number;
  trueNetProfit: number;
  trueMarginPercent: number;
  productPnl: ProductPnlRow[];
  discrepancies: SettlementDiscrepancy[];
}

export function calculateReconciliationReport(input: {
  orders: OrderRecord[];
  products: Product[];
  returns: ReturnRequestRecord[];
  adSpends: MonthlyAdSpendRecord[];
  period?: ReconciliationPeriod;
  channelFilter?: MarketplaceChannel | 'All';
  nowMs?: number;
}): ReconciliationSummary {
  const {
    orders,
    products,
    returns,
    adSpends,
    period = 'all',
    channelFilter = 'All',
    nowMs = Date.now(),
  } = input;

  const cutoffMs =
    period === '7d'
      ? nowMs - 7 * 86400000
      : period === '30d'
        ? nowMs - 30 * 86400000
        : period === '90d'
          ? nowMs - 90 * 86400000
          : 0;

  const filteredOrders = orders.filter((o) => {
    const ch = getEffectiveSourceChannel(o);
    if (channelFilter !== 'All' && ch !== channelFilter) return false;
    if (cutoffMs > 0 && new Date(o.createdAt).getTime() < cutoffMs) return false;
    return true;
  });

  const filteredAdSpend = adSpends
    .filter((a) => channelFilter === 'All' || a.channel === 'All Channels' || a.channel === channelFilter)
    .reduce((sum, a) => sum + Math.max(0, Number(a.amount) || 0), 0);

  let grossSales = 0;
  let returnsAndRtoDeduction = 0;
  let totalCogs = 0;
  let marketplaceAndShippingFees = 0;
  let expectedSettlementTotal = 0;
  let actualBankReceivedTotal = 0;

  const productAgg = new Map<string, ProductPnlRow>();
  for (const p of products) {
    productAgg.set(p.id, {
      productId: p.id,
      sku: p.sku || p.id,
      title: p.title,
      unitsSold: 0,
      grossRevenue: 0,
      cogsTotal: 0,
      returnsLoss: 0,
      feesAndShipping: 0,
      netProfit: 0,
      marginPercent: 0,
    });
  }

  const discrepancies: SettlementDiscrepancy[] = [];

  for (const order of filteredOrders) {
    const ch = getEffectiveSourceChannel(order);
    const isCancelledOrRto =
      order.status === 'Cancelled' || order.fulfillmentStage === 'RTO / Return';

    grossSales += order.total;

    if (isCancelledOrRto) {
      returnsAndRtoDeduction += order.total;
    }

    const orderFees =
      (order.settlement?.commissionFee ?? 0) +
      (order.settlement?.paymentGatewayFee ?? (ch === 'bee4.in' && order.paymentMethod !== 'cod' ? Math.round(order.total * 0.02) : 0)) +
      (order.settlement?.shippingCharged ?? (order.shippingFee > 0 ? order.shippingFee : 0));

    marketplaceAndShippingFees += orderFees;

    const expectedPayout = order.settlement?.expectedPayout ?? Math.max(0, order.total - orderFees);
    const actualSettled = order.settlement?.actualSettlementReceived ?? 0;

    if (!isCancelledOrRto) {
      expectedSettlementTotal += expectedPayout;
      actualBankReceivedTotal += actualSettled;
    }

    // Discrepancy 1: Courier weight overcharge vs product catalog weight
    const catalogWeight = order.items.reduce((w, it) => {
      const prod = products.find((p) => p.id === it.productId);
      return w + (prod?.weightGrams ?? 180) * it.quantity;
    }, 0);
    const chargedWeight = order.settlement?.chargedWeightGrams ?? 0;
    if (chargedWeight > catalogWeight + 150) {
      discrepancies.push({
        orderNumber: order.orderNumber,
        channel: ch,
        issueType: 'Courier Weight Overcharge',
        detail: `Catalog ${catalogWeight}g vs Courier billed ${chargedWeight}g`,
        impactAmount: 45,
      });
    }

    // Discrepancy 2: Delivered > 15 days without settlement received
    const ageDays = Math.floor((nowMs - new Date(order.createdAt).getTime()) / 86400000);
    if (order.status === 'Delivered' && ageDays > 15 && actualSettled <= 0) {
      discrepancies.push({
        orderNumber: order.orderNumber,
        channel: ch,
        issueType: 'Unpaid Delivered Order (>15d)',
        detail: `Delivered ${ageDays}d ago · Expected payout ₹${Math.round(expectedPayout)} pending`,
        impactAmount: Math.round(expectedPayout),
      });
    } else if (actualSettled > 0 && expectedPayout - actualSettled > 15) {
      discrepancies.push({
        orderNumber: order.orderNumber,
        channel: ch,
        issueType: 'Settlement Shortfall',
        detail: `Expected ₹${Math.round(expectedPayout)} vs Received ₹${Math.round(actualSettled)}`,
        impactAmount: Math.round(expectedPayout - actualSettled),
      });
    }

    // Product-wise P&L allocation
    const itemRevenueSum = order.items.reduce((s, it) => s + it.price * it.quantity, 0) || 1;
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      const unitCogs = prod?.cogsCost ?? prod?.manufacturingCost ?? Math.round(item.price * 0.34);
      const lineRev = item.price * item.quantity;
      const lineCogs = isCancelledOrRto ? 0 : unitCogs * item.quantity;
      totalCogs += lineCogs;

      const lineFeeShare = (lineRev / itemRevenueSum) * orderFees;
      const row = productAgg.get(item.productId) ?? {
        productId: item.productId,
        sku: prod?.sku || item.productId,
        title: item.title,
        unitsSold: 0,
        grossRevenue: 0,
        cogsTotal: 0,
        returnsLoss: 0,
        feesAndShipping: 0,
        netProfit: 0,
        marginPercent: 0,
      };

      if (isCancelledOrRto) {
        row.returnsLoss += lineRev;
      } else {
        row.unitsSold += item.quantity;
        row.grossRevenue += lineRev;
        row.cogsTotal += lineCogs;
        row.feesAndShipping += lineFeeShare;
      }
      productAgg.set(item.productId, row);
    }
  }

  for (const rma of returns) {
    if (channelFilter !== 'All' && (rma.sourceChannel || 'bee4.in') !== channelFilter) continue;
    if (cutoffMs > 0 && new Date(rma.createdAt).getTime() < cutoffMs) continue;
    if (rma.status === 'Refund Completed' || rma.qcOutcome === 'Damaged_Unsellable') {
      const val = rma.refundAmount ?? computeReturnItemsValue(rma.items);
      returnsAndRtoDeduction += val;
      for (const it of rma.items) {
        const row = productAgg.get(it.productId);
        if (row) row.returnsLoss += it.unitPrice * it.quantity;
      }
    }
  }

  const netSales = Math.max(0, grossSales - returnsAndRtoDeduction);
  const trueNetProfit =
    netSales - totalCogs - marketplaceAndShippingFees - filteredAdSpend;
  const trueMarginPercent = netSales > 0 ? Math.round((trueNetProfit / netSales) * 1000) / 10 : 0;

  const productPnl = Array.from(productAgg.values()).map((row) => {
    const net = row.grossRevenue - row.cogsTotal - row.feesAndShipping - row.returnsLoss;
    const marginPercent =
      row.grossRevenue > 0 ? Math.round((net / row.grossRevenue) * 1000) / 10 : 0;
    return {
      ...row,
      feesAndShipping: Math.round(row.feesAndShipping),
      netProfit: Math.round(net),
      marginPercent,
    };
  });

  return {
    grossSales: Math.round(grossSales),
    returnsAndRtoDeduction: Math.round(returnsAndRtoDeduction),
    netSales: Math.round(netSales),
    totalCogs: Math.round(totalCogs),
    marketplaceAndShippingFees: Math.round(marketplaceAndShippingFees),
    adSpendTotal: Math.round(filteredAdSpend),
    expectedSettlementTotal: Math.round(expectedSettlementTotal),
    actualBankReceivedTotal: Math.round(actualBankReceivedTotal),
    settlementVariance: Math.round(expectedSettlementTotal - actualBankReceivedTotal),
    trueNetProfit: Math.round(trueNetProfit),
    trueMarginPercent,
    productPnl,
    discrepancies,
  };
}

// ============================================================================
// 8. State-Wise Region Analytics, Jan-Dec Matrix & GST/HSN GSTR-1 Export
// ============================================================================

export interface StateAnalyticsRow {
  state: string;
  ordersCount: number;
  grossRevenue: number;
  returnsCount: number;
  returnRatePercent: number;
  estimatedNetProfit: number;
  topChannel: MarketplaceChannel;
}

export function buildStateAnalytics(
  orders: OrderRecord[],
  products: Product[],
  returns: ReturnRequestRecord[]
): StateAnalyticsRow[] {
  const byState = new Map<
    string,
    {
      ordersCount: number;
      grossRevenue: number;
      returnsCount: number;
      cogs: number;
      fees: number;
      channelCount: Record<string, number>;
    }
  >();

  for (const o of orders) {
    const state = o.customer.state?.trim() || 'Bihar';
    const cur = byState.get(state) ?? {
      ordersCount: 0,
      grossRevenue: 0,
      returnsCount: 0,
      cogs: 0,
      fees: 0,
      channelCount: {},
    };
    cur.ordersCount += 1;
    if (o.status === 'Cancelled' || o.fulfillmentStage === 'RTO / Return') {
      cur.returnsCount += 1;
    } else {
      cur.grossRevenue += o.total;
      for (const it of o.items) {
        const prod = products.find((p) => p.id === it.productId);
        cur.cogs += (prod?.cogsCost ?? prod?.manufacturingCost ?? Math.round(it.price * 0.34)) * it.quantity;
      }
      cur.fees += (o.settlement?.commissionFee ?? 0) + (o.settlement?.shippingCharged ?? 0);
    }
    const ch = getEffectiveSourceChannel(o);
    cur.channelCount[ch] = (cur.channelCount[ch] || 0) + 1;
    byState.set(state, cur);
  }

  for (const r of returns) {
    const parent = orders.find((o) => o.orderNumber === r.orderNumber);
    const state = parent?.customer.state?.trim() || 'Bihar';
    const cur = byState.get(state);
    if (cur) cur.returnsCount += 1;
  }

  return Array.from(byState.entries())
    .map(([state, d]) => {
      const topChannel = (Object.entries(d.channelCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        'bee4.in') as MarketplaceChannel;
      const returnRatePercent =
        d.ordersCount > 0 ? Math.round((d.returnsCount / d.ordersCount) * 1000) / 10 : 0;
      return {
        state,
        ordersCount: d.ordersCount,
        grossRevenue: Math.round(d.grossRevenue),
        returnsCount: d.returnsCount,
        returnRatePercent,
        estimatedNetProfit: Math.round(d.grossRevenue - d.cogs - d.fees),
        topChannel,
      };
    })
    .sort((a, b) => b.grossRevenue - a.grossRevenue);
}

export interface MonthlyMatrixRow {
  monthIndex: number; // 0-11
  monthLabel: string;
  ordersCount: number;
  grossRevenue: number;
  netProfit: number;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildAnnualMonthlyMatrix(
  orders: OrderRecord[],
  products: Product[],
  year: number,
  channelFilter: MarketplaceChannel | 'All' = 'All'
): MonthlyMatrixRow[] {
  return MONTH_NAMES.map((monthLabel, monthIndex) => {
    const monthOrders = orders.filter((o) => {
      const d = new Date(o.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      if (d.getFullYear() !== year || d.getMonth() !== monthIndex) return false;
      if (channelFilter !== 'All' && getEffectiveSourceChannel(o) !== channelFilter) return false;
      return true;
    });

    let gross = 0;
    let cogs = 0;
    for (const o of monthOrders) {
      if (o.status === 'Cancelled' || o.fulfillmentStage === 'RTO / Return') continue;
      gross += o.total;
      for (const it of o.items) {
        const prod = products.find((p) => p.id === it.productId);
        cogs += (prod?.cogsCost ?? prod?.manufacturingCost ?? Math.round(it.price * 0.34)) * it.quantity;
      }
    }

    return {
      monthIndex,
      monthLabel,
      ordersCount: monthOrders.length,
      grossRevenue: Math.round(gross),
      netProfit: Math.round(gross - cogs),
    };
  });
}

export interface GstHsnSummaryRow {
  hsnCode: HsnCode;
  gstRatePercent: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTaxAmount: number;
  invoiceTotal: number;
}

export function buildGstHsnReport(
  orders: OrderRecord[],
  products: Product[],
  originState: string = 'Bihar'
): GstHsnSummaryRow[] {
  const gstRateByHsn: Record<HsnCode, number> = {
    '3926': 12,
    '7323': 18,
    '4202': 18,
  };

  const groups = new Map<HsnCode, GstHsnSummaryRow>();
  (['3926', '7323', '4202'] as HsnCode[]).forEach((hsn) => {
    groups.set(hsn, {
      hsnCode: hsn,
      gstRatePercent: gstRateByHsn[hsn],
      taxableValue: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalTaxAmount: 0,
      invoiceTotal: 0,
    });
  });

  for (const order of orders) {
    if (order.status === 'Cancelled') continue;
    const isIntraState =
      (order.customer.state || '').trim().toLowerCase() === originState.toLowerCase();

    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId);
      const hsn: HsnCode = prod?.hsnCode || '3926';
      const rate = gstRateByHsn[hsn];
      const grossLine = item.price * item.quantity;
      const taxable = grossLine / (1 + rate / 100);
      const tax = grossLine - taxable;
      const bucket = groups.get(hsn)!;
      bucket.taxableValue += taxable;
      bucket.totalTaxAmount += tax;
      bucket.invoiceTotal += grossLine;
      if (isIntraState) {
        bucket.cgstAmount += tax / 2;
        bucket.sgstAmount += tax / 2;
      } else {
        bucket.igstAmount += tax;
      }
    }
  }

  return Array.from(groups.values()).map((r) => ({
    ...r,
    taxableValue: Math.round(r.taxableValue * 100) / 100,
    cgstAmount: Math.round(r.cgstAmount * 100) / 100,
    sgstAmount: Math.round(r.sgstAmount * 100) / 100,
    igstAmount: Math.round(r.igstAmount * 100) / 100,
    totalTaxAmount: Math.round(r.totalTaxAmount * 100) / 100,
    invoiceTotal: Math.round(r.invoiceTotal * 100) / 100,
  }));
}

export function exportGstHsnCsv(rows: GstHsnSummaryRow[]): string {
  const header = [
    'HSN Code',
    'GST Rate %',
    'Taxable Value (INR)',
    'Intra-State CGST (INR)',
    'Intra-State SGST (INR)',
    'Inter-State IGST (INR)',
    'Total Tax (INR)',
    'Invoice Gross Total (INR)',
  ];
  const body = rows.map((r) => [
    r.hsnCode,
    `${r.gstRatePercent}%`,
    r.taxableValue.toFixed(2),
    r.cgstAmount.toFixed(2),
    r.sgstAmount.toFixed(2),
    r.igstAmount.toFixed(2),
    r.totalTaxAmount.toFixed(2),
    r.invoiceTotal.toFixed(2),
  ]);
  return [header, ...body].map((row) => row.join(',')).join('\n');
}
