import {
  AgeGroup,
  CartItem,
  CheckoutErrors,
  CheckoutFormValues,
  CustomerProfile,
  GiftOccasion,
  OrderRecord,
  OrderStatus,
  Product,
  ProductCategory,
  SavedAddress,
  SavedAddressErrors,
  SortOption,
  Testimonial,
  TestimonialErrors,
  TestimonialFormValues,
} from '../types';
import { sha256Hex, verifyAdminPassword } from './adminAuth';
import {
  buildOrderConfirmationEmailPayload,
  buildOrderInvoiceHtml,
  buildOrderSmsConfirmationText,
  getInvoiceFilename,
} from './orderNotifications';

export {
  buildOrderConfirmationEmailPayload,
  buildOrderInvoiceHtml,
  buildOrderSmsConfirmationText,
  getInvoiceFilename,
};

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_FEE = 49;
export const GIFT_WRAP_FEE = 49;
export const WELCOME_PROMO_CODE = 'BEE4WELCOME';

export function normalizeAssetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/src/assets/images/')) {
    return url.replace('/src/assets/images/', '/assets/images/');
  }
  return url;
}

export const ORDERED_AGE_GROUPS: Exclude<AgeGroup, AgeGroup.ALL>[] = [
  AgeGroup.AGE_3_5,
  AgeGroup.AGE_6_8,
  AgeGroup.AGE_9_11,
  AgeGroup.AGE_12_15,
];

export interface ProductFilterOptions {
  category: ProductCategory;
  ageGroup?: AgeGroup;
  occasion: GiftOccasion;
  search: string;
  maxPrice: number | null;
  inStockOnly?: boolean;
  sortBy: SortOption;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  giftWrapFee: number;
  total: number;
  amountToFreeShipping: number;
  promoApplied: boolean;
}

export function formatINR(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `₹${safeAmount.toLocaleString('en-IN')}`;
}

export function filterAndSortProducts(
  products: Product[],
  options: ProductFilterOptions
): Product[] {
  const query = options.search.trim().toLowerCase();
  const activeAge = options.ageGroup ?? AgeGroup.ALL;

  const filtered = products.filter((product) => {
    if (options.category !== ProductCategory.ALL && product.category !== options.category) {
      return false;
    }
    if (activeAge !== AgeGroup.ALL && product.ageGroup !== activeAge) {
      return false;
    }
    if (options.occasion !== GiftOccasion.ALL && product.occasion !== options.occasion) {
      return false;
    }
    if (options.inStockOnly && !product.inStock) {
      return false;
    }
    if (options.maxPrice !== null && product.price > options.maxPrice) {
      return false;
    }
    if (query.length > 0) {
      const searchable = [
        product.title,
        product.category,
        product.ageGroup,
        product.originConcept,
        product.occasion,
        product.shortSpec,
        product.description,
        product.useCaseHi,
        product.brainBenefitsHi,
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(query)) {
        return false;
      }
    }
    return true;
  });

  if (options.sortBy === 'price-asc') {
    return [...filtered].sort((a, b) => a.price - b.price);
  }
  if (options.sortBy === 'price-desc') {
    return [...filtered].sort((a, b) => b.price - a.price);
  }
  return [...filtered].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}

export function groupProductsByAge(
  products: Product[]
): { ageGroup: Exclude<AgeGroup, AgeGroup.ALL>; items: Product[] }[] {
  return ORDERED_AGE_GROUPS.map((ageGroup) => ({
    ageGroup,
    items: products.filter((p) => p.ageGroup === ageGroup),
  })).filter((group) => group.items.length > 0);
}

export function calculateCartTotals(
  items: CartItem[],
  options: {
    giftWrap?: boolean;
    promoCode?: string;
    freeShippingThreshold?: number;
    expectedPromoCode?: string;
    promoDiscountPercent?: number;
  } = {}
): CartTotals {
  const threshold = options.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD;
  const expectedCode = (options.expectedPromoCode ?? WELCOME_PROMO_CODE).trim().toUpperCase();
  const discountPercent = options.promoDiscountPercent ?? 10;

  const itemCount = items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0);
  const subtotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.price) * Math.max(0, item.quantity),
    0
  );

  const normalizedPromo = (options.promoCode ?? '').trim().toUpperCase();
  const promoApplied =
    subtotal > 0 && expectedCode.length > 0 && normalizedPromo === expectedCode;
  const discount = promoApplied ? Math.round((subtotal * discountPercent) / 100) : 0;
  const netMerchandise = Math.max(0, subtotal - discount);

  const shippingFee =
    subtotal === 0 || netMerchandise >= threshold ? 0 : STANDARD_SHIPPING_FEE;
  const giftWrapFee = subtotal > 0 && options.giftWrap ? GIFT_WRAP_FEE : 0;
  const total = netMerchandise + shippingFee + giftWrapFee;
  const amountToFreeShipping =
    subtotal === 0 ? threshold : Math.max(0, threshold - netMerchandise);

  return {
    itemCount,
    subtotal,
    discount,
    shippingFee,
    giftWrapFee,
    total,
    amountToFreeShipping,
    promoApplied,
  };
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (values.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name.';
  }

  const digitsOnlyPhone = values.phone.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(digitsOnlyPhone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (!values.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address for order confirmation & invoice.';
  }

  if (values.address.trim().length < 6) {
    errors.address = 'Please enter your house/flat number and street address.';
  }

  if (values.city.trim().length < 2) {
    errors.city = 'Please enter your city or town.';
  }

  if (values.state.trim().length < 2) {
    errors.state = 'Please select your state.';
  }

  if (!/^\d{6}$/.test(values.pinCode.trim())) {
    errors.pinCode = 'Enter a valid 6-digit PIN code.';
  }

  return errors;
}

export const DEFAULT_WHATSAPP_NUMBER = '919800004004';

export function normalizeWhatsAppNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  if (digits.length >= 10) {
    return digits;
  }
  return DEFAULT_WHATSAPP_NUMBER;
}

export function formatWhatsAppDisplay(normalized: string): string {
  const digits = normalizeWhatsAppNumber(normalized);
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

export function buildWhatsAppUrl(
  message: string,
  phoneNumber = DEFAULT_WHATSAPP_NUMBER
): string {
  const normalized = normalizeWhatsAppNumber(phoneNumber);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function formatWhatsAppSingleProductMessage(
  product: Product,
  variant: string,
  quantity: number
): string {
  const total = product.price * quantity;
  return [
    `Hi BEE4! I would like to order:`,
    `• ${product.title} (${variant}) × ${quantity}`,
    `Age Group: ${product.ageGroup} · Skill: ${product.category}`,
    `Total: ${formatINR(total)}`,
    `Please share Razorpay / UPI / COD confirmation details.`,
  ].join('\n');
}

export function formatWhatsAppBagMessage(items: CartItem[], totals: CartTotals): string {
  const lines = items.map(
    (item) =>
      `• ${item.title} (${item.variant}) × ${item.quantity} — ${formatINR(item.price * item.quantity)}`
  );
  return [
    `Hi BEE4! I'd like to place an order:`,
    ...lines,
    `Shipping: ${totals.shippingFee === 0 ? 'FREE' : formatINR(totals.shippingFee)}`,
    `Total Payable: ${formatINR(totals.total)}`,
  ].join('\n');
}

export function generateOrderNumber(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `BEE4-${randomSuffix}`;
}

export interface AdminMetrics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  totalProducts: number;
  inStockCount: number;
  outOfStockCount: number;
  categoryCounts: { category: string; count: number }[];
}

export function calculateAdminMetrics(
  products: Product[],
  orders: OrderRecord[]
): AdminMetrics {
  const validOrders = orders.filter((o) => o.status !== 'Cancelled');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Preparing Shipment'
  ).length;
  const averageOrderValue =
    validOrders.length > 0 ? Math.round(totalRevenue / validOrders.length) : 0;

  const inStockCount = products.filter((p) => p.inStock).length;
  const outOfStockCount = products.length - inStockCount;

  const countsMap = new Map<string, number>();
  for (const product of products) {
    countsMap.set(product.category, (countsMap.get(product.category) ?? 0) + 1);
  }
  const categoryCounts = Array.from(countsMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRevenue,
    totalOrders,
    pendingOrders,
    averageOrderValue,
    totalProducts: products.length,
    inStockCount,
    outOfStockCount,
    categoryCounts,
  };
}

export function filterOrders(
  orders: OrderRecord[],
  options: { search: string; status: OrderStatus | 'All' }
): OrderRecord[] {
  const query = options.search.trim().toLowerCase();
  return orders.filter((order) => {
    if (options.status !== 'All' && order.status !== options.status) {
      return false;
    }
    if (query.length > 0) {
      const text = [
        order.orderNumber,
        order.customer.fullName,
        order.customer.phone,
        order.customer.city,
        order.customer.pinCode,
      ]
        .join(' ')
        .toLowerCase();
      if (!text.includes(query)) return false;
    }
    return true;
  });
}

export function validateTestimonialForm(values: TestimonialFormValues): TestimonialErrors {
  const errors: TestimonialErrors = {};
  if (values.customerName.trim().length < 2) {
    errors.customerName = 'Please enter your name.';
  }
  if (values.cityOrRole.trim().length < 2) {
    errors.cityOrRole = 'Please enter your city or role (e.g. Parent · Pune).';
  }
  if (values.feedback.trim().length < 10) {
    errors.feedback = 'Please write at least 10 characters about your experience.';
  }
  return errors;
}

export function calculateTestimonialSummary(testimonials: Testimonial[]): {
  count: number;
  averageRating: number;
} {
  if (testimonials.length === 0) {
    return { count: 0, averageRating: 0 };
  }
  const sum = testimonials.reduce((acc, item) => acc + item.rating, 0);
  return {
    count: testimonials.length,
    averageRating: Math.round((sum / testimonials.length) * 10) / 10,
  };
}

export function normalizeIndianPhone10(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

export function parseContactIdentifier(raw: string): {
  type: 'phone' | 'email' | 'invalid';
  normalized: string;
} {
  const trimmed = raw.trim();
  const phone10 = normalizeIndianPhone10(trimmed);
  if (/^[6-9]\d{9}$/.test(phone10) && !trimmed.includes('@')) {
    return { type: 'phone', normalized: phone10 };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { type: 'email', normalized: trimmed.toLowerCase() };
  }
  return { type: 'invalid', normalized: trimmed };
}

export function validateCustomerSignup(input: {
  fullName: string;
  contactIdentifier: string;
  password: string;
}): { fullName?: string; contactIdentifier?: string; password?: string } {
  const errors: { fullName?: string; contactIdentifier?: string; password?: string } = {};
  if (input.fullName.trim().length < 2) {
    errors.fullName = 'Please enter your full name.';
  }
  const parsed = parseContactIdentifier(input.contactIdentifier);
  if (parsed.type === 'invalid') {
    errors.contactIdentifier = 'Enter a valid 10-digit Indian mobile number or email address.';
  }
  if (!input.password || input.password.length < 6) {
    errors.password = 'Create a password with at least 6 characters.';
  }
  return errors;
}

export function findCustomerByIdentifier(
  customers: CustomerProfile[],
  identifier: string
): CustomerProfile | undefined {
  const parsed = parseContactIdentifier(identifier);
  if (parsed.type === 'phone') {
    return customers.find((c) => normalizeIndianPhone10(c.phone) === parsed.normalized);
  }
  if (parsed.type === 'email') {
    return customers.find((c) => c.email.trim().toLowerCase() === parsed.normalized);
  }
  return undefined;
}

export function authenticateCustomer(
  customers: CustomerProfile[],
  identifier: string,
  password: string
): { customer?: CustomerProfile; error?: string } {
  const parsed = parseContactIdentifier(identifier);
  if (parsed.type === 'invalid') {
    return { error: 'Enter a valid 10-digit Indian mobile number or email address.' };
  }
  if (!password) {
    return { error: 'Please enter your password to sign in.' };
  }
  const matched = findCustomerByIdentifier(customers, identifier);
  if (!matched || !matched.passwordHash || !verifyAdminPassword(password, matched.passwordHash)) {
    return { error: 'Incorrect mobile/email or password. Please check your credentials.' };
  }
  return { customer: matched };
}

export function validateCustomerPasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  expectedHash?: string;
}): { error?: string; nextHash?: string } {
  if (input.expectedHash) {
    if (!input.currentPassword) {
      return { error: 'Enter your current password.' };
    }
    if (!verifyAdminPassword(input.currentPassword, input.expectedHash)) {
      return { error: 'Current password is incorrect.' };
    }
  }
  if (!input.newPassword || input.newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters long.' };
  }
  if (input.newPassword !== input.confirmPassword) {
    return { error: 'New password and confirmation do not match.' };
  }
  return { nextHash: sha256Hex(input.newPassword) };
}

export function hydrateCustomersWithStarterHashes(
  stored: CustomerProfile[],
  starters: CustomerProfile[]
): CustomerProfile[] {
  return stored.map((cust) => {
    if (cust.passwordHash && /^[a-f0-9]{64}$/.test(cust.passwordHash)) {
      return cust;
    }
    const starter = starters.find((s) => s.id === cust.id);
    if (starter?.passwordHash) {
      return { ...cust, passwordHash: starter.passwordHash };
    }
    return cust;
  });
}

export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
export const MAX_OTP_ATTEMPTS = 5;

export type OtpPurpose = 'signup' | 'login' | 'reset';

export interface OtpChallenge {
  purpose: OtpPurpose;
  customerId?: string;
  identifier: string;
  channel: 'phone' | 'email';
  maskedTarget: string;
  otpHash: string;
  expiresAtMs: number;
  resendAvailableAtMs: number;
  attemptsRemaining: number;
}

export interface PasswordResetOtpChallenge extends OtpChallenge {
  customerId: string;
}

export function maskContactTarget(type: 'phone' | 'email', normalized: string): string {
  if (type === 'phone') {
    const digits = normalizeIndianPhone10(normalized);
    if (digits.length >= 4) {
      return `+91 ••••••${digits.slice(-4)}`;
    }
    return '+91 ••••••••••';
  }
  const [local = '', domain = ''] = normalized.split('@');
  if (!domain) return '••••';
  const visible = local.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(2, local.length - 2))}@${domain}`;
}

export function generateSixDigitOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function verifyOtpCodeOnly<T extends OtpChallenge>(
  challenge: T,
  enteredOtp: string,
  nowMs = Date.now()
): { valid: boolean; error?: string; updatedChallenge?: T } {
  if (nowMs > challenge.expiresAtMs) {
    return { valid: false, error: 'This OTP has expired. Please request a fresh 6-digit OTP.' };
  }

  if (challenge.attemptsRemaining <= 0) {
    return { valid: false, error: 'Maximum OTP attempts exceeded. Please request a new OTP.' };
  }

  const cleanOtp = enteredOtp.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, error: 'Enter the 6-digit numeric OTP sent to your mobile or email.' };
  }

  if (!verifyAdminPassword(cleanOtp, challenge.otpHash)) {
    const nextAttempts = Math.max(0, challenge.attemptsRemaining - 1);
    return {
      valid: false,
      updatedChallenge: { ...challenge, attemptsRemaining: nextAttempts },
      error:
        nextAttempts === 0
          ? 'Incorrect OTP. Maximum attempts reached—please request a new OTP.'
          : `Incorrect OTP. ${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} remaining.`,
    };
  }

  return { valid: true };
}

export function createSignupOtpChallenge(
  customers: CustomerProfile[],
  input: {
    fullName: string;
    contactIdentifier: string;
    password: string;
  },
  nowMs = Date.now(),
  fixedOtp?: string
): {
  challenge?: OtpChallenge;
  otpCode?: string;
  errors?: { fullName?: string; contactIdentifier?: string; password?: string };
} {
  const errs = validateCustomerSignup(input);
  if (Object.keys(errs).length > 0) {
    return { errors: errs };
  }

  const existing = findCustomerByIdentifier(customers, input.contactIdentifier);
  if (existing) {
    return {
      errors: {
        contactIdentifier: 'An account with this mobile or email already exists. Please sign in.',
      },
    };
  }

  const parsed = parseContactIdentifier(input.contactIdentifier);
  if (parsed.type === 'invalid') {
    return {
      errors: {
        contactIdentifier: 'Enter a valid 10-digit Indian mobile number or email address.',
      },
    };
  }

  const otpCode = fixedOtp ?? generateSixDigitOtp();
  const channel = parsed.type;
  return {
    otpCode,
    challenge: {
      purpose: 'signup',
      identifier: parsed.normalized,
      channel,
      maskedTarget: maskContactTarget(channel, parsed.normalized),
      otpHash: sha256Hex(otpCode),
      expiresAtMs: nowMs + OTP_EXPIRY_MS,
      resendAvailableAtMs: nowMs + OTP_RESEND_COOLDOWN_MS,
      attemptsRemaining: MAX_OTP_ATTEMPTS,
    },
  };
}

export function completeSignupWithOtp(input: {
  challenge: OtpChallenge;
  fullName: string;
  password: string;
  enteredOtp: string;
  guestWishlistIds?: string[];
  nowMs?: number;
}): {
  customer?: CustomerProfile;
  error?: string;
  updatedChallenge?: OtpChallenge;
} {
  const check = verifyOtpCodeOnly(input.challenge, input.enteredOtp, input.nowMs ?? Date.now());
  if (!check.valid) {
    return {
      error: check.error,
      updatedChallenge: check.updatedChallenge,
    };
  }

  if (input.fullName.trim().length < 2) {
    return { error: 'Please enter your full name.' };
  }

  if (!input.password || input.password.length < 6) {
    return { error: 'Create a password with at least 6 characters.' };
  }

  const nowIso = new Date(input.nowMs ?? Date.now()).toISOString();
  return {
    customer: {
      id: `cust-${Date.now()}`,
      fullName: input.fullName.trim(),
      phone: input.challenge.channel === 'phone' ? input.challenge.identifier : '',
      email: input.challenge.channel === 'email' ? input.challenge.identifier : '',
      passwordHash: sha256Hex(input.password),
      preferredPayment: 'upi',
      celebrationMonth: '',
      createdAt: nowIso,
      addresses: [],
      wishlistIds: [...(input.guestWishlistIds ?? [])],
    },
  };
}

export function createLoginOtpChallenge(
  customers: CustomerProfile[],
  identifier: string,
  nowMs = Date.now(),
  fixedOtp?: string
): { challenge?: PasswordResetOtpChallenge; otpCode?: string; error?: string } {
  const parsed = parseContactIdentifier(identifier);
  if (parsed.type === 'invalid') {
    return { error: 'Enter a valid registered 10-digit Indian mobile number or email address.' };
  }

  const matched = findCustomerByIdentifier(customers, identifier);
  if (!matched) {
    return { error: 'No registered account found for that mobile number or email. Please create an account.' };
  }

  const otpCode = fixedOtp ?? generateSixDigitOtp();
  const channel = parsed.type;
  return {
    otpCode,
    challenge: {
      purpose: 'login',
      customerId: matched.id,
      identifier: parsed.normalized,
      channel,
      maskedTarget: maskContactTarget(channel, parsed.normalized),
      otpHash: sha256Hex(otpCode),
      expiresAtMs: nowMs + OTP_EXPIRY_MS,
      resendAvailableAtMs: nowMs + OTP_RESEND_COOLDOWN_MS,
      attemptsRemaining: MAX_OTP_ATTEMPTS,
    },
  };
}

export function completeLoginWithOtp(input: {
  customers: CustomerProfile[];
  challenge: PasswordResetOtpChallenge;
  enteredOtp: string;
  nowMs?: number;
}): {
  customer?: CustomerProfile;
  error?: string;
  updatedChallenge?: PasswordResetOtpChallenge;
} {
  const check = verifyOtpCodeOnly(input.challenge, input.enteredOtp, input.nowMs ?? Date.now());
  if (!check.valid) {
    return {
      error: check.error,
      updatedChallenge: check.updatedChallenge,
    };
  }

  const matched = input.customers.find((c) => c.id === input.challenge.customerId);
  if (!matched) {
    return { error: 'Customer account not found. Please try again.' };
  }

  return { customer: matched };
}

export function createPasswordResetOtpChallenge(
  customers: CustomerProfile[],
  identifier: string,
  nowMs = Date.now(),
  fixedOtp?: string
): { challenge?: PasswordResetOtpChallenge; otpCode?: string; error?: string } {
  const parsed = parseContactIdentifier(identifier);
  if (parsed.type === 'invalid') {
    return { error: 'Enter a valid registered 10-digit Indian mobile number or email address.' };
  }

  const matched = findCustomerByIdentifier(customers, identifier);
  if (!matched) {
    return { error: 'No registered customer account found for that mobile number or email.' };
  }

  const otpCode = fixedOtp ?? generateSixDigitOtp();
  const channel = parsed.type;
  const challenge: PasswordResetOtpChallenge = {
    purpose: 'reset',
    customerId: matched.id,
    identifier: parsed.normalized,
    channel,
    maskedTarget: maskContactTarget(channel, parsed.normalized),
    otpHash: sha256Hex(otpCode),
    expiresAtMs: nowMs + OTP_EXPIRY_MS,
    resendAvailableAtMs: nowMs + OTP_RESEND_COOLDOWN_MS,
    attemptsRemaining: MAX_OTP_ATTEMPTS,
  };

  return { challenge, otpCode };
}

export function completePasswordResetWithOtp(input: {
  challenge: PasswordResetOtpChallenge;
  enteredOtp: string;
  newPassword: string;
  confirmPassword: string;
  nowMs?: number;
}): {
  nextHash?: string;
  error?: string;
  updatedChallenge?: PasswordResetOtpChallenge;
} {
  const check = verifyOtpCodeOnly(input.challenge, input.enteredOtp, input.nowMs ?? Date.now());
  if (!check.valid) {
    return {
      error: check.error,
      updatedChallenge: check.updatedChallenge,
    };
  }

  if (!input.newPassword || input.newPassword.length < 6) {
    return { error: 'New password must be at least 6 characters long.' };
  }

  if (input.newPassword !== input.confirmPassword) {
    return { error: 'New password and confirmation do not match.' };
  }

  return { nextHash: sha256Hex(input.newPassword) };
}

export function validateSavedAddress(address: Omit<SavedAddress, 'id' | 'isDefault'>): SavedAddressErrors {
  const errors: SavedAddressErrors = {};
  if (address.fullName.trim().length < 2) {
    errors.fullName = 'Please enter recipient full name.';
  }
  const phone10 = normalizeIndianPhone10(address.phone);
  if (!/^[6-9]\d{9}$/.test(phone10)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (address.address.trim().length < 6) {
    errors.address = 'Please enter house/flat no. and street address.';
  }
  if (address.city.trim().length < 2) {
    errors.city = 'Please enter city or town.';
  }
  if (address.state.trim().length < 2) {
    errors.state = 'Please select state.';
  }
  if (!/^\d{6}$/.test(address.pinCode.trim())) {
    errors.pinCode = 'Enter a valid 6-digit PIN code.';
  }
  return errors;
}

export function getCustomerOrders(
  orders: OrderRecord[],
  customer: CustomerProfile
): OrderRecord[] {
  const customerPhone10 = normalizeIndianPhone10(customer.phone);
  const customerEmail = customer.email.trim().toLowerCase();

  return orders.filter((order) => {
    const orderPhone10 = normalizeIndianPhone10(order.customer.phone);
    const orderEmail = order.customer.email.trim().toLowerCase();
    const phoneMatch = customerPhone10.length === 10 && orderPhone10 === customerPhone10;
    const emailMatch = customerEmail.length > 0 && orderEmail === customerEmail;
    return phoneMatch || emailMatch;
  });
}

export const ORDER_TRACKING_STEPS: Exclude<OrderStatus, 'Cancelled'>[] = [
  'Confirmed',
  'Preparing Shipment',
  'Shipped',
  'Delivered',
];

export function getOrderTrackingStepIndex(status: OrderStatus): number {
  if (status === 'Cancelled') return -1;
  return ORDER_TRACKING_STEPS.indexOf(status);
}

export function downloadOrderInvoice(
  order: OrderRecord,
  options?: { supportEmail?: string; whatsappNumber?: string }
): string {
  const filename = getInvoiceFilename(order.orderNumber);
  const html = buildOrderInvoiceHtml(order, options);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
