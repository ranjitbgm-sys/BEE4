import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Gift,
  Globe,
  Heart,
  HelpCircle,
  Image as ImageIcon,
  Info,
  KeyRound,
  Laptop,
  LifeBuoy,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Star,
  Trash2,
  Truck,
  Upload,
  User,
  Wallet,
} from 'lucide-react';
import { DEFAULT_STORE_SETTINGS, INDIAN_STATES } from '../data/catalog';
import {
  resendCustomerVerificationEmailSupabase,
  updateSupabaseUserPassword,
  uploadCustomDesignToSupabaseStorage,
  verifyCustomerEmailOtpSupabase,
} from '../services/supabaseStoreService';
import {
  AddressLabel,
  CartItem,
  CouponRecord,
  CustomerCustomDesign,
  CustomerGender,
  CustomerMessageRecord,
  CustomerMessageTopic,
  CustomerNotificationPreferences,
  CustomerPanelControls,
  CustomerProfile,
  GiftCardRecord,
  OrderRecord,
  PaymentMethod,
  Product,
  ProductQuestionRecord,
  ProductReviewRecord,
  ReturnRequestRecord,
  SavedAddress,
  SavedAddressErrors,
  StorePage,
  StoreSettings,
  SupportMessageRecord,
  SupportTicketRecord,
  SupportTicketStatus,
} from '../types';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  getAccountUiCopy,
  joinFirstLastName,
  logoutOtherDeviceSessions,
  normalizeCustomerPanelControls,
  splitFullName,
  validateUpiId,
} from '../utils/customerAccountLogic';
import { canCustomerCancelOrder } from '../utils/giftCardWalletLogic';
import { canCustomerReviewProduct } from '../utils/reviewsPolicyLogic';
import {
  CUSTOMER_RETURN_TRACKER_STEPS,
  buildCustomerReturnStepIndex,
  getOrderRmaStatusBadge,
  isOrderEligibleForReturn,
} from '../utils/rmaLogic';
import {
  ORDER_TRACKING_STEPS,
  buildWhatsAppUrl,
  downloadOrderInvoice,
  formatINR,
  formatPaymentMethodLabel,
  getCustomerOrders,
  getOrderTrackingStepIndex,
  normalizeIndianPhone10,
  validateSavedAddress,
} from '../utils/storeLogic';
import { CancelOrderModal } from './CancelOrderModal';
import { CustomerReturnModal } from './CustomerReturnModal';
import { ProductImage } from './ProductImage';
import { SupportLiveChatPanel } from './account/SupportLiveChatPanel';
import { UnifiedAuthView } from './account/UnifiedAuthView';

export type CustomerAccountTab =
  | 'overview'
  | 'orders'
  | 'wallet'
  | 'uploads'
  | 'wishlist'
  | 'addresses'
  | 'qa'
  | 'privacy'
  | 'support'
  | 'profile';

interface CustomerAccountViewProps {
  currentCustomer: CustomerProfile | null;
  existingCustomers?: CustomerProfile[];
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  giftCards?: GiftCardRecord[];
  customerMessages?: CustomerMessageRecord[];
  productQuestions?: ProductQuestionRecord[];
  supportTickets?: SupportTicketRecord[];
  supportMessages?: SupportMessageRecord[];
  coupons?: CouponRecord[];
  settings?: StoreSettings;
  products: Product[];
  guestWishlistIds: string[];
  whatsappNumber: string;
  supportEmail?: string;
  cloudUserEmail?: string | null;
  isCloudConnected?: boolean;
  customerPanelControls?: CustomerPanelControls;
  requestedTab?: CustomerAccountTab | null;
  onConsumeRequestedTab?: () => void;
  onTabChange?: (tab: CustomerAccountTab) => void;
  showInstallApp?: boolean;
  onInstallApp?: () => void;
  authRecoveryMode?: boolean;
  authVerificationNotice?: string;
  externalAuthError?: string | null;
  onClearExternalAuthError?: () => void;
  onClearAuthVerificationNotice?: () => void;
  onClearAuthRecoveryMode?: () => void;
  onGoogleSignIn?: () => Promise<void>;
  onSyncAuthenticatedUser?: (
    user: SupabaseUser,
    hints?: { fullName?: string; phone?: string }
  ) => Promise<void>;
  onCompleteCustomerAuth?: (customer: CustomerProfile) => void;
  onSignOut: () => void;
  onUpdateCustomer: (updated: CustomerProfile) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, variant: string, quantity: number, openDrawer: boolean) => void;
  onReorderItems: (items: CartItem[]) => void;
  onCancelOrder: (orderNumber: string, reason?: string) => Promise<void> | void;
  onCreateReturnRequest?: (rma: ReturnRequestRecord) => void;
  onOpenBuyGiftCardModal?: (mode?: 'personal' | 'bulk') => void;
  onRedeemGiftCard?: (
    code: string,
    pin: string
  ) => Promise<{ ok: boolean; creditedAmount?: number; error?: string }>;
  onSubmitCustomerMessage?: (
    msg: CustomerMessageRecord
  ) => Promise<{ ok: boolean; error?: string } | void> | void;
  onSubmitProductReview?: (review: ProductReviewRecord) => void;
  onSubmitProductQuestion?: (question: ProductQuestionRecord) => void;
  onCreateSupportTicket?: (input: {
    subject: string;
    linkedOrderNumber?: string;
    status: SupportTicketStatus;
    needsExecutive: boolean;
    initialMessages: {
      sender: 'customer' | 'bot' | 'executive';
      senderName: string;
      text: string;
      createdAt: string;
    }[];
  }) => SupportTicketRecord;
  onSendSupportMessage?: (
    ticket: SupportTicketRecord,
    message: {
      sender: 'customer' | 'bot' | 'executive';
      senderName: string;
      text: string;
    },
    ticketUpdates?: Partial<SupportTicketRecord>
  ) => void;
  onUpdateSupportTicket?: (updated: SupportTicketRecord) => void;
  onSelectProduct: (productId: string) => void;
  onNavigatePage?: (page: StorePage, orderNumber?: string) => void;
  onContinueShopping: () => void;
  onRefreshOrders?: () => Promise<void>;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const GENDERS: CustomerGender[] = ['Male', 'Female', 'Other'];
const AVATAR_PRESETS = ['🧸', '🧩', '🚀', '🦉', '🎨', '⭐'];

const EMPTY_ADDRESS_FORM = {
  label: 'Home' as AddressLabel,
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: 'Bihar',
  pinCode: '',
  isDefault: false,
};

const FAQS_DATA = [
  {
    q: 'How long does BEE4 delivery take across India?',
    a: 'All brain-training toys are printed and quality-checked in Banka, Bihar within 24–48 hours and typically arrive across Indian metros in 3–5 business days.',
  },
  {
    q: 'How does the 7-day replacement guarantee work?',
    a: 'If a toy arrives damaged or misses a part, open My Orders in your BEE4 Account and tap Request Return / Replacement within 7 days of delivery.',
  },
  {
    q: 'Are BEE4 3D-printed toys safe for young children?',
    a: 'Yes. Every puzzle is crafted from certified non-toxic Bio-PLA plant polymer with smooth chamfered edges. Clean gently with a cool damp cloth (keep away from >55°C heat).',
  },
  {
    q: 'Do BEE4 Digital Gift Cards expire quickly?',
    a: 'Gift cards are valid for 12 months from issue and can be redeemed instantaneously into your BEE4 Wallet across all brain toys, flasks, and custom gifts.',
  },
];

export function CustomerAccountView({
  currentCustomer,
  existingCustomers = [],
  orders,
  returns = [],
  giftCards = [],
  customerMessages = [],
  productQuestions = [],
  supportTickets = [],
  supportMessages = [],
  coupons = [],
  settings = DEFAULT_STORE_SETTINGS,
  products,
  guestWishlistIds,
  whatsappNumber,
  supportEmail = 'hello@bee4.in',
  isCloudConnected = false,
  customerPanelControls,
  requestedTab = null,
  onConsumeRequestedTab,
  onTabChange,
  showInstallApp = false,
  onInstallApp,
  authRecoveryMode = false,
  authVerificationNotice = '',
  externalAuthError = null,
  onClearExternalAuthError,
  onClearAuthVerificationNotice,
  onClearAuthRecoveryMode,
  onGoogleSignIn,
  onSyncAuthenticatedUser,
  onCompleteCustomerAuth,
  onSignOut,
  onUpdateCustomer,
  onToggleWishlist,
  onAddToCart,
  onReorderItems,
  onCancelOrder,
  onCreateReturnRequest,
  onOpenBuyGiftCardModal,
  onRedeemGiftCard,
  onSubmitCustomerMessage,
  onSubmitProductReview,
  onSubmitProductQuestion,
  onCreateSupportTicket,
  onSendSupportMessage,
  onUpdateSupportTicket,
  onSelectProduct,
  onNavigatePage,
  onContinueShopping,
  onRefreshOrders,
}: CustomerAccountViewProps) {
  const controls = normalizeCustomerPanelControls({ customerPanelControls });
  const lang: 'en' | 'hi' =
    controls.enableLanguageSwitcher && currentCustomer?.preferredLanguage === 'hi'
      ? 'hi'
      : 'en';
  const ui = getAccountUiCopy(lang);

  const [activeTab, setActiveTab] = useState<CustomerAccountTab>(requestedTab || 'overview');
  const [guestOrdersRequested, setGuestOrdersRequested] = useState(requestedTab === 'orders');
  const [accountToast, setAccountToast] = useState<string | null>(null);

  useEffect(() => {
    if (!requestedTab) return;
    setActiveTab(requestedTab);
    if (!currentCustomer && requestedTab === 'orders') {
      setGuestOrdersRequested(true);
    }
    onConsumeRequestedTab?.();
  }, [requestedTab, currentCustomer, onConsumeRequestedTab]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  // Orders search & filter + modals
  const [orderSearch, setOrderSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');
  const [isRefreshingOrders, setIsRefreshingOrders] = useState(false);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<OrderRecord | null>(null);
  const [returnModalOrder, setReturnModalOrder] = useState<OrderRecord | null>(null);

  // Inline ratings strip state
  const [inlineRatings, setInlineRatings] = useState<Record<string, number>>({});
  const [inlineComments, setInlineComments] = useState<Record<string, string>>({});
  const [ratedProductIds, setRatedProductIds] = useState<Record<string, boolean>>({});

  // Wallet & Gift Card Redeem + UPI
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPin, setVoucherPin] = useState('');
  const [redeemingCard, setRedeemingCard] = useState(false);
  const [redeemFeedback, setRedeemFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newUpiInput, setNewUpiInput] = useState('');
  const [upiError, setUpiError] = useState<string | null>(null);

  // Profile Editor state
  const nameSplit = splitFullName(currentCustomer?.fullName || '');
  const [editFirstName, setEditFirstName] = useState(
    currentCustomer?.firstName || nameSplit.firstName || ''
  );
  const [editLastName, setEditLastName] = useState(
    currentCustomer?.lastName || nameSplit.lastName || ''
  );
  const [editGender, setEditGender] = useState<CustomerGender | ''>(
    currentCustomer?.gender || ''
  );
  const [editPhone, setEditPhone] = useState(currentCustomer?.phone || '');
  const [editMonth, setEditMonth] = useState(currentCustomer?.celebrationMonth || '');
  const [editPayment, setEditPayment] = useState<PaymentMethod>(
    currentCustomer?.preferredPayment || 'UPI / Prepaid'
  );
  const [editAvatar, setEditAvatar] = useState(currentCustomer?.avatarUrl || '');
  const [verifyEmailToken, setVerifyEmailToken] = useState('');
  const [emailVerifyFeedback, setEmailVerifyFeedback] = useState<string | null>(null);
  const [verifyingEmailBusy, setVerifyingEmailBusy] = useState(false);

  // Address Book state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS_FORM);
  const [addressErrors, setAddressErrors] = useState<SavedAddressErrors>({});

  // Custom Uploads
  const [customTitle, setCustomTitle] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [uploadingCustomDesign, setUploadingCustomDesign] = useState(false);

  // Q&A inside Account
  const [qaProductId, setQaProductId] = useState(products[0]?.id ?? '');
  const [qaQuestionText, setQaQuestionText] = useState('');

  // Support + FAQ accordion
  const [supportTopic, setSupportTopic] = useState<CustomerMessageTopic>('Order Status Inquiry');
  const [supportNote, setSupportNote] = useState('');
  const [supportSubmitError, setSupportSubmitError] = useState<string | null>(null);
  const [supportSubmitSuccess, setSupportSubmitSuccess] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  // Privacy / Password
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAccountToast(msg);
    setTimeout(() => setAccountToast(null), 3600);
  };

  if (!currentCustomer) {
    return (
      <UnifiedAuthView
        existingCustomers={existingCustomers}
        orders={orders}
        returns={returns}
        guestWishlistIds={guestWishlistIds}
        isCloudConnected={isCloudConnected}
        initialOpenGuestTracker={guestOrdersRequested}
        authRecoveryMode={authRecoveryMode}
        authVerificationNotice={authVerificationNotice}
        externalAuthError={externalAuthError}
        onClearExternalAuthError={onClearExternalAuthError}
        onClearAuthVerificationNotice={onClearAuthVerificationNotice}
        onClearAuthRecoveryMode={onClearAuthRecoveryMode}
        onGoogleSignIn={onGoogleSignIn}
        onSyncAuthenticatedUser={onSyncAuthenticatedUser}
        onCompleteCustomerAuth={(customer) => {
          if (onCompleteCustomerAuth) {
            onCompleteCustomerAuth(customer);
          } else {
            onUpdateCustomer(customer);
          }
        }}
        onContinueShopping={onContinueShopping}
      />
    );
  }

  const displayFirstName =
    currentCustomer.firstName || splitFullName(currentCustomer.fullName).firstName || 'Friend';

  const myOrders = getCustomerOrders(orders, currentCustomer);
  const filteredOrders = myOrders.filter((order) => {
    const matchesSearch =
      !orderSearch.trim() ||
      order.orderNumber.toLowerCase().includes(orderSearch.trim().toLowerCase()) ||
      order.items.some((it) =>
        it.title.toLowerCase().includes(orderSearch.trim().toLowerCase())
      );
    if (!matchesSearch) return false;
    if (orderFilter === 'delivered') return order.status === 'Delivered';
    if (orderFilter === 'cancelled') return order.status === 'Cancelled';
    if (orderFilter === 'active') {
      return order.status !== 'Delivered' && order.status !== 'Cancelled';
    }
    return true;
  });

  // Delivered items for inline Flipkart-style rating strip
  const deliveredItemsForRating = myOrders
    .filter((o) => o.status === 'Delivered')
    .flatMap((o) =>
      o.items.map((item) => ({
        key: `${o.orderNumber}::${item.productId}`,
        orderNumber: o.orderNumber,
        deliveredDate: new Date(o.createdAt).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        item,
      }))
    )
    .slice(0, 6);

  const wishlistedProducts = products.filter((p) =>
    currentCustomer.wishlistIds.includes(p.id)
  );
  const myReturns = returns.filter(
    (r) =>
      normalizeIndianPhone10(r.customerPhone) ===
        normalizeIndianPhone10(currentCustomer.phone) ||
      (currentCustomer.email &&
        r.customerEmail.toLowerCase() === currentCustomer.email.toLowerCase())
  );
  const myGiftCards = giftCards.filter(
    (g) =>
      g.purchaserUserId === currentCustomer.id ||
      g.redeemedByUserId === currentCustomer.id ||
      (currentCustomer.email &&
        (g.purchaserEmail.toLowerCase() === currentCustomer.email.toLowerCase() ||
          g.recipientEmail.toLowerCase() === currentCustomer.email.toLowerCase()))
  );
  const customerPhone10 = normalizeIndianPhone10(currentCustomer.phone);
  const myMessages = customerMessages.filter(
    (m) =>
      (m.userId && m.userId === currentCustomer.id) ||
      (customerPhone10.length === 10 &&
        normalizeIndianPhone10(m.phone) === customerPhone10) ||
      (currentCustomer.email &&
        (m.email ?? '').toLowerCase() === currentCustomer.email.toLowerCase())
  );
  const myQuestions = productQuestions.filter(
    (q) =>
      q.userId === currentCustomer.id ||
      q.customerContact === currentCustomer.phone ||
      (currentCustomer.email &&
        (q.customerContact ?? '').toLowerCase() === currentCustomer.email.toLowerCase()) ||
      q.status === 'Answered'
  );

  const notifPrefs: CustomerNotificationPreferences =
    currentCustomer.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES;

  // Profile Save Handler
  const handleSaveProfile = (e: FormEvent) => {
    e.preventDefault();
    const cleanFirst = editFirstName.trim() || displayFirstName;
    const cleanLast = editLastName.trim();
    const fullName = joinFirstLastName(cleanFirst, cleanLast) || currentCustomer.fullName;
    const normalizedPhone = normalizeIndianPhone10(editPhone);
    onUpdateCustomer({
      ...currentCustomer,
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName,
      gender: editGender || undefined,
      avatarUrl: editAvatar.trim() || undefined,
      phone: normalizedPhone || currentCustomer.phone,
      celebrationMonth: editMonth || undefined,
      preferredPayment: editPayment,
    });
    showToast('BEE4 profile details saved.');
  };

  const handleAvatarUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const uploaded = await uploadCustomDesignToSupabaseStorage(
        file,
        `avatar-${currentCustomer.id}`
      );
      setEditAvatar(uploaded.url);
      onUpdateCustomer({
        ...currentCustomer,
        avatarUrl: uploaded.url,
      });
      showToast('Profile avatar updated.');
    } catch {
      showToast('Unable to upload image. Try choosing an emoji avatar.');
    } finally {
      e.target.value = '';
    }
  };

  const handleToggleLanguage = (nextLang: 'en' | 'hi') => {
    onUpdateCustomer({
      ...currentCustomer,
      preferredLanguage: nextLang,
    });
    showToast(nextLang === 'hi' ? 'भाषा हिन्दी में अपडेट की गई।' : 'Language switched to English.');
  };

  const handleToggleNotificationPref = (
    key: keyof CustomerNotificationPreferences
  ) => {
    const updatedPrefs: CustomerNotificationPreferences = {
      ...notifPrefs,
      [key]: !notifPrefs[key],
    };
    onUpdateCustomer({
      ...currentCustomer,
      notificationPreferences: updatedPrefs,
    });
    showToast('Notification preferences updated.');
  };

  const handleVerifyEmailCodeInAccount = async (e: FormEvent) => {
    e.preventDefault();
    setEmailVerifyFeedback(null);
    if (!currentCustomer.email) {
      setEmailVerifyFeedback('Add an email address to your profile first.');
      return;
    }
    if (verifyEmailToken.trim().length < 6) {
      setEmailVerifyFeedback('Enter the 6-digit verification code.');
      return;
    }
    setVerifyingEmailBusy(true);
    try {
      if (isCloudConnected) {
        await verifyCustomerEmailOtpSupabase(currentCustomer.email, verifyEmailToken.trim());
      }
      onUpdateCustomer({
        ...currentCustomer,
        emailVerified: true,
        emailConfirmedAt: new Date().toISOString(),
      });
      setVerifyEmailToken('');
      setEmailVerifyFeedback('Email verified!');
    } catch (err) {
      setEmailVerifyFeedback(
        err instanceof Error ? err.message : 'Unable to verify email right now.'
      );
    } finally {
      setVerifyingEmailBusy(false);
    }
  };

  const handleSaveAddress = (e: FormEvent) => {
    e.preventDefault();
    const errors = validateSavedAddress(addressForm);
    if (Object.keys(errors).length > 0) {
      setAddressErrors(errors);
      return;
    }
    const cleanPhone = normalizeIndianPhone10(addressForm.phone);
    const id = editingAddressId ?? `addr-${Date.now()}`;
    const newEntry: SavedAddress = {
      id,
      label: addressForm.label,
      fullName: addressForm.fullName.trim(),
      phone: cleanPhone,
      address: addressForm.address.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state,
      pinCode: addressForm.pinCode.trim(),
      isDefault:
        addressForm.isDefault ||
        (currentCustomer.addresses.length === 0 && !editingAddressId),
    };

    let nextAddresses = editingAddressId
      ? currentCustomer.addresses.map((a) => (a.id === editingAddressId ? newEntry : a))
      : [...currentCustomer.addresses, newEntry];

    if (newEntry.isDefault) {
      nextAddresses = nextAddresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }));
    }

    onUpdateCustomer({ ...currentCustomer, addresses: nextAddresses });
    setShowAddressForm(false);
    setEditingAddressId(null);
    setAddressForm(EMPTY_ADDRESS_FORM);
    setAddressErrors({});
    showToast('Delivery address saved.');
  };

  const handleAddUpiId = (e: FormEvent) => {
    e.preventDefault();
    setUpiError(null);
    const check = validateUpiId(newUpiInput);
    if (!check.valid) {
      setUpiError(check.error || 'Invalid UPI ID');
      return;
    }
    const currentUpis = currentCustomer.savedUpiIds ?? [];
    if (currentUpis.includes(check.normalized)) {
      setUpiError('This UPI ID is already saved.');
      return;
    }
    onUpdateCustomer({
      ...currentCustomer,
      savedUpiIds: [check.normalized, ...currentUpis].slice(0, 10),
    });
    setNewUpiInput('');
    showToast(`Saved UPI ID ${check.normalized}.`);
  };

  const handleRedeemVoucherSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setRedeemFeedback(null);
    if (!onRedeemGiftCard) return;
    setRedeemingCard(true);
    try {
      const res = await onRedeemGiftCard(voucherCode.trim().toUpperCase(), voucherPin.trim());
      if (res.ok) {
        setRedeemFeedback({
          type: 'ok',
          text: `${formatINR(res.creditedAmount ?? 0)} added to your BEE4 Wallet!`,
        });
        setVoucherCode('');
        setVoucherPin('');
      } else {
        setRedeemFeedback({
          type: 'err',
          text: res.error || 'Could not verify gift card code or PIN.',
        });
      }
    } catch (err) {
      setRedeemFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to redeem gift card.',
      });
    } finally {
      setRedeemingCard(false);
    }
  };

  const handleInlineRatingSubmit = (
    itemKey: string,
    productId: string,
    productTitle: string
  ) => {
    if (!canCustomerReviewProduct(orders, currentCustomer, productId)) {
      showToast('Ratings can only be submitted after your order is delivered.');
      return;
    }
    const selectedStars = (inlineRatings[itemKey] ?? 5) as 1 | 2 | 3 | 4 | 5;
    const commentText =
      (inlineComments[itemKey] ?? '').trim() ||
      `Rated ${selectedStars}/5 stars from BEE4 Account after delivery.`;
    const now = new Date().toISOString();
    if (onSubmitProductReview) {
      onSubmitProductReview({
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId,
        productName: productTitle,
        customerName: currentCustomer.fullName,
        customerContact: currentCustomer.phone || currentCustomer.email,
        rating: selectedStars,
        comment: commentText,
        verifiedBuyer: true,
        featuredOnHomepage: false,
        status: 'Pending',
        createdAt: now,
        updatedAt: now,
      });
    }
    setRatedProductIds((prev) => ({ ...prev, [itemKey]: true }));
    showToast(`Thank you! Your ${selectedStars}-star rating for ${productTitle} was submitted.`);
  };

  const handleCustomDesignUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCustomDesign(true);
    try {
      const uploaded = await uploadCustomDesignToSupabaseStorage(file, currentCustomer.id);
      const newDesign: CustomerCustomDesign = {
        id: `dsn-${Date.now()}`,
        title: customTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
        productType: 'Custom 3D Print',
        imageUrl: uploaded.url,
        notes: customNotes.trim() || 'Uploaded via BEE4 Account',
        createdAt: new Date().toISOString(),
      };
      onUpdateCustomer({
        ...currentCustomer,
        customDesigns: [newDesign, ...(currentCustomer.customDesigns ?? [])].slice(0, 30),
      });
      setCustomTitle('');
      setCustomNotes('');
      showToast('Custom reference saved to your BEE4 library.');
    } catch {
      showToast('Could not save image. Try a smaller JPG/PNG.');
    } finally {
      setUploadingCustomDesign(false);
      e.target.value = '';
    }
  };

  const handleAskQuestionInAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!qaQuestionText.trim() || qaQuestionText.trim().length < 5) {
      showToast('Please enter at least 5 characters for your question.');
      return;
    }
    const targetProduct = products.find((p) => p.id === qaProductId) ?? products[0];
    const now = new Date().toISOString();
    onSubmitProductQuestion?.({
      id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: currentCustomer.id,
      productId: targetProduct?.id ?? 'general',
      productName: targetProduct?.title ?? 'BEE4 Product',
      customerName: currentCustomer.fullName,
      customerContact: currentCustomer.phone || currentCustomer.email,
      question: qaQuestionText.trim(),
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    });
    setQaQuestionText('');
    showToast('Question sent to Team BEE4! Answers appear here once posted.');
  };

  const handleDownloadMyData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      account: {
        name: currentCustomer.fullName,
        gender: currentCustomer.gender,
        phone: currentCustomer.phone,
        email: currentCustomer.email,
        preferredLanguage: currentCustomer.preferredLanguage ?? 'en',
        walletBalance: currentCustomer.walletBalance ?? 0,
        addresses: currentCustomer.addresses,
        savedUpiIds: currentCustomer.savedUpiIds ?? [],
      },
      orders: myOrders.map((o) => ({
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        total: o.total,
        status: o.status,
      })),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BEE4-Account-Data-${displayFirstName.toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('BEE4 account data JSON downloaded.');
  };

  const handleLogoutOtherDevices = () => {
    onUpdateCustomer({
      ...currentCustomer,
      devices: logoutOtherDeviceSessions(currentCustomer.devices),
    });
    showToast('All other active devices have been signed out.');
  };

  const handleRequestDeactivation = () => {
    onUpdateCustomer({
      ...currentCustomer,
      deactivationRequested: true,
      deactivationRequestedAt: new Date().toISOString(),
    });
    showToast('Account deactivation request logged with BEE4 Support.');
  };

  const handleUpdatePasswordInAccount = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPasswordInput.trim().length < 6) {
      setPasswordFeedback('Password must be at least 6 characters.');
      return;
    }
    try {
      if (isCloudConnected) {
        await updateSupabaseUserPassword(newPasswordInput.trim());
      }
      setNewPasswordInput('');
      setPasswordFeedback('Password updated cleanly!');
    } catch (err) {
      setPasswordFeedback(
        err instanceof Error ? err.message : 'Unable to update password right now.'
      );
    }
  };

  return (
    <section className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {activeTab === 'overview' ? (
          <button
            type="button"
            onClick={onContinueShopping}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to BEE4 Store</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Account</span>
          </button>
        )}

        {controls.enableLanguageSwitcher && (
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-slate-900 text-xs font-semibold">
            <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 ml-1.5" />
            <button
              type="button"
              onClick={() => handleToggleLanguage('en')}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === 'en'
                  ? 'bg-slate-900 text-white dark:bg-amber-600'
                  : 'text-slate-600 dark:text-zinc-300'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleToggleLanguage('hi')}
              className={`px-2.5 py-1 rounded-lg transition ${
                lang === 'hi'
                  ? 'bg-slate-900 text-white dark:bg-amber-600'
                  : 'text-slate-600 dark:text-zinc-300'
              }`}
            >
              हिन्दी
            </button>
          </div>
        )}
      </div>

      {accountToast && (
        <div
          role="status"
          className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2"
        >
          <BadgeCheck className="w-4 h-4 shrink-0" />
          <span>{accountToast}</span>
        </div>
      )}

      {/* Flipkart-Style Clean Identity Header (Hey, Full Name — zero badge above name) */}
      <div className="glass-surface rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-xl font-bold text-amber-800 dark:text-amber-200 overflow-hidden shrink-0">
            {currentCustomer.avatarUrl ? (
              currentCustomer.avatarUrl.startsWith('http') ||
              currentCustomer.avatarUrl.startsWith('data:') ? (
                <img
                  src={currentCustomer.avatarUrl}
                  alt={currentCustomer.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{currentCustomer.avatarUrl}</span>
              )
            ) : (
              <span>{displayFirstName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
              {lang === 'hi' ? `नमस्ते, ${currentCustomer.fullName}` : `Hey, ${currentCustomer.fullName}`}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-300 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              {currentCustomer.phone && (
                <span className="tabular-nums font-medium">+91 {currentCustomer.phone}</span>
              )}
              {currentCustomer.phone && currentCustomer.email && <span>·</span>}
              {currentCustomer.email && <span className="truncate">{currentCustomer.email}</span>}
              {currentCustomer.emailVerified && (
                <>
                  <span>·</span>
                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold inline-flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-slate-800 dark:text-zinc-100 inline-flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-rose-700 dark:text-rose-300 inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'साइन आउट' : 'Sign Out'}</span>
          </button>
        </div>
      </div>

      {/* 4 Flipkart-Style Quick Action Cards */}
      <div
        className={`grid grid-cols-2 ${
          controls.enableGiftCards ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
        } gap-3`}
      >
        <button
          type="button"
          onClick={() => {
            if (onNavigatePage) {
              onNavigatePage('orders');
            } else {
              setActiveTab('orders');
            }
          }}
          className="p-4 rounded-2xl glass-surface text-left hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
              {myOrders.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">My Orders</p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Track, cancel &amp; GST invoices
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('wishlist')}
          className={`p-4 rounded-2xl glass-surface text-left hover:border-amber-400 transition-colors ${
            activeTab === 'wishlist' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <Heart className="w-5 h-5 text-rose-500" />
            <span className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
              {wishlistedProducts.length}
            </span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">{ui.wishlistLabel}</p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Saved brain-training picks
          </p>
        </button>

        {controls.enableGiftCards && (
          <button
            type="button"
            onClick={() => {
              if (onNavigatePage) {
                onNavigatePage('wallet');
              } else {
                setActiveTab('wallet');
              }
            }}
            className="p-4 rounded-2xl glass-surface text-left hover:border-amber-400 transition-colors"
          >
            <div className="flex items-center justify-between">
              <Gift className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                {formatINR(currentCustomer.walletBalance ?? 0)}
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              Gift Cards &amp; Wallet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
              Redeem vouchers &amp; BEE4 Wallet
            </p>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('support')}
          className={`p-4 rounded-2xl glass-surface text-left hover:border-amber-400 transition-colors ${
            activeTab === 'support' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <LifeBuoy className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            <span className="text-xs font-bold text-sky-700 dark:text-sky-300">24×7</span>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">Help Center</p>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400">
            Live AI Chat, Tokens &amp; FAQs
          </p>
        </button>
      </div>

      {/* TAB: OVERVIEW (Clean Flipkart Menu + Delivered Ratings + Recent Orders) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Delivered Order Inline Star Rating Strip — Verified Delivery Only */}
          {deliveredItemsForRating.length > 0 && (
            <div className="glass-surface rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  {ui.rateDeliveredHeading}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Verified delivery ratings for your completed BEE4 orders
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {deliveredItemsForRating.map(({ key, deliveredDate, item }) => {
                  const currentStar = inlineRatings[key] ?? 5;
                  const alreadyRated = ratedProductIds[key];
                  return (
                    <div key={key} className="p-3.5 rounded-xl glass-subtle space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shrink-0">
                          <ProductImage
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold">
                            Delivered on {deliveredDate}
                          </p>
                        </div>
                      </div>

                      {alreadyRated ? (
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1">
                          <BadgeCheck className="w-3.5 h-3.5" />
                          Rating submitted!
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            {([1, 2, 3, 4, 5] as const).map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() =>
                                  setInlineRatings((prev) => ({ ...prev, [key]: star }))
                                }
                                aria-label={`Rate ${star} stars for ${item.title}`}
                                className="p-1 rounded-lg hover:bg-amber-500/10"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    star <= currentStar
                                      ? 'fill-amber-500 text-amber-500'
                                      : 'text-slate-300 dark:text-zinc-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={inlineComments[key] ?? ''}
                              onChange={(e) =>
                                setInlineComments((prev) => ({ ...prev, [key]: e.target.value }))
                              }
                              placeholder="Quick review (optional)"
                              className="flex-1 min-w-0 h-8 px-2.5 rounded-lg glass-input text-xs focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleInlineRatingSubmit(key, item.productId, item.title)
                              }
                              className="px-3 h-8 rounded-lg glass-btn-amber text-white text-[11px] font-semibold shrink-0"
                            >
                              Submit
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Structured Flipkart-Inspired Account Menu */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Column 1: Profile Settings + Payments & Wallets */}
            <div className="space-y-5">
              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Profile Settings
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <User className="w-4 h-4 text-amber-600 shrink-0" />
                      Edit Profile &amp; Notification Settings
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('addresses')}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                      {ui.savedAddressesLabel}
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">{currentCustomer.addresses.length}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </span>
                  </button>
                  {controls.enableLanguageSwitcher && (
                    <div className="px-5 py-3 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                        <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                        Change Language
                      </span>
                      <div className="inline-flex items-center gap-1 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => handleToggleLanguage('en')}
                          className={`px-2.5 py-1 rounded-lg ${
                            lang === 'en'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300'
                          }`}
                        >
                          EN
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleLanguage('hi')}
                          className={`px-2.5 py-1 rounded-lg ${
                            lang === 'hi'
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-zinc-300'
                          }`}
                        >
                          हिन्दी
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {controls.enableGiftCards && (
                <div className="glass-surface rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Payments &amp; Wallets
                    </h2>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        if (onNavigatePage) {
                          onNavigatePage('wallet');
                        } else {
                          setActiveTab('wallet');
                        }
                      }}
                      className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                        <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                        BEE4 Wallet &amp; Gift Cards
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                        {formatINR(currentCustomer.walletBalance ?? 0)}
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('wallet')}
                      className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                        <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                        Saved UPI IDs &amp; Checkout Preference
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <span className="tabular-nums">
                          {(currentCustomer.savedUpiIds ?? []).length} UPI
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Privacy &amp; Security
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('privacy')}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      Privacy Center, Devices &amp; Password
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">
                        {(currentCustomer.devices ?? []).length} devices
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: My Activity + FAQ & Terms + Recent Orders */}
            <div className="space-y-5">
              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    My Activity
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  {controls.enableProductQa && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('qa')}
                      className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                        <HelpCircle className="w-4 h-4 text-sky-600 shrink-0" />
                        Questions &amp; Answers
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <span className="tabular-nums">{myQuestions.length}</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('wishlist')}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                      Saved Wishlist
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">{wishlistedProducts.length}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('uploads')}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <ImageIcon className="w-4 h-4 text-amber-600 shrink-0" />
                      Custom 3D Design Uploads
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">
                        {(currentCustomer.customDesigns ?? []).length}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </span>
                  </button>
                </div>
              </div>

              <div className="glass-surface rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    FAQ &amp; Terms
                  </h2>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('support')}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="inline-flex items-center gap-3 text-sm font-semibold text-slate-900 dark:text-white">
                      <LifeBuoy className="w-4 h-4 text-sky-600 shrink-0" />
                      Help Center &amp; FAQs
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                  {(
                    [
                      { label: 'Terms & Conditions', page: 'legal-terms', Icon: FileText },
                      { label: 'Privacy Policy', page: 'legal-privacy', Icon: ShieldCheck },
                      { label: 'Return & Refund Policy', page: 'legal-returns', Icon: RotateCcw },
                      { label: 'Shipping Policy', page: 'legal-shipping', Icon: Truck },
                      { label: 'About BEE4', page: 'about', Icon: Info },
                    ] as const
                  ).map(({ label, page, Icon }) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        onNavigatePage ? onNavigatePage(page) : setActiveTab('support')
                      }
                      className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-zinc-200">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                        {label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              {showInstallApp && onInstallApp && (
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="w-full p-4 rounded-2xl glass-btn-amber text-white flex items-center justify-between text-xs font-bold"
                >
                  <span className="inline-flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Install BEE4 App
                  </span>
                  <span className="text-[11px] opacity-90">Faster Checkout →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-5">
          <div className="glass-surface rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search your order here (Order ID or product name)"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl glass-input text-sm focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'active', 'delivered', 'cancelled'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOrderFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    orderFilter === f
                      ? 'bg-amber-600 text-white'
                      : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                  }`}
                >
                  {f}
                </button>
              ))}
              {onRefreshOrders && (
                <button
                  type="button"
                  disabled={isRefreshingOrders}
                  onClick={() => {
                    setIsRefreshingOrders(true);
                    void onRefreshOrders().finally(() => setIsRefreshingOrders(false));
                  }}
                  className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingOrders ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass-surface rounded-3xl p-10 text-center space-y-3">
              <Package className="w-8 h-8 mx-auto text-amber-600" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                No matching BEE4 orders found.
              </p>
              <button
                type="button"
                onClick={onContinueShopping}
                className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
              >
                Explore 16 Brain Toys
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const stepIdx = getOrderTrackingStepIndex(order.status);
                const rmaMatch = myReturns.find((r) => r.orderNumber === order.orderNumber);
                const canReturn =
                  isOrderEligibleForReturn(order, myReturns).eligible &&
                  !rmaMatch &&
                  Boolean(onCreateReturnRequest);
                const canCancel =
                  controls.enableSelfServiceCancel && canCustomerCancelOrder(order.status);
                const needsPrepaidRetry =
                  order.status !== 'Cancelled' &&
                  order.paymentMethod === 'UPI / Prepaid' &&
                  order.paymentStatus !== 'Paid' &&
                  order.paymentStatus !== 'Refunded';

                return (
                  <article key={order.orderNumber} className="glass-surface rounded-3xl p-6 space-y-4">
                    {needsPrepaidRetry && (
                      <div className="p-3 rounded-2xl bg-amber-500/12 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                          UPI payment confirmation pending for {order.orderNumber}.
                        </span>
                        <a
                          href={buildWhatsAppUrl(
                            `Hi BEE4! Sharing UPI payment confirmation for Order ${order.orderNumber} (${formatINR(order.total)}).`,
                            whatsappNumber
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline text-amber-800 dark:text-amber-300"
                        >
                          Share UTR / Confirm Payment
                        </a>
                      </div>
                    )}

                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Placed {new Date(order.createdAt).toLocaleDateString('en-IN')} ·{' '}
                          {formatPaymentMethodLabel(order.paymentMethod)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 text-xs font-bold">
                          {order.status}
                        </span>
                        <p className="mt-1 tabular-nums text-sm font-extrabold text-zinc-900 dark:text-white">
                          {formatINR(order.total)}
                        </p>
                      </div>
                    </div>

                    {order.status !== 'Cancelled' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {ORDER_TRACKING_STEPS.map((step, i) => (
                          <div
                            key={step}
                            className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold text-center ${
                              i <= stepIdx
                                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                                : 'bg-zinc-200/60 dark:bg-white/5 text-zinc-500'
                            }`}
                          >
                            {step}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-700 dark:text-rose-200">
                        Cancelled{order.cancelledBy ? ` by ${order.cancelledBy}` : ''}
                        {order.cancellationReason ? ` · ${order.cancellationReason}` : ''}
                      </div>
                    )}

                    <ul className="divide-y divide-zinc-900/8 dark:divide-white/10">
                      {order.items.map((item) => (
                        <li key={`${item.productId}::${item.variant}`} className="py-2.5 flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/60 dark:bg-slate-900/60 shrink-0">
                            <ProductImage
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => onSelectProduct(item.productId)}
                              className="text-sm font-semibold text-zinc-900 dark:text-white hover:underline truncate block"
                            >
                              {item.title}
                            </button>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.variant} · Qty {item.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
                            {formatINR(item.price * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {rmaMatch && (
                      <div className="p-3.5 rounded-2xl glass-subtle space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold">RMA {rmaMatch.rmaNumber}</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-300">
                            {getOrderRmaStatusBadge(order.orderNumber, myReturns)?.shortLabel ??
                              rmaMatch.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {CUSTOMER_RETURN_TRACKER_STEPS.map((st, idx) => (
                            <div
                              key={st}
                              className={`p-1.5 rounded-lg text-[10px] font-semibold text-center ${
                                idx <= buildCustomerReturnStepIndex(rmaMatch.status)
                                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                                  : 'bg-zinc-200/60 dark:bg-white/5 text-zinc-500'
                              }`}
                            >
                              {st}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => downloadOrderInvoice(order)}
                        className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        GST Invoice
                      </button>
                      <button
                        type="button"
                        onClick={() => onReorderItems(order.items)}
                        className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reorder
                      </button>
                      {canReturn && (
                        <button
                          type="button"
                          onClick={() => setReturnModalOrder(order)}
                          className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-amber-700 dark:text-amber-300"
                        >
                          Return / Replace (7 Days)
                        </button>
                      )}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={() => setCancelOrderTarget(order)}
                          className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-rose-700 dark:text-rose-300"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: GIFT CARDS, WALLET & SAVED PAYMENT METHODS (NO EMI, NO SUBSCRIPTIONS) */}
      {activeTab === 'wallet' && controls.enableGiftCards && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-5">
              <div className="rounded-2xl border border-amber-500/35 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/5 p-5 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                  BEE4 Wallet Balance
                </p>
                <p className="tabular-nums text-4xl font-extrabold text-zinc-900 dark:text-white">
                  {formatINR(currentCustomer.walletBalance ?? 0)}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Applies automatically at checkout on bee4.in.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  Want to gift someone?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenBuyGiftCardModal?.('personal')}
                    className="h-10 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    Personal Gift Card
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenBuyGiftCardModal?.('bulk')}
                    className="h-10 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    School / Bulk
                  </button>
                </div>
              </div>

              {/* 3-Step How to Redeem */}
              <div className="p-4 rounded-2xl glass-subtle space-y-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                <p className="font-bold text-zinc-900 dark:text-white">How to Redeem</p>
                <p>1. Enter your 16-character Gift Card Voucher Code.</p>
                <p>2. Enter the 4-digit security PIN.</p>
                <p>3. Balance credits instantly to your BEE4 Wallet with zero fees.</p>
              </div>
            </div>

            <div className="lg:col-span-7 glass-surface rounded-3xl p-6 space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                  Add Gift Card to Wallet
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Zero expiry worries · Instant credit
                </p>
              </div>

              {redeemFeedback && (
                <div
                  role="status"
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    redeemFeedback.type === 'ok'
                      ? 'bg-emerald-500/12 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-200'
                  }`}
                >
                  {redeemFeedback.text}
                </div>
              )}

              <form onSubmit={handleRedeemVoucherSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="text"
                  required
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="16-char Voucher Code"
                  className="sm:col-span-6 h-11 px-3.5 rounded-xl glass-input text-sm font-mono uppercase focus:outline-none"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={voucherPin}
                  onChange={(e) => setVoucherPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="4-digit PIN"
                  className="sm:col-span-3 h-11 px-3.5 rounded-xl glass-input text-sm font-mono tabular-nums focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={redeemingCard}
                  className="sm:col-span-3 h-11 rounded-xl glass-btn-amber text-white text-xs font-bold disabled:opacity-60"
                >
                  {redeemingCard ? 'Adding...' : 'Redeem'}
                </button>
              </form>

              {/* Wallet Ledger */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Gift Card &amp; Wallet Transactions
                </h3>
                {(currentCustomer.walletTransactions ?? []).length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    No wallet transactions yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-900/8 dark:divide-white/10">
                    {(currentCustomer.walletTransactions ?? []).slice(0, 8).map((tx) => {
                      const isCredit = tx.type !== 'debit_order';
                      return (
                        <li key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-zinc-900 dark:text-white">
                              {tx.note}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {new Date(tx.createdAt).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          <span
                            className={`tabular-nums font-bold ${
                              isCredit
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {isCredit ? '+' : '−'}
                            {formatINR(tx.amount)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {myGiftCards.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-900/10 dark:border-white/10">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    My Issued Gift Cards
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {myGiftCards.map((gc) => (
                      <div key={gc.id} className="p-3 rounded-2xl glass-subtle text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold">{gc.code}</span>
                          <span className="tabular-nums font-bold">
                            {formatINR(gc.initialAmount)}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          PIN: {gc.pin} · {gc.redeemedAt ? 'Redeemed' : 'Active'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard.writeText(`${gc.code} (PIN: ${gc.pin})`);
                            setCopiedCode(gc.id);
                            setTimeout(() => setCopiedCode(null), 1500);
                          }}
                          className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1"
                        >
                          {copiedCode === gc.id ? (
                            <>
                              <Check className="w-3 h-3" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Voucher
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Saved Payment Methods (UPI IDs & Default Checkout Preference — ZERO EMI) */}
          <div className="glass-surface rounded-3xl p-6 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {ui.savedPaymentsLabel}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Save trusted UPI IDs and pick your default BEE4 checkout mode (Direct UPI, BEE4
                Wallet, or Cash on Delivery)
              </p>
            </div>

            <form onSubmit={handleAddUpiId} className="flex flex-col sm:flex-row gap-2.5 max-w-lg">
              <input
                type="text"
                value={newUpiInput}
                onChange={(e) => {
                  setNewUpiInput(e.target.value);
                  if (upiError) setUpiError(null);
                }}
                placeholder="yourname@okaxis / yourname@ybl"
                className="flex-1 h-10 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add UPI ID
              </button>
            </form>
            {upiError && <p className="text-xs font-semibold text-rose-600">{upiError}</p>}

            {(currentCustomer.savedUpiIds ?? []).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {(currentCustomer.savedUpiIds ?? []).map((upi) => (
                  <div
                    key={upi}
                    className="px-3 py-1.5 rounded-xl glass-subtle text-xs font-mono font-semibold inline-flex items-center gap-2"
                  >
                    <span>{upi}</span>
                    <button
                      type="button"
                      aria-label={`Remove UPI ${upi}`}
                      onClick={() =>
                        onUpdateCustomer({
                          ...currentCustomer,
                          savedUpiIds: (currentCustomer.savedUpiIds ?? []).filter(
                            (id) => id !== upi
                          ),
                        })
                      }
                      className="text-zinc-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: WISHLIST */}
      {activeTab === 'wishlist' && (
        <div className="glass-surface rounded-3xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            Saved Brain-Training Toys ({wishlistedProducts.length})
          </h2>
          {wishlistedProducts.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Tap the heart icon on any toy to save it here.
              </p>
              <button
                type="button"
                onClick={onContinueShopping}
                className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
              >
                Browse BEE4 Toys
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistedProducts.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl glass-subtle space-y-3">
                  <button
                    type="button"
                    onClick={() => onSelectProduct(p.id)}
                    className="w-full h-40 rounded-xl overflow-hidden bg-white/60 block"
                  >
                    <ProductImage
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                      {p.title}
                    </p>
                    <p className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">
                      {formatINR(p.price)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onAddToCart(p, p.variants[0] ?? 'Standard', 1, true)}
                      className="flex-1 h-9 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Add
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(p.id)}
                      aria-label="Remove from wishlist"
                      className="h-9 px-3 rounded-xl glass-btn-secondary text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: ADDRESSES (Home, Work, Gift) */}
      {activeTab === 'addresses' && (
        <div className="glass-surface rounded-3xl p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {ui.savedAddressesLabel}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Save delivery addresses tagged as Home, Work, or Gift
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingAddressId(null);
                setAddressForm({
                  ...EMPTY_ADDRESS_FORM,
                  fullName: currentCustomer.fullName,
                  phone: currentCustomer.phone,
                });
                setShowAddressForm((s) => !s);
              }}
              className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Address
            </button>
          </div>

          {showAddressForm && (
            <form onSubmit={handleSaveAddress} className="p-5 rounded-2xl glass-subtle space-y-4">
              <div className="flex flex-wrap gap-2">
                {(['Home', 'Work', 'Gift'] as AddressLabel[]).map((lbl) => (
                  <button
                    key={lbl}
                    type="button"
                    onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border ${
                      addressForm.label === lbl
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-zinc-900/10 dark:border-white/15 glass-btn-secondary'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, fullName: e.target.value })
                    }
                    placeholder="Recipient Full Name *"
                    className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                  />
                  {addressErrors.fullName && (
                    <p className="text-xs text-rose-600 mt-1">{addressErrors.fullName}</p>
                  )}
                </div>
                <div>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="10-digit Phone *"
                    className="w-full h-10 px-3 rounded-xl glass-input text-sm tabular-nums"
                  />
                  {addressErrors.phone && (
                    <p className="text-xs text-rose-600 mt-1">{addressErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                  placeholder="House / Flat No., Street & Landmark *"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                />
                {addressErrors.address && (
                  <p className="text-xs text-rose-600 mt-1">{addressErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={addressForm.city}
                  onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  placeholder="City *"
                  className="h-10 px-3 rounded-xl glass-input text-sm"
                />
                <select
                  value={addressForm.state}
                  onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                  className="h-10 px-3 rounded-xl glass-input text-sm"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={addressForm.pinCode}
                  onChange={(e) => setAddressForm({ ...addressForm, pinCode: e.target.value })}
                  placeholder="6-digit PIN *"
                  className="h-10 px-3 rounded-xl glass-input text-sm tabular-nums"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) =>
                    setAddressForm({ ...addressForm, isDefault: e.target.checked })
                  }
                  className="accent-amber-600"
                />
                Make default delivery address
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressForm(false)}
                  className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {currentCustomer.addresses.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved addresses yet. Add your Home, Work, or Gift recipient address above.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentCustomer.addresses.map((addr) => (
                <div key={addr.id} className="p-4 rounded-2xl glass-subtle space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-200 text-[11px] font-bold">
                      {addr.label}
                      {addr.isDefault ? ' · Default' : ''}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAddressId(addr.id);
                          setAddressForm({
                            label: addr.label,
                            fullName: addr.fullName,
                            phone: addr.phone,
                            address: addr.address,
                            city: addr.city,
                            state: addr.state,
                            pinCode: addr.pinCode,
                            isDefault: addr.isDefault,
                          });
                          setShowAddressForm(true);
                        }}
                        className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCustomer({
                            ...currentCustomer,
                            addresses: currentCustomer.addresses.filter((a) => a.id !== addr.id),
                          })
                        }
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">
                    {addr.fullName} · <span className="tabular-nums">{addr.phone}</span>
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {addr.address}, {addr.city}, {addr.state} - {addr.pinCode}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOM UPLOADS */}
      {activeTab === 'uploads' && (
        <div className="glass-surface rounded-3xl p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              Custom 3D Engraving &amp; Design Uploads
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload photos, school crests, or sketches for customized gifts &amp; bulk batches.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl glass-subtle">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Design title (e.g. Kabir Nameplate)"
              className="h-10 px-3 rounded-xl glass-input text-sm"
            />
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Color / custom instructions"
              className="h-10 px-3 rounded-xl glass-input text-sm"
            />
            <label className="h-10 px-4 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingCustomDesign ? 'Uploading...' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingCustomDesign}
                onChange={handleCustomDesignUpload}
                className="sr-only"
              />
            </label>
          </div>

          {(currentCustomer.customDesigns ?? []).length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <ImageIcon className="w-7 h-7 mx-auto mb-2 opacity-50" />
              No custom design files uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(currentCustomer.customDesigns ?? []).map((dsn) => (
                <div key={dsn.id} className="p-3.5 rounded-2xl glass-subtle space-y-2">
                  <img
                    src={dsn.imageUrl}
                    alt={dsn.title}
                    className="w-full h-36 object-cover rounded-xl bg-black/5"
                  />
                  <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {dsn.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                    {dsn.notes}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateCustomer({
                        ...currentCustomer,
                        customDesigns: (currentCustomer.customDesigns ?? []).filter(
                          (d) => d.id !== dsn.id
                        ),
                      })
                    }
                    className="text-xs font-semibold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: QUESTIONS & ANSWERS */}
      {activeTab === 'qa' && controls.enableProductQa && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleAskQuestionInAccount}
            className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-3.5"
          >
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              Ask Team BEE4 About a Product
            </h2>
            <div>
              <label htmlFor="acc-qa-prod" className="block text-xs font-semibold mb-1">
                Select Product
              </label>
              <select
                id="acc-qa-prod"
                value={qaProductId}
                onChange={(e) => setQaProductId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl glass-input text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="acc-qa-text" className="block text-xs font-semibold mb-1">
                Your Question
              </label>
              <textarea
                id="acc-qa-text"
                rows={3}
                value={qaQuestionText}
                onChange={(e) => setQaQuestionText(e.target.value)}
                placeholder="Ask about age suitability, gift wrapping, or dimensions..."
                className="w-full p-3 rounded-xl glass-input text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full h-10 rounded-xl glass-btn-amber text-white text-xs font-semibold"
            >
              Submit Question
            </button>
          </form>

          <div className="lg:col-span-7 glass-surface rounded-3xl p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              {ui.qaLabel} ({myQuestions.length})
            </h2>
            {myQuestions.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No product questions posted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {myQuestions.map((qa) => (
                  <div key={qa.id} className="p-4 rounded-2xl glass-subtle space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-amber-700 dark:text-amber-300">
                        {qa.productName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                          qa.status === 'Answered'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-800 dark:text-amber-200'
                        }`}
                      >
                        {qa.status}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      Q: {qa.question}
                    </p>
                    {qa.answer && (
                      <p className="text-xs text-zinc-700 dark:text-zinc-200 border-l-2 border-emerald-500 pl-3">
                        <strong>{qa.answeredBy || 'Team BEE4'}:</strong> {qa.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRIVACY CENTER, MANAGE DEVICES & SECURITY */}
      {activeTab === 'privacy' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 glass-surface rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Privacy Center
              </h2>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Download a portable JSON copy of your BEE4 Account profile, delivery addresses, and
              order history, or submit an account deactivation request.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={handleDownloadMyData}
                className="px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download My BEE4 Data
              </button>
              <button
                type="button"
                disabled={currentCustomer.deactivationRequested}
                onClick={handleRequestDeactivation}
                className="px-4 py-2.5 rounded-xl glass-btn-secondary text-xs font-semibold text-rose-700 dark:text-rose-300 disabled:opacity-60 inline-flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {currentCustomer.deactivationRequested
                  ? 'Deactivation Requested'
                  : 'Request Account Deactivation'}
              </button>
            </div>

            <form
              onSubmit={handleUpdatePasswordInAccount}
              className="pt-4 border-t border-zinc-900/10 dark:border-white/10 space-y-3"
            >
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white inline-flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-600" />
                Update Account Password
              </h3>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="New password (6+ characters)"
                  className="flex-1 h-10 px-3.5 rounded-xl glass-input text-sm"
                />
                <button
                  type="submit"
                  className="px-4 h-10 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
              {passwordFeedback && (
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {passwordFeedback}
                </p>
              )}
            </form>
          </div>

          <div className="lg:col-span-6 glass-surface rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Laptop className="w-5 h-5 text-amber-600" />
                <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                  Manage Devices ({(currentCustomer.devices ?? []).length})
                </h2>
              </div>
              <button
                type="button"
                onClick={handleLogoutOtherDevices}
                className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold text-rose-700 dark:text-rose-300"
              >
                Log out all other devices
              </button>
            </div>

            {(currentCustomer.devices ?? []).length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Active on this browser session only.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {(currentCustomer.devices ?? []).map((dev) => (
                  <li
                    key={dev.id}
                    className="p-3.5 rounded-2xl glass-subtle flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{dev.deviceLabel}</p>
                      <p className="text-[11px] text-zinc-500">
                        Last active {new Date(dev.lastActiveAt).toLocaleString('en-IN')}
                      </p>
                    </div>
                    {dev.isCurrent && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                        Current
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* TAB: HELP CENTER — LIVE AI & EXECUTIVE CHAT + SUPPORT NOTES & FAQS */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          {onCreateSupportTicket && onSendSupportMessage && onUpdateSupportTicket && (
            <SupportLiveChatPanel
              customer={currentCustomer}
              customerOrders={myOrders}
              products={products}
              settings={settings}
              coupons={coupons}
              tickets={supportTickets}
              messages={supportMessages}
              whatsappNumber={whatsappNumber}
              onCreateSupportTicket={onCreateSupportTicket}
              onSendSupportMessage={onSendSupportMessage}
              onUpdateSupportTicket={onUpdateSupportTicket}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 glass-surface rounded-2xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                Send a Support Message to BEE4
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Messages go straight to our Banka studio team and replies show here.
              </p>
            </div>

            {supportSubmitError && (
              <div
                role="alert"
                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/35 text-xs font-semibold text-rose-700 dark:text-rose-200 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{supportSubmitError}</span>
              </div>
            )}

            {supportSubmitSuccess && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-500/35 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-start gap-2"
              >
                <BadgeCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{supportSubmitSuccess}</span>
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSupportSubmitError(null);
                setSupportSubmitSuccess(null);
                const cleanNote = supportNote.trim();
                if (cleanNote.length < 4) {
                  setSupportSubmitError('Please write at least 4 characters in your message.');
                  return;
                }
                const now = new Date().toISOString();
                setIsSubmittingSupport(true);
                try {
                  const res = await onSubmitCustomerMessage?.({
                    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    userId: currentCustomer.id,
                    customerName: currentCustomer.fullName,
                    phone: normalizeIndianPhone10(currentCustomer.phone) || '9800000000',
                    email: currentCustomer.email || undefined,
                    topic: supportTopic,
                    message: cleanNote,
                    status: 'Unread',
                    createdAt: now,
                    updatedAt: now,
                  });
                  if (res && typeof res === 'object' && 'ok' in res && !res.ok) {
                    setSupportSubmitError(
                      res.error || 'Could not send message right now. Please try again.'
                    );
                    return;
                  }
                  setSupportNote('');
                  setSupportSubmitSuccess('Your message has been delivered to BEE4 Support!');
                  showToast('Support message delivered to Team BEE4.');
                } catch (err) {
                  setSupportSubmitError(
                    err instanceof Error ? err.message : 'Could not send your message.'
                  );
                } finally {
                  setIsSubmittingSupport(false);
                }
              }}
              className="space-y-3"
            >
              <select
                value={supportTopic}
                onChange={(e) => setSupportTopic(e.target.value as CustomerMessageTopic)}
                className="w-full h-10 px-3 rounded-xl glass-input text-sm"
              >
                <option value="Order Status Inquiry">Order Status Inquiry</option>
                <option value="Custom 3D Print / Gift Request">Custom 3D Print / Gift Request</option>
                <option value="Bulk / School Order">Bulk / School Order</option>
                <option value="Product Feedback">Product Feedback</option>
                <option value="General Note">General Note</option>
              </select>
              <textarea
                rows={3}
                value={supportNote}
                onChange={(e) => {
                  setSupportNote(e.target.value);
                  if (supportSubmitError) setSupportSubmitError(null);
                }}
                placeholder="Share your Order ID or question for our Banka studio team..."
                className="w-full p-3 rounded-xl glass-input text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={isSubmittingSupport}
                  className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold disabled:opacity-60"
                >
                  {isSubmittingSupport ? 'Sending...' : 'Send Message'}
                </button>
                <a
                  href={buildWhatsAppUrl(
                    `Hi BEE4 Support! Customer: ${currentCustomer.fullName}`,
                    whatsappNumber
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  Chat on WhatsApp ({supportEmail})
                </a>
              </div>
            </form>

            {myMessages.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Your Support History ({myMessages.length})
                </h3>
                {myMessages.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl glass-subtle text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{m.topic}</span>
                      <span className="text-amber-700 dark:text-amber-300 font-semibold shrink-0">
                        {m.status}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-zinc-300">{m.message}</p>
                    {m.adminNote && (
                      <p className="text-emerald-700 dark:text-emerald-300 font-medium pt-1 border-t border-slate-200 dark:border-white/10">
                        Team BEE4: {m.adminNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 glass-surface rounded-3xl p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              FAQs &amp; BEE4 Policies
            </h2>
            <div className="space-y-2">
              {FAQS_DATA.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={item.q} className="rounded-2xl glass-subtle overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full p-4 flex items-center justify-between gap-2 text-left text-xs sm:text-sm font-bold text-zinc-900 dark:text-white"
                    >
                      <span>{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* TAB: PROFILE, LANGUAGE & NOTIFICATION SETTINGS */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveProfile}
            className="lg:col-span-7 glass-surface rounded-3xl p-6 space-y-5"
          >
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-amber-600" />
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {ui.accountSettingsHeading}
              </h2>
            </div>

            {/* Avatar Picker + Upload */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                Profile Avatar
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {AVATAR_PRESETS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditAvatar(av)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center border ${
                      editAvatar === av
                        ? 'border-amber-600 bg-amber-500/20'
                        : 'border-zinc-900/10 dark:border-white/15 glass-btn-secondary'
                    }`}
                  >
                    {av}
                  </button>
                ))}
                <label className="h-10 px-3.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="prof-first" className="block text-xs font-semibold mb-1">
                  First Name *
                </label>
                <input
                  id="prof-first"
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-sm"
                />
              </div>
              <div>
                <label htmlFor="prof-last" className="block text-xs font-semibold mb-1">
                  Last Name
                </label>
                <input
                  id="prof-last"
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-sm"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold mb-1.5">Gender</span>
              <div className="grid grid-cols-3 gap-2">
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setEditGender(g)}
                    className={`h-9 px-2 rounded-xl text-xs font-semibold border ${
                      editGender === g
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-zinc-900/10 dark:border-white/15 glass-btn-secondary'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="prof-phone" className="block text-xs font-semibold mb-1">
                  Mobile Number
                </label>
                <input
                  id="prof-phone"
                  type="tel"
                  inputMode="numeric"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-sm tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="prof-month" className="block text-xs font-semibold mb-1">
                  Child&apos;s Birthday Month (Optional)
                </label>
                <select
                  id="prof-month"
                  value={editMonth}
                  onChange={(e) => setEditMonth(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm"
                >
                  <option value="">None selected</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold mb-1.5">
                Preferred Checkout Method
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['UPI / Prepaid', 'BEE4 Wallet', 'COD'] as PaymentMethod[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEditPayment(m)}
                    className={`h-9 rounded-xl text-xs font-semibold border ${
                      editPayment === m
                        ? 'border-amber-600 bg-amber-600 text-white'
                        : 'border-zinc-900/10 dark:border-white/15 glass-btn-secondary'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-6 h-11 rounded-xl glass-btn-amber text-white text-sm font-bold"
            >
              SUBMIT
            </button>
          </form>

          <div className="lg:col-span-5 space-y-5">
            {/* Notification Settings */}
            <div className="glass-surface rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                  Notification Settings
                </h3>
              </div>
              <div className="space-y-2.5 text-xs">
                {(
                  [
                    {
                      key: 'orderUpdates',
                      label: 'Order & Dispatch Tracking Alerts',
                    },
                    {
                      key: 'returnAlerts',
                      label: 'Return & Replacement Status Updates',
                    },
                    {
                      key: 'offersAndLaunches',
                      label: 'New Toy Launches & Birthday Offers',
                    },
                  ] as const
                ).map((item) => {
                  const enabled = notifPrefs[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleToggleNotificationPref(item.key)}
                      className="w-full p-3 rounded-2xl glass-subtle flex items-center justify-between gap-3 font-semibold"
                    >
                      <span>{item.label}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold ${
                          enabled
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-200/70 dark:bg-white/10 text-zinc-500'
                        }`}
                      >
                        {enabled ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Install App Card inside Profile Settings */}
            {showInstallApp && onInstallApp && (
              <div className="glass-surface rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                    BEE4 Mobile App
                  </h3>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Add BEE4 to your Home Screen for 1-tap order alerts and faster checkout.
                </p>
                <button
                  type="button"
                  onClick={onInstallApp}
                  className="w-full h-10 rounded-xl glass-btn-amber text-white text-xs font-bold inline-flex items-center justify-center gap-2"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install BEE4 App</span>
                </button>
              </div>
            )}

            {/* Email Verification Block */}
            {currentCustomer.email && !currentCustomer.emailVerified && (
              <div className="glass-surface rounded-3xl p-6 space-y-3">
                <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                  Verify Your Email Address
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  Verify <strong>{currentCustomer.email}</strong> for digital GST invoices &amp;
                  gift cards.
                </p>
                <form onSubmit={handleVerifyEmailCodeInAccount} className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={verifyEmailToken}
                    onChange={(e) => setVerifyEmailToken(e.target.value)}
                    placeholder="6-digit code"
                    className="flex-1 h-10 px-3 rounded-xl glass-input text-sm font-mono tabular-nums"
                  />
                  <button
                    type="submit"
                    disabled={verifyingEmailBusy}
                    className="px-4 h-10 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                  >
                    Verify
                  </button>
                </form>
                {isCloudConnected && (
                  <button
                    type="button"
                    onClick={() => {
                      void resendCustomerVerificationEmailSupabase(currentCustomer.email).catch(
                        () => {}
                      );
                      setEmailVerifyFeedback('Verification email re-sent!');
                    }}
                    className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Resend verification code
                  </button>
                )}
                {emailVerifyFeedback && (
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {emailVerifyFeedback}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {cancelOrderTarget && (
        <CancelOrderModal
          order={cancelOrderTarget}
          mode="customer"
          onClose={() => setCancelOrderTarget(null)}
          onConfirm={async ({ reason }) => {
            await onCancelOrder(cancelOrderTarget.orderNumber, reason);
            setCancelOrderTarget(null);
            showToast(`Order ${cancelOrderTarget.orderNumber} cancelled.`);
          }}
        />
      )}

      {returnModalOrder && onCreateReturnRequest && (
        <CustomerReturnModal
          order={returnModalOrder}
          existingReturns={myReturns}
          onClose={() => setReturnModalOrder(null)}
          onSubmitReturn={(rma) => {
            onCreateReturnRequest(rma);
            setReturnModalOrder(null);
            showToast(`Return request ${rma.rmaNumber} submitted.`);
          }}
        />
      )}
    </section>
  );
}
