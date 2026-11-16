import test from 'node:test';
import assert from 'node:assert/strict';
import type { CustomerMessageRecord, ProductReviewRecord } from '../types';
import {
  buildMessageMailtoUrl,
  buildMessageWhatsAppReplyUrl,
  calculateMessagesReviewsBadgeCount,
  computeMessageInboxKpis,
  computeProductRatingStats,
  computeReviewManagerKpis,
  getPublishedHomepageReviews,
  getPublishedReviewsForProduct,
  validateCustomerNoteForm,
  validateProductReviewForm,
} from './messagesReviewsLogic';

const SAMPLE_MESSAGES: CustomerMessageRecord[] = [
  {
    id: 'msg-1',
    customerName: 'Priya Deshmukh',
    phone: '9823456789',
    email: 'priya@example.com',
    topic: 'Custom 3D Print / Gift Request',
    message: 'Need custom 3D printed nameplates for birthday gifts.',
    status: 'Unread',
    createdAt: '2026-11-16T08:00:00.000Z',
    updatedAt: '2026-11-16T08:00:00.000Z',
  },
  {
    id: 'msg-2',
    customerName: 'Siddharth Joshi',
    phone: '9845011223',
    topic: 'Bulk / School Order',
    message: 'Looking for 30 Soma Cube kits for STEM fest.',
    status: 'Unread',
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
  },
  {
    id: 'msg-3',
    customerName: 'Rohan Malhotra',
    phone: '9811445566',
    topic: 'Order Status Inquiry',
    message: 'When will order BEE4-2041 arrive in Delhi?',
    status: 'Replied / Resolved',
    createdAt: '2026-11-14T11:00:00.000Z',
    updatedAt: '2026-11-14T15:00:00.000Z',
  },
];

const SAMPLE_REVIEWS: ProductReviewRecord[] = [
  {
    id: 'rev-1',
    productId: 'bee4-karakuri-trick-box',
    productName: 'Karakuri Secret 5-Step Trick Box',
    customerName: 'Ananya Verma',
    customerContact: '9820112233',
    cityOrRole: 'Mumbai',
    rating: 5,
    comment: 'Super smooth dovetail gears. Zero screen time for my son!',
    verifiedBuyer: true,
    featuredOnHomepage: true,
    status: 'Published',
    adminReply: 'Thank you Ananya! Happy screen-free building!',
    createdAt: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T10:00:00.000Z',
  },
  {
    id: 'rev-2',
    productId: 'bee4-karakuri-trick-box',
    productName: 'Karakuri Secret 5-Step Trick Box',
    customerName: 'Kabir Mehta',
    customerContact: 'kabir@example.com',
    rating: 4,
    comment: 'Great tactile mechanism and neat Bio-PLA finish.',
    verifiedBuyer: false,
    featuredOnHomepage: false,
    status: 'Published',
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
  },
  {
    id: 'rev-3',
    productId: 'bee4-karakuri-trick-box',
    productName: 'Karakuri Secret 5-Step Trick Box',
    customerName: 'Spam User',
    customerContact: '9999988888',
    rating: 1,
    comment: 'Pending moderation review comment.',
    verifiedBuyer: false,
    featuredOnHomepage: false,
    status: 'Pending',
    createdAt: '2026-11-16T07:00:00.000Z',
    updatedAt: '2026-11-16T07:00:00.000Z',
  },
  {
    id: 'rev-4',
    productId: 'bee4-soma-cube',
    productName: "Korean 'Gabe' Soma Cube 240-Challenge Vault",
    customerName: 'Meera Nair',
    customerContact: '9900112233',
    rating: 5,
    comment: 'Hidden test review must not appear on storefront.',
    verifiedBuyer: true,
    featuredOnHomepage: true,
    status: 'Hidden',
    createdAt: '2026-11-13T07:00:00.000Z',
    updatedAt: '2026-11-13T07:00:00.000Z',
  },
];

test('validateCustomerNoteForm enforces required fields and 10-digit Indian phone', () => {
  const invalid = validateCustomerNoteForm({
    customerName: 'A',
    phone: '12345',
    email: 'bad-email',
    topic: 'General Note',
    message: 'Hi',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.customerName);
  assert.ok(invalid.errors.phone);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.message);

  const valid = validateCustomerNoteForm({
    customerName: 'Aarav Sharma',
    phone: '+91 98765 01234',
    email: '',
    topic: 'Custom 3D Print / Gift Request',
    message: 'Need 10 custom puzzles with engraved names.',
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedPhone, '9876501234');
});

test('validateProductReviewForm validates rating bounds, contact, and photo URL', () => {
  const invalid = validateProductReviewForm({
    customerName: '',
    customerContact: 'not-valid',
    productId: 'bee4-karakuri-trick-box',
    productName: 'Karakuri Secret 5-Step Trick Box',
    rating: 0,
    comment: 'short',
    photoUrl: 'ftp://invalid.com/pic.jpg',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.customerName);
  assert.ok(invalid.errors.customerContact);
  assert.ok(invalid.errors.rating);
  assert.ok(invalid.errors.comment);
  assert.ok(invalid.errors.photoUrl);

  const valid = validateProductReviewForm({
    customerName: 'Neha Singh',
    customerContact: '9835012345',
    productId: 'bee4-karakuri-trick-box',
    productName: 'Karakuri Secret 5-Step Trick Box',
    rating: 5,
    comment: 'Kids play with this trick box daily after school!',
    photoUrl: '/assets/products/karakuri.jpg',
  });
  assert.equal(valid.valid, true);
});

test('KPIs and published-only rating recalculations work accurately', () => {
  const msgKpis = computeMessageInboxKpis(SAMPLE_MESSAGES);
  assert.equal(msgKpis.totalNotes, 3);
  assert.equal(msgKpis.unreadCount, 2);
  assert.equal(msgKpis.customPrintAndGiftCount, 2);
  assert.equal(msgKpis.resolvedCount, 1);

  const revKpis = computeReviewManagerKpis(SAMPLE_REVIEWS);
  assert.equal(revKpis.totalReviews, 4);
  assert.equal(revKpis.pendingCount, 1);
  assert.equal(revKpis.publishedCount, 2);
  assert.equal(revKpis.featuredCount, 1);
  assert.equal(revKpis.averageRating, 4.5);

  // Storefront rating must exclude Pending (1★) and Hidden (5★)
  const productStats = computeProductRatingStats(
    SAMPLE_REVIEWS,
    'bee4-karakuri-trick-box'
  );
  assert.equal(productStats.reviewCount, 2);
  assert.equal(productStats.averageRating, 4.5);

  const publishedForKarakuri = getPublishedReviewsForProduct(
    SAMPLE_REVIEWS,
    'bee4-karakuri-trick-box'
  );
  assert.equal(publishedForKarakuri.length, 2);
  assert.equal(publishedForKarakuri[0].id, 'rev-2'); // newest first

  const homepageReviews = getPublishedHomepageReviews(SAMPLE_REVIEWS);
  assert.equal(homepageReviews.length, 2);
  assert.equal(homepageReviews[0].id, 'rev-1'); // featured prioritized
});

test('Badge count and 1-click WhatsApp & Email reply builders generate valid payloads', () => {
  assert.equal(
    calculateMessagesReviewsBadgeCount(SAMPLE_MESSAGES, SAMPLE_REVIEWS),
    3 // 2 Unread + 1 Pending
  );

  const waUrl = buildMessageWhatsAppReplyUrl(SAMPLE_MESSAGES[0]);
  assert.ok(waUrl.startsWith('https://wa.me/919823456789?text='));
  assert.ok(waUrl.includes(encodeURIComponent('Custom 3D Print / Gift Request')));

  const mailUrl = buildMessageMailtoUrl(SAMPLE_MESSAGES[0]);
  assert.ok(mailUrl && mailUrl.startsWith('mailto:priya%40example.com?subject='));

  assert.equal(buildMessageMailtoUrl(SAMPLE_MESSAGES[1]), null);
});
