import type { CustomerProfile, OrderRecord } from '../types';
import { doesOrderBelongToCustomer } from './storeLogic';

export interface ReviewEligibilityResult {
  eligible: boolean;
  deliveredOrderNumber: string | null;
  deliveredAt: string | null;
  reason: string;
}

export const VERIFIED_DELIVERY_REVIEW_MESSAGE =
  'Only verified buyers who have received this product can submit a rating or review.';

export function canCustomerReviewProduct(
  orders: OrderRecord[],
  customer: CustomerProfile | null | undefined,
  productId: string
): ReviewEligibilityResult {
  if (!customer || !productId) {
    return {
      eligible: false,
      deliveredOrderNumber: null,
      deliveredAt: null,
      reason: VERIFIED_DELIVERY_REVIEW_MESSAGE,
    };
  }

  const normalizedProductId = productId.trim();
  const matchingDeliveredOrder = orders.find((order) => {
    if (order.status !== 'Delivered') return false;
    if (!doesOrderBelongToCustomer(order, customer)) return false;
    return order.items.some((item) => item.productId === normalizedProductId);
  });

  if (!matchingDeliveredOrder) {
    return {
      eligible: false,
      deliveredOrderNumber: null,
      deliveredAt: null,
      reason: VERIFIED_DELIVERY_REVIEW_MESSAGE,
    };
  }

  return {
    eligible: true,
    deliveredOrderNumber: matchingDeliveredOrder.orderNumber,
    deliveredAt: matchingDeliveredOrder.createdAt,
    reason: 'Verified delivered purchase',
  };
}

export function getDeliveredReviewableProductIds(
  orders: OrderRecord[],
  customer: CustomerProfile | null | undefined
): string[] {
  if (!customer) return [];
  const ids = new Set<string>();
  for (const order of orders) {
    if (order.status !== 'Delivered') continue;
    if (!doesOrderBelongToCustomer(order, customer)) continue;
    for (const item of order.items) {
      if (item.productId) ids.add(item.productId);
    }
  }
  return Array.from(ids);
}
