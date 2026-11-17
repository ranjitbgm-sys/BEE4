import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  filterAndSortProducts,
  formatINR,
  formatWhatsAppBagMessage,
  groupProductsByAge,
  normalizeAssetUrl,
  validateCheckoutForm,
} from './storeLogic';
import { AGE_GROUP_META, HERO_IMAGE, INITIAL_COUPONS, INITIAL_PRODUCTS } from '../data/catalog';
import { TEST_COUPONS } from './testFixtures';
import { AgeGroup, GiftOccasion, Product, ProductCategory } from '../types';

const SAMPLE_PRODUCTS: Product[] = INITIAL_PRODUCTS.slice(0, 8);
const DEVANAGARI_RE = /[\u0900-\u097F]/;

test('INITIAL_PRODUCTS contains all 16 East-Asian 3D-printed brain toys priced ₹349–₹899 with 3-angle galleries & clean global English copy', () => {
  assert.equal(INITIAL_PRODUCTS.length, 16);
  assert.ok(HERO_IMAGE.startsWith('/assets/images/'), 'HERO_IMAGE must resolve from public /assets/images/');
  assert.equal(
    normalizeAssetUrl('/src/assets/images/toy_motor_front_1794767911807.jpg'),
    '/assets/images/toy_motor_front_1794767911807.jpg'
  );
  assert.equal(
    normalizeAssetUrl('assets/images/toy_motor_front_1794767911807.jpg'),
    '/assets/images/toy_motor_front_1794767911807.jpg'
  );
  assert.equal(
    normalizeAssetUrl('./src/assets/images/hero_brain_toys_1794767911110.jpg'),
    '/assets/images/hero_brain_toys_1794767911110.jpg'
  );
  assert.equal(
    normalizeAssetUrl('/assets/images/toy_motor_front_1794767911807.jpg'),
    '/assets/images/toy_motor_front_1794767911807.jpg'
  );

  const byAge = groupProductsByAge(INITIAL_PRODUCTS);
  assert.equal(byAge.length, 4);
  for (const bucket of byAge) {
    assert.equal(bucket.items.length, 4, `Expected 4 items for ${bucket.ageGroup}`);
  }

  for (const meta of AGE_GROUP_META) {
    assert.ok(meta.sectionSubtextHi.length > 20, `${meta.ageGroup} missing English subtext`);
    assert.equal(DEVANAGARI_RE.test(meta.sectionSubtextHi), false, `${meta.ageGroup} contains Hindi text`);
  }

  for (const product of INITIAL_PRODUCTS) {
    assert.ok(product.price >= 349 && product.price <= 899, `${product.title} price out of range`);
    assert.ok(product.image.startsWith('/assets/images/'), `${product.title} image must be under /assets/images/`);
    assert.equal(product.gallery.length, 3, `${product.title} must have 3 angles`);
    for (const angle of product.gallery) {
      assert.ok(angle.url.startsWith('/assets/images/'), `${product.title} angle ${angle.id} must be under /assets/images/`);
    }
    assert.equal(product.gallery[0].label, 'View 1: Front');
    assert.equal(product.gallery[1].label, 'View 2: Mechanism/Inside');
    assert.equal(product.gallery[2].label, 'View 3: Hands-On Scale');
    assert.ok(product.useCaseHi.length > 20, `${product.title} missing mechanism guide`);
    assert.ok(product.brainBenefitsHi.length > 20, `${product.title} missing cognitive benefits`);
    assert.ok(product.whyParentsBuyHi.length > 20, `${product.title} missing family value note`);
    assert.equal(DEVANAGARI_RE.test(product.useCaseHi), false, `${product.title} useCase has Hindi`);
    assert.equal(DEVANAGARI_RE.test(product.brainBenefitsHi), false, `${product.title} brainBenefits has Hindi`);
    assert.equal(DEVANAGARI_RE.test(product.whyParentsBuyHi), false, `${product.title} whyParentsBuy has Hindi`);
    assert.ok(product.originConcept.length > 5, `${product.title} missing origin concept badge`);
  }
});

test('formatINR formats Indian Rupee currency cleanly', () => {
  assert.equal(formatINR(349), '₹349');
  assert.equal(formatINR(1299), '₹1,299');
  assert.equal(formatINR(0), '₹0');
});

test('filterAndSortProducts supports dual skill + ageGroup filtering, search, maxPrice and sorting', () => {
  const motorOnly = filterAndSortProducts(INITIAL_PRODUCTS, {
    category: ProductCategory.MOTOR_SKILLS,
    ageGroup: AgeGroup.ALL,
    occasion: GiftOccasion.ALL,
    search: '',
    maxPrice: null,
    sortBy: 'featured',
  });
  assert.equal(motorOnly.length, 4);

  const engineering6to8 = filterAndSortProducts(INITIAL_PRODUCTS, {
    category: ProductCategory.ENGINEERING,
    ageGroup: AgeGroup.AGE_6_8,
    occasion: GiftOccasion.ALL,
    search: '',
    maxPrice: null,
    sortBy: 'featured',
  });
  assert.equal(engineering6to8.length, 2);
  assert.deepEqual(
    engineering6to8.map((p) => p.id),
    ['bee4-kumiki-animal-burr', 'bee4-huarong-dao-slide-vault']
  );

  const searched = filterAndSortProducts(INITIAL_PRODUCTS, {
    category: ProductCategory.ALL,
    ageGroup: AgeGroup.AGE_12_15,
    occasion: GiftOccasion.ALL,
    search: 'binary',
    maxPrice: 900,
    sortBy: 'price-asc',
  });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'bee4-binary-marble-computer');

  const sortedDesc = filterAndSortProducts(SAMPLE_PRODUCTS.slice(0, 3), {
    category: ProductCategory.ALL,
    occasion: GiftOccasion.ALL,
    search: '',
    maxPrice: null,
    sortBy: 'price-desc',
  });
  assert.deepEqual(
    sortedDesc.map((p) => p.price),
    [549, 449, 399]
  );

  const mixedStock: Product[] = SAMPLE_PRODUCTS.slice(0, 4).map((p, idx) => ({
    ...p,
    inStock: idx !== 1,
  }));
  const inStockAsc = filterAndSortProducts(mixedStock, {
    category: ProductCategory.ALL,
    occasion: GiftOccasion.ALL,
    search: '',
    maxPrice: null,
    inStockOnly: true,
    sortBy: 'price-asc',
  });
  assert.equal(inStockAsc.length, 3);
  assert.ok(inStockAsc.every((p) => p.inStock));
  assert.deepEqual(
    inStockAsc.map((p) => p.price),
    [399, 449, 649]
  );
});

test('calculateCartTotals applies free shipping at ₹499+, gift wrap, and promo code', () => {
  const belowThreshold = calculateCartTotals([
    {
      productId: 'bee4-mame-tsukami-chopsticks',
      title: 'Mame-Tsukami Spring Chopstick Precision Game',
      price: 399,
      image: '/b.jpg',
      variant: 'Sage & Ivory Tray',
      quantity: 1,
      category: 'Motor Skills',
    },
  ]);
  assert.equal(belowThreshold.subtotal, 399);
  assert.equal(belowThreshold.shippingFee, 49);
  assert.equal(belowThreshold.amountToFreeShipping, 100);
  assert.equal(belowThreshold.total, 448);

  const aboveWithPromoAndGift = calculateCartTotals(
    [
      {
        productId: 'bee4-karakuri-trick-box',
        title: 'Karakuri Secret 5-Step Trick Box',
        price: 699,
        image: '/a.jpg',
        variant: 'Obsidian Slate PLA',
        quantity: 1,
        category: 'Engineering',
      },
    ],
    { giftWrap: true, promoCode: 'bee4welcome' }
  );
  assert.equal(aboveWithPromoAndGift.promoApplied, true);
  assert.equal(aboveWithPromoAndGift.discount, 70);
  assert.equal(aboveWithPromoAndGift.shippingFee, 0);
  assert.equal(aboveWithPromoAndGift.giftWrapFee, 49);
  assert.equal(aboveWithPromoAndGift.codFee, 0);
  assert.equal(aboveWithPromoAndGift.total, 678);

  const codWithPrepaidCoupon = calculateCartTotals(
    [
      {
        productId: 'bee4-karakuri-trick-box',
        title: 'Karakuri Secret 5-Step Trick Box',
        price: 699,
        image: '/a.jpg',
        variant: 'Obsidian Slate PLA',
        quantity: 1,
        category: 'Engineering',
      },
    ],
    {
      promoCode: 'PREPAID50',
      paymentMethod: 'cod',
      codHandlingFee: 29,
      coupons: TEST_COUPONS,
    }
  );
  assert.equal(codWithPrepaidCoupon.promoApplied, false);
  assert.ok(codWithPrepaidCoupon.promoReason);
  assert.equal(codWithPrepaidCoupon.codFee, 29);
  assert.equal(codWithPrepaidCoupon.total, 728);
  assert.equal(INITIAL_COUPONS.length, 1);
  assert.equal(INITIAL_COUPONS[0].code, 'SMARTKID15');
  assert.equal(INITIAL_COUPONS[0].usedCount, 0);

  const upiWithSmartKid15 = calculateCartTotals(
    [
      {
        productId: 'bee4-karakuri-trick-box',
        title: 'Karakuri Secret 5-Step Trick Box',
        price: 699,
        image: '/a.jpg',
        variant: 'Obsidian Slate PLA',
        quantity: 1,
        category: 'Engineering',
      },
    ],
    {
      promoCode: 'SMARTKID15',
      paymentMethod: 'upi',
      codHandlingFee: 29,
      coupons: INITIAL_COUPONS,
    }
  );
  assert.equal(upiWithSmartKid15.promoApplied, true);
  assert.equal(upiWithSmartKid15.discount, 105);
  assert.equal(upiWithSmartKid15.codFee, 0);
  assert.equal(upiWithSmartKid15.total, 594);
});

test('validateCheckoutForm enforces valid Indian phone and 6-digit PIN code', () => {
  const invalidErrors = validateCheckoutForm({
    fullName: 'A',
    phone: '12345',
    email: 'bad-email',
    address: '12',
    city: '',
    state: '',
    pinCode: '5600',
    paymentMethod: 'cod',
    giftWrap: false,
    giftMessage: '',
    promoCode: '',
  });
  assert.ok(invalidErrors.fullName);
  assert.ok(invalidErrors.phone);
  assert.ok(invalidErrors.email);
  assert.ok(invalidErrors.address);
  assert.ok(invalidErrors.city);
  assert.ok(invalidErrors.state);
  assert.ok(invalidErrors.pinCode);

  const validErrors = validateCheckoutForm({
    fullName: 'Aarav Sharma',
    phone: '9876543210',
    email: 'aarav@example.com',
    address: '42 Indiranagar 100 Feet Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560038',
    paymentMethod: 'upi',
    giftWrap: true,
    giftMessage: 'Happy Birthday!',
    promoCode: '',
  });
  assert.deepEqual(validErrors, {});
});

test('formatWhatsAppBagMessage includes itemized list and total', () => {
  const items = [
    {
      productId: 'bee4-korean-soma-cube',
      title: "Korean 'Gabe' Soma Cube 240-Challenge Vault",
      price: 399,
      image: '/a.jpg',
      variant: 'Bauhaus Multi-Tone',
      quantity: 2,
      category: 'Maths & Science',
    },
  ];
  const totals = calculateCartTotals(items);
  const message = formatWhatsAppBagMessage(items, totals);
  assert.match(message, /Soma Cube 240-Challenge Vault \(Bauhaus Multi-Tone\) × 2/);
  assert.match(message, /₹798/);
  assert.match(message, /FREE/);
});

test('normalizeWhatsAppNumber and formatWhatsAppDisplay handle Indian numbers', async () => {
  const { normalizeWhatsAppNumber, formatWhatsAppDisplay, buildWhatsAppUrl } = await import(
    './storeLogic'
  );
  assert.equal(normalizeWhatsAppNumber('98765 43210'), '919876543210');
  assert.equal(normalizeWhatsAppNumber('+91-9876543210'), '919876543210');
  assert.equal(formatWhatsAppDisplay('9876543210'), '+91 98765 43210');
  assert.match(buildWhatsAppUrl('Hello', '9876543210'), /^https:\/\/wa\.me\/919876543210\?text=/);
});

test('calculateAdminMetrics and filterOrders summarize store health and filter orders', async () => {
  const { calculateAdminMetrics, filterOrders } = await import('./storeLogic');
  const orders = [
    {
      orderNumber: 'BEE4-1001',
      createdAt: '2026-11-14T10:00:00Z',
      items: [],
      subtotal: 599,
      discount: 0,
      shippingFee: 0,
      giftWrapFee: 0,
      total: 599,
      paymentMethod: 'upi' as const,
      customer: {
        fullName: 'Ananya Verma',
        phone: '9820112233',
        email: '',
        address: 'Bandra',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400050',
      },
      giftWrap: false,
      giftMessage: '',
      status: 'Confirmed' as const,
    },
    {
      orderNumber: 'BEE4-1002',
      createdAt: '2026-11-14T11:00:00Z',
      items: [],
      subtotal: 400,
      discount: 0,
      shippingFee: 49,
      giftWrapFee: 0,
      total: 449,
      paymentMethod: 'cod' as const,
      customer: {
        fullName: 'Rohan Malhotra',
        phone: '9811445566',
        email: '',
        address: 'Hauz Khas',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110016',
      },
      giftWrap: false,
      giftMessage: '',
      status: 'Cancelled' as const,
    },
  ];

  const metrics = calculateAdminMetrics(INITIAL_PRODUCTS, orders);
  assert.equal(metrics.totalRevenue, 599);
  assert.equal(metrics.totalOrders, 2);
  assert.equal(metrics.pendingOrders, 1);
  assert.equal(metrics.inStockCount, 16);

  const mumbaiConfirmed = filterOrders(orders, { search: 'mumbai', status: 'Confirmed' });
  assert.equal(mumbaiConfirmed.length, 1);
  assert.equal(mumbaiConfirmed[0].orderNumber, 'BEE4-1001');
});

test('validateTestimonialForm and calculateTestimonialSummary validate inputs and compute rating', async () => {
  const { validateTestimonialForm, calculateTestimonialSummary } = await import('./storeLogic');

  const invalid = validateTestimonialForm({
    customerName: 'A',
    cityOrRole: '',
    productName: 'Karakuri Secret 5-Step Trick Box',
    rating: 5,
    feedback: 'Nice',
  });
  assert.ok(invalid.customerName);
  assert.ok(invalid.cityOrRole);
  assert.ok(invalid.feedback);

  const valid = validateTestimonialForm({
    customerName: 'Kavya Menon',
    cityOrRole: 'Kochi',
    productName: 'Karakuri Secret 5-Step Trick Box',
    rating: 5,
    feedback: 'Kept our 10-year-old completely screen-free all weekend.',
  });
  assert.deepEqual(valid, {});

  const summary = calculateTestimonialSummary([
    {
      id: 't1',
      customerName: 'Ananya Verma',
      cityOrRole: 'Mumbai',
      productName: 'Soma Cube',
      rating: 5,
      feedback: 'Lovely 3D finish and fast shipping.',
      createdAt: '2026-11-10T00:00:00Z',
    },
    {
      id: 't2',
      customerName: 'Rohan Malhotra',
      cityOrRole: 'Delhi',
      productName: 'Kendama',
      rating: 4,
      feedback: 'Solid build quality for everyday play.',
      createdAt: '2026-11-11T00:00:00Z',
    },
  ]);
  assert.equal(summary.count, 2);
  assert.equal(summary.averageRating, 4.5);
});

test('customer signup, OTP login/reset, saved address validation, and order tracking work cleanly', async () => {
  const {
    parseContactIdentifier,
    validateCustomerSignup,
    findCustomerByIdentifier,
    authenticateCustomer,
    validateCustomerPasswordChange,
    hydrateCustomersWithStarterHashes,
    validateSavedAddress,
    getCustomerOrders,
    getOrderTrackingStepIndex,
    calculateAdminMetrics,
    createSignupOtpChallenge,
    completeSignupWithOtp,
    createLoginOtpChallenge,
    completeLoginWithOtp,
    createPasswordResetOtpChallenge,
    completePasswordResetWithOtp,
    OTP_EXPIRY_MS,
  } = await import('./storeLogic');
  const { sha256Hex } = await import('./adminAuth');

  assert.deepEqual(parseContactIdentifier('+91 98201 12233'), {
    type: 'phone',
    normalized: '9820112233',
  });
  assert.deepEqual(parseContactIdentifier('Ananya.V@Example.com'), {
    type: 'email',
    normalized: 'ananya.v@example.com',
  });
  assert.equal(parseContactIdentifier('1234').type, 'invalid');

  const badSignup = validateCustomerSignup({
    fullName: 'A',
    contactIdentifier: 'abc',
    password: '123',
  });
  assert.ok(badSignup.fullName);
  assert.ok(badSignup.contactIdentifier);
  assert.ok(badSignup.password);

  assert.deepEqual(
    validateCustomerSignup({
      fullName: 'Kabir Mehta',
      contactIdentifier: '9876543210',
      password: 'Kabir@123',
    }),
    {}
  );

  const customers = [
    {
      id: 'c1',
      fullName: 'Ananya Verma',
      phone: '9820112233',
      email: 'ananya.v@example.com',
      passwordHash: sha256Hex('Ananya@123'),
      preferredPayment: 'upi' as const,
      createdAt: '2026-11-01T00:00:00Z',
      addresses: [],
      wishlistIds: [],
    },
  ];
  assert.equal(findCustomerByIdentifier(customers, '9820112233')?.id, 'c1');
  assert.ok(authenticateCustomer(customers, '9820112233', '').error);
  assert.equal(authenticateCustomer(customers, '9820112233', 'Ananya@123').customer?.id, 'c1');

  const rotated = validateCustomerPasswordChange({
    currentPassword: 'Ananya@123',
    newPassword: 'NewPass@123',
    confirmPassword: 'NewPass@123',
    expectedHash: sha256Hex('Ananya@123'),
  });
  assert.equal(rotated.nextHash, sha256Hex('NewPass@123'));

  const hydrated = hydrateCustomersWithStarterHashes(
    [{ ...customers[0], passwordHash: undefined }],
    [customers[0]]
  );
  assert.equal(hydrated[0].passwordHash, customers[0].passwordHash);

  const nowMs = 1_700_000_000_000;
  const signupIssued = createSignupOtpChallenge(
    customers,
    { fullName: 'Kabir Mehta', contactIdentifier: '9876543210', password: 'Kabir@123' },
    nowMs,
    '654321'
  );
  const validSignup = completeSignupWithOtp({
    challenge: signupIssued.challenge!,
    fullName: 'Kabir Mehta',
    password: 'Kabir@123',
    enteredOtp: '654321',
    guestWishlistIds: ['bee4-karakuri-trick-box'],
    nowMs: nowMs + 2000,
  });
  assert.equal(validSignup.customer?.fullName, 'Kabir Mehta');

  const loginIssued = createLoginOtpChallenge(customers, 'ananya.v@example.com', nowMs, '778899');
  const validLogin = completeLoginWithOtp({
    customers,
    challenge: loginIssued.challenge!,
    enteredOtp: '778899',
    nowMs: nowMs + 2000,
  });
  assert.equal(validLogin.customer?.id, 'c1');

  const issued = createPasswordResetOtpChallenge(customers, '9820112233', nowMs, '482910');
  const expired = completePasswordResetWithOtp({
    challenge: issued.challenge!,
    enteredOtp: '482910',
    newPassword: 'ResetPass@123',
    confirmPassword: 'ResetPass@123',
    nowMs: nowMs + OTP_EXPIRY_MS + 1,
  });
  assert.ok(expired.error);

  const badAddress = validateSavedAddress({
    label: 'Home',
    fullName: 'A',
    phone: '123',
    address: 'abc',
    city: '',
    state: '',
    pinCode: '4000',
  });
  assert.ok(badAddress.pinCode);

  const ananyaOrders = getCustomerOrders(
    [
      {
        orderNumber: 'BEE4-2041',
        createdAt: '2026-11-14T14:20:00.000Z',
        items: [],
        subtotal: 899,
        discount: 0,
        shippingFee: 0,
        giftWrapFee: 0,
        total: 899,
        paymentMethod: 'upi' as const,
        customer: {
          fullName: 'Ananya Verma',
          phone: '9820112233',
          email: 'ananya.v@example.com',
          address: 'Bandra',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400050',
        },
        giftWrap: false,
        giftMessage: '',
        status: 'Preparing Shipment' as const,
      },
      {
        orderNumber: 'BEE4-2099',
        userId: 'c1',
        createdAt: '2026-11-15T10:00:00.000Z',
        items: [],
        subtotal: 699,
        discount: 0,
        shippingFee: 0,
        giftWrapFee: 0,
        total: 699,
        paymentMethod: 'upi' as const,
        customer: {
          fullName: 'Gift Recipient',
          phone: '9911223344',
          email: 'recipient@example.com',
          address: 'Koramangala',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560034',
        },
        giftWrap: true,
        giftMessage: 'Happy Birthday!',
        status: 'Pending' as const,
      },
    ],
    customers[0]
  );
  assert.equal(ananyaOrders.length, 2);
  assert.equal(getOrderTrackingStepIndex('Pending'), 0);
  assert.equal(getOrderTrackingStepIndex('Confirmed'), 1);
  assert.equal(getOrderTrackingStepIndex('Cancelled'), -1);

  const metrics = calculateAdminMetrics(INITIAL_PRODUCTS, ananyaOrders);
  assert.equal(metrics.totalOrders, 2);
  assert.equal(metrics.pendingOrders, 2);
});

test('getInvoiceFilename and order notification builders work properly', async () => {
  const { getInvoiceFilename, buildOrderInvoiceHtml, buildOrderSmsConfirmationText } =
    await import('./storeLogic');

  assert.equal(getInvoiceFilename('BEE4-2041'), 'BEE4-Invoice-BEE4-2041.html');
  const order = {
    orderNumber: 'BEE4-2041',
    createdAt: '2026-11-14T14:20:00.000Z',
    items: [
      {
        productId: 'bee4-binary-marble-computer',
        title: 'Mechanical Binary Marble Computer Board',
        price: 899,
        image: 'x.jpg',
        variant: 'Graphite & Amber Gates',
        quantity: 1,
        category: 'Maths & Science',
      },
    ],
    subtotal: 899,
    discount: 0,
    shippingFee: 0,
    giftWrapFee: 0,
    total: 899,
    paymentMethod: 'upi' as const,
    customer: {
      fullName: 'Ananya Verma',
      phone: '9820112233',
      email: 'ananya.v@example.com',
      address: '14 Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pinCode: '400050',
    },
    giftWrap: false,
    giftMessage: '',
    status: 'Confirmed' as const,
  };
  const html = buildOrderInvoiceHtml(order, {
    supportEmail: 'hello@bee4.in',
    whatsappNumber: '9800004004',
  });
  assert.ok(html.includes('BEE4-2041'));
  const sms = buildOrderSmsConfirmationText(order, { whatsappNumber: '9800004004' });
  assert.ok(sms.includes('BEE4-2041'));
});
