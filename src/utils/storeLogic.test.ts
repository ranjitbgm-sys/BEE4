import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCartTotals,
  filterAndSortProducts,
  formatINR,
  formatWhatsAppBagMessage,
  validateCheckoutForm,
} from './storeLogic';
import { GiftOccasion, Product, ProductCategory } from '../types';

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'p1',
    title: 'Honeycomb Bottle',
    category: ProductCategory.BOTTLES,
    occasion: GiftOccasion.DESK_COLLEGE,
    price: 599,
    image: '/a.jpg',
    variants: ['Amber'],
    shortSpec: '600 ml',
    description: 'Insulated steel bottle.',
    materials: 'Steel',
    dimensions: '22 cm',
    inStock: true,
    featured: true,
  },
  {
    id: 'p2',
    title: '3D Dragon Toy',
    category: ProductCategory.TOYS_3D,
    occasion: GiftOccasion.BIRTHDAY,
    price: 399,
    image: '/b.jpg',
    variants: ['Gold'],
    shortSpec: 'PLA flexi',
    description: 'Articulated desk dragon.',
    materials: 'PLA',
    dimensions: '24 cm',
    inStock: true,
    featured: false,
  },
  {
    id: 'p3',
    title: 'Canvas Tote Bag',
    category: ProductCategory.HANDBAGS,
    occasion: GiftOccasion.EVERYDAY,
    price: 899,
    image: '/c.jpg',
    variants: ['Natural'],
    shortSpec: '14-inch laptop fit',
    description: 'Structured tote.',
    materials: 'Canvas',
    dimensions: '38 cm',
    inStock: true,
    featured: true,
  },
];

test('formatINR formats Indian Rupee currency cleanly', () => {
  assert.equal(formatINR(199), '₹199');
  assert.equal(formatINR(1299), '₹1,299');
  assert.equal(formatINR(0), '₹0');
});

test('filterAndSortProducts filters by category, search, maxPrice and sorts', () => {
  const bottles = filterAndSortProducts(SAMPLE_PRODUCTS, {
    category: ProductCategory.BOTTLES,
    occasion: GiftOccasion.ALL,
    search: '',
    maxPrice: null,
    sortBy: 'featured',
  });
  assert.equal(bottles.length, 1);
  assert.equal(bottles[0].id, 'p1');

  const searched = filterAndSortProducts(SAMPLE_PRODUCTS, {
    category: ProductCategory.ALL,
    occasion: GiftOccasion.ALL,
    search: 'dragon',
    maxPrice: 500,
    sortBy: 'price-asc',
  });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].id, 'p2');

  const sortedDesc = filterAndSortProducts(SAMPLE_PRODUCTS, {
    category: ProductCategory.ALL,
    occasion: GiftOccasion.ALL,
    search: '',
    maxPrice: null,
    sortBy: 'price-desc',
  });
  assert.deepEqual(
    sortedDesc.map((p) => p.id),
    ['p3', 'p1', 'p2']
  );
});

test('calculateCartTotals applies free shipping at ₹499+, gift wrap, and promo code', () => {
  const belowThreshold = calculateCartTotals([
    {
      productId: 'p2',
      title: '3D Dragon Toy',
      price: 399,
      image: '/b.jpg',
      variant: 'Gold',
      quantity: 1,
      category: '3D Toys',
    },
  ]);
  assert.equal(belowThreshold.subtotal, 399);
  assert.equal(belowThreshold.shippingFee, 49);
  assert.equal(belowThreshold.amountToFreeShipping, 100);
  assert.equal(belowThreshold.total, 448);

  const aboveWithPromoAndGift = calculateCartTotals(
    [
      {
        productId: 'p1',
        title: 'Honeycomb Bottle',
        price: 599,
        image: '/a.jpg',
        variant: 'Amber',
        quantity: 1,
        category: 'Bottles & Sippers',
      },
    ],
    { giftWrap: true, promoCode: 'bee4welcome' }
  );
  assert.equal(aboveWithPromoAndGift.promoApplied, true);
  assert.equal(aboveWithPromoAndGift.discount, 60);
  assert.equal(aboveWithPromoAndGift.shippingFee, 0);
  assert.equal(aboveWithPromoAndGift.giftWrapFee, 49);
  assert.equal(aboveWithPromoAndGift.total, 588);
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
      productId: 'p1',
      title: 'Honeycomb Bottle',
      price: 599,
      image: '/a.jpg',
      variant: 'Amber',
      quantity: 2,
      category: 'Bottles',
    },
  ];
  const totals = calculateCartTotals(items);
  const message = formatWhatsAppBagMessage(items, totals);
  assert.match(message, /Honeycomb Bottle \(Amber\) × 2/);
  assert.match(message, /₹1,198/);
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

  const metrics = calculateAdminMetrics(SAMPLE_PRODUCTS, orders);
  assert.equal(metrics.totalRevenue, 599);
  assert.equal(metrics.totalOrders, 2);
  assert.equal(metrics.pendingOrders, 1);
  assert.equal(metrics.inStockCount, 3);

  const mumbaiConfirmed = filterOrders(orders, { search: 'mumbai', status: 'Confirmed' });
  assert.equal(mumbaiConfirmed.length, 1);
  assert.equal(mumbaiConfirmed[0].orderNumber, 'BEE4-1001');
});

test('validateTestimonialForm and calculateTestimonialSummary validate inputs and compute rating', async () => {
  const { validateTestimonialForm, calculateTestimonialSummary } = await import('./storeLogic');

  const invalid = validateTestimonialForm({
    customerName: 'A',
    cityOrRole: '',
    productName: 'Honeycomb Insulated Steel Flask',
    rating: 5,
    feedback: 'Nice',
  });
  assert.ok(invalid.customerName);
  assert.ok(invalid.cityOrRole);
  assert.ok(invalid.feedback);

  const valid = validateTestimonialForm({
    customerName: 'Kavya Menon',
    cityOrRole: 'Kochi',
    productName: 'Honeycomb Insulated Steel Flask',
    rating: 5,
    feedback: 'Keeps water ice-cold through a full college day.',
  });
  assert.deepEqual(valid, {});

  const summary = calculateTestimonialSummary([
    {
      id: 't1',
      customerName: 'Ananya Verma',
      cityOrRole: 'Mumbai',
      productName: 'Hamper',
      rating: 5,
      feedback: 'Lovely hamper and fast shipping.',
      createdAt: '2026-11-10T00:00:00Z',
    },
    {
      id: 't2',
      customerName: 'Rohan Malhotra',
      cityOrRole: 'Delhi',
      productName: 'Flask',
      rating: 4,
      feedback: 'Solid build quality for everyday office use.',
      createdAt: '2026-11-11T00:00:00Z',
    },
  ]);
  assert.equal(summary.count, 2);
  assert.equal(summary.averageRating, 4.5);
});

test('customer signup, password authentication, password change, saved address validation, and order tracking work cleanly', async () => {
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
    {
      id: 'c2-legacy',
      fullName: 'Legacy User',
      phone: '9898989898',
      email: 'legacy@example.com',
      preferredPayment: 'cod' as const,
      createdAt: '2026-11-01T00:00:00Z',
      addresses: [],
      wishlistIds: [],
    },
  ];
  assert.equal(findCustomerByIdentifier(customers, '9820112233')?.id, 'c1');
  assert.equal(findCustomerByIdentifier(customers, 'ananya.v@example.com')?.id, 'c1');
  assert.equal(findCustomerByIdentifier(customers, '9999999999'), undefined);

  // Rejects empty password, wrong password, and legacy accounts without passwordHash
  assert.ok(authenticateCustomer(customers, '9820112233', '').error);
  assert.ok(authenticateCustomer(customers, '9820112233', 'WrongPass').error);
  assert.ok(authenticateCustomer(customers, '9898989898', 'AnyPass123').error);
  assert.equal(authenticateCustomer(customers, '9820112233', 'Ananya@123').customer?.id, 'c1');
  assert.equal(
    authenticateCustomer(customers, 'ananya.v@example.com', 'Ananya@123').customer?.id,
    'c1'
  );

  // Password change validation
  assert.ok(
    validateCustomerPasswordChange({
      currentPassword: 'Wrong',
      newPassword: 'NewPass@123',
      confirmPassword: 'NewPass@123',
      expectedHash: sha256Hex('Ananya@123'),
    }).error
  );
  const rotated = validateCustomerPasswordChange({
    currentPassword: 'Ananya@123',
    newPassword: 'NewPass@123',
    confirmPassword: 'NewPass@123',
    expectedHash: sha256Hex('Ananya@123'),
  });
  assert.equal(rotated.nextHash, sha256Hex('NewPass@123'));

  // Starter hydration fills missing hashes cleanly
  const hydrated = hydrateCustomersWithStarterHashes(
    [{ ...customers[0], passwordHash: undefined }],
    [customers[0]]
  );
  assert.equal(hydrated[0].passwordHash, customers[0].passwordHash);

  // OTP Forgot Password flow
  const {
    createPasswordResetOtpChallenge,
    completePasswordResetWithOtp,
    OTP_EXPIRY_MS,
  } = await import('./storeLogic');

  assert.ok(createPasswordResetOtpChallenge(customers, 'bad').error);
  assert.ok(createPasswordResetOtpChallenge(customers, '9999988888').error);

  const nowMs = 1_700_000_000_000;
  const issued = createPasswordResetOtpChallenge(customers, '9820112233', nowMs, '482910');
  assert.ok(issued.challenge);
  assert.equal(issued.otpCode, '482910');
  assert.equal(issued.challenge?.maskedTarget, '+91 ••••••2233');
  assert.equal(issued.challenge?.attemptsRemaining, 5);

  // Wrong OTP decrements remaining attempts
  const wrongOtp = completePasswordResetWithOtp({
    challenge: issued.challenge!,
    enteredOtp: '000000',
    newPassword: 'ResetPass@123',
    confirmPassword: 'ResetPass@123',
    nowMs: nowMs + 1000,
  });
  assert.ok(wrongOtp.error);
  assert.equal(wrongOtp.updatedChallenge?.attemptsRemaining, 4);

  // Expired OTP is rejected
  const expired = completePasswordResetWithOtp({
    challenge: issued.challenge!,
    enteredOtp: '482910',
    newPassword: 'ResetPass@123',
    confirmPassword: 'ResetPass@123',
    nowMs: nowMs + OTP_EXPIRY_MS + 1,
  });
  assert.ok(expired.error);

  // Mismatched confirmation is rejected
  const mismatch = completePasswordResetWithOtp({
    challenge: issued.challenge!,
    enteredOtp: '482910',
    newPassword: 'ResetPass@123',
    confirmPassword: 'DifferentPassword',
    nowMs: nowMs + 2000,
  });
  assert.ok(mismatch.error);

  // Valid OTP + matching password succeeds and returns new SHA-256 hash
  const success = completePasswordResetWithOtp({
    challenge: issued.challenge!,
    enteredOtp: '482910',
    newPassword: 'ResetPass@123',
    confirmPassword: 'ResetPass@123',
    nowMs: nowMs + 2000,
  });
  assert.equal(success.nextHash, sha256Hex('ResetPass@123'));

  const badAddress = validateSavedAddress({
    label: 'Home',
    fullName: 'A',
    phone: '123',
    address: 'abc',
    city: '',
    state: '',
    pinCode: '4000',
  });
  assert.ok(badAddress.fullName);
  assert.ok(badAddress.phone);
  assert.ok(badAddress.address);
  assert.ok(badAddress.city);
  assert.ok(badAddress.state);
  assert.ok(badAddress.pinCode);

  const orders = [
    {
      orderNumber: 'BEE4-1026',
      createdAt: '2026-11-14T14:20:00.000Z',
      items: [],
      subtotal: 999,
      discount: 0,
      shippingFee: 0,
      giftWrapFee: 0,
      total: 999,
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
      orderNumber: 'BEE4-1025',
      createdAt: '2026-11-13T11:05:00.000Z',
      items: [],
      subtotal: 599,
      discount: 0,
      shippingFee: 0,
      giftWrapFee: 0,
      total: 599,
      paymentMethod: 'cod' as const,
      customer: {
        fullName: 'Rohan Malhotra',
        phone: '9811445566',
        email: 'rohan.m@example.com',
        address: 'Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pinCode: '110016',
      },
      giftWrap: false,
      giftMessage: '',
      status: 'Shipped' as const,
    },
  ];
  const ananyaOrders = getCustomerOrders(orders, customers[0]);
  assert.equal(ananyaOrders.length, 1);
  assert.equal(ananyaOrders[0].orderNumber, 'BEE4-1026');
  assert.equal(getOrderTrackingStepIndex('Confirmed'), 0);
  assert.equal(getOrderTrackingStepIndex('Shipped'), 2);
  assert.equal(getOrderTrackingStepIndex('Cancelled'), -1);
});

test('getInvoiceFilename and buildOrderInvoiceHtml generate clean, escaped invoice receipts', async () => {
  const { getInvoiceFilename, buildOrderInvoiceHtml } = await import('./storeLogic');

  assert.equal(getInvoiceFilename('BEE4-1026'), 'BEE4-Invoice-BEE4-1026.html');

  const html = buildOrderInvoiceHtml(
    {
      orderNumber: 'BEE4-1026',
      createdAt: '2026-11-14T14:20:00.000Z',
      items: [
        {
          productId: 'p1',
          title: 'Brass Urli & Candle <Set>',
          price: 999,
          image: 'x.jpg',
          variant: 'Emerald & Gold',
          quantity: 1,
          category: 'Gift Combos',
        },
      ],
      subtotal: 999,
      discount: 100,
      shippingFee: 0,
      giftWrapFee: 49,
      total: 948,
      paymentMethod: 'upi',
      customer: {
        fullName: 'Ananya Verma',
        phone: '9820112233',
        email: 'ananya.v@example.com',
        address: '14 Bandra West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pinCode: '400050',
      },
      giftWrap: true,
      giftMessage: 'Happy Diwali <3',
      status: 'Preparing Shipment',
    },
    { supportEmail: 'hello@bee4.in', whatsappNumber: '9800004004' }
  );

  assert.ok(html.includes('BEE4-1026'));
  assert.ok(html.includes('Ananya Verma'));
  assert.ok(html.includes('₹948'));
  assert.ok(html.includes('UPI (GPay / PhonePe / Paytm)'));
  assert.ok(html.includes('Brass Urli &amp; Candle &lt;Set&gt;'));
  assert.ok(!html.includes('<Set>'));
  assert.ok(html.includes('Happy Diwali &lt;3'));
});
