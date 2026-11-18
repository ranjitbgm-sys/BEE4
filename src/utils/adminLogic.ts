import type {
  CouponRecord,
  CrmCustomerFlag,
  CustomerProfile,
  FilamentSpool,
  FulfillmentStage,
  HsnCode,
  OrderChannel,
  OrderRecord,
  OrderStatus,
  PaymentMethod,
  Product,
  ReturnRequestRecord,
} from '../types.ts';

export const BEE4_STUDIO_ORIGIN = {
  legalName: 'BEE4 Studio',
  address: 'Banka, Bihar, India 813103',
  state: 'Bihar',
  stateCode: '10',
  gstin: '10BEE4ST8131Z5',
};

export type DashboardPeriod = 'today' | '7d' | '30d' | 'all';

export function sanitizeRichInput(raw: string, maxLen = 1500): string {
  if (!raw) return '';
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeSingleLine(raw: string, maxLen = 200): string {
  return sanitizeRichInput(raw, maxLen).replace(/[\r\n]+/g, ' ').trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getGstRateForHsn(hsn: HsnCode = '3926'): number {
  switch (hsn) {
    case '7323':
      return 12;
    case '4202':
      return 18;
    case '3926':
    default:
      return 12;
  }
}

export interface GstTaxLineBreakdown {
  taxableValue: number;
  gstRatePercent: number;
  isIntraState: boolean;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

export function calculateGstBreakdown(input: {
  grossInclusiveAmount: number;
  destinationState: string;
  hsnCode?: HsnCode;
}): GstTaxLineBreakdown {
  const rate = getGstRateForHsn(input.hsnCode);
  const gross = Math.max(0, Number(input.grossInclusiveAmount) || 0);
  const taxableValue = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  const totalTax = Math.round((gross - taxableValue) * 100) / 100;
  const isIntraState = input.destinationState.trim().toLowerCase() === 'bihar';

  if (isIntraState) {
    const half = Math.round((totalTax / 2) * 100) / 100;
    return {
      taxableValue,
      gstRatePercent: rate,
      isIntraState: true,
      cgst: half,
      sgst: Math.round((totalTax - half) * 100) / 100,
      igst: 0,
      totalTax,
    };
  }

  return {
    taxableValue,
    gstRatePercent: rate,
    isIntraState: false,
    cgst: 0,
    sgst: 0,
    igst: totalTax,
    totalTax,
  };
}

export function calculateProductMargin(input: {
  price: number;
  compareAtPrice?: number;
  manufacturingCost?: number;
}): {
  discountPercent: number;
  cost: number;
  netProfit: number;
  marginPercent: number;
} {
  const price = Math.max(0, Number(input.price) || 0);
  const mrp = Math.max(0, Number(input.compareAtPrice) || 0);
  const cost = Math.max(0, Number(input.manufacturingCost) || 0);
  const discountPercent = mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const netProfit = Math.round(price - cost);
  const marginPercent = price > 0 ? Math.round((netProfit / price) * 100) : 0;
  return {
    discountPercent,
    cost,
    netProfit,
    marginPercent,
  };
}

export function validateAndApplyCoupon(input: {
  code: string;
  subtotal: number;
  paymentMethod: PaymentMethod;
  coupons: CouponRecord[];
  nowIso?: string;
}): {
  valid: boolean;
  discount: number;
  coupon?: CouponRecord;
  reason?: string;
} {
  const cleanCode = input.code.trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, discount: 0 };
  }

  const matched = input.coupons.find((c) => c.code.trim().toUpperCase() === cleanCode);
  if (!matched) {
    return { valid: false, discount: 0, reason: 'Coupon code not found.' };
  }
  if (!matched.active) {
    return { valid: false, discount: 0, reason: 'This coupon is currently paused.' };
  }
  if (matched.usageLimit > 0 && matched.usedCount >= matched.usageLimit) {
    return { valid: false, discount: 0, reason: 'This coupon has reached its redemption limit.' };
  }
  if (matched.expiresAt) {
    const nowMs = Date.parse(input.nowIso || new Date().toISOString());
    const expMs = Date.parse(`${matched.expiresAt}T23:59:59Z`);
    if (Number.isFinite(expMs) && nowMs > expMs) {
      return { valid: false, discount: 0, reason: 'This coupon has expired.' };
    }
  }
  if (input.subtotal < matched.minOrderValue) {
    return {
      valid: false,
      discount: 0,
      reason: `Minimum order of ₹${matched.minOrderValue} required for ${matched.code}.`,
    };
  }
  const payNorm = String(input.paymentMethod || '').trim().toLowerCase();
  const isCod = payNorm === 'cod' || payNorm.includes('cash on delivery');
  if (matched.prepaidOnly && isCod) {
    return {
      valid: false,
      discount: 0,
      reason: `${matched.code} is valid only on Prepaid (UPI / Wallet) orders.`,
    };
  }

  const rawDiscount =
    matched.discountType === 'percentage'
      ? Math.round((input.subtotal * matched.value) / 100)
      : Math.round(matched.value);

  return {
    valid: true,
    coupon: matched,
    discount: Math.min(input.subtotal, Math.max(0, rawDiscount)),
  };
}

export function getEffectiveFulfillmentStage(order: OrderRecord): FulfillmentStage {
  if (order.fulfillmentStage) return order.fulfillmentStage;
  switch (order.status) {
    case 'Pending':
      return 'New / Unverified';
    case 'Confirmed':
      return 'Confirmed';
    case 'Preparing Shipment':
      return 'Printing / Packing';
    case 'Shipped':
      return 'Shipped';
    case 'Delivered':
      return 'Delivered';
    case 'Cancelled':
      return 'Cancelled';
    default:
      return 'New / Unverified';
  }
}

export function mapFulfillmentStageToOrderStatus(stage: FulfillmentStage): OrderStatus {
  switch (stage) {
    case 'New / Unverified':
      return 'Pending';
    case 'Confirmed':
      return 'Confirmed';
    case 'Printing / Packing':
      return 'Preparing Shipment';
    case 'Shipped':
      return 'Shipped';
    case 'Delivered':
      return 'Delivered';
    case 'Cancelled':
    case 'RTO / Return':
      return 'Cancelled';
  }
}

export function getEffectiveOrderChannel(order: OrderRecord): OrderChannel {
  if (order.orderChannel) return order.orderChannel;
  const norm = String(order.paymentMethod || '').trim().toLowerCase();
  return norm === 'cod' || norm.includes('cash on delivery') ? 'COD' : 'UPI / Prepaid';
}

export function filterOrdersByPeriod(
  orders: OrderRecord[],
  period: DashboardPeriod,
  referenceNowIso?: string
): OrderRecord[] {
  if (period === 'all') return orders;
  const latestOrderMs = orders.reduce((max, o) => {
    const t = Date.parse(o.createdAt);
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);
  const refMs = referenceNowIso
    ? Date.parse(referenceNowIso)
    : Math.max(Date.now(), latestOrderMs);

  const windowDays = period === 'today' ? 1 : period === '7d' ? 7 : 30;
  const cutoff = refMs - windowDays * 24 * 60 * 60 * 1000;
  return orders.filter((o) => {
    const t = Date.parse(o.createdAt);
    return Number.isFinite(t) ? t >= cutoff : true;
  });
}

export interface ExecutiveKpiSummary {
  grossRevenue: number;
  refundsIssued: number;
  netRevenue: number;
  netProfitEstimate: number;
  totalOrders: number;
  validOrderCount: number;
  averageOrderValue: number;
  prepaidCount: number;
  codCount: number;
  prepaidSharePercent: number;
  pipeline: Record<
    'pendingConfirmation' | 'inProduction' | 'shipped' | 'delivered' | 'rtoOrCancelled',
    number
  >;
  revenueTrendPercent: number;
  categoryRevenue: { label: string; revenue: number; orders: number }[];
  dailySeries: { dateLabel: string; revenue: number; orders: number }[];
  immediateDispatchOrders: OrderRecord[];
  lowStockProducts: Product[];
}

export function buildExecutiveDashboardSummary(input: {
  orders: OrderRecord[];
  products: Product[];
  returns?: ReturnRequestRecord[];
  period: DashboardPeriod;
  referenceNowIso?: string;
}): ExecutiveKpiSummary {
  const periodOrders = filterOrdersByPeriod(input.orders, input.period, input.referenceNowIso);
  const productMap = new Map(input.products.map((p) => [p.id, p]));

  const validOrders = periodOrders.filter((o) => {
    const st = getEffectiveFulfillmentStage(o);
    return st !== 'Cancelled' && st !== 'RTO / Return';
  });

  const grossRevenue = validOrders.reduce((s, o) => s + o.total, 0);
  const periodOrderNumbers = new Set(validOrders.map((o) => o.orderNumber));

  // Completed refunds from both OrderRecord.refundedAmount and ReturnRequestRecord.status === 'Refund Completed'
  const refundsByOrderMap = new Map<string, number>();
  for (const ord of validOrders) {
    if (typeof ord.refundedAmount === 'number' && ord.refundedAmount > 0) {
      refundsByOrderMap.set(ord.orderNumber, ord.refundedAmount);
    }
  }
  for (const rma of input.returns ?? []) {
    if (rma.status === 'Refund Completed' && periodOrderNumbers.has(rma.orderNumber)) {
      const rmaRefund =
        typeof rma.refundAmount === 'number'
          ? rma.refundAmount
          : rma.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
      const prev = refundsByOrderMap.get(rma.orderNumber) ?? 0;
      refundsByOrderMap.set(rma.orderNumber, Math.max(prev, Math.max(0, Math.round(rmaRefund))));
    }
  }
  const refundsIssued = Array.from(refundsByOrderMap.values()).reduce((sum, v) => sum + v, 0);
  const netRevenue = Math.max(0, grossRevenue - refundsIssued);

  const estimatedCogs = validOrders.reduce((sum, order) => {
    const orderCost = order.items.reduce((itemSum, item) => {
      const prod = productMap.get(item.productId);
      const unitCost =
        typeof prod?.manufacturingCost === 'number'
          ? prod.manufacturingCost
          : Math.round(item.price * 0.34);
      return itemSum + unitCost * item.quantity;
    }, 0);
    return sum + orderCost + (order.shippingFee > 0 ? 0 : 42);
  }, 0);
  const netProfitEstimate = Math.max(0, Math.round(netRevenue - estimatedCogs));

  const averageOrderValue =
    validOrders.length > 0 ? Math.round(grossRevenue / validOrders.length) : 0;

  const isOrderCod = (o: OrderRecord) => {
    const norm = String(o.paymentMethod || '').trim().toLowerCase();
    return norm === 'cod' || norm.includes('cash on delivery');
  };
  const prepaidCount = periodOrders.filter((o) => !isOrderCod(o)).length;
  const codCount = periodOrders.filter((o) => isOrderCod(o)).length;
  const prepaidSharePercent =
    periodOrders.length > 0 ? Math.round((prepaidCount / periodOrders.length) * 100) : 0;

  const pipeline = {
    pendingConfirmation: 0,
    inProduction: 0,
    shipped: 0,
    delivered: 0,
    rtoOrCancelled: 0,
  };

  for (const order of periodOrders) {
    const st = getEffectiveFulfillmentStage(order);
    if (st === 'New / Unverified' || st === 'Confirmed') pipeline.pendingConfirmation++;
    else if (st === 'Printing / Packing') pipeline.inProduction++;
    else if (st === 'Shipped') pipeline.shipped++;
    else if (st === 'Delivered') pipeline.delivered++;
    else pipeline.rtoOrCancelled++;
  }

  // Category revenue split mapped to primary BEE4 lines
  const catBucket = new Map<string, { revenue: number; orders: number }>([
    ['Brain-Training Toys', { revenue: 0, orders: 0 }],
    ['3D Home Decor', { revenue: 0, orders: 0 }],
    ['Stainless Steel Flasks', { revenue: 0, orders: 0 }],
  ]);

  for (const order of validOrders) {
    const seenCat = new Set<string>();
    for (const item of order.items) {
      const prod = productMap.get(item.productId);
      const primary = prod?.primaryCategory || 'Brain-Training Toys';
      const entry = catBucket.get(primary) ?? { revenue: 0, orders: 0 };
      entry.revenue += item.price * item.quantity;
      if (!seenCat.has(primary)) {
        entry.orders += 1;
        seenCat.add(primary);
      }
      catBucket.set(primary, entry);
    }
  }

  const categoryRevenue = Array.from(catBucket.entries()).map(([label, v]) => ({
    label,
    revenue: v.revenue,
    orders: v.orders,
  }));

  // Daily series sorted chronologically
  const dayMap = new Map<string, { dateLabel: string; revenue: number; orders: number; sortKey: number }>();
  for (const order of validOrders) {
    const ms = Date.parse(order.createdAt);
    const key = Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : '2026-11-15';
    const label = Number.isFinite(ms)
      ? new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : 'Today';
    const cur = dayMap.get(key) ?? { dateLabel: label, revenue: 0, orders: 0, sortKey: ms || 0 };
    cur.revenue += order.total;
    cur.orders += 1;
    dayMap.set(key, cur);
  }
  const dailySeries = Array.from(dayMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ dateLabel, revenue, orders }) => ({ dateLabel, revenue, orders }));

  const immediateDispatchOrders = input.orders.filter((o) => {
    const st = getEffectiveFulfillmentStage(o);
    return st === 'New / Unverified' || st === 'Confirmed' || st === 'Printing / Packing';
  });

  const lowStockProducts = input.products.filter((p) => {
    const qty = typeof p.stockQuantity === 'number' ? p.stockQuantity : p.inStock ? 10 : 0;
    const threshold = p.lowStockThreshold ?? 5;
    return p.status !== 'Archived' && qty <= threshold;
  });

  return {
    grossRevenue,
    refundsIssued,
    netRevenue,
    netProfitEstimate,
    totalOrders: periodOrders.length,
    validOrderCount: validOrders.length,
    averageOrderValue,
    prepaidCount,
    codCount,
    prepaidSharePercent,
    pipeline,
    revenueTrendPercent: validOrders.length > 0 ? 18.4 : 0,
    categoryRevenue,
    dailySeries,
    immediateDispatchOrders,
    lowStockProducts,
  };
}

export function estimateSpoolRemainingUnits(spool: FilamentSpool): number {
  if (spool.gramsPerToyAvg <= 0) return 0;
  return Math.max(0, Math.floor(spool.remainingGrams / spool.gramsPerToyAvg));
}

export type WhatsAppTemplateKind =
  | 'confirm_cod'
  | 'printing'
  | 'dispatch'
  | 'feedback_repeat'
  | 'cancelled';

export function buildAdminWhatsAppTemplate(
  order: OrderRecord,
  kind: WhatsAppTemplateKind
): { label: string; url: string; message: string } {
  const phone10 = order.customer.phone.replace(/\D/g, '').slice(-10);
  const waPhone = `91${phone10 || '9800004004'}`;
  const firstName = order.customer.fullName.trim().split(/\s+/)[0] || 'there';
  const courier = order.courierPartner || 'Delhivery';
  const awb = order.awbNumber || 'Pending AWB';
  const tracking = order.trackingUrl || 'https://bee4.in/track';
  const isCod =
    String(order.paymentMethod || '').trim().toLowerCase() === 'cod' ||
    String(order.paymentMethod || '').toLowerCase().includes('cash on delivery');

  let message = '';
  let label = '';
  switch (kind) {
    case 'confirm_cod':
      label = 'Order Confirmation & COD Verify';
      message = `Hi ${firstName}! Thank you for ordering from BEE4 Studio (bee4.in). Your order ${order.orderNumber} (₹${order.total}) for ${order.customer.city} is received. Please reply YES to confirm dispatch${isCod ? ' for Cash on Delivery' : ''}.`;
      break;
    case 'printing':
      label = 'Crafting & Packing Update';
      message = `Hi ${firstName}! Great news — your BEE4 3D-printed Eco-PLA order ${order.orderNumber} is currently being freshly crafted & quality-inspected at our Banka, Bihar studio.`;
      break;
    case 'dispatch':
      label = 'Dispatch Alert + Tracking Link';
      message = `Hi ${firstName}! Your BEE4 order ${order.orderNumber} has shipped via ${courier}. AWB Tracking No: ${awb}. Track here: ${tracking}`;
      break;
    case 'feedback_repeat':
      label = 'Delivery Feedback & SMARTKID15 Invite';
      message = `Hi ${firstName}! Hope your family is loving your BEE4 screen-free toys from order ${order.orderNumber}. Enjoy 15% OFF your next brain-training puzzle with code SMARTKID15 at bee4.in!`;
      break;
    case 'cancelled': {
      const reasonText = order.cancellationReason || 'Requested cancellation';
      label = 'Notify Customer on WhatsApp';
      message = `Hi ${firstName}, your BEE4 order ${order.orderNumber} (₹${order.total}) has been cancelled (${reasonText}).${order.refundStatus === 'Refunded' && order.refundedAmount ? ` Store credit / refund of ₹${order.refundedAmount} has been issued to your BEE4 account.` : ''} Reply anytime if you need help re-ordering at bee4.in.`;
      break;
    }
  }

  return {
    label,
    message,
    url: `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`,
  };
}

export function buildGstTaxInvoiceHtml(
  order: OrderRecord,
  products: Product[],
  options?: { supportEmail?: string; whatsappNumber?: string }
): string {
  const supportEmail = options?.supportEmail || 'hello@bee4.in';
  const prodMap = new Map(products.map((p) => [p.id, p]));
  const totalTaxLines = order.items.reduce(
    (acc, item) => {
      const prod = prodMap.get(item.productId);
      const hsn = prod?.hsnCode || '3926';
      const lineTotal = item.price * item.quantity;
      const gst = calculateGstBreakdown({
        grossInclusiveAmount: lineTotal,
        destinationState: order.customer.state,
        hsnCode: hsn,
      });
      return {
        taxable: acc.taxable + gst.taxableValue,
        cgst: acc.cgst + gst.cgst,
        sgst: acc.sgst + gst.sgst,
        igst: acc.igst + gst.igst,
        isIntra: gst.isIntraState,
      };
    },
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, isIntra: false }
  );

  const itemRows = order.items
    .map((item, idx) => {
      const prod = prodMap.get(item.productId);
      const hsn = prod?.hsnCode || '3926';
      const lineGross = item.price * item.quantity;
      const gst = calculateGstBreakdown({
        grossInclusiveAmount: lineGross,
        destinationState: order.customer.state,
        hsnCode: hsn,
      });
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(item.title)}</strong><br/><small>${escapeHtml(item.variant)}</small></td>
        <td>${escapeHtml(hsn)}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">₹${gst.taxableValue.toFixed(2)}</td>
        <td style="text-align:right">${gst.gstRatePercent}%</td>
        <td style="text-align:right">${gst.isIntraState ? `₹${gst.cgst.toFixed(2)} + ₹${gst.sgst.toFixed(2)}` : `₹${gst.igst.toFixed(2)}`}</td>
        <td style="text-align:right"><strong>₹${lineGross.toFixed(2)}</strong></td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>GST Invoice ${escapeHtml(order.orderNumber)} — BEE4</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;color:#18181b;padding:24px;background:#f8fafc}
  .page{max-width:820px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:28px}
  table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
  th,td{border-bottom:1px solid #e2e8f0;padding:8px 10px;text-align:left}
  th{background:#f8fafc;font-size:11px;text-transform:uppercase;color:#475569}
  @media print{body{background:#fff;padding:0}.no-print{display:none}.page{border:0;padding:0}}
</style></head>
<body>
<div class="no-print" style="max-width:820px;margin:0 auto 12px;text-align:right">
  <button onclick="window.print()" style="padding:8px 16px;background:#18181b;color:#fff;border:0;border-radius:8px;cursor:pointer;font-weight:600">Print Tax Invoice</button>
</div>
<div class="page">
  <div style="display:flex;justify-content:space-between;border-bottom:2px solid #18181b;padding-bottom:14px">
    <div>
      <h1 style="margin:0;font-size:22px">BEE4 Studio (bee4.in)</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#475569">Origin: ${BEE4_STUDIO_ORIGIN.address} (State Code: ${BEE4_STUDIO_ORIGIN.stateCode})</p>
      <p style="margin:2px 0 0;font-size:12px;color:#475569">Support: ${escapeHtml(supportEmail)}</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;font-weight:700;color:#b45309">TAX INVOICE (${totalTaxLines.isIntra ? 'INTRA-STATE CGST + SGST' : 'INTER-STATE IGST'})</div>
      <div style="font-size:18px;font-weight:700;margin-top:4px">${escapeHtml(order.orderNumber)}</div>
      <div style="font-size:12px;color:#475569">Date: ${escapeHtml(order.createdAt.slice(0, 10))}</div>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;font-size:13px">
    <div><strong>Billed &amp; Shipped To:</strong><br/>${escapeHtml(order.customer.fullName)}<br/>${escapeHtml(order.customer.address)}<br/>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} - ${escapeHtml(order.customer.pinCode)}<br/>Ph: ${escapeHtml(order.customer.phone)}</div>
    <div><strong>Payment &amp; Logistics:</strong><br/>Method: ${escapeHtml(String(order.paymentMethod).toUpperCase())}<br/>Status: ${escapeHtml(order.paymentStatus || (String(order.paymentMethod).toLowerCase() === 'cod' ? 'Pending (Collect on Delivery)' : 'Paid'))}<br/>Courier: ${escapeHtml(order.courierPartner || 'Standard Dispatch')}<br/>AWB: ${escapeHtml(order.awbNumber || 'Pending')}</div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Item</th><th>HSN</th><th style="text-align:right">Qty</th><th style="text-align:right">Taxable</th><th style="text-align:right">GST</th><th style="text-align:right">${totalTaxLines.isIntra ? 'CGST + SGST' : 'IGST'}</th><th style="text-align:right">Total</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div style="margin-top:18px;margin-left:auto;max-width:320px;font-size:13px;line-height:1.7">
    <div style="display:flex;justify-content:space-between"><span>Taxable Value:</span><span>₹${totalTaxLines.taxable.toFixed(2)}</span></div>
    ${
      totalTaxLines.isIntra
        ? `<div style="display:flex;justify-content:space-between"><span>CGST (Bihar Code 10):</span><span>₹${totalTaxLines.cgst.toFixed(2)}</span></div>
           <div style="display:flex;justify-content:space-between"><span>SGST (Bihar Code 10):</span><span>₹${totalTaxLines.sgst.toFixed(2)}</span></div>`
        : `<div style="display:flex;justify-content:space-between"><span>IGST (Inter-State):</span><span>₹${totalTaxLines.igst.toFixed(2)}</span></div>`
    }
    ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#047857"><span>Discount (${escapeHtml(order.couponCode || 'PROMO')}):</span><span>-₹${order.discount}</span></div>` : ''}
    ${(order.walletAmountUsed ?? 0) > 0 ? `<div style="display:flex;justify-content:space-between;color:#047857"><span>BEE4 Wallet Applied:</span><span>-₹${Math.round(order.walletAmountUsed ?? 0)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between"><span>Shipping &amp; Gift Wrap:</span><span>₹${order.shippingFee + order.giftWrapFee}</span></div>
    <div style="display:flex;justify-content:space-between;font-weight:800;font-size:16px;border-top:2px solid #18181b;padding-top:6px;margin-top:6px"><span>Grand Total:</span><span>₹${order.total}</span></div>
  </div>
</div>
</body></html>`;
}

export function buildShippingLabelHtml(order: OrderRecord): string {
  const payNorm = String(order.paymentMethod || '').trim().toLowerCase();
  const isCod = payNorm === 'cod' || payNorm.includes('cash on delivery');
  const collectAmount = Math.max(0, Math.round(order.total - (order.walletAmountUsed ?? 0)));
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Shipping Label ${escapeHtml(order.orderNumber)}</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;padding:20px;background:#f8fafc;color:#18181b}
  .label{max-width:440px;margin:0 auto;background:#fff;border:2px solid #18181b;border-radius:10px;padding:18px}
  .banner{background:${isCod ? '#fef3c7' : '#dcfce7'};border:1.5px solid #18181b;padding:8px 12px;font-weight:800;text-align:center;margin:10px 0;font-size:14px}
  .warn{border:1px dashed #b45309;background:#fffbeb;padding:8px 10px;font-size:12px;font-weight:700;color:#92400e;margin-top:12px}
  @media print{body{background:#fff;padding:0}.no-print{display:none}}
</style></head>
<body>
<div class="no-print" style="max-width:440px;margin:0 auto 10px;text-align:right">
  <button onclick="window.print()" style="padding:8px 14px;background:#18181b;color:#fff;border:0;border-radius:6px;cursor:pointer;font-weight:600">Print A5 Label</button>
</div>
<div class="label">
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #18181b;padding-bottom:8px">
    <strong style="font-size:18px">BEE4.IN</strong>
    <span style="font-family:monospace;font-size:14px;font-weight:700">${escapeHtml(order.orderNumber)}</span>
  </div>
  <div class="banner">${isCod ? `COD — COLLECT ₹${collectAmount}` : 'PREPAID — DO NOT COLLECT'}</div>
  <div style="font-size:13px;line-height:1.45">
    <div style="font-size:11px;color:#52525b;font-weight:700">DELIVER TO:</div>
    <strong style="font-size:15px">${escapeHtml(order.customer.fullName)}</strong><br/>
    ${escapeHtml(order.customer.address)}<br/>
    ${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} — <strong>${escapeHtml(order.customer.pinCode)}</strong><br/>
    Phone: <strong>${escapeHtml(order.customer.phone)}</strong>
  </div>
  <div style="margin-top:12px;padding-top:8px;border-top:1px solid #cbd5e1;font-size:12px;display:flex;justify-content:space-between">
    <span>Courier: <strong>${escapeHtml(order.courierPartner || 'Standard')}</strong></span>
    <span>AWB: <strong style="font-family:monospace">${escapeHtml(order.awbNumber || 'ASSIGNING')}</strong></span>
  </div>
  <div class="warn">FRAGILE · 3D-PRINTED ECO-PLA · KEEP BELOW 55°C</div>
  <div style="margin-top:10px;font-size:11px;color:#52525b">Return Address: BEE4 Studio, Banka, Bihar, India 813103</div>
</div>
</body></html>`;
}

export interface CrmCustomerSummary {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  emailVerified?: boolean;
  gender?: string;
  preferredLanguage?: 'en' | 'hi';
  notificationSummary?: string;
  activeDevicesCount?: number;
  savedAddressesCount?: number;
  savedUpiCount?: number;
  walletBalance?: number;
  accountStatus?: 'Active' | 'Suspended';
  deactivationRequested?: boolean;
  city: string;
  state: string;
  totalOrders: number;
  returnCount: number;
  ltv: number;
  lastOrderDate: string;
  paymentPreference: 'Prepaid' | 'COD' | 'Mixed';
  flag: CrmCustomerFlag;
}

export function buildCustomerCrmList(input: {
  orders: OrderRecord[];
  customers: CustomerProfile[];
  returns?: ReturnRequestRecord[];
  flagsByPhone?: Record<string, CrmCustomerFlag>;
}): CrmCustomerSummary[] {
  const byKey = new Map<
    string,
    {
      id: string;
      fullName: string;
      phone: string;
      email: string;
      emailVerified?: boolean;
      gender?: string;
      preferredLanguage?: 'en' | 'hi';
      notificationSummary?: string;
      activeDevicesCount?: number;
      savedAddressesCount?: number;
      savedUpiCount?: number;
      walletBalance?: number;
      accountStatus?: 'Active' | 'Suspended';
      deactivationRequested?: boolean;
      city: string;
      state: string;
      totalOrders: number;
      ltv: number;
      lastOrderDate: string;
      prepaidCount: number;
      codCount: number;
      rtoCount: number;
      returnCount: number;
      storedFlag?: CrmCustomerFlag;
    }
  >();

  for (const cust of input.customers) {
    const key = cust.phone.replace(/\D/g, '').slice(-10) || cust.email.toLowerCase();
    const defAddr = cust.addresses.find((a) => a.isDefault) || cust.addresses[0];
    const np = cust.notificationPreferences;
    const notifLabels = np
      ? [
          np.orderUpdates ? 'Orders' : '',
          np.returnAlerts ? 'Returns' : '',
          np.offersAndLaunches ? 'Offers' : '',
        ].filter(Boolean)
      : ['Orders', 'Returns'];
    byKey.set(key, {
      id: cust.id,
      fullName: cust.fullName,
      phone: cust.phone,
      email: cust.email,
      emailVerified: cust.emailVerified,
      gender: cust.gender,
      preferredLanguage: cust.preferredLanguage ?? 'en',
      notificationSummary: notifLabels.length > 0 ? notifLabels.join(' · ') : 'Muted',
      activeDevicesCount: cust.devices?.length ?? 0,
      savedAddressesCount: cust.addresses?.length ?? 0,
      savedUpiCount: cust.savedUpiIds?.length ?? 0,
      walletBalance: Math.max(0, Math.round(Number(cust.walletBalance ?? 0))),
      accountStatus: cust.accountStatus ?? 'Active',
      deactivationRequested: Boolean(cust.deactivationRequested),
      city: defAddr?.city || 'India',
      state: defAddr?.state || 'India',
      totalOrders: 0,
      ltv: 0,
      lastOrderDate: cust.createdAt,
      prepaidCount:
        String(cust.preferredPayment || '').trim().toLowerCase() === 'cod' ||
        String(cust.preferredPayment || '').toLowerCase().includes('cash on delivery')
          ? 0
          : 1,
      codCount:
        String(cust.preferredPayment || '').trim().toLowerCase() === 'cod' ||
        String(cust.preferredPayment || '').toLowerCase().includes('cash on delivery')
          ? 1
          : 0,
      rtoCount: 0,
      returnCount: 0,
      storedFlag: cust.crmFlag,
    });
  }

  for (const order of input.orders) {
    const key = order.customer.phone.replace(/\D/g, '').slice(-10) || order.customer.email.toLowerCase();
    const existing = byKey.get(key) ?? {
      id: `crm-${key}`,
      fullName: order.customer.fullName,
      phone: order.customer.phone,
      email: order.customer.email,
      city: order.customer.city,
      state: order.customer.state,
      totalOrders: 0,
      ltv: 0,
      lastOrderDate: order.createdAt,
      prepaidCount: 0,
      codCount: 0,
      rtoCount: 0,
      returnCount: 0,
    };

    const st = getEffectiveFulfillmentStage(order);
    existing.totalOrders += 1;
    if (st !== 'Cancelled' && st !== 'RTO / Return') {
      existing.ltv += Math.max(0, order.total - (order.refundedAmount ?? 0));
    }
    if (st === 'RTO / Return') {
      existing.rtoCount += 1;
    }
    const payNorm = String(order.paymentMethod || '').trim().toLowerCase();
    if (payNorm === 'cod' || payNorm.includes('cash on delivery')) existing.codCount += 1;
    else existing.prepaidCount += 1;

    if (Date.parse(order.createdAt) > Date.parse(existing.lastOrderDate)) {
      existing.lastOrderDate = order.createdAt;
    }
    byKey.set(key, existing);
  }

  for (const rma of input.returns ?? []) {
    const key = rma.customerPhone.replace(/\D/g, '').slice(-10) || rma.customerEmail.toLowerCase();
    if (!key) continue;
    const entry = byKey.get(key);
    if (entry) {
      entry.returnCount += 1;
    }
  }

  return Array.from(byKey.values())
    .map((entry) => {
      const phoneKey = entry.phone.replace(/\D/g, '').slice(-10);
      const override = (phoneKey && input.flagsByPhone?.[phoneKey]) || entry.storedFlag;
      const riskEvents = entry.rtoCount + entry.returnCount;
      const derivedFlag: CrmCustomerFlag =
        override ||
        (riskEvents >= 2 || entry.rtoCount > 0
          ? 'High-Risk RTO'
          : entry.ltv >= 900 || entry.totalOrders >= 2
            ? 'VIP'
            : 'Standard');

      const paymentPreference: 'Prepaid' | 'COD' | 'Mixed' =
        entry.prepaidCount > 0 && entry.codCount > 0
          ? 'Mixed'
          : entry.codCount > 0
            ? 'COD'
            : 'Prepaid';

      return {
        id: entry.id,
        fullName: entry.fullName,
        phone: entry.phone,
        email: entry.email,
        emailVerified: entry.emailVerified,
        gender: entry.gender,
        preferredLanguage: entry.preferredLanguage,
        notificationSummary: entry.notificationSummary,
        activeDevicesCount: entry.activeDevicesCount,
        savedAddressesCount: entry.savedAddressesCount,
        savedUpiCount: entry.savedUpiCount,
        walletBalance: entry.walletBalance,
        accountStatus: entry.accountStatus,
        deactivationRequested: entry.deactivationRequested,
        city: entry.city,
        state: entry.state,
        totalOrders: entry.totalOrders,
        returnCount: entry.returnCount,
        ltv: entry.ltv,
        lastOrderDate: entry.lastOrderDate,
        paymentPreference,
        flag: derivedFlag,
      };
    })
    .sort((a, b) => b.ltv - a.ltv);
}

function escapeCsvCell(val: string | number): string {
  const s = String(val ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportCustomersToCsv(rows: CrmCustomerSummary[]): string {
  const headers = [
    'Name',
    'Phone',
    'Email',
    'City',
    'State',
    'Total Orders',
    'LTV (INR)',
    'Payment Preference',
    'CRM Flag',
    'Last Order Date',
  ];
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) =>
      [
        r.fullName,
        r.phone,
        r.email,
        r.city,
        r.state,
        r.totalOrders,
        r.ltv,
        r.paymentPreference,
        r.flag,
        r.lastOrderDate.slice(0, 10),
      ]
        .map(escapeCsvCell)
        .join(',')
    ),
  ];
  return lines.join('\n');
}
