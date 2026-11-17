import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOrderCancellation,
  canCustomerCancelOrder,
  createDigitalGiftCard,
  deductWalletOnOrder,
  generateGiftCardCode,
  generateGiftCardPin,
  redeemGiftCardIntoProfile,
  validateGiftCardPurchaseInput,
} from './giftCardWalletLogic.ts';
import {
  calculateCartTotals,
  isCodPaymentMethod,
  resolveCanonicalOrderPayment,
} from './storeLogic.ts';
import {
  buildAdminWhatsAppTemplate,
  buildShippingLabelHtml,
} from './adminLogic.ts';
import { generateBulkThermalLabelsHtml } from './omnichannelLogic.ts';
import type { CustomerProfile, OrderRecord, Product } from '../types.ts';

function makeProduct(id: string, stockQuantity: number): Product {
  return {
    id,
    title: `BEE4 Toy ${id}`,
    category: 'Engineering' as Product['category'],
    ageGroup: '6–8 Years' as Product['ageGroup'],
    originConcept: 'India 3D Studio',
    occasion: 'Birthday' as Product['occasion'],
    price: 499,
    image: '/assets/images/toy.jpg',
    gallery: [
      { id: 'front', label: 'Front', shortLabel: 'Front', url: '/assets/images/toy.jpg' },
      { id: 'mechanism', label: 'Mech', shortLabel: 'Mech', url: '/assets/images/toy.jpg' },
      { id: 'scale', label: 'Scale', shortLabel: 'Scale', url: '/assets/images/toy.jpg' },
    ],
    variants: ['Standard'],
    shortSpec: 'Eco-PLA',
    description: 'Precision brain toy',
    useCaseHi: 'Screen-free focus',
    brainBenefitsHi: 'Spatial logic',
    whyParentsBuyHi: 'Safe Eco-PLA',
    materials: 'Bio-PLA',
    dimensions: '10x10cm',
    inStock: stockQuantity > 0,
    stockQuantity,
  };
}

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    orderNumber: 'BEE4-8821',
    userId: 'user-1',
    createdAt: '2026-11-17T10:00:00.000Z',
    items: [
      {
        productId: 'prod-1',
        title: 'Gear Logic Cube',
        price: 499,
        image: '/assets/images/toy.jpg',
        variant: 'Saffron',
        quantity: 2,
        category: 'Engineering',
      },
    ],
    subtotal: 998,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    total: 998,
    paymentMethod: 'COD',
    paymentStatus: 'Pending (Collect on Delivery)',
    orderChannel: 'COD',
    customer: {
      fullName: 'Aarav Sharma',
      phone: '9876543210',
      email: 'aarav@example.com',
      address: '12 MG Road',
      city: 'Patna',
      state: 'Bihar',
      pinCode: '800001',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Pending',
    fulfillmentStage: 'New / Unverified',
    ...overrides,
  };
}

function makeCustomer(overrides: Partial<CustomerProfile> = {}): CustomerProfile {
  return {
    id: 'user-1',
    fullName: 'Aarav Sharma',
    phone: '9876543210',
    email: 'aarav@example.com',
    preferredPayment: 'UPI / Prepaid',
    walletBalance: 0,
    walletTransactions: [],
    customDesigns: [],
    createdAt: '2026-11-10T09:00:00.000Z',
    addresses: [],
    wishlistIds: [],
    ...overrides,
  };
}

test('COD vs UPI / Wallet canonicalization and shipping labels prevent payment mismatches', () => {
  assert.equal(isCodPaymentMethod('cod'), true);
  assert.equal(isCodPaymentMethod('COD'), true);
  assert.equal(isCodPaymentMethod('Cash on Delivery'), true);
  assert.equal(isCodPaymentMethod('UPI / Prepaid'), false);
  assert.equal(isCodPaymentMethod('BEE4 Wallet'), false);

  const codResolved = resolveCanonicalOrderPayment({
    selectedMethod: 'cod',
    walletAmountUsed: 200,
    totalAmount: 998,
  });
  assert.equal(codResolved.paymentMethod, 'COD');
  assert.equal(codResolved.paymentStatus, 'Pending (Collect on Delivery)');
  assert.equal(codResolved.orderChannel, 'COD');

  const fullWalletResolved = resolveCanonicalOrderPayment({
    selectedMethod: 'cod',
    walletAmountUsed: 998,
    totalAmount: 998,
  });
  assert.equal(fullWalletResolved.paymentMethod, 'BEE4 Wallet');
  assert.equal(fullWalletResolved.paymentStatus, 'Paid');
  assert.equal(fullWalletResolved.orderChannel, 'UPI / Prepaid');

  const codOrder = makeOrder({ paymentMethod: 'COD', total: 998, walletAmountUsed: 200 });
  const a5CodLabel = buildShippingLabelHtml(codOrder);
  assert.ok(a5CodLabel.includes('COD — COLLECT ₹798'));

  const upiOrder = makeOrder({ paymentMethod: 'UPI / Prepaid', paymentStatus: 'Paid' });
  const a5UpiLabel = buildShippingLabelHtml(upiOrder);
  assert.ok(a5UpiLabel.includes('PREPAID — DO NOT COLLECT'));

  const bulkHtml = generateBulkThermalLabelsHtml([codOrder, upiOrder], '4x6');
  assert.ok(bulkHtml.includes('COD — COLLECT ₹798'));
  assert.ok(bulkHtml.includes('PREPAID — DO NOT COLLECT'));
});

test('Customer order cancellation records reason, transitions stage, and restores product stock', () => {
  assert.equal(canCustomerCancelOrder('Pending'), true);
  assert.equal(canCustomerCancelOrder('Confirmed'), true);
  assert.equal(canCustomerCancelOrder('Preparing Shipment'), true);
  assert.equal(canCustomerCancelOrder('Shipped'), false);
  assert.equal(canCustomerCancelOrder('Delivered'), false);
  assert.equal(canCustomerCancelOrder('Cancelled'), false);

  const outOfStockProd = makeProduct('prod-1', 0);
  const result = applyOrderCancellation({
    order: makeOrder({ paymentMethod: 'COD' }),
    products: [outOfStockProd],
    reason: 'Ordered by mistake',
    cancelledBy: 'Customer',
    autoRestock: true,
    nowIso: '2026-11-17T11:30:00.000Z',
  });

  assert.equal(result.updatedOrder.status, 'Cancelled');
  assert.equal(result.updatedOrder.fulfillmentStage, 'Cancelled');
  assert.equal(result.updatedOrder.operationalBucket, 'Cancelled / RTO');
  assert.equal(result.updatedOrder.cancelledBy, 'Customer');
  assert.equal(result.updatedOrder.cancellationReason, 'Ordered by mistake');
  assert.equal(result.updatedOrder.cancelledAt, '2026-11-17T11:30:00.000Z');
  assert.equal(result.updatedProducts[0].stockQuantity, 2);
  assert.equal(result.updatedProducts[0].inStock, true);
  assert.equal(result.restoredLogs[0].adjustmentType, 'cancel_restock');
  assert.equal(result.restoredLogs[0].delta, 2);
});

test('Admin cancellation supports store-credit refund issuance and WhatsApp notification template', () => {
  const prepaidOrder = makeOrder({
    orderNumber: 'BEE4-9901',
    paymentMethod: 'UPI / Prepaid',
    paymentStatus: 'Paid',
    total: 1200,
    status: 'Confirmed',
  });

  const result = applyOrderCancellation({
    order: prepaidOrder,
    products: [makeProduct('prod-1', 5)],
    reason: 'Out of Stock / Filament Delay',
    cancelledBy: 'Admin',
    autoRestock: true,
    issueRefundCredit: true,
    nowIso: '2026-11-17T12:00:00.000Z',
  });

  assert.equal(result.updatedOrder.cancelledBy, 'Admin');
  assert.equal(result.updatedOrder.refundStatus, 'Refunded');
  assert.equal(result.updatedOrder.refundedAmount, 1200);
  assert.equal(result.updatedOrder.paymentStatus, 'Refunded');
  assert.equal(result.refundAmountToCredit, 1200);
  assert.ok(result.issuedGiftCard);
  assert.equal(result.issuedGiftCard?.initialAmount, 1200);
  assert.equal(result.updatedProducts[0].stockQuantity, 7);

  const waTemplate = buildAdminWhatsAppTemplate(result.updatedOrder, 'cancelled');
  assert.ok(waTemplate.message.includes('BEE4-9901'));
  assert.ok(waTemplate.message.includes('Out of Stock / Filament Delay'));
  assert.ok(waTemplate.message.includes('₹1200'));
});

test('Gift Card creation, validation, PIN check, Wallet redemption, and Checkout deduction work end-to-end', () => {
  assert.match(generateGiftCardCode(), /^BEE4-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.match(generateGiftCardPin(), /^\d{4}$/);

  const badInput = validateGiftCardPurchaseInput({
    amount: 50,
    recipientName: 'Riya',
    recipientEmail: 'not-an-email',
  });
  assert.equal(badInput.valid, false);

  const card = createDigitalGiftCard({
    amount: 1000,
    purchaserUserId: 'user-2',
    purchaserName: 'Neha Verma',
    purchaserEmail: 'neha@example.com',
    recipientName: 'Aarav Sharma',
    recipientEmail: 'aarav@example.com',
    message: 'Happy Birthday!',
  });

  const customer = makeCustomer({ walletBalance: 250 });

  const wrongPin = redeemGiftCardIntoProfile({
    code: card.code,
    pin: '0000' === card.pin ? '9999' : '0000',
    giftCards: [card],
    profile: customer,
  });
  assert.equal(wrongPin.ok, false);

  const okRedeem = redeemGiftCardIntoProfile({
    code: card.code.toLowerCase(),
    pin: card.pin,
    giftCards: [card],
    profile: customer,
    nowIso: '2026-11-17T13:00:00.000Z',
  });
  assert.equal(okRedeem.ok, true);
  if (!okRedeem.ok) return;

  assert.equal(okRedeem.creditedAmount, 1000);
  assert.equal(okRedeem.updatedProfile.walletBalance, 1250);
  assert.equal(okRedeem.redeemedCard.balance, 0);

  // Double redemption blocked
  const duplicate = redeemGiftCardIntoProfile({
    code: card.code,
    pin: card.pin,
    giftCards: okRedeem.updatedGiftCards,
    profile: okRedeem.updatedProfile,
  });
  assert.equal(duplicate.ok, false);

  // Partial Wallet + COD checkout calculation
  const totalsPartial = calculateCartTotals(
    [
      {
        productId: 'prod-1',
        title: 'Gear Toy',
        price: 1500,
        image: '',
        variant: 'Blue',
        quantity: 1,
        category: 'Engineering',
      },
    ],
    {
      paymentMethod: 'COD',
      codHandlingFee: 40,
      walletBalanceAvailable: 1250,
      useWalletBalance: true,
    }
  );
  assert.equal(totalsPartial.total, 1540);
  assert.equal(totalsPartial.walletAmountApplied, 1250);
  assert.equal(totalsPartial.remainingPayable, 290);

  // Full Wallet checkout covers base without COD fee
  const totalsFull = calculateCartTotals(
    [
      {
        productId: 'prod-1',
        title: 'Gear Toy',
        price: 600,
        image: '',
        variant: 'Blue',
        quantity: 1,
        category: 'Engineering',
      },
    ],
    {
      paymentMethod: 'COD',
      codHandlingFee: 40,
      walletBalanceAvailable: 1250,
      useWalletBalance: true,
    }
  );
  assert.equal(totalsFull.codFee, 0);
  assert.equal(totalsFull.walletAmountApplied, 600);
  assert.equal(totalsFull.remainingPayable, 0);

  const afterOrder = deductWalletOnOrder({
    profile: okRedeem.updatedProfile,
    walletAmountUsed: 600,
    orderNumber: 'BEE4-7777',
  });
  assert.equal(afterOrder.walletBalance, 650);
  assert.equal(afterOrder.walletTransactions?.[0]?.type, 'debit_order');
  assert.equal(afterOrder.walletTransactions?.[0]?.amount, 600);
});
