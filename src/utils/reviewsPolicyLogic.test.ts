import assert from 'node:assert/strict';
import test from 'node:test';
import { canCustomerReviewProduct, getDeliveredReviewableProductIds } from './reviewsPolicyLogic';
import type { CustomerProfile, OrderRecord } from '../types';

const mockCustomer: CustomerProfile = {
  id: 'cust-101',
  fullName: 'Aarav Sharma',
  phone: '9876543210',
  email: 'aarav@example.com',
  preferredPayment: 'upi',
  createdAt: '2026-01-01T10:00:00.000Z',
  addresses: [],
  wishlistIds: [],
};

function makeOrder(partial: Partial<OrderRecord>): OrderRecord {
  return {
    orderNumber: 'BEE4-1001',
    userId: 'cust-101',
    createdAt: '2026-02-01T10:00:00.000Z',
    items: [
      {
        productId: 'prod-clock-1',
        title: '3D Geometric Silent Wall Clock',
        price: 799,
        image: '/img/clock.jpg',
        variant: 'Matte Black',
        quantity: 1,
        category: '3D Home Decor',
      },
    ],
    subtotal: 799,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    total: 799,
    paymentMethod: 'upi',
    customer: {
      fullName: 'Aarav Sharma',
      phone: '9876543210',
      email: 'aarav@example.com',
      address: '12 MG Road',
      city: 'Pune',
      state: 'Maharashtra',
      pinCode: '411001',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Pending',
    ...partial,
  };
}

test('denies review when customer is null', () => {
  const res = canCustomerReviewProduct([makeOrder({ status: 'Delivered' })], null, 'prod-clock-1');
  assert.equal(res.eligible, false);
});

test('denies review for Pending, Shipped, or Cancelled orders', () => {
  const orders: OrderRecord[] = [
    makeOrder({ orderNumber: 'BEE4-1', status: 'Pending' }),
    makeOrder({ orderNumber: 'BEE4-2', status: 'Confirmed' }),
    makeOrder({ orderNumber: 'BEE4-3', status: 'Shipped' }),
    makeOrder({ orderNumber: 'BEE4-4', status: 'Cancelled' }),
  ];
  const res = canCustomerReviewProduct(orders, mockCustomer, 'prod-clock-1');
  assert.equal(res.eligible, false);
});

test('allows review ONLY when matching customer has a Delivered order containing the product', () => {
  const orders: OrderRecord[] = [
    makeOrder({ orderNumber: 'BEE4-1', status: 'Pending' }),
    makeOrder({ orderNumber: 'BEE4-2', status: 'Delivered' }),
  ];
  const ok = canCustomerReviewProduct(orders, mockCustomer, 'prod-clock-1');
  assert.equal(ok.eligible, true);
  assert.equal(ok.deliveredOrderNumber, 'BEE4-2');

  const otherProd = canCustomerReviewProduct(orders, mockCustomer, 'prod-other-99');
  assert.equal(otherProd.eligible, false);
});

test('ignores delivered orders belonging to other customers', () => {
  const otherCustomerOrder = makeOrder({
    userId: 'cust-999',
    customer: {
      fullName: 'Other User',
      phone: '9000000000',
      email: 'other@example.com',
      address: 'Street',
      city: 'Delhi',
      state: 'Delhi',
      pinCode: '110001',
    },
    status: 'Delivered',
  });
  const res = canCustomerReviewProduct([otherCustomerOrder], mockCustomer, 'prod-clock-1');
  assert.equal(res.eligible, false);
});

test('getDeliveredReviewableProductIds collects only products from Delivered orders', () => {
  const orders: OrderRecord[] = [
    makeOrder({ orderNumber: 'BEE4-1', status: 'Delivered' }),
    makeOrder({
      orderNumber: 'BEE4-2',
      status: 'Shipped',
      items: [
        {
          productId: 'prod-fidget-2',
          title: 'Fidget Cube',
          price: 399,
          image: '/img/f.jpg',
          variant: 'Amber',
          quantity: 1,
          category: 'Brain-Training Toys',
        },
      ],
    }),
  ];
  assert.deepEqual(getDeliveredReviewableProductIds(orders, mockCustomer), ['prod-clock-1']);
});
