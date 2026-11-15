import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Gift,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { INDIAN_STATES } from '../data/catalog';
import {
  CartItem,
  CheckoutErrors,
  CheckoutFormValues,
  CustomerProfile,
  OrderRecord,
  PaymentMethod,
  SavedAddress,
} from '../types';
import {
  buildWhatsAppUrl,
  calculateCartTotals,
  downloadOrderInvoice,
  formatINR,
  generateOrderNumber,
  validateCheckoutForm,
  WELCOME_PROMO_CODE,
} from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface CheckoutViewProps {
  items: CartItem[];
  currentCustomer?: CustomerProfile | null;
  whatsappNumber: string;
  supportEmail?: string;
  freeShippingThreshold: number;
  expectedPromoCode: string;
  promoDiscountPercent: number;
  onBackToShop: () => void;
  onOrderComplete: (order: OrderRecord) => void;
  onSaveAddress?: (address: Omit<SavedAddress, 'id' | 'isDefault'>) => void;
  onNavigateToAccount?: () => void;
}

export function CheckoutView({
  items,
  currentCustomer,
  whatsappNumber,
  supportEmail = 'hello@bee4.in',
  freeShippingThreshold,
  expectedPromoCode,
  promoDiscountPercent,
  onBackToShop,
  onOrderComplete,
  onSaveAddress,
  onNavigateToAccount,
}: CheckoutViewProps) {
  const defaultAddress =
    currentCustomer?.addresses.find((a) => a.isDefault) ?? currentCustomer?.addresses[0] ?? null;

  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddress?.id ?? '');
  const [saveAddressToAccount, setSaveAddressToAccount] = useState<boolean>(
    Boolean(currentCustomer && currentCustomer.addresses.length === 0)
  );
  const [form, setForm] = useState<CheckoutFormValues>({
    fullName: defaultAddress?.fullName || currentCustomer?.fullName || '',
    phone: defaultAddress?.phone || currentCustomer?.phone || '',
    email: currentCustomer?.email || '',
    address: defaultAddress?.address || '',
    city: defaultAddress?.city || '',
    state: defaultAddress?.state || 'Karnataka',
    pinCode: defaultAddress?.pinCode || '',
    paymentMethod: currentCustomer?.preferredPayment || 'upi',
    giftWrap: false,
    giftMessage: '',
    promoCode: '',
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [downloadedFilename, setDownloadedFilename] = useState<string>('');

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setSaveAddressToAccount(false);
    setForm((prev) => ({
      ...prev,
      fullName: addr.fullName,
      phone: addr.phone,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      pinCode: addr.pinCode,
    }));
    setErrors({});
  };

  const totals = calculateCartTotals(items, {
    giftWrap: form.giftWrap,
    promoCode: form.promoCode,
    freeShippingThreshold,
    expectedPromoCode,
    promoDiscountPercent,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (items.length === 0) return;

    const validationErrors = validateCheckoutForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const newOrder: OrderRecord = {
      orderNumber: generateOrderNumber(),
      createdAt: new Date().toISOString(),
      items: [...items],
      subtotal: totals.subtotal,
      discount: totals.discount,
      shippingFee: totals.shippingFee,
      giftWrapFee: totals.giftWrapFee,
      total: totals.total,
      paymentMethod: form.paymentMethod,
      customer: {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
      },
      giftWrap: form.giftWrap,
      giftMessage: form.giftMessage.trim(),
      status: 'Confirmed',
    };

    if (currentCustomer && onSaveAddress && saveAddressToAccount) {
      onSaveAddress({
        label: currentCustomer.addresses.length === 0 ? 'Home' : 'Other',
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
      });
    }

    setConfirmedOrder(newOrder);
    onOrderComplete(newOrder);
  };

  if (confirmedOrder) {
    const paymentLabel =
      confirmedOrder.paymentMethod === 'upi'
        ? 'UPI (GPay / PhonePe / Paytm)'
        : confirmedOrder.paymentMethod === 'card'
          ? 'Credit / Debit Card'
          : 'Cash on Delivery (COD)';

    const whatsAppConfirmUrl = buildWhatsAppUrl(
      `Hi BEE4! My order ${confirmedOrder.orderNumber} for ${formatINR(confirmedOrder.total)} (${paymentLabel}) is placed for ${confirmedOrder.customer.city}, PIN ${confirmedOrder.customer.pinCode}.`,
      whatsappNumber
    );

    return (
      <section className="max-w-[780px] mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-[#E6E4DD] rounded-2xl p-6 sm:p-10">
          <div className="flex items-center gap-3 text-emerald-700">
            <CheckCircle2 className="w-7 h-7 shrink-0" />
            <span className="text-xs font-semibold tracking-wide">
              Order {confirmedOrder.orderNumber} Confirmed — Preparing Shipment
            </span>
          </div>

          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-zinc-900">
            Thank you, {confirmedOrder.customer.fullName}!
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Your BEE4 order is confirmed. Expected pan-India delivery in 3–5 business days to{' '}
            <span className="font-medium text-zinc-900">
              {confirmedOrder.customer.city}, {confirmedOrder.customer.state} (PIN{' '}
              {confirmedOrder.customer.pinCode})
            </span>
            .
          </p>

          <div className="mt-8 border-t border-b border-[#E6E4DD] py-6 space-y-4">
            <h2 className="text-xs font-semibold tracking-wide text-zinc-500">
              Order Receipt
            </h2>
            <ul className="space-y-3">
              {confirmedOrder.items.map((item) => (
                <li
                  key={`${item.productId}::${item.variant}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-800">
                    {item.title} ({item.variant}) × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-900">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-[#F0EFEA] space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatINR(confirmedOrder.subtotal)}</span>
              </div>
              {confirmedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promo Discount</span>
                  <span className="tabular-nums">−{formatINR(confirmedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {confirmedOrder.shippingFee === 0
                    ? 'FREE'
                    : formatINR(confirmedOrder.shippingFee)}
                </span>
              </div>
              {confirmedOrder.giftWrap && (
                <div className="flex justify-between text-zinc-600">
                  <span>Kraft Gift Wrap &amp; Card</span>
                  <span className="tabular-nums">{formatINR(confirmedOrder.giftWrapFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-2 border-t border-[#E6E4DD]">
                <span>Total · {paymentLabel}</span>
                <span className="tabular-nums">{formatINR(confirmedOrder.total)}</span>
              </div>
            </div>

            {confirmedOrder.giftMessage && (
              <div className="p-3.5 rounded-xl bg-[#F7F6F2] text-xs text-zinc-700">
                <span className="font-semibold text-zinc-900">Gift Note: </span>
                {confirmedOrder.giftMessage}
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const filename = downloadOrderInvoice(confirmedOrder, {
                  supportEmail,
                  whatsappNumber,
                });
                setDownloadedFilename(filename);
              }}
              className="px-5 py-3 rounded-lg bg-zinc-900 hover:bg-amber-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Invoice</span>
            </button>
            <button
              type="button"
              onClick={onBackToShop}
              className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
            >
              Continue Shopping
            </button>
            {onNavigateToAccount && (
              <button
                type="button"
                onClick={onNavigateToAccount}
                className="px-5 py-3 rounded-lg border border-[#E6E4DD] bg-white hover:bg-[#F7F6F2] text-zinc-900 text-sm font-semibold transition-colors"
              >
                Track in My Account
              </button>
            )}
            <a
              href={whatsAppConfirmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-lg border border-[#E6E4DD] bg-white hover:bg-[#F7F6F2] text-zinc-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <span>Track / Confirm via WhatsApp</span>
            </a>
          </div>
          {downloadedFilename && (
            <p role="status" className="mt-3 text-xs font-medium text-emerald-700">
              Downloaded {downloadedFilename}. Open it anytime to print or save as PDF.
            </p>
          )}
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="max-w-[720px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-[#F7F6F2] border border-[#E6E4DD] rounded-2xl p-10">
          <h1 className="font-display text-2xl font-bold text-zinc-900">Your bag is empty</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Add at least one item to your bag before heading to checkout.
          </p>
          <button
            type="button"
            onClick={onBackToShop}
            className="mt-6 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
          >
            Browse BEE4 Products
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-16">
      <button
        type="button"
        onClick={onBackToShop}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 hover:text-zinc-900 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store</span>
      </button>

      <h1 className="font-display text-3xl font-bold text-zinc-900 mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping, Gift Wrap & Payment */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E6E4DD] rounded-2xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900">1. Delivery Details</h2>
              {currentCustomer ? (
                <span className="text-xs font-medium text-emerald-700">
                  Signed in as {currentCustomer.fullName}
                </span>
              ) : (
                onNavigateToAccount && (
                  <button
                    type="button"
                    onClick={onNavigateToAccount}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                  >
                    Sign in for saved addresses →
                  </button>
                )
              )}
            </div>

            {currentCustomer && currentCustomer.addresses.length > 0 && (
              <div className="p-3.5 rounded-xl bg-[#F7F6F2] border border-[#E6E4DD] space-y-2">
                <p className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>Quick-fill from saved addresses:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentCustomer.addresses.map((addr) => {
                    const active = selectedAddressId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(addr)}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-colors ${
                          active
                            ? 'border-amber-600 bg-white text-zinc-900'
                            : 'border-[#E6E4DD] bg-white/70 text-zinc-700 hover:bg-white'
                        }`}
                      >
                        <p className="font-bold text-zinc-900">
                          {addr.label} · {addr.city} (<span className="tabular-nums">{addr.pinCode}</span>)
                        </p>
                        <p className="text-zinc-600 truncate mt-0.5">{addr.address}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Full Name *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={form.fullName}
                  onChange={(e) => {
                    setForm({ ...form, fullName: e.target.value });
                    if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                  }}
                  placeholder="e.g. Riya Patel"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E4DD] rounded-lg focus:border-amber-600 focus:outline-none"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="checkout-phone" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Mobile Number (10 digits) *
                </label>
                <input
                  id="checkout-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value });
                    if (errors.phone) setErrors({ ...errors, phone: undefined });
                  }}
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E4DD] rounded-lg tabular-nums focus:border-amber-600 focus:outline-none"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="checkout-email" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address (for order updates)
              </label>
              <input
                id="checkout-email"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                placeholder="riya@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E6E4DD] rounded-lg focus:border-amber-600 focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="checkout-address" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                House / Flat No., Street &amp; Landmark *
              </label>
              <input
                id="checkout-address"
                type="text"
                value={form.address}
                onChange={(e) => {
                  setForm({ ...form, address: e.target.value });
                  if (errors.address) setErrors({ ...errors, address: undefined });
                }}
                placeholder="Flat 402, Indiranagar 12th Main"
                className="w-full px-3.5 py-2.5 text-sm border border-[#E6E4DD] rounded-lg focus:border-amber-600 focus:outline-none"
              />
              {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="checkout-city" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  City *
                </label>
                <input
                  id="checkout-city"
                  type="text"
                  value={form.city}
                  onChange={(e) => {
                    setForm({ ...form, city: e.target.value });
                    if (errors.city) setErrors({ ...errors, city: undefined });
                  }}
                  placeholder="Bengaluru"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E4DD] rounded-lg focus:border-amber-600 focus:outline-none"
                />
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
              </div>

              <div>
                <label htmlFor="checkout-state" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  State *
                </label>
                <select
                  id="checkout-state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-[#E6E4DD] rounded-lg bg-white focus:border-amber-600 focus:outline-none"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
              </div>

              <div>
                <label htmlFor="checkout-pin" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  PIN Code *
                </label>
                <input
                  id="checkout-pin"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.pinCode}
                  onChange={(e) => {
                    setForm({ ...form, pinCode: e.target.value });
                    if (errors.pinCode) setErrors({ ...errors, pinCode: undefined });
                  }}
                  placeholder="560038"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#E6E4DD] rounded-lg tabular-nums focus:border-amber-600 focus:outline-none"
                />
                {errors.pinCode && <p className="mt-1 text-xs text-red-600">{errors.pinCode}</p>}
              </div>
            </div>

            {currentCustomer && (
              <label className="inline-flex items-center gap-2 pt-1 text-xs font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={saveAddressToAccount}
                  onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Save this delivery address to my BEE4 account</span>
              </label>
            )}
          </div>

          {/* Gift Wrap Option */}
          <div className="bg-white border border-[#E6E4DD] rounded-2xl p-6 space-y-3">
            <div className="flex items-start gap-3">
              <input
                id="checkout-giftwrap"
                type="checkbox"
                checked={form.giftWrap}
                onChange={(e) => setForm({ ...form, giftWrap: e.target.checked })}
                className="mt-1 w-4 h-4 accent-amber-600"
              />
              <label htmlFor="checkout-giftwrap" className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-700" />
                <span>Add Kraft Gift Wrap &amp; Handwritten Note Card (+₹49)</span>
              </label>
            </div>

            {form.giftWrap && (
              <div>
                <label htmlFor="checkout-giftmsg" className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  Your Gift Message (optional)
                </label>
                <textarea
                  id="checkout-giftmsg"
                  rows={2}
                  value={form.giftMessage}
                  onChange={(e) => setForm({ ...form, giftMessage: e.target.value })}
                  placeholder="Happy Birthday! Hope you love these."
                  className="w-full px-3.5 py-2 text-sm border border-[#E6E4DD] rounded-lg focus:border-amber-600 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white border border-[#E6E4DD] rounded-2xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-zinc-900">2. Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Payment method">
              {(
                [
                  { id: 'upi', label: 'UPI (GPay / PhonePe)', note: 'Zero extra fee' },
                  { id: 'card', label: 'Debit / Credit Card', note: 'Visa, Mastercard, RuPay' },
                  { id: 'cod', label: 'Cash on Delivery', note: 'Pay at your doorstep' },
                ] as { id: PaymentMethod; label: string; note: string }[]
              ).map((method) => {
                const active = form.paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setForm({ ...form, paymentMethod: method.id })}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      active
                        ? 'border-amber-600 bg-amber-50/60'
                        : 'border-[#E6E4DD] bg-white hover:bg-[#F7F6F2]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-zinc-900">{method.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{method.note}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 bg-[#F7F6F2] border border-[#E6E4DD] rounded-2xl p-6 space-y-5 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold text-zinc-900">Order Summary</h2>

          <ul className="divide-y divide-[#E6E4DD]">
            {items.map((item) => (
              <li key={`${item.productId}::${item.variant}`} className="py-3 flex items-center gap-3">
                <div className="w-14 h-12 rounded-lg overflow-hidden bg-white border border-[#E6E4DD] shrink-0">
                  <ProductImage
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500">
                    {item.variant} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-zinc-900">
                  {formatINR(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="checkout-promo" className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Promo Code (try {expectedPromoCode || WELCOME_PROMO_CODE} for {promoDiscountPercent}% off)
            </label>
            <input
              id="checkout-promo"
              type="text"
              value={form.promoCode}
              onChange={(e) => setForm({ ...form, promoCode: e.target.value })}
              placeholder={`Enter ${expectedPromoCode || WELCOME_PROMO_CODE}`}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E6E4DD] rounded-lg uppercase focus:border-amber-600 focus:outline-none"
            />
            {totals.promoApplied && (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                {promoDiscountPercent}% welcome discount applied!
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-[#E6E4DD] space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {formatINR(totals.subtotal)}
              </span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Promo Savings</span>
                <span className="tabular-nums font-medium">−{formatINR(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600">
              <span>Shipping</span>
              <span className="tabular-nums font-medium text-zinc-900">
                {totals.shippingFee === 0 ? 'FREE' : formatINR(totals.shippingFee)}
              </span>
            </div>
            {totals.giftWrapFee > 0 && (
              <div className="flex justify-between text-zinc-600">
                <span>Kraft Gift Wrap</span>
                <span className="tabular-nums font-medium text-zinc-900">
                  {formatINR(totals.giftWrapFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-zinc-900 pt-3 border-t border-[#E6E4DD]">
              <span>Total Payable</span>
              <span className="tabular-nums">{formatINR(totals.total)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition-colors"
          >
            Place Order · {formatINR(totals.total)}
          </button>

          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            <span>Safe Indian checkout · 7-day replacement guarantee</span>
          </p>
        </div>
      </form>
    </section>
  );
}
