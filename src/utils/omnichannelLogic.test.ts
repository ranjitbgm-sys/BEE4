import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PRODUCTS } from '../data/catalog.ts';
import type { AutomationRule, OrderRecord, ReturnRequestRecord } from '../types.ts';
import {
  buildAnnualMonthlyMatrix,
  buildGstHsnReport,
  buildSpfClaimDossierCsv,
  buildStateAnalytics,
  calculateChannelAvailableStock,
  calculateReconciliationReport,
  calculateReturnOverdueDays,
  deductMasterInventoryForItems,
  evaluateOrderAutomations,
  generateBulkPicklistCsv,
  generateBulkThermalLabelsHtml,
  getOperationalOrderBucket,
  getOrderSlaStatus,
  importMarketplaceOrdersFromCsv,
  isReturnOverdueUnreceived,
} from './omnichannelLogic.ts';

const baseProduct = {
  ...INITIAL_PRODUCTS[0],
  stockQuantity: 10,
  reserveForWebsite: 3,
  cogsCost: 150,
  marketplaceListings: [
    {
      id: 'lst-fk',
      channel: 'Flipkart' as const,
      remoteSkuOrAsin: 'FK-BEE4-PACK2',
      listingId: 'LSTFK001',
      packMultiplier: 2,
      active: true,
    },
    {
      id: 'lst-amz',
      channel: 'Amazon' as const,
      remoteSkuOrAsin: 'B0BEE4TEST',
      packMultiplier: 1,
      active: true,
    },
  ],
};

test('calculateChannelAvailableStock respects website reserve throttling and combo pack multipliers', () => {
  // Master = 10, reserve = 3 -> bee4.in sees 10, Amazon sees 7, Flipkart Pack of 2 sees floor(7 / 2) = 3
  assert.equal(calculateChannelAvailableStock(baseProduct, 'bee4.in'), 10);
  assert.equal(calculateChannelAvailableStock(baseProduct, 'Amazon'), 7);
  assert.equal(calculateChannelAvailableStock(baseProduct, 'Flipkart'), 3);
});

test('deductMasterInventoryForItems applies combo pack multiplier across marketplace SKUs', () => {
  const { updatedProducts, deductions } = deductMasterInventoryForItems(
    [baseProduct],
    [
      {
        productId: 'FK-BEE4-PACK2',
        title: baseProduct.title,
        price: 898,
        image: baseProduct.image,
        variant: 'Pack of 2',
        quantity: 2,
        category: baseProduct.category,
      },
    ],
    'Flipkart'
  );
  // 2 packs * multiplier 2 = 4 units deducted from master 10 -> 6 remaining
  assert.equal(deductions[0].unitsDeducted, 4);
  assert.equal(updatedProducts[0].stockQuantity, 6);
});

test('evaluateOrderAutomations triggers rules matching payment method and order total', () => {
  const order: OrderRecord = {
    orderNumber: 'BEE4-TEST-101',
    createdAt: '2026-11-10T10:00:00.000Z',
    items: [
      {
        productId: baseProduct.id,
        title: baseProduct.title,
        price: 1100,
        image: baseProduct.image,
        variant: 'Standard',
        quantity: 1,
        category: baseProduct.category,
      },
    ],
    subtotal: 1100,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    total: 1100,
    paymentMethod: 'upi',
    customer: {
      fullName: 'Test Buyer',
      phone: '9800000001',
      email: 'buyer@example.com',
      address: 'Main Road',
      city: 'Banka',
      state: 'Bihar',
      pinCode: '813102',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Confirmed',
  };

  const rules: AutomationRule[] = [
    {
      id: 'r1',
      name: 'Auto Accept UPI',
      enabled: true,
      trigger: 'new_order_placed',
      conditionField: 'payment_method_eq',
      conditionValue: 'upi',
      actionType: 'auto_accept_order',
      actionValue: 'Ready for Process',
      executionCount: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'r2',
      name: 'Assign Delhivery High Value',
      enabled: true,
      trigger: 'new_order_placed',
      conditionField: 'order_total_gte',
      conditionValue: '999',
      actionType: 'assign_courier',
      actionValue: 'Delhivery',
      executionCount: 2,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ];

  const result = evaluateOrderAutomations(order, rules, 'new_order_placed');
  assert.equal(result.updatedOrder.courierPartner, 'Delhivery');
  assert.equal(result.updatedOrder.operationalBucket, 'Ready for Process');
  assert.equal(result.updatedRules[0].executionCount, 1);
  assert.equal(result.updatedRules[1].executionCount, 3);
  assert.equal(result.triggeredLogs.length, 2);
});

test('getOperationalOrderBucket and getOrderSlaStatus compute bucket & SLA breach accurately', () => {
  const createdAt = '2026-11-01T00:00:00.000Z';
  const order: OrderRecord = {
    orderNumber: 'FK-9001',
    sourceChannel: 'Flipkart',
    createdAt,
    items: [],
    subtotal: 499,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    total: 499,
    paymentMethod: 'upi',
    customer: {
      fullName: 'Aarav',
      phone: '9811111111',
      email: '',
      address: 'Street 1',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Confirmed',
    fulfillmentStage: 'New / Unverified',
  };

  assert.equal(getOperationalOrderBucket(order), 'New / Upcoming');
  // 30 hours after creation exceeds Flipkart 24h SLA
  const checkMs = new Date('2026-11-02T06:00:00.000Z').getTime();
  const sla = getOrderSlaStatus(order, checkMs);
  assert.equal(sla.tone, 'breached');
});

test('importMarketplaceOrdersFromCsv parses marketplace orders and fees accurately', () => {
  const csv = [
    'Order ID,SKU,Title,Qty,Total,Buyer Name,Phone,City,State,Pin,Payment,Commission,Shipping Fee,Settlement Payout',
    `FK-ORD-77,${baseProduct.sku},${baseProduct.title},1,699,Riya Verma,9876543210,Patna,Bihar,800001,Prepaid,70,55,574`,
  ].join('\n');

  const res = importMarketplaceOrdersFromCsv(csv, 'Flipkart', [baseProduct]);
  assert.equal(res.errors.length, 0);
  assert.equal(res.importedOrders.length, 1);
  const ord = res.importedOrders[0];
  assert.equal(ord.sourceChannel, 'Flipkart');
  assert.equal(ord.total, 699);
  assert.equal(ord.settlement?.commissionFee, 70);
  assert.equal(ord.settlement?.actualSettlementReceived, 574);
});

test('10/20/30 day overdue unreceived returns and SPF claim dossier work cleanly', () => {
  const nowMs = new Date('2026-11-25T00:00:00.000Z').getTime();
  const rma25DaysOld: ReturnRequestRecord = {
    id: 'rma-1',
    rmaNumber: 'RMA-2501',
    orderNumber: 'FK-ORD-77',
    sourceChannel: 'Flipkart',
    customerName: 'Riya Verma',
    customerPhone: '9876543210',
    customerEmail: '',
    orderPaymentMethod: 'upi',
    orderTotal: 699,
    items: [
      {
        productId: baseProduct.id,
        title: baseProduct.title,
        variant: 'Standard',
        quantity: 1,
        unitPrice: 699,
        image: baseProduct.image,
      },
    ],
    reason: 'Damaged in Transit',
    resolutionType: 'Free Instant Replacement',
    customerComments: 'Box crushed',
    proofImages: [],
    status: 'Approved — Reverse Pickup Scheduled',
    autoRestockEnabled: false,
    isRestocked: false,
    receivedAtHub: false,
    createdAt: '2026-10-31T00:00:00.000Z',
    updatedAt: '2026-10-31T00:00:00.000Z',
  };

  assert.equal(calculateReturnOverdueDays(rma25DaysOld, nowMs), 25);
  assert.equal(isReturnOverdueUnreceived(rma25DaysOld, 10, nowMs), true);
  assert.equal(isReturnOverdueUnreceived(rma25DaysOld, 20, nowMs), true);
  assert.equal(isReturnOverdueUnreceived(rma25DaysOld, 30, nowMs), false);

  const dossier = buildSpfClaimDossierCsv([rma25DaysOld], []);
  assert.ok(dossier.includes('RMA-2501'));
  assert.ok(dossier.includes('Flipkart'));
});

test('calculateReconciliationReport, GST HSN split, state analytics & annual matrix compute accurately', () => {
  const nowMs = new Date('2026-11-25T00:00:00.000Z').getTime();
  const orders: OrderRecord[] = [
    {
      orderNumber: 'ORD-BIHAR',
      sourceChannel: 'bee4.in',
      createdAt: '2026-11-01T10:00:00.000Z',
      items: [
        {
          productId: baseProduct.id,
          title: baseProduct.title,
          price: 560,
          image: baseProduct.image,
          variant: 'Standard',
          quantity: 1,
          category: baseProduct.category,
        },
      ],
      subtotal: 560,
      discount: 0,
      shippingFee: 0,
      giftWrapFee: 0,
      total: 560,
      paymentMethod: 'upi',
      customer: {
        fullName: 'Ananya',
        phone: '9800001111',
        email: '',
        address: 'Banka Road',
        city: 'Patna',
        state: 'Bihar',
        pinCode: '800001',
      },
      giftWrap: false,
      giftMessage: '',
      status: 'Delivered',
      settlement: {
        commissionFee: 0,
        paymentGatewayFee: 11,
        shippingCharged: 50,
        chargedWeightGrams: 600, // weight overcharge vs 180g catalog
        expectedPayout: 499,
        actualSettlementReceived: 0, // > 15 days unpaid!
      },
    },
  ];

  const pnl = calculateReconciliationReport({
    orders,
    products: [baseProduct],
    returns: [],
    adSpends: [{ id: 'ad1', month: '2026-11', channel: 'All Channels', amount: 100, updatedAt: '' }],
    nowMs,
  });

  assert.equal(pnl.grossSales, 560);
  assert.equal(pnl.totalCogs, 150);
  assert.equal(pnl.adSpendTotal, 100);
  assert.equal(pnl.discrepancies.length, 2); // Weight overcharge + >15d unpaid delivered!

  const hsn = buildGstHsnReport(orders, [baseProduct], 'Bihar');
  const hsn3926 = hsn.find((r) => r.hsnCode === '3926')!;
  assert.equal(hsn3926.invoiceTotal, 560);
  // Intra-state Bihar splits into CGST + SGST (both > 0, IGST = 0)
  assert.ok(hsn3926.cgstAmount > 0 && hsn3926.sgstAmount > 0);
  assert.equal(hsn3926.igstAmount, 0);

  const states = buildStateAnalytics(orders, [baseProduct], []);
  assert.equal(states[0].state, 'Bihar');

  const matrix = buildAnnualMonthlyMatrix(orders, [baseProduct], 2026);
  assert.equal(matrix[10].monthLabel, 'Nov'); // index 10 = Nov
  assert.equal(matrix[10].grossRevenue, 560);

  const htmlLabels = generateBulkThermalLabelsHtml(orders, '4x6');
  assert.ok(htmlLabels.includes('ORD-BIHAR'));
  const picklist = generateBulkPicklistCsv(orders, [baseProduct]);
  assert.ok(picklist.includes(baseProduct.title));
});
