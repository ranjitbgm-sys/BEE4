import {
  CancelledByRole,
  CustomerProfile,
  GiftCardRecord,
  InventoryAdjustmentRecord,
  OrderRecord,
  Product,
  WalletTransactionRecord,
} from '../types';
import { isCodPaymentMethod } from './storeLogic';

export const CUSTOMER_CANCELLATION_REASONS = [
  'Ordered by mistake',
  'Need to change delivery address / phone',
  'Want to change custom photo / engraving text',
  'Found a better price / Delivery taking too long',
  'Other',
] as const;

export const ADMIN_CANCELLATION_REASONS = [
  'Unreachable / Fake COD Number',
  'Customer Requested on WhatsApp',
  'Out of Stock / Filament Delay',
  'Duplicate Order',
  'Other',
] as const;

export function canCustomerCancelOrder(status: OrderRecord['status']): boolean {
  return (
    status === 'Pending' ||
    status === 'Confirmed' ||
    status === 'Preparing Shipment'
  );
}

export function canAdminCancelOrder(status: OrderRecord['status']): boolean {
  return status !== 'Delivered' && status !== 'Cancelled';
}

export function generateGiftCardCode(randomBytesSource?: () => number): string {
  const rng = randomBytesSource ?? (() => Math.floor(Math.random() * 32));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const group = () =>
    Array.from({ length: 4 }, () => alphabet[Math.abs(rng()) % alphabet.length]).join('');
  return `BEE4-${group()}-${group()}-${group()}`;
}

export function generateGiftCardPin(randomDigitSource?: () => number): string {
  const rng = randomDigitSource ?? (() => Math.floor(Math.random() * 10));
  return Array.from({ length: 4 }, () => String(Math.abs(rng()) % 10)).join('');
}

export function normalizeGiftCardCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/\s+/g, '');
}

export function validateGiftCardPurchaseInput(input: {
  amount: number;
  recipientName: string;
  recipientEmail: string;
}): { valid: boolean; error?: string } {
  if (!Number.isFinite(input.amount) || input.amount < 100 || input.amount > 50000) {
    return { valid: false, error: 'Gift card amount must be between ₹100 and ₹50,000.' };
  }
  if (input.recipientName.trim().length < 2) {
    return { valid: false, error: 'Please enter the recipient name.' };
  }
  const email = input.recipientEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Please enter a valid recipient email address.' };
  }
  return { valid: true };
}

export function createDigitalGiftCard(input: {
  amount: number;
  purchaserUserId?: string | null;
  purchaserName: string;
  purchaserEmail: string;
  purchaserPhone?: string;
  recipientName: string;
  recipientEmail: string;
  message?: string;
  issuedReason?: GiftCardRecord['issuedReason'];
  nowIso?: string;
}): GiftCardRecord {
  const now = input.nowIso ?? new Date().toISOString();
  const expiresDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const safeAmount = Math.max(1, Math.round(Number(input.amount) || 0));

  return {
    id: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: generateGiftCardCode(),
    pin: generateGiftCardPin(),
    initialAmount: safeAmount,
    balance: safeAmount,
    purchaserUserId: input.purchaserUserId ?? null,
    purchaserName: input.purchaserName.trim() || 'BEE4 Customer',
    purchaserEmail: input.purchaserEmail.trim().toLowerCase(),
    purchaserPhone: input.purchaserPhone?.trim() || '',
    recipientName: input.recipientName.trim(),
    recipientEmail: input.recipientEmail.trim().toLowerCase(),
    message: input.message?.trim() || '',
    active: true,
    issuedReason: input.issuedReason ?? 'Purchased',
    createdAt: now,
    expiresAt: expiresDate,
  };
}

export function redeemGiftCardIntoProfile(input: {
  code: string;
  pin: string;
  giftCards: GiftCardRecord[];
  profile: CustomerProfile;
  nowIso?: string;
}):
  | {
      ok: true;
      creditedAmount: number;
      redeemedCard: GiftCardRecord;
      updatedGiftCards: GiftCardRecord[];
      updatedProfile: CustomerProfile;
      transaction: WalletTransactionRecord;
    }
  | { ok: false; error: string } {
  const normalizedCode = normalizeGiftCardCode(input.code);
  const cleanPin = input.pin.trim();

  if (!normalizedCode || normalizedCode.length < 8) {
    return { ok: false, error: 'Please enter a valid 16-character BEE4 Gift Card code.' };
  }
  if (!/^\d{4}$/.test(cleanPin)) {
    return { ok: false, error: 'Please enter the 4-digit Gift Card PIN.' };
  }

  const target = input.giftCards.find(
    (card) => normalizeGiftCardCode(card.code) === normalizedCode
  );
  if (!target) {
    return { ok: false, error: 'Gift card code not found. Please verify and try again.' };
  }
  if (!target.active) {
    return { ok: false, error: 'This gift card is currently disabled.' };
  }
  if (target.pin !== cleanPin) {
    return { ok: false, error: 'Incorrect 4-digit Gift Card PIN.' };
  }
  if (target.balance <= 0 || target.redeemedAt) {
    return { ok: false, error: 'This gift card has already been redeemed.' };
  }
  if (target.expiresAt && new Date(target.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: 'This gift card has expired.' };
  }

  const now = input.nowIso ?? new Date().toISOString();
  const creditedAmount = Math.round(target.balance);
  const prevBalance = Math.max(0, Math.round(Number(input.profile.walletBalance ?? 0)));
  const balanceAfter = prevBalance + creditedAmount;

  const redeemedCard: GiftCardRecord = {
    ...target,
    balance: 0,
    redeemedByUserId: input.profile.id,
    redeemedAt: now,
  };

  const transaction: WalletTransactionRecord = {
    id: `wtx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'credit_gift_card',
    amount: creditedAmount,
    balanceAfter,
    referenceId: target.code,
    note: `Redeemed Gift Card ${target.code} (from ${target.purchaserName})`,
    createdAt: now,
  };

  const updatedGiftCards = input.giftCards.map((c) =>
    c.id === target.id ? redeemedCard : c
  );

  const updatedProfile: CustomerProfile = {
    ...input.profile,
    walletBalance: balanceAfter,
    walletTransactions: [transaction, ...(input.profile.walletTransactions ?? [])],
  };

  return {
    ok: true,
    creditedAmount,
    redeemedCard,
    updatedGiftCards,
    updatedProfile,
    transaction,
  };
}

export function deductWalletOnOrder(input: {
  profile: CustomerProfile;
  walletAmountUsed: number;
  orderNumber: string;
  nowIso?: string;
}): CustomerProfile {
  const used = Math.max(0, Math.round(Number(input.walletAmountUsed) || 0));
  if (used <= 0) return input.profile;

  const now = input.nowIso ?? new Date().toISOString();
  const currentBalance = Math.max(0, Math.round(Number(input.profile.walletBalance ?? 0)));
  const actualDeducted = Math.min(currentBalance, used);
  const balanceAfter = Math.max(0, currentBalance - actualDeducted);

  const tx: WalletTransactionRecord = {
    id: `wtx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'debit_order',
    amount: actualDeducted,
    balanceAfter,
    referenceId: input.orderNumber,
    note: `Used toward order ${input.orderNumber}`,
    createdAt: now,
  };

  return {
    ...input.profile,
    walletBalance: balanceAfter,
    walletTransactions: [tx, ...(input.profile.walletTransactions ?? [])],
  };
}

export function restoreStockForCancelledOrderItems(
  products: Product[],
  items: OrderRecord['items'],
  orderNumber: string,
  cancelledBy: CancelledByRole,
  nowIso?: string
): {
  updatedProducts: Product[];
  restoredLogs: InventoryAdjustmentRecord[];
} {
  const now = nowIso ?? new Date().toISOString();
  const qtyByProductId = new Map<string, number>();

  for (const item of items) {
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
    qtyByProductId.set(item.productId, (qtyByProductId.get(item.productId) ?? 0) + qty);
  }

  const restoredLogs: InventoryAdjustmentRecord[] = [];
  const updatedProducts = products.map((product) => {
    const restoreQty = qtyByProductId.get(product.id);
    if (!restoreQty) return product;

    const currentStock = Math.max(0, Number(product.stockQuantity ?? (product.inStock ? 25 : 0)));
    const nextStock = currentStock + restoreQty;

    restoredLogs.push({
      id: `inv-cancel-${Date.now()}-${product.id}`,
      timestamp: now,
      productId: product.id,
      productTitle: product.title,
      sku: product.sku,
      delta: restoreQty,
      adjustmentType: 'cancel_restock',
      referenceId: orderNumber,
      note: `Auto-restocked +${restoreQty} unit(s) after ${cancelledBy} cancellation (${orderNumber})`,
    });

    return {
      ...product,
      stockQuantity: nextStock,
      inStock: nextStock > 0,
    };
  });

  return { updatedProducts, restoredLogs };
}

export function applyOrderCancellation(input: {
  order: OrderRecord;
  products: Product[];
  reason: string;
  cancelledBy: CancelledByRole;
  autoRestock?: boolean;
  issueRefundCredit?: boolean;
  nowIso?: string;
}): {
  updatedOrder: OrderRecord;
  updatedProducts: Product[];
  restoredLogs: InventoryAdjustmentRecord[];
  refundAmountToCredit: number;
  issuedGiftCard?: GiftCardRecord;
} {
  const now = input.nowIso ?? new Date().toISOString();
  const cleanReason = input.reason.trim() || 'Cancelled upon request';
  const shouldRestock = input.autoRestock ?? true;

  const { updatedProducts, restoredLogs } = shouldRestock
    ? restoreStockForCancelledOrderItems(
        input.products,
        input.order.items,
        input.order.orderNumber,
        input.cancelledBy,
        now
      )
    : { updatedProducts: input.products, restoredLogs: [] };

  const walletUsed = Math.max(0, Math.round(Number(input.order.walletAmountUsed ?? 0)));
  const isCod = isCodPaymentMethod(input.order.paymentMethod);
  const prepaidPaidAmount = isCod ? walletUsed : Math.max(0, Math.round(Number(input.order.total ?? 0)));
  const refundAmountToCredit = input.issueRefundCredit ? prepaidPaidAmount : 0;

  let issuedGiftCard: GiftCardRecord | undefined;
  if (input.issueRefundCredit && refundAmountToCredit > 0) {
    issuedGiftCard = createDigitalGiftCard({
      amount: refundAmountToCredit,
      purchaserUserId: input.order.userId ?? null,
      purchaserName: 'BEE4 Studio Refund Desk',
      purchaserEmail: 'hello@bee4.in',
      recipientName: input.order.customer.fullName,
      recipientEmail: input.order.customer.email || 'hello@bee4.in',
      message: `Instant Store Credit for cancelled order ${input.order.orderNumber}`,
      issuedReason: 'Cancellation Credit',
      nowIso: now,
    });
  }

  const nextPaymentStatus: OrderRecord['paymentStatus'] =
    refundAmountToCredit > 0
      ? 'Refunded'
      : input.order.paymentStatus ?? (isCod ? 'Pending (Collect on Delivery)' : 'Paid');

  const updatedOrder: OrderRecord = {
    ...input.order,
    status: 'Cancelled',
    fulfillmentStage: 'Cancelled',
    operationalBucket: 'Cancelled / RTO',
    cancellationReason: cleanReason,
    cancelledBy: input.cancelledBy,
    cancelledAt: now,
    paymentStatus: nextPaymentStatus,
    refundStatus: refundAmountToCredit > 0 ? 'Refunded' : input.order.refundStatus,
    refundedAmount:
      refundAmountToCredit > 0 ? refundAmountToCredit : input.order.refundedAmount,
    internalNotes: [
      input.order.internalNotes,
      `[${input.cancelledBy} Cancelled: ${cleanReason}]`,
    ]
      .filter(Boolean)
      .join(' ')
      .trim(),
  };

  return {
    updatedOrder,
    updatedProducts,
    restoredLogs,
    refundAmountToCredit,
    issuedGiftCard,
  };
}
