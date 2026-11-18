import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAppRoutePath, parseAppRoute } from './routingLogic';

test('parses storefront, customer account, orders, order detail, wallet, cart, legal, and admin routes', () => {
  assert.equal(parseAppRoute('/').page, 'home');
  assert.equal(parseAppRoute('/orders').page, 'orders');
  assert.deepEqual(parseAppRoute('/orders/BEE4-9001'), {
    page: 'order-detail',
    orderNumber: 'BEE4-9001',
  });
  assert.equal(parseAppRoute('/wallet').page, 'wallet');
  assert.equal(parseAppRoute('/cart').page, 'cart');
  assert.equal(parseAppRoute('/account').page, 'account');
  assert.equal(parseAppRoute('/about-bee4').page, 'about');
  assert.equal(parseAppRoute('/legal/terms').page, 'legal-terms');
  assert.equal(parseAppRoute('/legal/privacy').page, 'legal-privacy');
  assert.equal(parseAppRoute('/legal/returns').page, 'legal-returns');
  assert.equal(parseAppRoute('/legal/shipping').page, 'legal-shipping');
  assert.equal(parseAppRoute('/legal/copyright').page, 'legal-copyright');
  assert.deepEqual(parseAppRoute('/admin/reels'), {
    page: 'manager',
    adminRoute: 'reels',
  });
});

test('buildAppRoutePath creates clean URL paths', () => {
  assert.equal(buildAppRoutePath({ page: 'home' }), '/');
  assert.equal(buildAppRoutePath({ page: 'orders' }), '/orders');
  assert.equal(
    buildAppRoutePath({ page: 'order-detail', orderNumber: 'BEE4-101' }),
    '/orders/BEE4-101'
  );
  assert.equal(buildAppRoutePath({ page: 'wallet' }), '/wallet');
  assert.equal(buildAppRoutePath({ page: 'cart' }), '/cart');
  assert.equal(buildAppRoutePath({ page: 'legal-terms' }), '/legal/terms');
  assert.equal(
    buildAppRoutePath({ page: 'manager', adminRoute: 'reels' }),
    '/admin/reels'
  );
});
