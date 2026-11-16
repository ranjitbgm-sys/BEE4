import type {
  CouponRecord,
  FilamentSpool,
  InventoryAdjustmentRecord,
  OrderRecord,
  PrintJobRecord,
  Product,
  RefundMode,
  ReturnItemEntry,
  ReturnReason,
  ReturnRequestRecord,
  ReturnRequestStatus,
  ReturnResolutionType,
} from '../types';
import { sanitizeRichInput, sanitizeSingleLine } from './adminLogic';
import { normalizeIndianPhone10 } from './storeLogic';

export const RETURN_WINDOW_DAYS = 7;

export const RETURN_REASONS: ReturnReason[] = [
  'Damaged in Transit',
  'Missing 3D Puzzle Piece / Part',
  'Heat Warping During Delivery (>55°C exposure)',
  'Wrong Item Received',
  'Quality / Finish Issue',
  'Other',
];

export const RETURN_RESOLUTIONS: {
  id: ReturnResolutionType;
  title: string;
  subtitle: string;
  recommended?: boolean;
  bonusBadge?: string;
}[] = [
  {
    id: 'Free Instant Replacement',
    title: 'Free Instant Replacement',
    subtitle: 'Priority 3D print & express dispatch from Banka Studio at zero cost.',
    recommended: true,
  },
  {
    id: 'Instant Store Credit Coupon (+10% Bonus Value)',
    title: 'Instant Store Credit Coupon (+10% Bonus Value)',
    subtitle: 'Get 110% of item value immediately as an exclusive BEE4 coupon.',
    bonusBadge: '+10% Bonus',
  },
  {
    id: 'Refund to Original Payment / UPI ID',
    title: 'Refund to Original Payment / UPI ID',
    subtitle: 'Direct refund to original UPI/card or customer UPI ID / Bank account for COD.',
  },
];

export const RMA_WORKFLOW_STATUSES: ReturnRequestStatus[] = [
  'Return Requested',
  'Approved — Reverse Pickup Scheduled',
  'Rejected',
  'Item Received at Banka Hub (Pending QC)',
  'QC Passed — Restocked to Inventory',
  'QC Failed — Damaged / Scrap PLA (Do Not Restock)',
  'Replacement Dispatched',
  'Refund Completed',
];

export const REJECTION_REASON_PRESETS: string[] = [
  'Outside 7-day return window',
  'No unpacking / damage photo proof provided',
  'Heat warping from post-delivery sun/car exposure (>55°C)',
  'Missing original packaging or multiple tampered parts',
];

export const REVERSE_COURIERS: string[] = [
  'Delhivery Reverse',
  'Shiprocket Reverse',
  'BlueDart Surface Reverse',
  'India Post Speed Return',
];

export const CUSTOMER_RETURN_TRACKER_STEPS = [
  'Return Requested',
  'Approved & Pickup Scheduled',
  'Item Received',
  'Quality Check (QC)',
  'Refunded / Replacement Shipped',
] as const;

export function isOrderEligibleForReturn(
  order: OrderRecord,
  existingReturns: ReturnRequestRecord[],
  nowMs = Date.now(),
  windowDays = RETURN_WINDOW_DAYS
): {
  eligible: boolean;
  reason?: string;
  daysRemaining?: number;
  existingRma?: ReturnRequestRecord;
} {
  const existingRma = existingReturns.find((r) => r.orderNumber === order.orderNumber);
  if (existingRma) {
    return {
      eligible: false,
      existingRma,
      reason: `Return ${existingRma.rmaNumber} already submitted (${existingRma.status}).`,
    };
  }

  if (order.status !== 'Delivered') {
    return {
      eligible: false,
      reason: 'Returns are enabled once your order status is Delivered.',
    };
  }

  const createdMs = Date.parse(order.createdAt);
  if (!Number.isFinite(createdMs)) {
    return { eligible: true, daysRemaining: windowDays };
  }

  const elapsedDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);
  if (elapsedDays > windowDays) {
    return {
      eligible: false,
      daysRemaining: 0,
      reason: `The ${windowDays}-day return window has expired for this delivery.`,
    };
  }

  const daysRemaining = Math.max(1, Math.ceil(windowDays - elapsedDays));
  return { eligible: true, daysRemaining };
}

export function buildCustomerReturnStepIndex(status: ReturnRequestStatus): number {
  switch (status) {
    case 'Return Requested':
      return 0;
    case 'Approved — Reverse Pickup Scheduled':
      return 1;
    case 'Item Received at Banka Hub (Pending QC)':
      return 2;
    case 'QC Passed — Restocked to Inventory':
    case 'QC Failed — Damaged / Scrap PLA (Do Not Restock)':
      return 3;
    case 'Replacement Dispatched':
    case 'Refund Completed':
      return 4;
    case 'Rejected':
      return -1;
  }
}

export function computeReturnItemsValue(items: ReturnItemEntry[]): number {
  return Math.round(
    items.reduce(
      (sum, it) => sum + Math.max(0, Number(it.unitPrice) || 0) * Math.max(0, Number(it.quantity) || 0),
      0
    )
  );
}

export function calculateStoreCreditAmount(baseAmount: number): number {
  const safeBase = Math.max(0, Number(baseAmount) || 0);
  return Math.round(safeBase * 1.1);
}

export function generateRmaNumber(existingReturns: ReturnRequestRecord[]): string {
  const existingSet = new Set(existingReturns.map((r) => r.rmaNumber.toUpperCase()));
  let candidate = 1041 + existingReturns.length;
  while (existingSet.has(`RMA-${candidate}`)) {
    candidate += 1;
  }
  return `RMA-${candidate}`;
}

export function lookupGuestOrderByOrderAndPhone(
  orders: OrderRecord[],
  orderNumberQuery: string,
  phoneQuery: string
): { order?: OrderRecord; error?: string } {
  const cleanOrderNo = orderNumberQuery.trim().toUpperCase();
  const cleanPhone10 = normalizeIndianPhone10(phoneQuery);

  if (!cleanOrderNo || cleanOrderNo.length < 4) {
    return { error: 'Enter your BEE4 Order ID (e.g. BEE4-2044 or BEE4-2039).' };
  }
  if (!/^[6-9]\d{9}$/.test(cleanPhone10)) {
    return { error: 'Enter the 10-digit Indian mobile number used during checkout.' };
  }

  const matched = orders.find((o) => {
    const orderPhone10 = normalizeIndianPhone10(o.customer.phone);
    return o.orderNumber.trim().toUpperCase() === cleanOrderNo && orderPhone10 === cleanPhone10;
  });

  if (!matched) {
    return {
      error: `No order found matching ${cleanOrderNo} with mobile ${cleanPhone10}. Check your Order ID and phone number.`,
    };
  }

  return { order: matched };
}

export interface ReturnRequestFormInput {
  selectedItems: ReturnItemEntry[];
  reason: ReturnReason | '';
  resolutionType: ReturnResolutionType;
  orderPaymentMethod: OrderRecord['paymentMethod'];
  refundUpiId?: string;
  refundBankAccount?: string;
  refundBankIfsc?: string;
  proofImages: string[];
  customerComments: string;
}

export function validateReturnRequestForm(input: ReturnRequestFormInput): {
  valid: boolean;
  errors: {
    items?: string;
    reason?: string;
    payout?: string;
    proof?: string;
  };
} {
  const errors: {
    items?: string;
    reason?: string;
    payout?: string;
    proof?: string;
  } = {};

  const totalQty = input.selectedItems.reduce((s, it) => s + Math.max(0, it.quantity), 0);
  if (totalQty <= 0) {
    errors.items = 'Select at least 1 item and quantity to return or replace.';
  }

  if (!input.reason) {
    errors.reason = 'Please select the primary reason for your return request.';
  }

  if (
    input.resolutionType === 'Refund to Original Payment / UPI ID' &&
    input.orderPaymentMethod === 'cod'
  ) {
    const upi = (input.refundUpiId ?? '').trim();
    const bankAcc = (input.refundBankAccount ?? '').replace(/\s+/g, '');
    const ifsc = (input.refundBankIfsc ?? '').trim().toUpperCase();
    const hasValidUpi = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9.-]{2,}$/.test(upi);
    const hasValidBank = /^\d{8,18}$/.test(bankAcc) && /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
    if (!hasValidUpi && !hasValidBank) {
      errors.payout =
        'For COD refunds, enter a valid UPI ID (e.g. name@okaxis) or Bank Account + 11-char IFSC.';
    }
  }

  if (input.proofImages.length === 0) {
    errors.proof = 'Upload or paste at least 1 unpacking / product photo proof for fast approval.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface RmaTransitionUpdates {
  status: ReturnRequestStatus;
  rejectionReason?: string;
  adminNote?: string;
  reverseCourier?: string;
  reverseAwb?: string;
  replacementAwb?: string;
  autoRestockEnabled: boolean;
  refundAmount?: number;
  refundMode?: RefundMode;
  refundUtr?: string;
}

export interface RmaTransitionSyncResult {
  updatedReturn: ReturnRequestRecord;
  updatedProducts: Product[];
  updatedOrders: OrderRecord[];
  updatedSpools: FilamentSpool[];
  newPrintJob: PrintJobRecord | null;
  newCoupon: CouponRecord | null;
  inventoryAdjustments: InventoryAdjustmentRecord[];
  auditSummary: string;
}

export function applyRmaTransitionSync(input: {
  prevReturn: ReturnRequestRecord;
  nextUpdates: RmaTransitionUpdates;
  products: Product[];
  orders: OrderRecord[];
  spools: FilamentSpool[];
  coupons: CouponRecord[];
  forceQueuePrint?: boolean;
  nowIso?: string;
}): RmaTransitionSyncResult {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const prev = input.prevReturn;
  const upd = input.nextUpdates;

  let nextReturn: ReturnRequestRecord = {
    ...prev,
    status: upd.status,
    rejectionReason:
      upd.status === 'Rejected'
        ? sanitizeSingleLine(upd.rejectionReason ?? prev.rejectionReason ?? '', 240)
        : sanitizeSingleLine(upd.rejectionReason ?? '', 240),
    adminNote: sanitizeRichInput(upd.adminNote ?? prev.adminNote ?? '', 500),
    reverseCourier: sanitizeSingleLine(upd.reverseCourier ?? prev.reverseCourier ?? '', 80),
    reverseAwb: sanitizeSingleLine(upd.reverseAwb ?? prev.reverseAwb ?? '', 64),
    replacementAwb: sanitizeSingleLine(upd.replacementAwb ?? prev.replacementAwb ?? '', 64),
    autoRestockEnabled: Boolean(upd.autoRestockEnabled),
    refundAmount:
      typeof upd.refundAmount === 'number' && Number.isFinite(upd.refundAmount)
        ? Math.max(0, Math.round(upd.refundAmount))
        : prev.refundAmount,
    refundMode: upd.refundMode ?? prev.refundMode,
    refundUtr: sanitizeSingleLine(upd.refundUtr ?? prev.refundUtr ?? '', 80),
    updatedAt: nowIso,
  };

  let nextProducts = input.products.map((p) => ({ ...p }));
  let nextOrders = input.orders.map((o) => ({ ...o }));
  let nextSpools = input.spools.map((s) => ({ ...s }));
  let newPrintJob: PrintJobRecord | null = null;
  let newCoupon: CouponRecord | null = null;
  const inventoryAdjustments: InventoryAdjustmentRecord[] = [];
  const auditParts: string[] = [`${prev.rmaNumber} -> ${upd.status}`];

  const shouldRestock =
    !prev.isRestocked &&
    (upd.status === 'QC Passed — Restocked to Inventory' ||
      (upd.status === 'Refund Completed' && upd.autoRestockEnabled));

  if (shouldRestock) {
    for (const item of nextReturn.items) {
      const idx = nextProducts.findIndex((p) => p.id === item.productId);
      if (idx >= 0) {
        const prod = nextProducts[idx];
        const prevQty = typeof prod.stockQuantity === 'number' ? prod.stockQuantity : prod.inStock ? 10 : 0;
        const added = Math.max(1, Math.round(item.quantity));
        const nextQty = prevQty + added;
        nextProducts[idx] = {
          ...prod,
          stockQuantity: nextQty,
          inStock: nextQty > 0,
        };
        inventoryAdjustments.push({
          id: `inv-${Date.now()}-${item.productId}`,
          timestamp: nowIso,
          productId: prod.id,
          productTitle: prod.title,
          sku: prod.sku,
          delta: added,
          adjustmentType: 'rma_restock',
          referenceId: nextReturn.rmaNumber,
          note: `+${added} unit${added > 1 ? 's' : ''} restocked from Return #${nextReturn.rmaNumber}`,
        });
      }
    }
    nextReturn = { ...nextReturn, isRestocked: true };
    auditParts.push('Inventory auto-restocked (idempotent)');
  }

  const shouldRecordScrap =
    !prev.scrapRecorded && upd.status === 'QC Failed — Damaged / Scrap PLA (Do Not Restock)';

  if (shouldRecordScrap) {
    for (const item of nextReturn.items) {
      const idx = nextProducts.findIndex((p) => p.id === item.productId);
      if (idx >= 0) {
        const prod = nextProducts[idx];
        const addedScrap = Math.max(1, Math.round(item.quantity));
        const prevScrap = prod.damagedScrapCount ?? 0;
        nextProducts[idx] = {
          ...prod,
          damagedScrapCount: prevScrap + addedScrap,
        };
        inventoryAdjustments.push({
          id: `inv-scrap-${Date.now()}-${item.productId}`,
          timestamp: nowIso,
          productId: prod.id,
          productTitle: prod.title,
          sku: prod.sku,
          delta: 0,
          adjustmentType: 'rma_scrap',
          referenceId: nextReturn.rmaNumber,
          note: `${addedScrap} unit${addedScrap > 1 ? 's' : ''} quarantined as Damaged / Scrap PLA (${nextReturn.rmaNumber})`,
        });
      }
    }
    nextReturn = { ...nextReturn, scrapRecorded: true };
    auditParts.push('Logged Damaged/Scrap PLA');
  }

  // 3D Print Queue + Eco-PLA filament deduction for Replacement orders
  const primaryItem = nextReturn.items[0];
  const primaryProd = primaryItem
    ? nextProducts.find((p) => p.id === primaryItem.productId)
    : undefined;
  const primaryStock = primaryProd
    ? typeof primaryProd.stockQuantity === 'number'
      ? primaryProd.stockQuantity
      : primaryProd.inStock
        ? 10
        : 0
    : 0;
  const lowThreshold = primaryProd?.lowStockThreshold ?? 5;
  const totalReturnedQty = nextReturn.items.reduce((s, it) => s + Math.max(1, it.quantity), 0);

  const autoNeedsPrint =
    nextReturn.resolutionType === 'Free Instant Replacement' &&
    (upd.status === 'Approved — Reverse Pickup Scheduled' || upd.status === 'Replacement Dispatched') &&
    primaryStock <= lowThreshold;

  const shouldQueuePrint =
    Boolean(primaryItem) &&
    !prev.replacementPrintQueued &&
    (Boolean(input.forceQueuePrint) || autoNeedsPrint);

  if (shouldQueuePrint && primaryItem) {
    const unitGrams = primaryProd?.weightGrams ?? 160;
    const totalGrams = Math.max(40, totalReturnedQty * unitGrams);

    // Deduct estimated grams from the most-stocked active PLA spool
    if (nextSpools.length > 0) {
      let bestSpoolIdx = 0;
      let maxRem = -1;
      nextSpools.forEach((s, idx) => {
        if (s.remainingGrams > maxRem) {
          maxRem = s.remainingGrams;
          bestSpoolIdx = idx;
        }
      });
      const targetSpool = nextSpools[bestSpoolIdx];
      nextSpools[bestSpoolIdx] = {
        ...targetSpool,
        remainingGrams: Math.max(0, targetSpool.remainingGrams - totalGrams),
      };
    }

    newPrintJob = {
      id: `job-rma-${Date.now()}`,
      productId: primaryItem.productId,
      productTitle: `${primaryItem.title} (Replacement #${nextReturn.rmaNumber})`,
      orderNumber: nextReturn.orderNumber,
      batchQty: totalReturnedQty,
      material: primaryProd?.materials || 'Matte Bio-PLA+',
      estimatedGrams: totalGrams,
      stage: 'Queued',
      printerName: 'Bambu P1S #1 — Priority Replacement (Banka Lab)',
      updatedAt: nowIso,
    };
    nextReturn = { ...nextReturn, replacementPrintQueued: true };
    auditParts.push(`Queued 3D replacement print (${totalGrams}g PLA)`);
  }

  // Refund financial sync + optional +10% Store Credit Coupon
  if (upd.status === 'Refund Completed') {
    const fallbackVal = computeReturnItemsValue(nextReturn.items);
    const refundVal = Math.max(0, Math.round(nextReturn.refundAmount ?? fallbackVal));
    const refundMode: RefundMode =
      nextReturn.refundMode ??
      (nextReturn.resolutionType === 'Instant Store Credit Coupon (+10% Bonus Value)'
        ? 'Store Credit Coupon'
        : nextReturn.orderPaymentMethod === 'cod'
          ? 'UPI Transfer'
          : 'Original Source');

    let issuedCouponCode = prev.issuedCouponCode;
    if (refundMode === 'Store Credit Coupon' && !issuedCouponCode) {
      const creditVal = calculateStoreCreditAmount(refundVal);
      const rmaDigits = nextReturn.rmaNumber.replace(/[^A-Z0-9]/gi, '').slice(-4) || '1041';
      let codeCandidate = `BEE4CR${rmaDigits}`;
      const existingCodes = new Set(input.coupons.map((c) => c.code.toUpperCase()));
      if (existingCodes.has(codeCandidate)) {
        codeCandidate = `${codeCandidate}X`;
      }
      issuedCouponCode = codeCandidate;
      newCoupon = {
        id: `cpn-credit-${Date.now()}`,
        code: codeCandidate,
        description: `Store Credit (+10% Bonus) for Return #${nextReturn.rmaNumber}`,
        discountType: 'flat',
        value: Math.max(1, creditVal),
        minOrderValue: 0,
        prepaidOnly: false,
        usageLimit: 1,
        usedCount: 0,
        expiresAt: '2027-12-31',
        active: true,
      };
      auditParts.push(`Issued +10% store credit coupon ${codeCandidate} (₹${creditVal})`);
    }

    nextReturn = {
      ...nextReturn,
      refundAmount: refundVal,
      refundMode,
      issuedCouponCode,
    };

    nextOrders = nextOrders.map((order) => {
      if (order.orderNumber !== nextReturn.orderNumber) return order;
      const prevRefunded = order.refundedAmount ?? 0;
      const totalRefunded = Math.max(prevRefunded, refundVal);
      const refundStatus =
        totalRefunded >= order.total ? ('Refunded' as const) : ('Partially Refunded' as const);
      return {
        ...order,
        refundedAmount: totalRefunded,
        refundStatus,
      };
    });

    auditParts.push(`Refunded ₹${refundVal} via ${refundMode}`);
  }

  return {
    updatedReturn: nextReturn,
    updatedProducts: nextProducts,
    updatedOrders: nextOrders,
    updatedSpools: nextSpools,
    newPrintJob,
    newCoupon,
    inventoryAdjustments,
    auditSummary: auditParts.join(' · '),
  };
}

export interface ReturnKpiSummary {
  pendingCount: number;
  activePickupsCount: number;
  totalRefundedValue: number;
  savedRevenueCount: number;
  resolvedOrActiveCount: number;
  savedRevenueRatioPercent: number;
}

export function calculateReturnKpis(returns: ReturnRequestRecord[]): ReturnKpiSummary {
  const pendingCount = returns.filter((r) => r.status === 'Return Requested').length;
  const activePickupsCount = returns.filter(
    (r) =>
      r.status === 'Approved — Reverse Pickup Scheduled' ||
      r.status === 'Item Received at Banka Hub (Pending QC)'
  ).length;

  const totalRefundedValue = returns
    .filter((r) => r.status === 'Refund Completed')
    .reduce(
      (sum, r) => sum + Math.max(0, r.refundAmount ?? computeReturnItemsValue(r.items)),
      0
    );

  const nonRejected = returns.filter((r) => r.status !== 'Rejected');
  const savedRevenueCount = nonRejected.filter(
    (r) =>
      r.resolutionType === 'Free Instant Replacement' ||
      r.resolutionType === 'Instant Store Credit Coupon (+10% Bonus Value)'
  ).length;

  const savedRevenueRatioPercent =
    nonRejected.length > 0 ? Math.round((savedRevenueCount / nonRejected.length) * 100) : 0;

  return {
    pendingCount,
    activePickupsCount,
    totalRefundedValue,
    savedRevenueCount,
    resolvedOrActiveCount: nonRejected.length,
    savedRevenueRatioPercent,
  };
}

export type RmaWhatsAppTemplateKind =
  | 'approved_pickup'
  | 'replacement_shipped'
  | 'refund_processed'
  | 'declined';

export function buildRmaWhatsAppTemplate(
  rma: ReturnRequestRecord,
  kind: RmaWhatsAppTemplateKind
): { label: string; message: string; url: string } {
  const phone10 = normalizeIndianPhone10(rma.customerPhone) || '9800004004';
  const waPhone = `91${phone10.slice(-10)}`;
  const firstName = rma.customerName.trim().split(/\s+/)[0] || 'there';
  const revCourier = rma.reverseCourier || 'Delhivery Reverse';
  const revAwb = rma.reverseAwb || 'Pickup ID generating shortly';
  const repAwb = rma.replacementAwb || 'Dispatching today from Banka Studio';
  const refundAmt = rma.refundAmount ?? computeReturnItemsValue(rma.items);
  const utr = rma.refundUtr || 'Settled';
  const declineReason = rma.rejectionReason || 'Outside our 7-day verification policy';

  let label = '';
  let message = '';

  switch (kind) {
    case 'approved_pickup':
      label = '1. Return Approved & Reverse Pickup';
      message = `Namaste ${firstName}! Your return request ${rma.rmaNumber} for Order ${rma.orderNumber} is APPROVED. Reverse pickup booked via ${revCourier} (AWB: ${revAwb}). Please keep the puzzle packed safely. — BEE4 Studio (bee4.in)`;
      break;
    case 'replacement_shipped':
      label = '2. Replacement Shipped + Tracking';
      message = `Hi ${firstName}! Great news — your FREE replacement for ${rma.rmaNumber} (Order ${rma.orderNumber}) has been freshly 3D-printed at our Banka lab & dispatched! Replacement Tracking / AWB: ${repAwb}. — BEE4 Studio`;
      break;
    case 'refund_processed':
      label = '3. Refund Processed (₹ + UTR)';
      message = `Namaste ${firstName}! Your refund of ₹${refundAmt} for Return ${rma.rmaNumber} (Order ${rma.orderNumber}) has been processed via ${rma.refundMode || 'UPI Transfer'}. Ref/UTR: ${utr}.${rma.issuedCouponCode ? ` Store Credit Code (+10% Bonus): ${rma.issuedCouponCode}` : ''} — BEE4 Studio`;
      break;
    case 'declined':
      label = '4. Return Declined politely';
      message = `Hi ${firstName}, regarding your return request ${rma.rmaNumber} for Order ${rma.orderNumber}: unfortunately we couldn't approve this request because: ${declineReason}. Reply here if you'd like us to re-check or send a spare puzzle part! — BEE4 Care`;
      break;
  }

  return {
    label,
    message,
    url: `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`,
  };
}

export function getOrderRmaStatusBadge(
  orderNumber: string,
  returns: ReturnRequestRecord[]
): { rma: ReturnRequestRecord; shortLabel: string; toneClass: string } | null {
  const rma = returns.find((r) => r.orderNumber === orderNumber);
  if (!rma) return null;

  switch (rma.status) {
    case 'Return Requested':
      return {
        rma,
        shortLabel: 'Return Requested',
        toneClass: 'bg-amber-500/18 text-amber-800 dark:text-amber-300 border border-amber-500/30',
      };
    case 'Approved — Reverse Pickup Scheduled':
    case 'Item Received at Banka Hub (Pending QC)':
      return {
        rma,
        shortLabel: 'Return Approved',
        toneClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25',
      };
    case 'QC Passed — Restocked to Inventory':
    case 'QC Failed — Damaged / Scrap PLA (Do Not Restock)':
      return {
        rma,
        shortLabel: rma.status.startsWith('QC Passed') ? 'QC Passed' : 'QC Scrap PLA',
        toneClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25',
      };
    case 'Replacement Dispatched':
      return {
        rma,
        shortLabel: 'Replaced',
        toneClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25',
      };
    case 'Refund Completed':
      return {
        rma,
        shortLabel: 'Refunded',
        toneClass: 'bg-emerald-500/18 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30',
      };
    case 'Rejected':
      return {
        rma,
        shortLabel: 'Return Rejected',
        toneClass: 'bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/25',
      };
  }
}
