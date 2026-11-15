import {
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

export const FREE_SHIPPING_THRESHOLD = 499;
export const STANDARD_SHIPPING_FEE = 49;
export const GIFT_WRAP_FEE = 49;
export const WELCOME_PROMO_CODE = 'BEE4WELCOME';

export interface ProductFilterOptions {
  category: ProductCategory;
  occasion: GiftOccasion;
  search: string;
  maxPrice: number | null;
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

  const filtered = products.filter((product) => {
    if (options.category !== ProductCategory.ALL && product.category !== options.category) {
      return false;
    }
    if (options.occasion !== GiftOccasion.ALL && product.occasion !== options.occasion) {
      return false;
    }
    if (options.maxPrice !== null && product.price > options.maxPrice) {
      return false;
    }
    if (query.length > 0) {
      const searchable = [
        product.title,
        product.category,
        product.occasion,
        product.shortSpec,
        product.description,
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

  if (values.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.';
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
    `Total: ${formatINR(total)}`,
    `Please share payment/COD confirmation details.`,
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
    errors.cityOrRole = 'Please enter your city or role (e.g. Pune or Gift Buyer).';
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

export interface PasswordResetOtpChallenge {
  customerId: string;
  identifier: string;
  channel: 'phone' | 'email';
  maskedTarget: string;
  otpHash: string;
  expiresAtMs: number;
  resendAvailableAtMs: number;
  attemptsRemaining: number;
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
  const nowMs = input.nowMs ?? Date.now();
  const { challenge } = input;

  if (nowMs > challenge.expiresAtMs) {
    return { error: 'This OTP has expired. Please request a fresh 6-digit OTP.' };
  }

  if (challenge.attemptsRemaining <= 0) {
    return { error: 'Maximum OTP attempts exceeded. Please request a new OTP.' };
  }

  const cleanOtp = input.enteredOtp.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanOtp)) {
    return { error: 'Enter the 6-digit numeric OTP sent to your mobile or email.' };
  }

  if (!verifyAdminPassword(cleanOtp, challenge.otpHash)) {
    const nextAttempts = Math.max(0, challenge.attemptsRemaining - 1);
    return {
      updatedChallenge: { ...challenge, attemptsRemaining: nextAttempts },
      error:
        nextAttempts === 0
          ? 'Incorrect OTP. Maximum attempts reached—please request a new OTP.'
          : `Incorrect OTP. ${nextAttempts} attempt${nextAttempts === 1 ? '' : 's'} remaining.`,
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInvoiceFilename(orderNumber: string): string {
  const safeOrderNo = orderNumber.replace(/[^a-zA-Z0-9_-]/g, '') || 'ORDER';
  return `BEE4-Invoice-${safeOrderNo}.html`;
}

export function buildOrderInvoiceHtml(
  order: OrderRecord,
  options?: { supportEmail?: string; whatsappNumber?: string }
): string {
  const supportEmail = options?.supportEmail?.trim() || 'hello@bee4.in';
  const whatsappDisplay = formatWhatsAppDisplay(options?.whatsappNumber || '9800004004');

  const paymentLabel =
    order.paymentMethod === 'upi'
      ? 'UPI (GPay / PhonePe / Paytm)'
      : order.paymentMethod === 'card'
        ? 'Credit / Debit Card'
        : 'Cash on Delivery (COD)';

  const orderDate = new Date(order.createdAt);
  const formattedDate = Number.isNaN(orderDate.getTime())
    ? escapeHtml(order.createdAt)
    : orderDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const itemRows = order.items
    .map(
      (item, index) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;color:#52525b;">${index + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;">
            <strong style="color:#18181b;">${escapeHtml(item.title)}</strong><br/>
            <span style="font-size:12px;color:#71717a;">${escapeHtml(item.variant)} · ${escapeHtml(item.category)}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;font-variant-numeric:tabular-nums;">${item.quantity}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;font-variant-numeric:tabular-nums;">${escapeHtml(formatINR(item.price))}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(formatINR(item.price * item.quantity))}</td>
        </tr>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BEE4 Invoice ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #18181b; background: #f7f6f2; }
    .sheet { max-width: 780px; margin: 0 auto; background: #ffffff; border: 1px solid #e6e4dd; border-radius: 16px; padding: 32px; }
    .toolbar { max-width: 780px; margin: 0 auto 14px; display: flex; justify-content: flex-end; }
    .print-btn { background: #18181b; color: #ffffff; border: 0; border-radius: 8px; padding: 10px 16px; font-size: 13px; font-weight: 600; cursor: pointer; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .toolbar { display: none; }
      .sheet { border: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <main class="sheet">
    <header style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:20px;border-bottom:1px solid #e6e4dd;flex-wrap:wrap;">
      <div>
        <div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;">BEE4</div>
        <p style="margin:4px 0 0;font-size:12px;color:#52525b;">Bengaluru Dispatch Studio · Curated Indian Lifestyle &amp; Gifting</p>
        <p style="margin:2px 0 0;font-size:12px;color:#52525b;">${escapeHtml(supportEmail)} · WhatsApp ${escapeHtml(whatsappDisplay)}</p>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px;font-weight:700;color:#b45309;">TAX / ORDER INVOICE</div>
        <div style="margin-top:4px;font-size:18px;font-weight:700;font-variant-numeric:tabular-nums;">${escapeHtml(order.orderNumber)}</div>
        <div style="margin-top:2px;font-size:12px;color:#52525b;">Date: ${formattedDate} · Status: ${escapeHtml(order.status)}</div>
      </div>
    </header>

    <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;padding:20px 0;border-bottom:1px solid #e6e4dd;font-size:13px;">
      <div>
        <div style="font-size:11px;font-weight:700;color:#71717a;margin-bottom:6px;">BILLED &amp; DELIVERED TO</div>
        <div style="font-weight:700;color:#18181b;">${escapeHtml(order.customer.fullName)}</div>
        <div style="margin-top:4px;color:#3f3f46;line-height:1.5;">
          ${escapeHtml(order.customer.address)}<br/>
          ${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.state)} — ${escapeHtml(order.customer.pinCode)}
        </div>
        <div style="margin-top:4px;color:#52525b;">Phone: ${escapeHtml(order.customer.phone)}${order.customer.email ? ` · ${escapeHtml(order.customer.email)}` : ''}</div>
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;color:#71717a;margin-bottom:6px;">PAYMENT &amp; FULFILLMENT</div>
        <div style="color:#18181b;"><strong>Payment Method:</strong> ${escapeHtml(paymentLabel)}</div>
        <div style="margin-top:4px;color:#3f3f46;"><strong>Gift Wrap:</strong> ${order.giftWrap ? 'Included (Kraft Wrap &amp; Note Card)' : 'Standard Eco Packaging'}</div>
        ${order.giftMessage ? `<div style="margin-top:4px;color:#52525b;"><strong>Gift Note:</strong> &ldquo;${escapeHtml(order.giftMessage)}&rdquo;</div>` : ''}
      </div>
    </section>

    <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;">
      <thead>
        <tr style="background:#f7f6f2;text-align:left;font-size:12px;color:#52525b;">
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;">#</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;">Item</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;">Qty</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;">Price</th>
          <th style="padding:10px 12px;border-bottom:1px solid #e6e4dd;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <section style="margin-top:20px;display:flex;justify-content:flex-end;">
      <div style="width:100%;max-width:300px;font-size:13px;line-height:1.8;">
        <div style="display:flex;justify-content:space-between;color:#52525b;">
          <span>Subtotal (incl. GST)</span>
          <span style="font-variant-numeric:tabular-nums;">${escapeHtml(formatINR(order.subtotal))}</span>
        </div>
        ${
          order.discount > 0
            ? `<div style="display:flex;justify-content:space-between;color:#047857;">
                <span>Promo Discount</span>
                <span style="font-variant-numeric:tabular-nums;">&minus;${escapeHtml(formatINR(order.discount))}</span>
              </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;color:#52525b;">
          <span>Shipping</span>
          <span style="font-variant-numeric:tabular-nums;">${order.shippingFee === 0 ? 'FREE' : escapeHtml(formatINR(order.shippingFee))}</span>
        </div>
        ${
          order.giftWrapFee > 0
            ? `<div style="display:flex;justify-content:space-between;color:#52525b;">
                <span>Kraft Gift Wrap</span>
                <span style="font-variant-numeric:tabular-nums;">${escapeHtml(formatINR(order.giftWrapFee))}</span>
              </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:10px;border-top:2px solid #18181b;font-size:16px;font-weight:800;color:#18181b;">
          <span>Grand Total</span>
          <span style="font-variant-numeric:tabular-nums;">${escapeHtml(formatINR(order.total))}</span>
        </div>
      </div>
    </section>

    <footer style="margin-top:28px;padding-top:16px;border-top:1px solid #e6e4dd;font-size:11px;color:#71717a;">
      Thank you for shopping with BEE4 India. All prices include applicable taxes. For order support, contact ${escapeHtml(supportEmail)} or WhatsApp ${escapeHtml(whatsappDisplay)}.
    </footer>
  </main>
</body>
</html>`;
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
