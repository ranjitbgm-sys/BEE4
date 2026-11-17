import { FormEvent, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Gift,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { INDIAN_STATES } from '../data/catalog';
import {
  CartItem,
  CheckoutErrors,
  CheckoutFormValues,
  CouponRecord,
  CustomerProfile,
  OrderNotificationDispatchResult,
  OrderRecord,
  PaymentMethod,
  SavedAddress,
} from '../types';
import {
  buildOrderConfirmationEmailPayload,
  buildOrderSmsConfirmationText,
  buildWhatsAppUrl,
  calculateCartTotals,
  downloadOrderInvoice,
  formatINR,
  formatPaymentMethodLabel,
  generateOrderNumber,
  getInvoiceFilename,
  isCodPaymentMethod,
  resolveCanonicalOrderPayment,
  validateCheckoutForm,
  WELCOME_PROMO_CODE,
} from '../utils/storeLogic';
import { OrderSuccessConfetti } from './OrderSuccessConfetti';
import { ProductImage } from './ProductImage';

interface CheckoutViewProps {
  items: CartItem[];
  currentCustomer?: CustomerProfile | null;
  whatsappNumber: string;
  supportEmail?: string;
  freeShippingThreshold: number;
  standardShippingFee?: number;
  giftWrapFee?: number;
  giftWrapEnabled?: boolean;
  codHandlingFee?: number;
  upiEnabled?: boolean;
  codEnabled?: boolean;
  whatsappOrderEnabled?: boolean;
  upiVpa?: string;
  coupons?: CouponRecord[];
  expectedPromoCode: string;
  promoDiscountPercent: number;
  onBackToShop: () => void;
  onOrderComplete: (order: OrderRecord) => Promise<void> | void;
  onSaveAddress?: (address: Omit<SavedAddress, 'id' | 'isDefault'>) => void;
  onNavigateToAccount?: () => void;
}

export function CheckoutView({
  items,
  currentCustomer,
  whatsappNumber,
  supportEmail = 'hello@bee4.in',
  freeShippingThreshold,
  standardShippingFee = 49,
  giftWrapFee = 49,
  giftWrapEnabled = true,
  codHandlingFee = 0,
  upiEnabled = true,
  codEnabled = true,
  whatsappOrderEnabled = true,
  upiVpa = 'bee4studio@okaxis',
  coupons,
  expectedPromoCode,
  promoDiscountPercent,
  onBackToShop,
  onOrderComplete,
  onSaveAddress,
  onNavigateToAccount,
}: CheckoutViewProps) {
  const defaultAddress =
    currentCustomer?.addresses.find((a) => a.isDefault) ?? currentCustomer?.addresses[0] ?? null;

  const fallbackPayment: PaymentMethod = upiEnabled
    ? 'upi'
    : 'cod';
  const initialPayment: PaymentMethod =
    isCodPaymentMethod(currentCustomer?.preferredPayment) && codEnabled
      ? 'cod'
      : upiEnabled
        ? 'upi'
        : fallbackPayment;

  const walletBalanceAvailable = Math.max(
    0,
    Math.round(Number(currentCustomer?.walletBalance ?? 0))
  );
  const [useWalletBalance, setUseWalletBalance] = useState<boolean>(false);
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
    paymentMethod: initialPayment,
    giftWrap: false,
    giftMessage: '',
    promoCode: '',
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSubmitError, setOrderSubmitError] = useState<string>('');
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);
  const [downloadedFilename, setDownloadedFilename] = useState<string>('');
  const [notificationResult, setNotificationResult] =
    useState<OrderNotificationDispatchResult | null>(null);
  const [isDispatchingNotifications, setIsDispatchingNotifications] = useState<boolean>(false);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(false);
  const [copiedSms, setCopiedSms] = useState<boolean>(false);

  useEffect(() => {
    if (!currentCustomer) return;
    const custDefault =
      currentCustomer.addresses.find((a) => a.isDefault) ?? currentCustomer.addresses[0] ?? null;
    if (custDefault && !selectedAddressId) {
      setSelectedAddressId(custDefault.id);
    }
    if (currentCustomer.addresses.length === 0) {
      setSaveAddressToAccount(true);
    }
    setForm((prev) => ({
      ...prev,
      fullName: prev.fullName || custDefault?.fullName || currentCustomer.fullName || '',
      phone: prev.phone || custDefault?.phone || currentCustomer.phone || '',
      email: prev.email || currentCustomer.email || '',
      address: prev.address || custDefault?.address || '',
      city: prev.city || custDefault?.city || '',
      state: custDefault?.state && !prev.address ? custDefault.state : prev.state,
      pinCode: prev.pinCode || custDefault?.pinCode || '',
    }));
  }, [currentCustomer, selectedAddressId]);

  useEffect(() => {
    if (confirmedOrder) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [confirmedOrder]);

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
    giftWrap: giftWrapEnabled ? form.giftWrap : false,
    promoCode: form.promoCode,
    freeShippingThreshold,
    standardShippingFee,
    giftWrapFee,
    codHandlingFee,
    paymentMethod: form.paymentMethod,
    coupons,
    expectedPromoCode,
    promoDiscountPercent,
    walletBalanceAvailable,
    useWalletBalance,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (items.length === 0 || isSubmittingOrder) return;

    const validationErrors = validateCheckoutForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setOrderSubmitError('');
      return;
    }

    const effectiveGiftWrap = giftWrapEnabled && form.giftWrap;
    const canonicalPayment = resolveCanonicalOrderPayment({
      selectedMethod: form.paymentMethod,
      walletAmountUsed: totals.walletAmountApplied,
      totalAmount: totals.total,
    });

    const newOrder: OrderRecord = {
      orderNumber: generateOrderNumber(),
      userId: currentCustomer?.id ?? null,
      createdAt: new Date().toISOString(),
      items: [...items],
      subtotal: totals.subtotal,
      discount: totals.discount,
      shippingFee: totals.shippingFee,
      giftWrapFee: totals.giftWrapFee,
      codFee: totals.codFee,
      total: totals.total,
      walletAmountUsed: totals.walletAmountApplied,
      paymentMethod: canonicalPayment.paymentMethod,
      paymentStatus: canonicalPayment.paymentStatus,
      orderChannel: canonicalPayment.orderChannel,
      couponCode: totals.promoApplied ? form.promoCode.trim().toUpperCase() : '',
      customer: {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pinCode: form.pinCode.trim(),
      },
      giftWrap: effectiveGiftWrap,
      giftMessage: effectiveGiftWrap ? form.giftMessage.trim() : '',
      status: 'Pending',
      fulfillmentStage: 'New / Unverified',
      operationalBucket: 'New / Upcoming',
    };

    const dispatchOrderNotifications = async (order: OrderRecord) => {
      setIsDispatchingNotifications(true);
      const smsPreview = buildOrderSmsConfirmationText(order, { whatsappNumber });
      const emailPayload = buildOrderConfirmationEmailPayload(order, {
        supportEmail,
        whatsappNumber,
      });

      const buildFallbackResult = (): OrderNotificationDispatchResult => {
        const cleanDigits = order.customer.phone.replace(/\D/g, '');
        const normalizedPhone =
          cleanDigits.length === 12 && cleanDigits.startsWith('91')
            ? `+${cleanDigits}`
            : cleanDigits.length === 10
              ? `+91${cleanDigits}`
              : order.customer.phone;

        return {
          orderNumber: order.orderNumber,
          dispatchedAt: new Date().toISOString(),
          sms: {
            channel: 'sms',
            target: normalizedPhone,
            status: 'preview',
            provider: 'instant-preview',
            detail: `Order confirmation ready for ${normalizedPhone}.`,
            previewText: smsPreview,
          },
          email: {
            channel: 'email',
            target: order.customer.email,
            status: 'preview',
            provider: 'instant-preview',
            detail: `Order confirmation & invoice (${emailPayload.invoiceFilename}) ready for ${order.customer.email}.`,
            previewText: emailPayload.textBody,
            invoiceFilename: emailPayload.invoiceFilename,
          },
        };
      };

      try {
        const response = await fetch('/api/orders/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order,
            supportEmail,
            whatsappNumber,
          }),
        });
        if (response.ok) {
          const data = (await response.json()) as OrderNotificationDispatchResult;
          setNotificationResult(data);
        } else {
          setNotificationResult(buildFallbackResult());
        }
      } catch {
        setNotificationResult(buildFallbackResult());
      } finally {
        setIsDispatchingNotifications(false);
      }
    };

    setIsSubmittingOrder(true);
    setOrderSubmitError('');
    try {
      await onOrderComplete(newOrder);
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
      void dispatchOrderNotifications(newOrder);
    } catch (err) {
      console.error('[BEE4 Checkout] Unable to place order:', err);
      setOrderSubmitError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to save your order right now. Please check your connection and try again.'
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  if (confirmedOrder) {
    const paymentLabel = formatPaymentMethodLabel(confirmedOrder.paymentMethod);

    const whatsAppConfirmUrl = buildWhatsAppUrl(
      `Hi BEE4! My order ${confirmedOrder.orderNumber} for ${formatINR(confirmedOrder.total)} (${paymentLabel}) is placed for ${confirmedOrder.customer.city}, PIN ${confirmedOrder.customer.pinCode}.`,
      whatsappNumber
    );

    const emailPayload = buildOrderConfirmationEmailPayload(confirmedOrder, {
      supportEmail,
      whatsappNumber,
    });
    const invoiceFilename =
      notificationResult?.email.invoiceFilename || getInvoiceFilename(confirmedOrder.orderNumber);
    const smsText =
      notificationResult?.sms.previewText ||
      buildOrderSmsConfirmationText(confirmedOrder, { whatsappNumber });
    const smsWhatsAppUrl = buildWhatsAppUrl(smsText, whatsappNumber);
    const mailtoUrl = `mailto:${encodeURIComponent(confirmedOrder.customer.email)}?subject=${encodeURIComponent(
      emailPayload.subject
    )}&body=${encodeURIComponent(emailPayload.textBody)}`;

    const handleCopySms = async () => {
      try {
        await navigator.clipboard.writeText(smsText);
        setCopiedSms(true);
        window.setTimeout(() => setCopiedSms(false), 2000);
      } catch {
        setCopiedSms(false);
      }
    };

    return (
      <section className="max-w-[780px] mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden glass-surface rounded-3xl p-6 sm:p-10"
        >
          <OrderSuccessConfetti active={Boolean(confirmedOrder)} orderKey={confirmedOrder.orderNumber} />
          <div className="relative z-20 flex items-center gap-3 text-emerald-700 dark:text-emerald-300">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.08 }}
              className="w-10 h-10 rounded-full glass-orb flex items-center justify-center shrink-0"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            </motion.div>
            <span className="text-xs font-semibold tracking-wide">
              Order {confirmedOrder.orderNumber} Placed — Status: {confirmedOrder.status}
            </span>
          </div>

          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
            Thank you, {confirmedOrder.customer.fullName}!
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Your BEE4 order has been saved ({confirmedOrder.status}). Expected pan-India delivery in 3–5 business days to{' '}
            <span className="font-medium text-zinc-900 dark:text-white">
              {confirmedOrder.customer.city}, {confirmedOrder.customer.state} (PIN{' '}
              {confirmedOrder.customer.pinCode})
            </span>
            .
          </p>

          {/* Confirmation & Invoice Dispatch Status */}
          <div
            data-testid="order-dispatch-panel"
            className="mt-6 glass-subtle rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold tracking-wide text-zinc-800 dark:text-zinc-100">
                Confirmation &amp; Invoice Dispatch
              </h2>
              {isDispatchingNotifications ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending mobile &amp; email confirmation...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirmation &amp; invoice processed</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Mobile SMS Channel */}
              <div className="rounded-xl border border-white/75 dark:border-white/15 bg-white/55 dark:bg-slate-900/55 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Smartphone className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Mobile Confirmation</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 tabular-nums truncate">
                        {notificationResult?.sms.target || confirmedOrder.customer.phone}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg shrink-0 ${
                      notificationResult?.sms.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : notificationResult?.sms.status === 'failed'
                          ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {notificationResult?.sms.status === 'sent'
                      ? `Sent (${notificationResult.sms.provider})`
                      : notificationResult?.sms.status === 'failed'
                        ? 'Attention'
                        : 'SMS Ready'}
                  </span>
                </div>

                {notificationResult?.sms.detail && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {notificationResult.sms.detail}
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-white/80 dark:border-white/12 text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {smsText}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleCopySms}
                    className="px-2.5 py-1.5 rounded-lg glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5"
                  >
                    {copiedSms ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
                        <span>Copied SMS</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy SMS</span>
                      </>
                    )}
                  </button>
                  <a
                    href={smsWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-lg glass-btn-secondary text-xs font-semibold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Send via WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Email + Invoice Channel */}
              <div className="rounded-xl border border-white/75 dark:border-white/15 bg-white/55 dark:bg-slate-900/55 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">Email &amp; Invoice</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                        {notificationResult?.email.target || confirmedOrder.customer.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg shrink-0 ${
                      notificationResult?.email.status === 'sent'
                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : notificationResult?.email.status === 'failed'
                          ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                          : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    {notificationResult?.email.status === 'sent'
                      ? `Sent (${notificationResult.email.provider})`
                      : notificationResult?.email.status === 'failed'
                        ? 'Attention'
                        : 'Email Ready'}
                  </span>
                </div>

                {notificationResult?.email.detail && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {notificationResult.email.detail}
                  </p>
                )}

                <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-white/80 dark:border-white/12 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                      {invoiceFilename}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const filename = downloadOrderInvoice(confirmedOrder, {
                        supportEmail,
                        whatsappNumber,
                      });
                      setDownloadedFilename(filename);
                    }}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 shrink-0"
                  >
                    Save
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setShowEmailPreview((prev) => !prev)}
                    className="px-2.5 py-1.5 rounded-lg glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5"
                  >
                    {showEmailPreview ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Email</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Email</span>
                      </>
                    )}
                  </button>
                  <a
                    href={mailtoUrl}
                    className="px-2.5 py-1.5 rounded-lg glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Open Email App</span>
                  </a>
                </div>
              </div>
            </div>

            {showEmailPreview && (
              <div
                data-testid="email-confirmation-preview"
                className="rounded-xl border border-white/80 dark:border-white/15 bg-white/75 dark:bg-slate-950/75 p-4 space-y-2"
              >
                <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5 border-b border-zinc-900/10 dark:border-white/10 pb-2">
                  <p>
                    <span className="font-semibold text-zinc-900 dark:text-white">To:</span>{' '}
                    {confirmedOrder.customer.email}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-900 dark:text-white">Subject:</span>{' '}
                    {emailPayload.subject}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-900 dark:text-white">Attachment:</span>{' '}
                    {invoiceFilename}
                  </p>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {emailPayload.textBody}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-b border-zinc-900/10 dark:border-white/10 py-6 space-y-4">
            <h2 className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
              Order Receipt
            </h2>
            <ul className="space-y-3">
              {confirmedOrder.items.map((item) => (
                <li
                  key={`${item.productId}::${item.variant}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-zinc-800 dark:text-zinc-200">
                    {item.title} ({item.variant}) × {item.quantity}
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-900 dark:text-white">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="pt-4 border-t border-zinc-900/8 dark:border-white/10 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatINR(confirmedOrder.subtotal)}</span>
              </div>
              {confirmedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                  <span>Promo Discount</span>
                  <span className="tabular-nums">−{formatINR(confirmedOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {confirmedOrder.shippingFee === 0
                    ? 'FREE'
                    : formatINR(confirmedOrder.shippingFee)}
                </span>
              </div>
              {confirmedOrder.giftWrap && (
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>Kraft Gift Wrap &amp; Card</span>
                  <span className="tabular-nums">{formatINR(confirmedOrder.giftWrapFee)}</span>
                </div>
              )}
              {(confirmedOrder.codFee ?? 0) > 0 && (
                <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                  <span>COD Handling Fee</span>
                  <span className="tabular-nums">{formatINR(confirmedOrder.codFee ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-white pt-2 border-t border-zinc-900/10 dark:border-white/10">
                <span>Total · {paymentLabel}</span>
                <span className="tabular-nums">{formatINR(confirmedOrder.total)}</span>
              </div>
            </div>

            {confirmedOrder.giftMessage && (
              <div className="p-3.5 rounded-2xl glass-subtle text-xs text-zinc-700 dark:text-zinc-200">
                <span className="font-semibold text-zinc-900 dark:text-white">Gift Note: </span>
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
              className="px-5 py-3 rounded-xl glass-btn-ink text-white dark:text-zinc-950 text-sm font-semibold inline-flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Invoice</span>
            </button>
            <button
              type="button"
              onClick={onBackToShop}
              className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
            >
              Continue Shopping
            </button>
            {onNavigateToAccount && (
              <button
                type="button"
                onClick={onNavigateToAccount}
                className="px-5 py-3 rounded-xl glass-btn-secondary text-zinc-900 dark:text-zinc-100 text-sm font-semibold transition-all"
              >
                Track in My Account
              </button>
            )}
            <a
              href={whatsAppConfirmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-xl glass-btn-secondary text-zinc-800 dark:text-zinc-100 text-sm font-semibold inline-flex items-center gap-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Track / Confirm via WhatsApp</span>
            </a>
          </div>
          {downloadedFilename && (
            <p role="status" className="mt-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Downloaded {downloadedFilename}. Open it anytime to print or save as PDF.
            </p>
          )}
        </motion.div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="max-w-[720px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="glass-surface rounded-3xl p-10">
          <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">Your bag is empty</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Add at least one brain-training toy to your bag before heading to checkout.
          </p>
          <button
            type="button"
            onClick={onBackToShop}
            className="mt-6 px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
          >
            Browse BEE4 Toy Library
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Store</span>
      </button>

      <h1 className="font-display text-3xl font-bold text-zinc-900 dark:text-white mb-8">Checkout</h1>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Shipping, Gift Wrap & Payment */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-surface rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">1. Delivery Details</h2>
              {currentCustomer ? (
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Signed in as {currentCustomer.fullName}
                </span>
              ) : (
                onNavigateToAccount && (
                  <button
                    type="button"
                    onClick={onNavigateToAccount}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800"
                  >
                    Sign in for saved addresses →
                  </button>
                )
              )}
            </div>

            {currentCustomer && currentCustomer.addresses.length > 0 && (
              <div className="p-3.5 rounded-2xl glass-subtle space-y-2">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
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
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                          active
                            ? 'border-amber-600 bg-white/95 dark:bg-slate-900/80 text-zinc-900 dark:text-white shadow-sm'
                            : 'border-white/75 dark:border-white/15 bg-white/55 dark:bg-slate-900/45 text-zinc-700 dark:text-zinc-200 hover:bg-white/85 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <p className="font-bold text-zinc-900 dark:text-white">
                          {addr.label} · {addr.city} (<span className="tabular-nums">{addr.pinCode}</span>)
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-300 truncate mt-0.5">{addr.address}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                />
                {errors.fullName && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.fullName}</p>}
              </div>

              <div>
                <label htmlFor="checkout-phone" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.phone}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="checkout-email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                Email Address (for order confirmation &amp; invoice) *
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
                className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="checkout-address" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
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
                className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
              />
              {errors.address && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.address}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="checkout-city" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                />
                {errors.city && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.city}</p>}
              </div>

              <div>
                <label htmlFor="checkout-state" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                  State *
                </label>
                <select
                  id="checkout-state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                {errors.state && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.state}</p>}
              </div>

              <div>
                <label htmlFor="checkout-pin" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
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
                  className="w-full px-3.5 py-2.5 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                />
                {errors.pinCode && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.pinCode}</p>}
              </div>
            </div>

            {currentCustomer && (
              <label className="inline-flex items-center gap-2 pt-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
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
          {giftWrapEnabled && (
            <div className="glass-surface rounded-3xl p-6 space-y-3">
              <div className="flex items-start gap-3">
                <input
                  id="checkout-giftwrap"
                  type="checkbox"
                  checked={form.giftWrap}
                  onChange={(e) => setForm({ ...form, giftWrap: e.target.checked })}
                  className="mt-1 w-4 h-4 accent-amber-600"
                />
                <label htmlFor="checkout-giftwrap" className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                  <span>Add Kraft Gift Wrap &amp; Handwritten Note Card (+{formatINR(giftWrapFee)})</span>
                </label>
              </div>

              {form.giftWrap && (
                <div>
                  <label htmlFor="checkout-giftmsg" className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-1.5">
                    Your Gift Message (optional)
                  </label>
                  <textarea
                    id="checkout-giftmsg"
                    rows={2}
                    value={form.giftMessage}
                    onChange={(e) => setForm({ ...form, giftMessage: e.target.value })}
                    placeholder="Happy Birthday! Hope your child enjoys building screen-free."
                    className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Payment Method */}
          <div className="glass-surface rounded-3xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">2. Payment Method</h2>
              {upiEnabled && upiVpa && (
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  Direct Studio VPA: {upiVpa}
                </span>
              )}
            </div>

            {currentCustomer && walletBalanceAvailable > 0 && (
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm transition hover:bg-emerald-500/15">
                <span className="flex items-center gap-3">
                  <input
                    id="checkout-use-wallet"
                    type="checkbox"
                    checked={useWalletBalance}
                    onChange={(e) => setUseWalletBalance(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <strong className="inline-flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Use BEE4 Wallet Balance ({formatINR(walletBalanceAvailable)})
                    </strong>
                    <span className="block text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                      {useWalletBalance
                        ? `${formatINR(totals.walletAmountApplied)} applied · Remaining due: ${formatINR(totals.remainingPayable)}`
                        : 'Apply gift card & refund credits toward this order'}
                    </span>
                  </span>
                </span>
              </label>
            )}

            {totals.walletAmountApplied > 0 && totals.remainingPayable === 0 ? (
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  100% Covered by BEE4 Wallet
                </span>
                <span className="tabular-nums">{formatINR(totals.walletAmountApplied)}</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Payment method">
                {(
                  [
                    ...(upiEnabled
                      ? [
                          {
                            id: 'upi' as PaymentMethod,
                            label: 'Direct UPI / QR (GPay, PhonePe, Paytm)',
                            note: upiVpa
                              ? `Scan / Pay to ${upiVpa} · Instant confirmation`
                              : 'Zero extra fee · Instant Prepaid',
                          },
                        ]
                      : []),
                    ...(codEnabled
                      ? [
                          {
                            id: 'cod' as PaymentMethod,
                            label: 'Cash on Delivery (COD)',
                            note:
                              codHandlingFee > 0
                                ? `+${formatINR(codHandlingFee)} COD handling fee`
                                : 'Pay in cash or UPI at your doorstep',
                          },
                        ]
                      : []),
                  ]
                ).map((method) => {
                  const active = form.paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setForm({ ...form, paymentMethod: method.id })}
                      className={`p-3.5 rounded-2xl border text-left transition-all ${
                        active
                          ? 'border-amber-600 bg-amber-50/75 dark:bg-amber-950/50 backdrop-blur-md shadow-sm'
                          : 'border-white/75 dark:border-white/15 bg-white/55 dark:bg-slate-900/45 hover:bg-white/85 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{method.label}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-300 mt-0.5">{method.note}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-5 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">Order Summary</h2>

          <ul className="divide-y divide-zinc-900/8 dark:divide-white/10">
            {items.map((item) => (
              <li key={`${item.productId}::${item.variant}`} className="py-3 flex items-center gap-3">
                <div className="w-14 h-12 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-900/60 border border-white/75 dark:border-white/15 shrink-0">
                  <ProductImage
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-300">
                    {item.variant} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                  {formatINR(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div>
            <label htmlFor="checkout-promo" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
              Promo Code (try {expectedPromoCode || WELCOME_PROMO_CODE} for {promoDiscountPercent}% off)
            </label>
            <input
              id="checkout-promo"
              type="text"
              value={form.promoCode}
              onChange={(e) => setForm({ ...form, promoCode: e.target.value })}
              placeholder={`Enter ${expectedPromoCode || WELCOME_PROMO_CODE}`}
              className="w-full px-3.5 py-2 text-sm glass-input rounded-xl uppercase focus:outline-none"
            />
            {totals.promoApplied && (
              <p className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Promo savings of {formatINR(totals.discount)} applied!
              </p>
            )}
            {!totals.promoApplied && form.promoCode.trim().length > 0 && totals.promoReason && (
              <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                {totals.promoReason}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-900/10 dark:border-white/10 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
              <span>Subtotal</span>
              <span className="tabular-nums font-medium text-zinc-900 dark:text-white">
                {formatINR(totals.subtotal)}
              </span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>Promo Savings</span>
                <span className="tabular-nums font-medium">−{formatINR(totals.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
              <span>Shipping</span>
              <span className="tabular-nums font-medium text-zinc-900 dark:text-white">
                {totals.shippingFee === 0 ? 'FREE' : formatINR(totals.shippingFee)}
              </span>
            </div>
            {totals.giftWrapFee > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Kraft Gift Wrap</span>
                <span className="tabular-nums font-medium text-zinc-900 dark:text-white">
                  {formatINR(totals.giftWrapFee)}
                </span>
              </div>
            )}
            {totals.codFee > 0 && (
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>COD Handling Fee</span>
                <span className="tabular-nums font-medium text-zinc-900 dark:text-white">
                  {formatINR(totals.codFee)}
                </span>
              </div>
            )}
            {totals.walletAmountApplied > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                <span>BEE4 Wallet Applied</span>
                <span className="tabular-nums font-medium">−{formatINR(totals.walletAmountApplied)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-zinc-900 dark:text-white pt-3 border-t border-zinc-900/10 dark:border-white/10">
              <span>{totals.walletAmountApplied > 0 ? 'Net Payable' : 'Total Payable'}</span>
              <span className="tabular-nums">{formatINR(totals.remainingPayable)}</span>
            </div>
          </div>

          {orderSubmitError && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-red-50/90 dark:bg-red-950/55 backdrop-blur-md border border-red-200 dark:border-red-500/35 text-xs text-red-700 dark:text-red-300 font-medium flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Could not place order</p>
                <p className="mt-0.5 leading-relaxed">{orderSubmitError}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmittingOrder}
            className="w-full py-3.5 px-6 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {isSubmittingOrder ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Placing Order...</span>
              </>
            ) : (
              <span>
                {totals.remainingPayable === 0
                  ? `Place Order · Paid with Wallet (${formatINR(totals.total)})`
                  : `Place Order · ${formatINR(totals.remainingPayable)}`}
              </span>
            )}
          </button>

          {whatsappOrderEnabled && (
            <a
              href={buildWhatsAppUrl(
                `Hi BEE4 Studio! I'd like to place an order for:\n${items
                  .map((i) => `• ${i.title} (${i.variant}) × ${i.quantity}`)
                  .join('\n')}\nEstimated Total: ${formatINR(totals.total)}`,
                whatsappNumber
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl glass-btn-secondary text-zinc-800 dark:text-zinc-100 text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Express Order via WhatsApp Desk</span>
            </a>
          )}

          <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <span>Safe Indian checkout · 7-day replacement guarantee</span>
          </p>
        </div>
      </form>
    </section>
  );
}
