import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminWhatsAppTemplate,
  buildCustomerCrmList,
  buildExecutiveDashboardSummary,
  buildGstTaxInvoiceHtml,
  buildShippingLabelHtml,
  calculateGstBreakdown,
  calculateProductMargin,
  estimateSpoolRemainingUnits,
  exportCustomersToCsv,
  sanitizeRichInput,
  validateAndApplyCoupon,
} from './adminLogic';
import {
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_FILAMENT_SPOOLS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  hydrateProductAdminFields,
} from '../data/catalog';

test('XSS sanitization strips script tags, inline handlers, and javascript URIs', () => {
  const dirty = '<script>alert(1)</script><img src=x onerror="evil()">Hello <b>BEE4</b>';
  const clean = sanitizeRichInput(dirty);
  assert.equal(clean.includes('<script>'), false);
  assert.equal(clean.includes('onerror='), false);
  assert.equal(clean.includes('Hello BEE4'), true);
});

test('GST calculator splits CGST + SGST for Bihar (intra-state) and IGST for Maharashtra (inter-state)', () => {
  const biharTax = calculateGstBreakdown({
    grossInclusiveAmount: 1120,
    destinationState: 'Bihar',
    hsnCode: '3926',
  });
  assert.equal(biharTax.isIntraState, true);
  assert.equal(biharTax.gstRatePercent, 12);
  assert.equal(biharTax.taxableValue, 1000);
  assert.equal(biharTax.cgst, 60);
  assert.equal(biharTax.sgst, 60);
  assert.equal(biharTax.igst, 0);

  const mahaTax = calculateGstBreakdown({
    grossInclusiveAmount: 1120,
    destinationState: 'Maharashtra',
    hsnCode: '7323',
  });
  assert.equal(mahaTax.isIntraState, false);
  assert.equal(mahaTax.cgst, 0);
  assert.equal(mahaTax.sgst, 0);
  assert.equal(mahaTax.igst, 120);
});

test('Coupon validation enforces percentage, prepaid-only, min order value, and expiry', () => {
  const resValid = validateAndApplyCoupon({
    code: 'smartkid15',
    subtotal: 1000,
    paymentMethod: 'upi',
    coupons: INITIAL_COUPONS,
    nowIso: '2026-11-16T00:00:00Z',
  });
  assert.equal(resValid.valid, true);
  assert.equal(resValid.discount, 150);

  const resPrepaidBlockedOnCod = validateAndApplyCoupon({
    code: 'PREPAID50',
    subtotal: 800,
    paymentMethod: 'cod',
    coupons: INITIAL_COUPONS,
    nowIso: '2026-11-16T00:00:00Z',
  });
  assert.equal(resPrepaidBlockedOnCod.valid, false);
  assert.match(resPrepaidBlockedOnCod.reason ?? '', /Prepaid/i);

  const resMovBlocked = validateAndApplyCoupon({
    code: 'PREPAID50',
    subtotal: 400,
    paymentMethod: 'upi',
    coupons: INITIAL_COUPONS,
    nowIso: '2026-11-16T00:00:00Z',
  });
  assert.equal(resMovBlocked.valid, false);
  assert.match(resMovBlocked.reason ?? '', /Minimum order/i);
});

test('Product margin calculator computes discount %, net profit ₹, and margin %', () => {
  const m = calculateProductMargin({
    price: 699,
    compareAtPrice: 1299,
    manufacturingCost: 238,
  });
  assert.equal(m.discountPercent, 46);
  assert.equal(m.netProfit, 461);
  assert.equal(m.marginPercent, 66);
});

test('Executive dashboard KPIs aggregate revenue, prepaid split, dispatch queue, and low stock items', () => {
  const hydratedProducts = INITIAL_PRODUCTS.map((p, idx) => hydrateProductAdminFields(p, idx));
  const summary = buildExecutiveDashboardSummary({
    orders: INITIAL_ORDERS,
    products: hydratedProducts,
    period: 'all',
  });

  assert.equal(summary.totalOrders, 4);
  assert.equal(summary.grossRevenue, 1067 + 948 + 1017 + 498);
  assert.equal(summary.prepaidCount, 3);
  assert.equal(summary.codCount, 1);
  assert.equal(summary.prepaidSharePercent, 75);
  assert.equal(summary.immediateDispatchOrders.length, 2);
  assert.equal(summary.lowStockProducts.length >= 3, true);
});

test('Filament spool estimator computes printable toys remaining accurately', () => {
  const units = estimateSpoolRemainingUnits(INITIAL_FILAMENT_SPOOLS[0]);
  assert.equal(units, Math.floor(1850 / 115));
});

test('WhatsApp templates, printable GST invoice, and A5 label generate valid outputs', () => {
  const biharOrder = INITIAL_ORDERS[0];
  const wa = buildAdminWhatsAppTemplate(biharOrder, 'dispatch');
  assert.equal(wa.url.startsWith('https://wa.me/919431223344?text='), true);

  const invoiceHtml = buildGstTaxInvoiceHtml(biharOrder, INITIAL_PRODUCTS);
  assert.equal(invoiceHtml.includes('INTRA-STATE CGST + SGST'), true);
  assert.equal(invoiceHtml.includes('Banka, Bihar, India 813103'), true);

  const codLabelHtml = buildShippingLabelHtml(INITIAL_ORDERS[2]);
  assert.equal(codLabelHtml.includes('CASH ON DELIVERY'), true);
  assert.equal(codLabelHtml.includes('KEEP BELOW 55°C'), true);
});

test('CRM customer list and CSV export aggregate LTV and escape values properly', () => {
  const crm = buildCustomerCrmList({
    orders: INITIAL_ORDERS,
    customers: INITIAL_CUSTOMERS,
  });
  assert.equal(crm.length >= 3, true);
  const csv = exportCustomersToCsv(crm);
  assert.equal(csv.startsWith('Name,Phone,Email,City,State,Total Orders,LTV (INR)'), true);
  assert.equal(csv.includes('Ananya Verma'), true);
});
