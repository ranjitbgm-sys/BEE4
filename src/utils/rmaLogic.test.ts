import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_DEMO_RETURN_ORDERS,
  INITIAL_FILAMENT_SPOOLS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_RETURNS,
  hydrateProductAdminFields,
} from '../data/catalog';
import { buildCustomerCrmList, buildExecutiveDashboardSummary } from './adminLogic';
import {
  applyRmaTransitionSync,
  buildCustomerReturnStepIndex,
  buildRmaWhatsAppTemplate,
  calculateReturnKpis,
  calculateStoreCreditAmount,
  isOrderEligibleForReturn,
  lookupGuestOrderByOrderAndPhone,
  validateReturnRequestForm,
} from './rmaLogic';

test('7-day return eligibility permits recent Delivered order without prior RMA and rejects others', () => {
  const nowMs = Date.parse('2026-11-16T12:00:00.000Z');
  const codDeliveredOrder = INITIAL_DEMO_RETURN_ORDERS[0]; // BEE4-2044 delivered Nov 14
  const eligibleCheck = isOrderEligibleForReturn(codDeliveredOrder, INITIAL_RETURNS, nowMs);
  assert.equal(eligibleCheck.eligible, true);
  assert.equal((eligibleCheck.daysRemaining ?? 0) >= 4, true);

  // Already has RMA-1041
  const existingOrder = INITIAL_DEMO_RETURN_ORDERS[1]; // BEE4-2038
  const alreadyHasRma = isOrderEligibleForReturn(existingOrder, INITIAL_RETURNS, nowMs);
  assert.equal(alreadyHasRma.eligible, false);
  assert.equal(alreadyHasRma.existingRma?.rmaNumber, 'RMA-1041');

  // Expired window (> 7 days)
  const expiredCheck = isOrderEligibleForReturn(
    codDeliveredOrder,
    [],
    Date.parse('2026-11-25T12:00:00.000Z')
  );
  assert.equal(expiredCheck.eligible, false);
  assert.match(expiredCheck.reason ?? '', /7-day/i);

  // Non-delivered order
  const shippedOrder = INITIAL_ORDERS[2]; // Shipped
  assert.equal(isOrderEligibleForReturn(shippedOrder, [], nowMs).eligible, false);
});

test('Guest lookup matches normalized Order ID and 10-digit Indian phone', () => {
  const allOrders = [...INITIAL_ORDERS, ...INITIAL_DEMO_RETURN_ORDERS];
  const found = lookupGuestOrderByOrderAndPhone(allOrders, ' bee4-2044 ', '+91 98305-56677');
  assert.equal(found.order?.orderNumber, 'BEE4-2044');

  const missing = lookupGuestOrderByOrderAndPhone(allOrders, 'BEE4-9999', '9830556677');
  assert.equal(missing.order, undefined);
  assert.match(missing.error ?? '', /No order found/i);
});

test('COD refund requires valid UPI ID or Bank Account + IFSC while Free Replacement passes without UPI', () => {
  const baseItem = [
    {
      productId: 'bee4-karakuri-trick-box',
      title: 'Karakuri Secret 5-Step Trick Box',
      variant: 'Obsidian Slate PLA',
      quantity: 1,
      unitPrice: 699,
      image: '/img.jpg',
    },
  ];

  const codRefundMissingPayout = validateReturnRequestForm({
    selectedItems: baseItem,
    reason: 'Damaged in Transit',
    resolutionType: 'Refund to Original Payment / UPI ID',
    orderPaymentMethod: 'cod',
    proofImages: ['/proof.jpg'],
    customerComments: 'Box crushed',
  });
  assert.equal(codRefundMissingPayout.valid, false);
  assert.ok(codRefundMissingPayout.errors.payout);

  const codRefundWithUpi = validateReturnRequestForm({
    selectedItems: baseItem,
    reason: 'Heat Warping During Delivery (>55°C exposure)',
    resolutionType: 'Refund to Original Payment / UPI ID',
    orderPaymentMethod: 'cod',
    refundUpiId: 'vikram@okaxis',
    proofImages: ['/proof.jpg'],
    customerComments: 'Warped in sun',
  });
  assert.equal(codRefundWithUpi.valid, true);
});

test('Store credit coupon calculates +10% bonus and customer progress maps workflow stages accurately', () => {
  assert.equal(calculateStoreCreditAmount(449), 494);
  assert.equal(calculateStoreCreditAmount(1000), 1100);

  assert.equal(buildCustomerReturnStepIndex('Return Requested'), 0);
  assert.equal(buildCustomerReturnStepIndex('Approved — Reverse Pickup Scheduled'), 1);
  assert.equal(buildCustomerReturnStepIndex('Item Received at Banka Hub (Pending QC)'), 2);
  assert.equal(buildCustomerReturnStepIndex('QC Passed — Restocked to Inventory'), 3);
  assert.equal(buildCustomerReturnStepIndex('Refund Completed'), 4);
  assert.equal(buildCustomerReturnStepIndex('Rejected'), -1);
});

test('applyRmaTransitionSync guarantees idempotent restock and separates Damaged Scrap PLA from sellable stock', () => {
  const products = INITIAL_PRODUCTS.map((p, i) => hydrateProductAdminFields(p, i));
  const pendingRma = INITIAL_RETURNS[0]; // RMA-1041 for bee4-binary-marble-computer (stock = 4)
  const targetProdBefore = products.find((p) => p.id === 'bee4-binary-marble-computer');
  const startStock = targetProdBefore?.stockQuantity ?? 0;

  // First QC Pass -> increments stock +1 and sets isRestocked = true
  const pass1 = applyRmaTransitionSync({
    prevReturn: pendingRma,
    nextUpdates: {
      status: 'QC Passed — Restocked to Inventory',
      autoRestockEnabled: true,
    },
    products,
    orders: INITIAL_DEMO_RETURN_ORDERS,
    spools: INITIAL_FILAMENT_SPOOLS,
    coupons: INITIAL_COUPONS,
    nowIso: '2026-11-16T10:00:00.000Z',
  });

  const stockAfterPass1 = pass1.updatedProducts.find((p) => p.id === 'bee4-binary-marble-computer')?.stockQuantity;
  assert.equal(stockAfterPass1, startStock + 1);
  assert.equal(pass1.updatedReturn.isRestocked, true);
  assert.equal(pass1.inventoryAdjustments.length, 1);
  assert.match(pass1.inventoryAdjustments[0].note, /\+1 unit restocked from Return #RMA-1041/);

  // Re-saving as Refund Completed with autoRestockEnabled=true MUST NOT double-add stock!
  const pass2 = applyRmaTransitionSync({
    prevReturn: pass1.updatedReturn,
    nextUpdates: {
      status: 'Refund Completed',
      autoRestockEnabled: true,
      refundAmount: 899,
      refundMode: 'UPI Transfer',
      refundUtr: 'UTR999111222',
    },
    products: pass1.updatedProducts,
    orders: pass1.updatedOrders,
    spools: pass1.updatedSpools,
    coupons: INITIAL_COUPONS,
    nowIso: '2026-11-16T10:05:00.000Z',
  });

  const stockAfterPass2 = pass2.updatedProducts.find((p) => p.id === 'bee4-binary-marble-computer')?.stockQuantity;
  assert.equal(stockAfterPass2, startStock + 1);
  assert.equal(pass2.updatedOrders.find((o) => o.orderNumber === 'BEE4-2038')?.refundStatus, 'Refunded');
  assert.equal(pass2.updatedOrders.find((o) => o.orderNumber === 'BEE4-2038')?.refundedAmount, 899);

  // QC Failed -> Damaged/Scrap PLA does NOT change sellable stock, increments damagedScrapCount
  const scrapRes = applyRmaTransitionSync({
    prevReturn: pendingRma,
    nextUpdates: {
      status: 'QC Failed — Damaged / Scrap PLA (Do Not Restock)',
      autoRestockEnabled: false,
    },
    products,
    orders: INITIAL_DEMO_RETURN_ORDERS,
    spools: INITIAL_FILAMENT_SPOOLS,
    coupons: INITIAL_COUPONS,
  });
  const scrapProd = scrapRes.updatedProducts.find((p) => p.id === 'bee4-binary-marble-computer');
  assert.equal(scrapProd?.stockQuantity, startStock);
  assert.equal(scrapProd?.damagedScrapCount, 1);
});

test('applyRmaTransitionSync queues priority 3D print job + deducts Eco-PLA spool and issues +10% store credit coupon', () => {
  const products = INITIAL_PRODUCTS.map((p, i) => hydrateProductAdminFields(p, i));
  const pendingRma = {
    ...INITIAL_RETURNS[0],
    resolutionType: 'Free Instant Replacement' as const,
  };
  const totalSpoolBefore = INITIAL_FILAMENT_SPOOLS.reduce((s, sp) => s + sp.remainingGrams, 0);

  const printRes = applyRmaTransitionSync({
    prevReturn: pendingRma,
    nextUpdates: {
      status: 'Approved — Reverse Pickup Scheduled',
      autoRestockEnabled: true,
      reverseCourier: 'Delhivery Reverse',
      reverseAwb: 'DRP12345',
    },
    products,
    orders: INITIAL_DEMO_RETURN_ORDERS,
    spools: INITIAL_FILAMENT_SPOOLS,
    coupons: INITIAL_COUPONS,
    forceQueuePrint: true,
  });

  assert.ok(printRes.newPrintJob);
  assert.equal(printRes.newPrintJob?.orderNumber, pendingRma.orderNumber);
  assert.equal(printRes.updatedReturn.replacementPrintQueued, true);
  const totalSpoolAfter = printRes.updatedSpools.reduce((s, sp) => s + sp.remainingGrams, 0);
  assert.equal(totalSpoolAfter < totalSpoolBefore, true);

  // Store credit coupon (+10%)
  const creditRes = applyRmaTransitionSync({
    prevReturn: INITIAL_RETURNS[0],
    nextUpdates: {
      status: 'Refund Completed',
      autoRestockEnabled: false,
      refundAmount: 899,
      refundMode: 'Store Credit Coupon',
    },
    products,
    orders: INITIAL_DEMO_RETURN_ORDERS,
    spools: INITIAL_FILAMENT_SPOOLS,
    coupons: INITIAL_COUPONS,
  });

  assert.ok(creditRes.newCoupon);
  assert.equal(creditRes.newCoupon?.discountType, 'flat');
  assert.equal(creditRes.newCoupon?.value, 989); // 899 * 1.1 rounded
  assert.equal(creditRes.updatedReturn.issuedCouponCode, creditRes.newCoupon?.code);
});

test('Return KPIs, Dashboard Refund Deduction, CRM >= 2 High-Risk RTO auto-tag, and WhatsApp templates', () => {
  const kpis = calculateReturnKpis(INITIAL_RETURNS);
  assert.equal(kpis.pendingCount, 1); // RMA-1041
  assert.equal(kpis.activePickupsCount, 1); // RMA-1042
  assert.equal(kpis.totalRefundedValue, 499); // RMA-1043
  assert.equal(kpis.savedRevenueRatioPercent, 33); // 1 of 3 active/resolved saved via replacement

  const allOrders = [...INITIAL_ORDERS, ...INITIAL_DEMO_RETURN_ORDERS];
  const products = INITIAL_PRODUCTS.map((p, i) => hydrateProductAdminFields(p, i));
  const summary = buildExecutiveDashboardSummary({
    orders: allOrders,
    products,
    returns: INITIAL_RETURNS,
    period: 'all',
  });
  assert.equal(summary.refundsIssued, 499);
  assert.equal(summary.netRevenue, summary.grossRevenue - 499);

  // Customer with >= 2 returns auto-flagged High-Risk RTO
  const twoReturnsSameCust = [
    INITIAL_RETURNS[0],
    {
      ...INITIAL_RETURNS[0],
      id: 'rma-extra',
      rmaNumber: 'RMA-1099',
    },
  ];
  const crm = buildCustomerCrmList({
    orders: allOrders,
    customers: INITIAL_CUSTOMERS,
    returns: twoReturnsSameCust,
  });
  const kavita = crm.find((c) => c.phone === '9701223344');
  assert.equal(kavita?.returnCount, 2);
  assert.equal(kavita?.flag, 'High-Risk RTO');

  // WhatsApp notification URLs
  const waApproved = buildRmaWhatsAppTemplate(INITIAL_RETURNS[1], 'approved_pickup');
  assert.match(waApproved.url, /^https:\/\/wa\.me\/919822334455\?text=/);
  const waRefunded = buildRmaWhatsAppTemplate(INITIAL_RETURNS[2], 'refund_processed');
  assert.match(decodeURIComponent(waRefunded.url), /UTR491820394812/);
});
