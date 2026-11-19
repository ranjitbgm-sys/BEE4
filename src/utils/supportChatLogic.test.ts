import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_STORE_SETTINGS, INITIAL_COUPONS, INITIAL_PRODUCTS } from '../data/catalog';
import type { CustomerProfile, OrderRecord, SupportMessageRecord, SupportTicketRecord } from '../types';
import {
  computeSupportDeskKpis,
  filterSupportTickets,
  generateAiSupportReply,
  generateSupportTokenNumber,
  mergeSupportMessages,
} from './supportChatLogic';

const sampleCustomer: CustomerProfile = {
  id: 'cust-1',
  fullName: 'Ananya Sharma',
  firstName: 'Ananya',
  phone: '9876543210',
  email: 'ananya@example.com',
  preferredPayment: 'UPI / Prepaid',
  walletBalance: 250,
  createdAt: '2026-01-01T10:00:00.000Z',
  addresses: [],
  wishlistIds: [],
};

const sampleOrders: OrderRecord[] = [
  {
    orderNumber: 'BEE4-4091',
    userId: 'cust-1',
    createdAt: '2026-05-10T10:00:00.000Z',
    items: [
      {
        productId: INITIAL_PRODUCTS[0].id,
        title: INITIAL_PRODUCTS[0].title,
        price: INITIAL_PRODUCTS[0].price,
        image: INITIAL_PRODUCTS[0].image,
        variant: 'Standard',
        quantity: 1,
        category: INITIAL_PRODUCTS[0].category,
      },
    ],
    subtotal: INITIAL_PRODUCTS[0].price,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    total: INITIAL_PRODUCTS[0].price,
    paymentMethod: 'UPI / Prepaid',
    customer: {
      fullName: 'Ananya Sharma',
      phone: '9876543210',
      email: 'ananya@example.com',
      address: 'MG Road',
      city: 'Patna',
      state: 'Bihar',
      pinCode: '800001',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Shipped',
    courierPartner: 'Delhivery',
    awbNumber: 'DLV991122',
  },
];

test('generateSupportTokenNumber produces unique sequential TKT-BEE4-XXXX tokens', () => {
  const first = generateSupportTokenNumber([]);
  assert.equal(first, 'TKT-BEE4-1042');
  const second = generateSupportTokenNumber([
    { tokenNumber: 'TKT-BEE4-1042' },
    { tokenNumber: 'TKT-BEE4-1045' },
  ]);
  assert.equal(second, 'TKT-BEE4-1046');
});

test('generateAiSupportReply answers order tracking, returns, 55C Eco-PLA care, SMARTKID15, shipping, custom photo, and executive handoff', () => {
  const track = generateAiSupportReply({
    query: 'Track My Order',
    customer: sampleCustomer,
    customerOrders: sampleOrders,
    products: INITIAL_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    coupons: INITIAL_COUPONS,
  });
  assert.match(track.replyText, /BEE4-4091/);
  assert.match(track.replyText, /Shipped/);
  assert.match(track.replyText, /DLV991122/);
  assert.equal(track.linkedOrderNumber, 'BEE4-4091');

  const ret = generateAiSupportReply({
    query: 'Return / Damaged Item',
    customer: sampleCustomer,
    customerOrders: sampleOrders,
    products: INITIAL_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    coupons: INITIAL_COUPONS,
  });
  assert.match(ret.replyText, /7-Day/i);
  assert.equal(ret.suggestExecutiveHandoff, true);

  const care = generateAiSupportReply({
    query: 'How to clean Eco-PLA toy and heat care?',
    customer: sampleCustomer,
    customerOrders: sampleOrders,
    products: INITIAL_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    coupons: INITIAL_COUPONS,
  });
  assert.match(care.replyText, /55°C/);

  const coupon = generateAiSupportReply({
    query: 'Any SMARTKID15 coupon or wallet offer?',
    customer: sampleCustomer,
    customerOrders: sampleOrders,
    products: INITIAL_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    coupons: INITIAL_COUPONS,
  });
  assert.match(coupon.replyText, /SMARTKID15/);
  assert.match(coupon.replyText, /250/);

  const custom = generateAiSupportReply({
    query: 'Custom Photo Help',
    customer: sampleCustomer,
    customerOrders: sampleOrders,
    products: INITIAL_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    coupons: INITIAL_COUPONS,
  });
  assert.match(custom.replyText, /Custom 3D Design Uploads/i);
  assert.equal(custom.suggestExecutiveHandoff, true);

  const exec = generateAiSupportReply({
    query: 'Talk to Executive',
    customer: sampleCustomer,
    customerOrders: sampleOrders,
    products: INITIAL_PRODUCTS,
    settings: DEFAULT_STORE_SETTINGS,
    coupons: INITIAL_COUPONS,
  });
  assert.equal(exec.suggestExecutiveHandoff, true);
  assert.match(exec.replyText, /Raise Support Token/i);
});

test('computeSupportDeskKpis, filterSupportTickets, and mergeSupportMessages work accurately', () => {
  const tickets: SupportTicketRecord[] = [
    {
      id: 't1',
      tokenNumber: 'TKT-BEE4-1042',
      customerName: 'Ananya',
      subject: 'Damaged item',
      status: 'Waiting for Executive',
      needsExecutive: true,
      createdAt: '2026-05-10T10:00:00.000Z',
      updatedAt: '2026-05-10T12:00:00.000Z',
    },
    {
      id: 't2',
      tokenNumber: 'TKT-BEE4-1043',
      customerName: 'Ravi',
      subject: 'Order tracking',
      status: 'AI Handled',
      needsExecutive: false,
      createdAt: '2026-05-10T09:00:00.000Z',
      updatedAt: '2026-05-10T09:05:00.000Z',
    },
    {
      id: 't3',
      tokenNumber: 'TKT-BEE4-1044',
      customerName: 'Meera',
      subject: 'Custom photo',
      status: 'Closed',
      needsExecutive: false,
      satisfactionRating: 5,
      createdAt: '2026-05-09T09:00:00.000Z',
      updatedAt: '2026-05-09T11:00:00.000Z',
    },
  ];

  const kpis = computeSupportDeskKpis(tickets);
  assert.equal(kpis.total, 3);
  assert.equal(kpis.openNeedsExecutive, 1);
  assert.equal(kpis.aiHandled, 1);
  assert.equal(kpis.closed, 1);
  assert.equal(kpis.averageRating, 5);

  assert.equal(filterSupportTickets(tickets, 'Open / Needs Executive', '').length, 1);
  assert.equal(filterSupportTickets(tickets, 'AI Handled', '').length, 1);
  assert.equal(filterSupportTickets(tickets, 'Closed / Resolved', '').length, 1);
  assert.equal(filterSupportTickets(tickets, 'All', '1042').length, 1);

  const m1: SupportMessageRecord = {
    id: 'm1',
    ticketId: 't1',
    tokenNumber: 'TKT-BEE4-1042',
    sender: 'customer',
    senderName: 'Ananya',
    text: 'Hi',
    createdAt: '2026-05-10T10:00:00.000Z',
  };
  const m2: SupportMessageRecord = {
    id: 'm2',
    ticketId: 't1',
    tokenNumber: 'TKT-BEE4-1042',
    sender: 'executive',
    senderName: 'BEE4 Executive',
    text: 'Hello!',
    createdAt: '2026-05-10T10:01:00.000Z',
  };
  const merged = mergeSupportMessages([m2, m1], [m1]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'm1');
  assert.equal(merged[1].id, 'm2');
});
