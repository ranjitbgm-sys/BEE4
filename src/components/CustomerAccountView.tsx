import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Download,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
  UserCheck,
} from 'lucide-react';
import { INDIAN_STATES } from '../data/catalog';
import {
  AddressLabel,
  CartItem,
  CustomerProfile,
  OrderRecord,
  PaymentMethod,
  Product,
  ReturnRequestRecord,
  SavedAddress,
  SavedAddressErrors,
} from '../types';
import {
  buildCustomerReturnStepIndex,
  CUSTOMER_RETURN_TRACKER_STEPS,
  getOrderRmaStatusBadge,
  isOrderEligibleForReturn,
  lookupGuestOrderByOrderAndPhone,
} from '../utils/rmaLogic';
import {
  authenticateCustomer,
  buildWhatsAppUrl,
  completeLoginWithOtp,
  completePasswordResetWithOtp,
  completeSignupWithOtp,
  createLoginOtpChallenge,
  createPasswordResetOtpChallenge,
  createSignupOtpChallenge,
  downloadOrderInvoice,
  formatINR,
  getCustomerOrders,
  getOrderTrackingStepIndex,
  normalizeIndianPhone10,
  ORDER_TRACKING_STEPS,
  OtpChallenge,
  PasswordResetOtpChallenge,
  validateCustomerPasswordChange,
  validateSavedAddress,
} from '../utils/storeLogic';
import { CustomerReturnModal } from './CustomerReturnModal';
import { ProductImage } from './ProductImage';

export type CustomerAccountTab = 'overview' | 'orders' | 'wishlist' | 'addresses' | 'profile';

interface CustomerAccountViewProps {
  currentCustomer: CustomerProfile | null;
  customers: CustomerProfile[];
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  products: Product[];
  guestWishlistIds: string[];
  whatsappNumber: string;
  supportEmail?: string;
  cloudUserEmail?: string | null;
  onGoogleSignIn?: () => Promise<void>;
  onSignIn: (customerId: string) => void;
  onSignUp: (customer: CustomerProfile) => void;
  onSignOut: () => void;
  onUpdateCustomer: (updated: CustomerProfile) => void;
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product, variant: string, quantity: number, openDrawer: boolean) => void;
  onReorderItems: (items: CartItem[]) => void;
  onCancelOrder: (orderNumber: string) => void;
  onCreateReturnRequest?: (rma: ReturnRequestRecord) => void;
  onSelectProduct: (productId: string) => void;
  onContinueShopping: () => void;
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

function statusTone(status: OrderRecord['status']): string {
  switch (status) {
    case 'Delivered':
      return 'text-emerald-700';
    case 'Shipped':
      return 'text-blue-700';
    case 'Cancelled':
      return 'text-red-600';
    default:
      return 'text-amber-700';
  }
}

export function CustomerAccountView({
  currentCustomer,
  customers,
  orders,
  returns = [],
  products,
  guestWishlistIds,
  whatsappNumber,
  supportEmail = 'hello@bee4.in',
  cloudUserEmail = null,
  onGoogleSignIn,
  onSignIn,
  onSignUp,
  onSignOut,
  onUpdateCustomer,
  onToggleWishlist,
  onAddToCart,
  onReorderItems,
  onCancelOrder,
  onCreateReturnRequest,
  onSelectProduct,
  onContinueShopping,
}: CustomerAccountViewProps) {
  const [returnModalOrder, setReturnModalOrder] = useState<OrderRecord | null>(null);
  const [guestLookupOrderNo, setGuestLookupOrderNo] = useState('');
  const [guestLookupPhone, setGuestLookupPhone] = useState('');
  const [guestMatchedOrderNo, setGuestMatchedOrderNo] = useState<string | null>(null);
  const [guestLookupError, setGuestLookupError] = useState('');
  const [guestLookupNotice, setGuestLookupNotice] = useState('');

  const [authMode, setAuthMode] = useState<'signup' | 'signin' | 'forgot'>('signup');
  const [signinMethod, setSigninMethod] = useState<'otp' | 'password'>('otp');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Sign Up + OTP verification state
  const [signupName, setSignupName] = useState('');
  const [signupContact, setSignupContact] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupErrors, setSignupErrors] = useState<{
    fullName?: string;
    contactIdentifier?: string;
    password?: string;
  }>({});
  const [signupOtpChallenge, setSignupOtpChallenge] = useState<OtpChallenge | null>(null);
  const [signupIssuedOtpPreview, setSignupIssuedOtpPreview] = useState('');
  const [signupEnteredOtp, setSignupEnteredOtp] = useState('');
  const [signupOtpError, setSignupOtpError] = useState('');

  // Sign In (OTP + Password) state
  const [signinIdentifier, setSigninIdentifier] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [showSigninPassword, setShowSigninPassword] = useState(false);
  const [signinError, setSigninError] = useState('');
  const [signinNotice, setSigninNotice] = useState('');
  const [loginOtpChallenge, setLoginOtpChallenge] = useState<PasswordResetOtpChallenge | null>(null);
  const [loginIssuedOtpPreview, setLoginIssuedOtpPreview] = useState('');
  const [loginEnteredOtp, setLoginEnteredOtp] = useState('');
  const [loginOtpError, setLoginOtpError] = useState('');

  // Forgot Password via OTP state
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [otpChallenge, setOtpChallenge] = useState<PasswordResetOtpChallenge | null>(null);
  const [issuedOtpPreview, setIssuedOtpPreview] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPasswords, setShowResetPasswords] = useState(false);
  const [resetError, setResetError] = useState('');
  const [otpNowMs, setOtpNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!otpChallenge && !signupOtpChallenge && !loginOtpChallenge) return;
    const interval = window.setInterval(() => {
      setOtpNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [otpChallenge, signupOtpChallenge, loginOtpChallenge]);

  const [activeTab, setActiveTab] = useState<CustomerAccountTab>('overview');
  const [notice, setNotice] = useState('');

  // Orders filter state
  const [orderFilter, setOrderFilter] = useState<'All' | 'Active' | 'Delivered' | 'Cancelled'>('All');
  const [orderSearch, setOrderSearch] = useState('');

  // Address editor state
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [addressErrors, setAddressErrors] = useState<SavedAddressErrors>({});

  // Profile editor state
  const [profileName, setProfileName] = useState(currentCustomer?.fullName ?? '');
  const [profilePhone, setProfilePhone] = useState(currentCustomer?.phone ?? '');
  const [profileEmail, setProfileEmail] = useState(currentCustomer?.email ?? '');
  const [profilePayment, setProfilePayment] = useState<PaymentMethod>(
    currentCustomer?.preferredPayment ?? 'upi'
  );
  const [profileMonth, setProfileMonth] = useState(currentCustomer?.celebrationMonth ?? '');
  const [profileError, setProfileError] = useState('');

  // Customer password change state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');

  const syncProfileDrafts = (cust: CustomerProfile) => {
    setProfileName(cust.fullName);
    setProfilePhone(cust.phone);
    setProfileEmail(cust.email);
    setProfilePayment(cust.preferredPayment);
    setProfileMonth(cust.celebrationMonth ?? '');
    setProfileError('');
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setPasswordChangeError('');
  };

  const handleGoogleAuthClick = async () => {
    if (!onGoogleSignIn) return;
    setGoogleError('');
    setGoogleLoading(true);
    try {
      await onGoogleSignIn();
      setActiveTab('overview');
      setNotice('Signed in with Google and synced to your BEE4 Cloud Account.');
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Google sign-in was cancelled or blocked. Please allow popups and try again.';
      setGoogleError(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  const resetSignupOtpState = () => {
    setSignupOtpChallenge(null);
    setSignupIssuedOtpPreview('');
    setSignupEnteredOtp('');
    setSignupOtpError('');
  };

  const resetLoginOtpState = () => {
    setLoginOtpChallenge(null);
    setLoginIssuedOtpPreview('');
    setLoginEnteredOtp('');
    setLoginOtpError('');
  };

  const handleRequestSignupOtp = (event?: FormEvent) => {
    event?.preventDefault();
    const now = Date.now();
    const issued = createSignupOtpChallenge(
      customers,
      {
        fullName: signupName,
        contactIdentifier: signupContact,
        password: signupPassword,
      },
      now
    );

    if (issued.errors || !issued.challenge || !issued.otpCode) {
      setSignupErrors(issued.errors ?? {});
      return;
    }

    setOtpNowMs(now);
    setSignupErrors({});
    setSignupOtpChallenge(issued.challenge);
    setSignupIssuedOtpPreview(issued.otpCode);
    setSignupEnteredOtp('');
    setSignupOtpError('');
  };

  const handleVerifySignupOtp = (event: FormEvent) => {
    event.preventDefault();
    if (!signupOtpChallenge) return;

    const result = completeSignupWithOtp({
      challenge: signupOtpChallenge,
      fullName: signupName,
      password: signupPassword,
      enteredOtp: signupEnteredOtp,
      guestWishlistIds,
      nowMs: Date.now(),
    });

    if (result.updatedChallenge) {
      setSignupOtpChallenge(result.updatedChallenge);
    }

    if (result.error || !result.customer) {
      setSignupOtpError(result.error ?? 'Unable to verify OTP.');
      return;
    }

    const newCustomer = result.customer;
    onSignUp(newCustomer);
    syncProfileDrafts(newCustomer);
    setSignupName('');
    setSignupContact('');
    setSignupPassword('');
    setShowSignupPassword(false);
    setSignupErrors({});
    resetSignupOtpState();
    setActiveTab('overview');
    setNotice(`Mobile/email verified with OTP! Welcome to BEE4, ${newCustomer.fullName}.`);
  };

  const handleRequestLoginOtp = (event?: FormEvent) => {
    event?.preventDefault();
    const now = Date.now();
    const targetIdentifier = loginOtpChallenge ? loginOtpChallenge.identifier : signinIdentifier;
    const issued = createLoginOtpChallenge(customers, targetIdentifier, now);

    if (issued.error || !issued.challenge || !issued.otpCode) {
      setLoginOtpError(issued.error ?? 'Unable to generate login OTP.');
      return;
    }

    setOtpNowMs(now);
    setLoginOtpChallenge(issued.challenge);
    setLoginIssuedOtpPreview(issued.otpCode);
    setLoginEnteredOtp('');
    setLoginOtpError('');
    setSigninNotice('');
  };

  const handleVerifyLoginOtp = (event: FormEvent) => {
    event.preventDefault();
    if (!loginOtpChallenge) return;

    const result = completeLoginWithOtp({
      customers,
      challenge: loginOtpChallenge,
      enteredOtp: loginEnteredOtp,
      nowMs: Date.now(),
    });

    if (result.updatedChallenge) {
      setLoginOtpChallenge(result.updatedChallenge);
    }

    if (result.error || !result.customer) {
      setLoginOtpError(result.error ?? 'Unable to verify OTP.');
      return;
    }

    const matched = result.customer;
    onSignIn(matched.id);
    syncProfileDrafts(matched);
    setSigninIdentifier('');
    setSigninPassword('');
    setShowSigninPassword(false);
    setSigninError('');
    setSigninNotice('');
    resetLoginOtpState();
    setActiveTab('overview');
    setNotice(`Signed in via OTP as ${matched.fullName}.`);
  };

  const handleSigninSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = authenticateCustomer(customers, signinIdentifier, signinPassword);
    if (result.error || !result.customer) {
      setSigninError(result.error ?? 'Incorrect mobile/email or password.');
      return;
    }
    const matched = result.customer;
    onSignIn(matched.id);
    syncProfileDrafts(matched);
    setSigninIdentifier('');
    setSigninPassword('');
    setShowSigninPassword(false);
    setSigninError('');
    setSigninNotice('');
    resetLoginOtpState();
    setActiveTab('overview');
    setNotice(`Signed in as ${matched.fullName}.`);
  };

  const resetForgotState = (prefillIdentifier = '') => {
    setResetIdentifier(prefillIdentifier);
    setOtpChallenge(null);
    setIssuedOtpPreview('');
    setEnteredOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setShowResetPasswords(false);
    setResetError('');
  };

  const handleRequestPasswordResetOtp = (event?: FormEvent) => {
    event?.preventDefault();
    const now = Date.now();
    const targetIdentifier = otpChallenge ? otpChallenge.identifier : resetIdentifier;
    const issued = createPasswordResetOtpChallenge(customers, targetIdentifier, now);
    if (issued.error || !issued.challenge || !issued.otpCode) {
      setResetError(issued.error ?? 'Unable to generate OTP.');
      return;
    }
    setOtpNowMs(now);
    setOtpChallenge(issued.challenge);
    setIssuedOtpPreview(issued.otpCode);
    setEnteredOtp('');
    setResetError('');
  };

  const handleVerifyOtpAndResetPassword = (event: FormEvent) => {
    event.preventDefault();
    if (!otpChallenge) return;

    const result = completePasswordResetWithOtp({
      challenge: otpChallenge,
      enteredOtp,
      newPassword: resetNewPassword,
      confirmPassword: resetConfirmPassword,
      nowMs: Date.now(),
    });

    if (result.updatedChallenge) {
      setOtpChallenge(result.updatedChallenge);
    }

    if (result.error || !result.nextHash) {
      setResetError(result.error ?? 'Unable to verify OTP.');
      return;
    }

    const targetCustomer = customers.find((c) => c.id === otpChallenge.customerId);
    if (!targetCustomer) {
      setResetError('Account not found. Please try again.');
      return;
    }

    onUpdateCustomer({
      ...targetCustomer,
      passwordHash: result.nextHash,
    });

    const restoredIdentifier = otpChallenge.identifier;
    resetForgotState();
    setAuthMode('signin');
    setSigninMethod('password');
    setSigninIdentifier(restoredIdentifier);
    setSigninPassword('');
    setSigninError('');
    setSigninNotice('Password reset verified with OTP. Sign in with your new password.');
  };

  // Auth / Guest view when not signed in
  if (!currentCustomer) {
    const guestProducts = products.filter((p) => guestWishlistIds.includes(p.id));

    return (
      <section className="max-w-[1040px] mx-auto px-4 sm:px-6 pt-8 pb-16">
        <button
          type="button"
          onClick={onContinueShopping}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Auth Card */}
          <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">BEE4 Customer Account</p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                Sign up or access your orders &amp; wishlist
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                Continue instantly with Google Cloud Sync, or use your 10-digit Indian mobile number or email.
              </p>
            </div>

            {onGoogleSignIn && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleGoogleAuthClick}
                  disabled={googleLoading}
                  className="w-full h-11 px-4 rounded-xl glass-btn-secondary text-zinc-900 text-sm font-semibold inline-flex items-center justify-center gap-2.5 disabled:opacity-60 transition-all"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>{googleLoading ? 'Connecting with Google...' : 'Continue with Google'}</span>
                </button>

                {googleError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                  >
                    {googleError}
                  </div>
                )}

                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-zinc-900/10" />
                  <span className="shrink mx-3 text-[11px] font-medium text-zinc-500">
                    or continue with mobile / email
                  </span>
                  <div className="flex-grow border-t border-zinc-900/10" />
                </div>
              </div>
            )}

            <div
              role="tablist"
              aria-label="Customer authentication mode"
              className="inline-flex flex-wrap p-1.5 rounded-2xl glass-subtle gap-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signup'}
                onClick={() => {
                  setAuthMode('signup');
                  setSigninError('');
                  setSigninNotice('');
                  resetLoginOtpState();
                  resetForgotState();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  authMode === 'signup'
                    ? 'glass-btn-ink text-white dark:text-zinc-950'
                    : 'text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                Sign Up (OTP)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'signin'}
                onClick={() => {
                  setAuthMode('signin');
                  setSignupErrors({});
                  resetSignupOtpState();
                  setSigninNotice('');
                  resetForgotState();
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  authMode === 'signin'
                    ? 'glass-btn-ink text-white dark:text-zinc-950'
                    : 'text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={authMode === 'forgot'}
                onClick={() => {
                  setAuthMode('forgot');
                  setSignupErrors({});
                  resetSignupOtpState();
                  setSigninError('');
                  setSigninNotice('');
                  resetLoginOtpState();
                  resetForgotState(signinIdentifier);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  authMode === 'forgot'
                    ? 'glass-btn-ink text-white dark:text-zinc-950'
                    : 'text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                Forgot Password (OTP)
              </button>
            </div>

            {authMode === 'signup' && (
              !signupOtpChallenge ? (
                <form onSubmit={handleRequestSignupOtp} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="cust-signup-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      id="cust-signup-name"
                      type="text"
                      value={signupName}
                      onChange={(e) => {
                        setSignupName(e.target.value);
                        if (signupErrors.fullName) setSignupErrors({ ...signupErrors, fullName: undefined });
                      }}
                      placeholder="e.g. Kabir Mehta"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                    />
                    {signupErrors.fullName && (
                      <p className="mt-1 text-xs text-red-600">{signupErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="cust-signup-contact" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Mobile Number or Email *
                    </label>
                    <input
                      id="cust-signup-contact"
                      type="text"
                      value={signupContact}
                      onChange={(e) => {
                        setSignupContact(e.target.value);
                        if (signupErrors.contactIdentifier) {
                          setSignupErrors({ ...signupErrors, contactIdentifier: undefined });
                        }
                      }}
                      placeholder="9876543210 or kabir@example.com"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                    />
                    {signupErrors.contactIdentifier && (
                      <p className="mt-1 text-xs text-red-600">{signupErrors.contactIdentifier}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="cust-signup-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Create Password (min 6 characters) *
                    </label>
                    <div className="relative">
                      <input
                        id="cust-signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(e) => {
                          setSignupPassword(e.target.value);
                          if (signupErrors.password) {
                            setSignupErrors({ ...signupErrors, password: undefined });
                          }
                        }}
                        placeholder="Enter a strong password"
                        className="w-full h-11 pl-3.5 pr-11 rounded-xl glass-input text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword((prev) => !prev)}
                        aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900"
                      >
                        {showSignupPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {signupErrors.password && (
                      <p className="mt-1 text-xs text-red-600">{signupErrors.password}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
                  >
                    Send 6-Digit Verification OTP
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifySignupOtp} noValidate className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-50/75 backdrop-blur-md border border-amber-200/80 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-zinc-900">
                        Verification OTP sent to {signupOtpChallenge.maskedTarget}
                      </span>
                      <span className="tabular-nums font-medium text-amber-800">
                        {otpNowMs >= signupOtpChallenge.expiresAtMs
                          ? 'Expired'
                          : `Expires in ${Math.max(1, Math.ceil((signupOtpChallenge.expiresAtMs - otpNowMs) / 1000))}s`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
                      <span>Verification code for this session:</span>
                      <strong className="font-mono tabular-nums text-zinc-900 bg-white/90 px-2 py-0.5 rounded-lg border border-amber-200 shadow-xs">
                        {signupIssuedOtpPreview}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupEnteredOtp(signupIssuedOtpPreview);
                          setSignupOtpError('');
                        }}
                        className="px-2 py-0.5 rounded-lg glass-btn-secondary text-[11px] font-semibold text-amber-800"
                      >
                        Use Code
                      </button>
                    </div>
                  </div>

                  {signupOtpError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                    >
                      {signupOtpError}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label htmlFor="cust-signup-otp" className="block text-xs font-semibold text-zinc-700">
                        Enter 6-Digit OTP *
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRequestSignupOtp()}
                        disabled={otpNowMs < signupOtpChallenge.resendAvailableAtMs}
                        className="text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:text-zinc-400 tabular-nums"
                      >
                        {otpNowMs < signupOtpChallenge.resendAvailableAtMs
                          ? `Resend OTP in ${Math.max(1, Math.ceil((signupOtpChallenge.resendAvailableAtMs - otpNowMs) / 1000))}s`
                          : 'Resend OTP'}
                      </button>
                    </div>
                    <input
                      id="cust-signup-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      autoComplete="one-time-code"
                      value={signupEnteredOtp}
                      onChange={(e) => {
                        setSignupEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                        if (signupOtpError) setSignupOtpError('');
                      }}
                      placeholder="6-digit OTP"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm font-mono tracking-widest tabular-nums focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="submit"
                      className="flex-1 min-w-[200px] h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
                    >
                      Verify OTP &amp; Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => resetSignupOtpState()}
                      className="h-11 px-4 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700"
                    >
                      Edit Details
                    </button>
                  </div>
                </form>
              )
            )}

            {authMode === 'signin' && (
              <div className="space-y-4">
                {signinNotice && (
                  <div
                    role="status"
                    className="p-3 rounded-xl bg-emerald-50/85 backdrop-blur-md border border-emerald-200/80 text-xs text-emerald-800 font-medium"
                  >
                    {signinNotice}
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pb-1">
                  <div className="inline-flex p-1 rounded-xl glass-subtle gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSigninMethod('otp');
                        setSigninError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        signinMethod === 'otp'
                          ? 'glass-btn-amber text-white'
                          : 'text-zinc-700 hover:text-zinc-900'
                      }`}
                    >
                      Login via OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSigninMethod('password');
                        resetLoginOtpState();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        signinMethod === 'password'
                          ? 'glass-btn-ink'
                          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      Login via Password
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSigninError('');
                      setSigninNotice('');
                      resetLoginOtpState();
                      resetForgotState(signinIdentifier);
                      setAuthMode('forgot');
                    }}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 whitespace-nowrap"
                  >
                    Forgot Password?
                  </button>
                </div>

                {signinMethod === 'otp' ? (
                  !loginOtpChallenge ? (
                    <form onSubmit={handleRequestLoginOtp} noValidate className="space-y-4">
                      {loginOtpError && (
                        <div
                          role="alert"
                          className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                        >
                          {loginOtpError}
                        </div>
                      )}

                      <div>
                        <label htmlFor="cust-login-otp-id" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Registered Mobile Number or Email *
                        </label>
                        <input
                          id="cust-login-otp-id"
                          type="text"
                          autoComplete="username"
                          value={signinIdentifier}
                          onChange={(e) => {
                            setSigninIdentifier(e.target.value);
                            if (loginOtpError) setLoginOtpError('');
                          }}
                          placeholder="e.g. 9820112233 or ananya.v@example.com"
                          className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full h-11 rounded-xl glass-btn-ink text-sm font-semibold transition-all"
                      >
                        Send 6-Digit Login OTP
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyLoginOtp} noValidate className="space-y-4">
                      <div className="p-3.5 rounded-2xl bg-amber-50/75 backdrop-blur-md border border-amber-200/80 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-zinc-900">
                            Login OTP sent to {loginOtpChallenge.maskedTarget}
                          </span>
                          <span className="tabular-nums font-medium text-amber-800">
                            {otpNowMs >= loginOtpChallenge.expiresAtMs
                              ? 'Expired'
                              : `Expires in ${Math.max(1, Math.ceil((loginOtpChallenge.expiresAtMs - otpNowMs) / 1000))}s`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
                          <span>Verification code for this session:</span>
                          <strong className="font-mono tabular-nums text-zinc-900 bg-white/90 px-2 py-0.5 rounded-lg border border-amber-200 shadow-xs">
                            {loginIssuedOtpPreview}
                          </strong>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginEnteredOtp(loginIssuedOtpPreview);
                              setLoginOtpError('');
                            }}
                            className="px-2 py-0.5 rounded-lg glass-btn-secondary text-[11px] font-semibold text-amber-800"
                          >
                            Use Code
                          </button>
                        </div>
                      </div>

                      {loginOtpError && (
                        <div
                          role="alert"
                          className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                        >
                          {loginOtpError}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label htmlFor="cust-login-otp-code" className="block text-xs font-semibold text-zinc-700">
                            Enter 6-Digit OTP *
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRequestLoginOtp()}
                            disabled={otpNowMs < loginOtpChallenge.resendAvailableAtMs}
                            className="text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:text-zinc-400 tabular-nums"
                          >
                            {otpNowMs < loginOtpChallenge.resendAvailableAtMs
                              ? `Resend OTP in ${Math.max(1, Math.ceil((loginOtpChallenge.resendAvailableAtMs - otpNowMs) / 1000))}s`
                              : 'Resend OTP'}
                          </button>
                        </div>
                        <input
                          id="cust-login-otp-code"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          autoComplete="one-time-code"
                          value={loginEnteredOtp}
                          onChange={(e) => {
                            setLoginEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                            if (loginOtpError) setLoginOtpError('');
                          }}
                          placeholder="6-digit OTP"
                          className="w-full h-11 px-3.5 rounded-xl glass-input text-sm font-mono tracking-widest tabular-nums focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="submit"
                          className="flex-1 min-w-[200px] h-11 rounded-xl glass-btn-ink text-sm font-semibold transition-all"
                        >
                          Verify OTP &amp; Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => resetLoginOtpState()}
                          className="h-11 px-4 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700"
                        >
                          Change Account
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <form onSubmit={handleSigninSubmit} noValidate className="space-y-4">
                    {signinError && (
                      <div
                        role="alert"
                        className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                      >
                        {signinError}
                      </div>
                    )}

                    <div>
                      <label htmlFor="cust-signin-id" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Registered Mobile Number or Email *
                      </label>
                      <input
                        id="cust-signin-id"
                        type="text"
                        autoComplete="username"
                        value={signinIdentifier}
                        onChange={(e) => {
                          setSigninIdentifier(e.target.value);
                          if (signinError) setSigninError('');
                        }}
                        placeholder="e.g. 9820112233 or ananya.v@example.com"
                        className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="cust-signin-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Password *
                      </label>
                      <div className="relative">
                        <input
                          id="cust-signin-password"
                          type={showSigninPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={signinPassword}
                          onChange={(e) => {
                            setSigninPassword(e.target.value);
                            if (signinError) setSigninError('');
                          }}
                          placeholder="Enter your account password"
                          className="w-full h-11 pl-3.5 pr-11 rounded-xl glass-input text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSigninPassword((prev) => !prev)}
                          aria-label={showSigninPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900"
                        >
                          {showSigninPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 rounded-xl glass-btn-ink text-sm font-semibold transition-all"
                    >
                      Sign In with Password
                    </button>
                  </form>
                )}
              </div>
            )}

            {authMode === 'forgot' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-900/8">
                  <div>
                    <h2 className="font-display text-base font-bold text-zinc-900 inline-flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>Reset Password via 6-Digit OTP</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-600">
                      Verify your registered mobile number or email to set a new password.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resetForgotState();
                      setAuthMode('signin');
                    }}
                    className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 shrink-0"
                  >
                    ← Back to Sign In
                  </button>
                </div>

                {resetError && (
                  <div
                    role="alert"
                    className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                  >
                    {resetError}
                  </div>
                )}

                {!otpChallenge ? (
                  <form onSubmit={handleRequestPasswordResetOtp} noValidate className="space-y-4">
                    <div>
                      <label htmlFor="cust-reset-id" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Registered Mobile Number or Email *
                      </label>
                      <input
                        id="cust-reset-id"
                        type="text"
                        value={resetIdentifier}
                        onChange={(e) => {
                          setResetIdentifier(e.target.value);
                          if (resetError) setResetError('');
                        }}
                        placeholder="e.g. 9820112233 or ananya.v@example.com"
                        className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
                    >
                      Send 6-Digit OTP
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtpAndResetPassword} noValidate className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-50/75 backdrop-blur-md border border-amber-200/80 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-zinc-900">
                          OTP sent to {otpChallenge.maskedTarget}
                        </span>
                        <span className="tabular-nums font-medium text-amber-800">
                          {otpNowMs >= otpChallenge.expiresAtMs
                            ? 'Expired'
                            : `Expires in ${Math.max(1, Math.ceil((otpChallenge.expiresAtMs - otpNowMs) / 1000))}s`}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
                        <span>Verification code for this session:</span>
                        <strong className="font-mono tabular-nums text-zinc-900 bg-white/90 px-2 py-0.5 rounded-lg border border-amber-200 shadow-xs">
                          {issuedOtpPreview}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            setEnteredOtp(issuedOtpPreview);
                            setResetError('');
                          }}
                          className="px-2 py-0.5 rounded-lg glass-btn-secondary text-[11px] font-semibold text-amber-800"
                        >
                          Use Code
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <label htmlFor="cust-reset-otp" className="block text-xs font-semibold text-zinc-700">
                          Enter 6-Digit OTP *
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRequestPasswordResetOtp()}
                          disabled={otpNowMs < otpChallenge.resendAvailableAtMs}
                          className="text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:text-zinc-400 tabular-nums"
                        >
                          {otpNowMs < otpChallenge.resendAvailableAtMs
                            ? `Resend OTP in ${Math.max(1, Math.ceil((otpChallenge.resendAvailableAtMs - otpNowMs) / 1000))}s`
                            : 'Resend OTP'}
                        </button>
                      </div>
                      <input
                        id="cust-reset-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        value={enteredOtp}
                        onChange={(e) => {
                          setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                          if (resetError) setResetError('');
                        }}
                        placeholder="6-digit OTP"
                        className="w-full h-11 px-3.5 rounded-xl glass-input text-sm font-mono tracking-widest tabular-nums focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label htmlFor="cust-reset-new-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          New Password (min 6 chars) *
                        </label>
                        <div className="relative">
                          <input
                            id="cust-reset-new-password"
                            type={showResetPasswords ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={resetNewPassword}
                            onChange={(e) => {
                              setResetNewPassword(e.target.value);
                              if (resetError) setResetError('');
                            }}
                            placeholder="New password"
                            className="w-full h-11 pl-3.5 pr-10 rounded-xl glass-input text-sm focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowResetPasswords((prev) => !prev)}
                            aria-label={showResetPasswords ? 'Hide passwords' : 'Show passwords'}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900"
                          >
                            {showResetPasswords ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label htmlFor="cust-reset-confirm-password" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                          Confirm New Password *
                        </label>
                        <input
                          id="cust-reset-confirm-password"
                          type={showResetPasswords ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={resetConfirmPassword}
                          onChange={(e) => {
                            setResetConfirmPassword(e.target.value);
                            if (resetError) setResetError('');
                          }}
                          placeholder="Confirm password"
                          className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="submit"
                        className="flex-1 min-w-[200px] h-11 rounded-xl glass-btn-ink text-sm font-semibold transition-all"
                      >
                        Verify OTP &amp; Reset Password
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpChallenge(null);
                          setIssuedOtpPreview('');
                          setEnteredOtp('');
                          setResetError('');
                        }}
                        className="h-11 px-4 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700"
                      >
                        Change Account
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right: Track Order & Returns (Order ID + Phone) + Customer Benefits */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl glass-surface space-y-4">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                  Instant Guest Order &amp; RMA Lookup
                </p>
                <h2 className="mt-0.5 font-display text-lg font-bold text-zinc-900 dark:text-white">
                  Track Order &amp; Returns
                </h2>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Check live delivery status, request a 7-day return/replacement, or track refund progress.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const res = lookupGuestOrderByOrderAndPhone(
                    orders,
                    guestLookupOrderNo,
                    guestLookupPhone
                  );
                  if (res.error || !res.order) {
                    setGuestLookupError(res.error ?? 'Order not found.');
                    setGuestMatchedOrderNo(null);
                    return;
                  }
                  setGuestLookupError('');
                  setGuestLookupNotice('');
                  setGuestMatchedOrderNo(res.order.orderNumber);
                }}
                noValidate
                className="space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="guest-rma-order" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                      Order ID *
                    </label>
                    <input
                      id="guest-rma-order"
                      type="text"
                      value={guestLookupOrderNo}
                      onChange={(e) => {
                        setGuestLookupOrderNo(e.target.value);
                        if (guestLookupError) setGuestLookupError('');
                      }}
                      placeholder="e.g. BEE4-2044"
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs sm:text-sm font-mono uppercase focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="guest-rma-phone" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      id="guest-rma-phone"
                      type="tel"
                      value={guestLookupPhone}
                      onChange={(e) => {
                        setGuestLookupPhone(e.target.value);
                        if (guestLookupError) setGuestLookupError('');
                      }}
                      placeholder="e.g. 9830556677"
                      className="w-full h-10 px-3 rounded-xl glass-input text-xs sm:text-sm tabular-nums focus:outline-none"
                    />
                  </div>
                </div>

                {guestLookupError && (
                  <p role="alert" className="text-xs font-medium text-red-600">
                    {guestLookupError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full h-10 rounded-xl glass-btn-amber text-white text-xs sm:text-sm font-semibold transition-all"
                >
                  Track Order &amp; Manage Returns
                </button>
              </form>

              {guestLookupNotice && (
                <div
                  role="status"
                  className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-xs font-medium text-emerald-800"
                >
                  {guestLookupNotice}
                </div>
              )}

              {guestMatchedOrderNo &&
                (() => {
                  const matchedOrder = orders.find((o) => o.orderNumber === guestMatchedOrderNo);
                  if (!matchedOrder) return null;
                  return (
                    <div className="pt-3 border-t border-zinc-900/10 dark:border-white/10">
                      <OrderTrackingCard
                        compact
                        order={matchedOrder}
                        returns={returns}
                        whatsappNumber={whatsappNumber}
                        onDownloadInvoice={() => {
                          const filename = downloadOrderInvoice(matchedOrder, {
                            supportEmail,
                            whatsappNumber,
                          });
                          setGuestLookupNotice(`Downloaded invoice ${filename}.`);
                        }}
                        onReorder={() => {
                          onReorderItems(matchedOrder.items);
                          setGuestLookupNotice(
                            `Added items from ${matchedOrder.orderNumber} to your bag.`
                          );
                        }}
                        onCancel={() => {
                          onCancelOrder(matchedOrder.orderNumber);
                          setGuestLookupNotice(`Cancelled order ${matchedOrder.orderNumber}.`);
                        }}
                        onOpenReturnModal={() => setReturnModalOrder(matchedOrder)}
                      />
                    </div>
                  );
                })()}
            </div>

            <div className="p-6 rounded-3xl glass-surface space-y-4">
              <h2 className="font-display text-lg font-bold text-zinc-900">
                Inside Your BEE4 User Panel
              </h2>
              <ul className="space-y-3 text-sm text-zinc-700">
                <li className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full glass-orb flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <span className="pt-0.5">Track shipments step-by-step, request 7-day returns, or reorder in 1 click.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full glass-orb flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <span className="pt-0.5">Save Home, Work, or gifting addresses for instant checkout autofill.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full glass-orb flex items-center justify-center shrink-0">
                    <Heart className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <span className="pt-0.5">Keep a synced Wishlist across every category and gift occasion.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full glass-orb flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <span className="pt-0.5">Save your preferred payment mode (UPI, Card, or COD) and celebration month.</span>
                </li>
              </ul>
            </div>

            {guestProducts.length > 0 && (
              <div className="p-5 rounded-3xl glass-subtle">
                <p className="text-xs font-semibold text-zinc-900">
                  Saved Guest Wishlist ({guestProducts.length})
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Your saved items will automatically sync when you create an account:
                </p>
                <ul className="mt-3 space-y-2">
                  {guestProducts.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(item.id)}
                        className="text-zinc-800 hover:text-amber-700 font-medium truncate text-left"
                      >
                        {item.title}
                      </button>
                      <span className="font-semibold tabular-nums text-zinc-900 shrink-0">
                        {formatINR(item.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {returnModalOrder && (
          <CustomerReturnModal
            order={returnModalOrder}
            existingReturns={returns}
            onClose={() => setReturnModalOrder(null)}
            onSubmitReturn={(rma) => {
              onCreateReturnRequest?.(rma);
              setReturnModalOrder(null);
              setGuestLookupNotice(
                `Return request ${rma.rmaNumber} submitted! Track live progress below.`
              );
            }}
          />
        )}
      </section>
    );
  }

  // Signed-in Customer Panel Data
  const customerOrders = getCustomerOrders(orders, currentCustomer);
  const activeShipmentsCount = customerOrders.filter(
    (o) => o.status === 'Confirmed' || o.status === 'Preparing Shipment' || o.status === 'Shipped'
  ).length;
  const wishlistProducts = products.filter((p) => currentCustomer.wishlistIds.includes(p.id));

  const filteredCustomerOrders = customerOrders.filter((order) => {
    if (orderFilter === 'Active') {
      if (order.status === 'Delivered' || order.status === 'Cancelled') return false;
    } else if (orderFilter !== 'All' && order.status !== orderFilter) {
      return false;
    }
    const q = orderSearch.trim().toLowerCase();
    if (q.length > 0) {
      const hay = [
        order.orderNumber,
        order.customer.city,
        ...order.items.map((i) => i.title),
      ]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const openNewAddressForm = () => {
    setEditingAddress({
      id: `addr-${Date.now()}`,
      label: 'Home',
      fullName: currentCustomer.fullName,
      phone: currentCustomer.phone,
      address: '',
      city: '',
      state: 'Karnataka',
      pinCode: '',
      isDefault: currentCustomer.addresses.length === 0,
    });
    setAddressErrors({});
    setNotice('');
  };

  const handleSaveAddress = (event: FormEvent) => {
    event.preventDefault();
    if (!editingAddress) return;

    const errs = validateSavedAddress({
      label: editingAddress.label,
      fullName: editingAddress.fullName,
      phone: editingAddress.phone,
      address: editingAddress.address,
      city: editingAddress.city,
      state: editingAddress.state,
      pinCode: editingAddress.pinCode,
    });
    if (Object.keys(errs).length > 0) {
      setAddressErrors(errs);
      return;
    }

    const cleaned: SavedAddress = {
      ...editingAddress,
      fullName: editingAddress.fullName.trim(),
      phone: normalizeIndianPhone10(editingAddress.phone),
      address: editingAddress.address.trim(),
      city: editingAddress.city.trim(),
      state: editingAddress.state.trim(),
      pinCode: editingAddress.pinCode.trim(),
    };

    const exists = currentCustomer.addresses.some((a) => a.id === cleaned.id);
    let updatedList = exists
      ? currentCustomer.addresses.map((a) => (a.id === cleaned.id ? cleaned : a))
      : [...currentCustomer.addresses, cleaned];

    if (cleaned.isDefault) {
      updatedList = updatedList.map((a) => ({ ...a, isDefault: a.id === cleaned.id }));
    } else if (!updatedList.some((a) => a.isDefault) && updatedList.length > 0) {
      updatedList[0] = { ...updatedList[0], isDefault: true };
    }

    onUpdateCustomer({ ...currentCustomer, addresses: updatedList });
    setEditingAddress(null);
    setAddressErrors({});
    setNotice(`Saved "${cleaned.label}" delivery address.`);
  };

  const handleSetDefaultAddress = (addressId: string) => {
    const updatedList = currentCustomer.addresses.map((a) => ({
      ...a,
      isDefault: a.id === addressId,
    }));
    onUpdateCustomer({ ...currentCustomer, addresses: updatedList });
    setNotice('Updated default delivery address.');
  };

  const handleDeleteAddress = (addressId: string) => {
    const remaining = currentCustomer.addresses.filter((a) => a.id !== addressId);
    if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    onUpdateCustomer({ ...currentCustomer, addresses: remaining });
    setNotice('Removed saved address.');
  };

  const handleSaveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (profileName.trim().length < 2) {
      setProfileError('Please enter your full name.');
      return;
    }
    const cleanPhone = profilePhone.trim() ? normalizeIndianPhone10(profilePhone) : '';
    if (cleanPhone && !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setProfileError('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    const cleanEmail = profileEmail.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setProfileError('Enter a valid email address.');
      return;
    }
    if (!cleanPhone && !cleanEmail) {
      setProfileError('Keep at least one mobile number or email address on your profile.');
      return;
    }

    onUpdateCustomer({
      ...currentCustomer,
      fullName: profileName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      preferredPayment: profilePayment,
      celebrationMonth: profileMonth,
    });
    setProfileError('');
    setNotice('Profile & preferences updated.');
  };

  const tabMeta: Record<CustomerAccountTab, string> = {
    overview: 'Account Overview',
    orders: 'My Orders & Tracking',
    wishlist: 'Saved Wishlist',
    addresses: 'Saved Addresses',
    profile: 'Profile & Preferences',
  };

  const navItems: {
    id: CustomerAccountTab;
    label: string;
    icon: typeof User;
    count?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: UserCheck },
    { id: 'orders', label: 'My Orders', icon: Package, count: customerOrders.length },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, count: wishlistProducts.length },
    { id: 'addresses', label: 'Addresses', icon: MapPin, count: currentCustomer.addresses.length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-16">
      {/* Top Account Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/75">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            BEE4 Account / <span className="text-zinc-900 font-semibold">{tabMeta[activeTab]}</span>
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-zinc-900">
            Hello, {currentCustomer.fullName}
          </h1>
          {cloudUserEmail && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Supabase Cloud Sync active · {cloudUserEmail}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onContinueShopping}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-800 whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass-btn-secondary hover:bg-red-50/90 hover:text-red-700 text-xs font-semibold text-zinc-700 whitespace-nowrap transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Workspace Shell */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar */}
        <aside className="lg:col-span-3 glass-surface rounded-3xl p-3">
          <nav aria-label="Customer account sections" className="flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setNotice('');
                    if (item.id === 'profile') syncProfileDrafts(currentCustomer);
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'glass-btn-ink font-semibold'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-white/65 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`text-xs tabular-nums font-semibold ${
                        isActive ? 'text-amber-300 dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6 min-w-0">
          {notice && (
            <div
              role="status"
              className="p-3.5 rounded-2xl bg-emerald-50/85 backdrop-blur-md border border-emerald-200/80 text-sm text-emerald-800 font-medium"
            >
              {notice}
            </div>
          )}

          {/* 1. OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">My Orders</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {customerOrders.length}
                  </p>
                  <p className="mt-1 text-xs text-amber-700 font-medium tabular-nums">
                    {activeShipmentsCount} in transit / active
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Wishlist Items</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {wishlistProducts.length}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Saved for later</p>
                </div>

                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Saved Addresses</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {currentCustomer.addresses.length}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Fast checkout ready</p>
                </div>

                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Preferred Pay</p>
                  <p className="mt-1.5 font-display text-2xl font-bold uppercase text-zinc-900">
                    {currentCustomer.preferredPayment}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Default at checkout</p>
                </div>
              </div>

              {/* Latest Order Live Tracker */}
              <div className="glass-surface rounded-3xl p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="font-display text-base font-bold text-zinc-900">
                    Latest Order Tracking
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                  >
                    View All Orders →
                  </button>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="py-4 text-sm text-zinc-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span>You haven&apos;t placed an order with this phone/email yet.</span>
                    <button
                      type="button"
                      onClick={onContinueShopping}
                      className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold self-start sm:self-auto"
                    >
                      Explore Catalog
                    </button>
                  </div>
                ) : (
                  <OrderTrackingCard
                    order={customerOrders[0]}
                    returns={returns}
                    whatsappNumber={whatsappNumber}
                    onDownloadInvoice={() => {
                      const filename = downloadOrderInvoice(customerOrders[0], {
                        supportEmail,
                        whatsappNumber,
                      });
                      setNotice(`Downloaded invoice ${filename}.`);
                    }}
                    onReorder={() => {
                      onReorderItems(customerOrders[0].items);
                      setNotice(`Added items from ${customerOrders[0].orderNumber} to your bag.`);
                    }}
                    onCancel={() => {
                      onCancelOrder(customerOrders[0].orderNumber);
                      setNotice(`Cancelled order ${customerOrders[0].orderNumber}.`);
                    }}
                    onOpenReturnModal={() => setReturnModalOrder(customerOrders[0])}
                  />
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('addresses');
                    openNewAddressForm();
                  }}
                  className="p-4 rounded-2xl glass-subtle hover:bg-white/75 text-left transition-all"
                >
                  <p className="text-sm font-semibold text-zinc-900">+ Add Delivery Address</p>
                  <p className="mt-1 text-xs text-zinc-600">Save home or office PIN codes</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('wishlist')}
                  className="p-4 rounded-2xl glass-subtle hover:bg-white/75 text-left transition-all"
                >
                  <p className="text-sm font-semibold text-zinc-900">View Saved Wishlist</p>
                  <p className="mt-1 text-xs text-zinc-600">Move favorites straight to bag</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    syncProfileDrafts(currentCustomer);
                    setActiveTab('profile');
                  }}
                  className="p-4 rounded-2xl glass-subtle hover:bg-white/75 text-left transition-all"
                >
                  <p className="text-sm font-semibold text-zinc-900">Edit Profile &amp; Payment</p>
                  <p className="mt-1 text-xs text-zinc-600">Update phone, email or UPI default</p>
                </button>
              </div>
            </div>
          )}

          {/* 2. MY ORDERS & TRACKING */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="glass-surface rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <input
                  type="search"
                  aria-label="Search my orders"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by order # or item name..."
                  className="w-full md:w-72 px-3.5 py-2 rounded-xl glass-input text-sm focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5">
                  {(['All', 'Active', 'Delivered', 'Cancelled'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setOrderFilter(filter)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                        orderFilter === filter
                          ? 'glass-btn-ink'
                          : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {filteredCustomerOrders.length === 0 ? (
                <div className="glass-surface rounded-3xl p-10 text-center">
                  <p className="text-sm text-zinc-600">
                    No matching orders found for your account.
                  </p>
                  <button
                    type="button"
                    onClick={onContinueShopping}
                    className="mt-4 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                  >
                    Shop Curated Finds
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCustomerOrders.map((order) => (
                    <div
                      key={order.orderNumber}
                      className="glass-surface rounded-3xl p-5 sm:p-6"
                    >
                      <OrderTrackingCard
                        order={order}
                        returns={returns}
                        whatsappNumber={whatsappNumber}
                        onDownloadInvoice={() => {
                          const filename = downloadOrderInvoice(order, {
                            supportEmail,
                            whatsappNumber,
                          });
                          setNotice(`Downloaded invoice ${filename}.`);
                        }}
                        onReorder={() => {
                          onReorderItems(order.items);
                          setNotice(`Added items from ${order.orderNumber} to your bag.`);
                        }}
                        onCancel={() => {
                          onCancelOrder(order.orderNumber);
                          setNotice(`Cancelled order ${order.orderNumber}.`);
                        }}
                        onOpenReturnModal={() => setReturnModalOrder(order)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="glass-surface rounded-3xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h2 className="font-display text-lg font-bold text-zinc-900">
                  My Saved Wishlist ({wishlistProducts.length})
                </h2>
                <button
                  type="button"
                  onClick={onContinueShopping}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  Browse More →
                </button>
              </div>

              {wishlistProducts.length === 0 ? (
                <div className="py-10 text-center rounded-2xl glass-subtle">
                  <Heart className="w-7 h-7 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-800">Your wishlist is empty.</p>
                  <p className="mt-1 text-xs text-zinc-600">
                    Tap the heart icon on any product card to save gifts and daily finds here.
                  </p>
                  <button
                    type="button"
                    onClick={onContinueShopping}
                    className="mt-4 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                  >
                    Discover Products
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlistProducts.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl glass-subtle flex gap-4 items-start"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectProduct(item.id)}
                        className="w-24 h-20 rounded-xl overflow-hidden bg-white/50 border border-white/75 shrink-0"
                      >
                        <ProductImage
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">{item.category}</p>
                        <button
                          type="button"
                          onClick={() => onSelectProduct(item.id)}
                          className="text-sm font-semibold text-zinc-900 hover:text-amber-700 text-left line-clamp-1"
                        >
                          {item.title}
                        </button>
                        <p className="mt-1 text-sm font-bold tabular-nums text-zinc-900">
                          {formatINR(item.price)}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!item.inStock}
                            onClick={() => {
                              onAddToCart(item, item.variants[0] ?? 'Standard Edition', 1, true);
                              onToggleWishlist(item.id);
                              setNotice(`Moved "${item.title}" to your shopping bag.`);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-btn-amber disabled:opacity-50 text-white text-xs font-semibold transition-all"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>{item.inStock ? 'Move to Bag' : 'Sold Out'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleWishlist(item.id)}
                            aria-label={`Remove ${item.title} from wishlist`}
                            className="p-1.5 rounded-xl glass-btn-secondary text-zinc-600 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. SAVED ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-4">
              <div className="glass-surface rounded-3xl p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                  <div>
                    <h2 className="font-display text-lg font-bold text-zinc-900">
                      Saved Delivery Addresses ({currentCustomer.addresses.length})
                    </h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Your default address autofills automatically during checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold self-start sm:self-auto whitespace-nowrap"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add New Address</span>
                  </button>
                </div>

                {editingAddress && (
                  <form
                    onSubmit={handleSaveAddress}
                    noValidate
                    className="mb-6 p-5 rounded-2xl glass-subtle space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-zinc-900">Address Details</h3>
                      <div className="flex items-center gap-1.5">
                        {(['Home', 'Work', 'Other'] as AddressLabel[]).map((lbl) => (
                          <button
                            key={lbl}
                            type="button"
                            onClick={() => setEditingAddress({ ...editingAddress, label: lbl })}
                            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                              editingAddress.label === lbl
                                ? 'glass-btn-ink'
                                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                            }`}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label htmlFor="addr-name" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Recipient Full Name *
                        </label>
                        <input
                          id="addr-name"
                          type="text"
                          value={editingAddress.fullName}
                          onChange={(e) => {
                            setEditingAddress({ ...editingAddress, fullName: e.target.value });
                            if (addressErrors.fullName) setAddressErrors({ ...addressErrors, fullName: undefined });
                          }}
                          className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
                        />
                        {addressErrors.fullName && (
                          <p className="mt-1 text-xs text-red-600">{addressErrors.fullName}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="addr-phone" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Mobile Number (10 digits) *
                        </label>
                        <input
                          id="addr-phone"
                          type="tel"
                          value={editingAddress.phone}
                          onChange={(e) => {
                            setEditingAddress({ ...editingAddress, phone: e.target.value });
                            if (addressErrors.phone) setAddressErrors({ ...addressErrors, phone: undefined });
                          }}
                          placeholder="9876543210"
                          className="w-full h-10 px-3 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                        />
                        {addressErrors.phone && (
                          <p className="mt-1 text-xs text-red-600">{addressErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="addr-street" className="block text-xs font-semibold text-zinc-700 mb-1">
                        House / Flat No., Street &amp; Landmark *
                      </label>
                      <input
                        id="addr-street"
                        type="text"
                        value={editingAddress.address}
                        onChange={(e) => {
                          setEditingAddress({ ...editingAddress, address: e.target.value });
                          if (addressErrors.address) setAddressErrors({ ...addressErrors, address: undefined });
                        }}
                        placeholder="Flat 402, Indiranagar 12th Main"
                        className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
                      />
                      {addressErrors.address && (
                        <p className="mt-1 text-xs text-red-600">{addressErrors.address}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div>
                        <label htmlFor="addr-city" className="block text-xs font-semibold text-zinc-700 mb-1">
                          City *
                        </label>
                        <input
                          id="addr-city"
                          type="text"
                          value={editingAddress.city}
                          onChange={(e) => {
                            setEditingAddress({ ...editingAddress, city: e.target.value });
                            if (addressErrors.city) setAddressErrors({ ...addressErrors, city: undefined });
                          }}
                          placeholder="Bengaluru"
                          className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
                        />
                        {addressErrors.city && (
                          <p className="mt-1 text-xs text-red-600">{addressErrors.city}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="addr-state" className="block text-xs font-semibold text-zinc-700 mb-1">
                          State *
                        </label>
                        <select
                          id="addr-state"
                          value={editingAddress.state}
                          onChange={(e) => setEditingAddress({ ...editingAddress, state: e.target.value })}
                          className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="addr-pin" className="block text-xs font-semibold text-zinc-700 mb-1">
                          PIN Code *
                        </label>
                        <input
                          id="addr-pin"
                          type="text"
                          maxLength={6}
                          inputMode="numeric"
                          value={editingAddress.pinCode}
                          onChange={(e) => {
                            setEditingAddress({ ...editingAddress, pinCode: e.target.value });
                            if (addressErrors.pinCode) setAddressErrors({ ...addressErrors, pinCode: undefined });
                          }}
                          placeholder="560038"
                          className="w-full h-10 px-3 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                        />
                        {addressErrors.pinCode && (
                          <p className="mt-1 text-xs text-red-600">{addressErrors.pinCode}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800">
                        <input
                          type="checkbox"
                          checked={editingAddress.isDefault}
                          onChange={(e) =>
                            setEditingAddress({ ...editingAddress, isDefault: e.target.checked })
                          }
                          className="w-4 h-4 accent-amber-600"
                        />
                        <span>Set as default delivery address</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAddress(null);
                            setAddressErrors({});
                          }}
                          className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 rounded-xl glass-btn-ink text-xs font-semibold transition-all"
                        >
                          Save Address
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {currentCustomer.addresses.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl glass-subtle">
                    <p className="text-sm text-zinc-600">
                      No saved addresses yet. Add your home or office address for faster checkout.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentCustomer.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-4 rounded-2xl border backdrop-blur-md ${
                          addr.isDefault ? 'border-amber-500/80 bg-amber-50/55' : 'glass-subtle'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-zinc-900">{addr.label}</span>
                            {addr.isDefault && (
                              <>
                                <span aria-hidden="true" className="text-zinc-400">
                                  ·
                                </span>
                                <span className="font-semibold text-amber-700">Default</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingAddress(addr);
                                setAddressErrors({});
                              }}
                              aria-label={`Edit ${addr.label} address`}
                              className="p-1.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-white/70"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(addr.id)}
                              aria-label={`Delete ${addr.label} address`}
                              className="p-1.5 rounded-xl text-zinc-600 hover:text-red-600 hover:bg-red-50/80"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-zinc-900">{addr.fullName}</p>
                        <p className="mt-1 text-xs text-zinc-600 leading-relaxed">
                          {addr.address}, {addr.city}, {addr.state} —{' '}
                          <span className="tabular-nums font-medium">{addr.pinCode}</span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-600 tabular-nums">Phone: {addr.phone}</p>

                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="mt-3 text-xs font-semibold text-amber-700 hover:text-amber-800"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. PROFILE & PREFERENCES */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveProfile}
                noValidate
                className="glass-surface rounded-3xl p-6 space-y-5"
              >
                <div>
                  <h2 className="font-display text-lg font-bold text-zinc-900">
                    Profile &amp; Shopping Preferences
                  </h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Keep your mobile number and email updated to automatically link and track orders.
                  </p>
                </div>

                {profileError && (
                  <div className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium">
                    {profileError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="prof-name" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      id="prof-name"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="prof-phone" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Mobile Number (10 digits)
                    </label>
                    <input
                      id="prof-phone"
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="prof-email" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="prof-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="prof-month" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Birthday / Gifting Month (optional)
                    </label>
                    <select
                      id="prof-month"
                      value={profileMonth}
                      onChange={(e) => setProfileMonth(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl glass-input text-sm focus:outline-none"
                    >
                      <option value="">Select month</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-zinc-700 mb-2">
                    Preferred Checkout Payment Method
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Preferred payment method">
                    {(
                      [
                        { id: 'upi', label: 'Razorpay / UPI (GPay / PhonePe)' },
                        { id: 'card', label: 'Credit / Debit Card (Razorpay)' },
                        { id: 'cod', label: 'Cash on Delivery (COD)' },
                      ] as { id: PaymentMethod; label: string }[]
                    ).map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        role="radio"
                        aria-checked={profilePayment === method.id}
                        onClick={() => setProfilePayment(method.id)}
                        className={`px-4 py-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                          profilePayment === method.id
                            ? 'border-amber-600 bg-amber-50/65 dark:bg-amber-950/50 backdrop-blur-md text-zinc-900 dark:text-white shadow-sm'
                            : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        {method.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl glass-btn-ink text-sm font-semibold transition-all"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>

              {currentCustomer.passwordHash ? (
                <form
                  onSubmit={(event: FormEvent) => {
                    event.preventDefault();
                    const result = validateCustomerPasswordChange({
                      currentPassword: currentPasswordInput,
                      newPassword: newPasswordInput,
                      confirmPassword: confirmPasswordInput,
                      expectedHash: currentCustomer.passwordHash,
                    });
                    if (result.error || !result.nextHash) {
                      setPasswordChangeError(result.error ?? 'Unable to update password.');
                      return;
                    }
                    onUpdateCustomer({
                      ...currentCustomer,
                      passwordHash: result.nextHash,
                    });
                    setCurrentPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmPasswordInput('');
                    setPasswordChangeError('');
                    setNotice('Account password updated successfully.');
                  }}
                  noValidate
                  className="glass-surface rounded-3xl p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold text-zinc-900 inline-flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-amber-700" />
                        <span>Account Password &amp; Security</span>
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        Update the password required to sign in to your BEE4 customer account.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields((prev) => !prev)}
                      className="text-xs font-semibold text-zinc-700 hover:text-zinc-900"
                    >
                      {showPasswordFields ? 'Hide passwords' : 'Show passwords'}
                    </button>
                  </div>

                  {passwordChangeError && (
                    <div
                      role="alert"
                      className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium"
                    >
                      {passwordChangeError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="prof-cur-pass" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Current Password *
                      </label>
                      <input
                        id="prof-cur-pass"
                        type={showPasswordFields ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={currentPasswordInput}
                        onChange={(e) => {
                          setCurrentPasswordInput(e.target.value);
                          if (passwordChangeError) setPasswordChangeError('');
                        }}
                        className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-new-pass" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        New Password (min 6 chars) *
                      </label>
                      <input
                        id="prof-new-pass"
                        type={showPasswordFields ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={newPasswordInput}
                        onChange={(e) => {
                          setNewPasswordInput(e.target.value);
                          if (passwordChangeError) setPasswordChangeError('');
                        }}
                        className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="prof-confirm-pass" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Confirm New Password *
                      </label>
                      <input
                        id="prof-confirm-pass"
                        type={showPasswordFields ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPasswordInput}
                        onChange={(e) => {
                          setConfirmPasswordInput(e.target.value);
                          if (passwordChangeError) setPasswordChangeError('');
                        }}
                        className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 hover:text-amber-800 text-xs font-semibold transition-all"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              ) : (
                <div className="glass-surface rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-zinc-900 inline-flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Connected via Google Auth</span>
                    </h3>
                    <p className="mt-1 text-xs text-zinc-600">
                      Signed in securely with{' '}
                      <span className="font-semibold text-zinc-900">
                        {cloudUserEmail || currentCustomer.email || 'Google Account'}
                      </span>
                      . Your orders, wishlist, and saved addresses sync automatically with Supabase Postgres.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="px-4 py-2 rounded-xl glass-btn-secondary hover:bg-red-50/90 hover:text-red-700 text-xs font-semibold text-zinc-800 inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {returnModalOrder && (
        <CustomerReturnModal
          order={returnModalOrder}
          existingReturns={returns}
          onClose={() => setReturnModalOrder(null)}
          onSubmitReturn={(rma) => {
            onCreateReturnRequest?.(rma);
            setReturnModalOrder(null);
            setNotice(`Return request ${rma.rmaNumber} submitted! Live progress tracker added below.`);
          }}
        />
      )}
    </section>
  );
}

interface OrderTrackingCardProps {
  order: OrderRecord;
  returns: ReturnRequestRecord[];
  whatsappNumber: string;
  compact?: boolean;
  onDownloadInvoice: () => void;
  onReorder: () => void;
  onCancel: () => void;
  onOpenReturnModal: () => void;
}

function OrderTrackingCard({
  order,
  returns,
  whatsappNumber,
  compact = false,
  onDownloadInvoice,
  onReorder,
  onCancel,
  onOpenReturnModal,
}: OrderTrackingCardProps) {
  const stepIndex = getOrderTrackingStepIndex(order.status);
  const canCancel = order.status === 'Confirmed' || order.status === 'Preparing Shipment';
  const eligibility = isOrderEligibleForReturn(order, returns);
  const existingRma = eligibility.existingRma;
  const rmaBadge = getOrderRmaStatusBadge(order.orderNumber, returns);
  const rmaStepIdx = existingRma ? buildCustomerReturnStepIndex(existingRma.status) : 0;
  const orderHelpUrl = buildWhatsAppUrl(
    `Hi BEE4! I need an update on my order ${order.orderNumber} (status: ${order.status}).`,
    whatsappNumber
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-900/8">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-bold text-zinc-900 tabular-nums">{order.orderNumber}</span>
            <span aria-hidden="true" className="text-zinc-400">
              ·
            </span>
            <span className={`font-semibold text-xs ${statusTone(order.status)}`}>{order.status}</span>
            <span aria-hidden="true" className="text-zinc-400">
              ·
            </span>
            <span className="text-xs text-zinc-500 uppercase">{order.paymentMethod}</span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Delivering to {order.customer.address}, {order.customer.city} (PIN{' '}
            <span className="tabular-nums">{order.customer.pinCode}</span>)
          </p>
        </div>

        <p className="font-display text-lg font-bold tabular-nums text-zinc-900">
          {formatINR(order.total)}
        </p>
      </div>

      {/* 4-step Visual Order Progress Bar */}
      {order.status === 'Cancelled' ? (
        <div className="p-3 rounded-2xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700 font-medium">
          This order was cancelled before dispatch. You can reorder any item below.
        </div>
      ) : (
        <div
          className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}
          aria-label={`Tracking steps for ${order.orderNumber}`}
        >
          {ORDER_TRACKING_STEPS.map((step, idx) => {
            const done = idx <= stepIndex;
            const current = idx === stepIndex;
            return (
              <div
                key={step}
                className={`p-2.5 rounded-2xl border backdrop-blur-md text-xs ${
                  current
                    ? 'border-amber-500/80 bg-amber-50/65 text-zinc-900 font-semibold shadow-xs'
                    : done
                      ? 'border-emerald-200/80 bg-emerald-50/60 text-emerald-800 font-medium'
                      : 'glass-subtle text-zinc-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      done ? 'bg-emerald-600 text-white' : 'bg-zinc-200/80 text-zinc-600'
                    }`}
                  >
                    {done ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                  </span>
                  <span className="truncate">{step}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Items */}
      <ul className="space-y-2 text-xs text-zinc-700">
        {order.items.map((item) => (
          <li
            key={`${order.orderNumber}::${item.productId}::${item.variant}`}
            className="flex items-center justify-between gap-2"
          >
            <span>
              {item.title} ({item.variant}) × {item.quantity}
            </span>
            <span className="font-semibold tabular-nums text-zinc-900">
              {formatINR(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {order.giftWrap && (
        <p className="text-xs text-zinc-500">
          Kraft Gift Wrap included
          {order.giftMessage ? ` · Note: "${order.giftMessage}"` : ''}
        </p>
      )}

      {/* Live Return & Replacement Status Tracker */}
      {existingRma && (
        <div className="p-4 rounded-2xl bg-amber-50/55 dark:bg-amber-950/35 border border-amber-200/80 dark:border-amber-500/25 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
                {existingRma.rmaNumber}
              </span>
              {rmaBadge && (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${rmaBadge.toneClass}`}>
                  {rmaBadge.shortLabel}
                </span>
              )}
              <span className="text-zinc-600 dark:text-zinc-300">
                {existingRma.resolutionType}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {existingRma.reason}
            </span>
          </div>

          {existingRma.status === 'Rejected' ? (
            <div className="p-3 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-700 font-medium">
              Return Declined: {existingRma.rejectionReason || existingRma.adminNote || 'Please contact BEE4 Support via WhatsApp for assistance.'}
            </div>
          ) : (
            <div className="space-y-2.5" aria-label={`Return progress steps for ${existingRma.rmaNumber}`}>
              {/* 5-segment progress track */}
              <div className="grid grid-cols-5 gap-1.5" aria-hidden="true">
                {CUSTOMER_RETURN_TRACKER_STEPS.map((label, idx) => (
                  <div
                    key={`bar-${label}`}
                    className={`h-1.5 rounded-full transition-colors ${
                      idx < rmaStepIdx
                        ? 'bg-emerald-500'
                        : idx === rmaStepIdx
                          ? 'bg-amber-500'
                          : 'bg-zinc-200/80 dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>

              <div
                className={`grid gap-1.5 ${
                  compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
                }`}
              >
                {CUSTOMER_RETURN_TRACKER_STEPS.map((label, idx) => {
                  const done = idx <= rmaStepIdx;
                  const current = idx === rmaStepIdx;
                  return (
                    <div
                      key={label}
                      className={`px-2.5 py-2 rounded-xl border text-[11px] flex items-center justify-between gap-2 ${
                        current
                          ? 'border-amber-500 bg-white/90 dark:bg-zinc-900/75 text-zinc-900 dark:text-white font-semibold shadow-xs'
                          : done
                            ? 'border-emerald-200 bg-emerald-50/75 text-emerald-800 font-medium'
                            : 'glass-subtle text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            done ? 'bg-emerald-600 text-white' : 'bg-zinc-200 text-zinc-600'
                          }`}
                        >
                          {done ? <Check className="w-2.5 h-2.5" /> : idx + 1}
                        </span>
                        <span className="leading-snug">{label}</span>
                      </div>
                      {current && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 shrink-0">
                          Active
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(existingRma.reverseAwb || existingRma.replacementAwb || existingRma.refundUtr || existingRma.issuedCouponCode || existingRma.adminNote) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-700 dark:text-zinc-200 tabular-nums">
              {existingRma.reverseAwb && (
                <span>
                  Reverse Pickup: <strong>{existingRma.reverseCourier || 'Courier'}</strong> ({existingRma.reverseAwb})
                </span>
              )}
              {existingRma.replacementAwb && (
                <span>
                  Replacement Tracking: <strong>{existingRma.replacementAwb}</strong>
                </span>
              )}
              {existingRma.refundUtr && (
                <span>
                  Refund UTR: <strong>{existingRma.refundUtr}</strong>
                </span>
              )}
              {existingRma.issuedCouponCode && (
                <span>
                  Store Credit Code: <strong className="text-emerald-700">{existingRma.issuedCouponCode}</strong>
                </span>
              )}
              {existingRma.adminNote && (
                <span className="w-full text-zinc-600 dark:text-zinc-300">
                  Studio Update: {existingRma.adminNote}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer Actions */}
      <div className="pt-2 flex flex-wrap items-center gap-2.5">
        {eligibility.eligible && (
          <button
            type="button"
            onClick={onOpenReturnModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>
              Request Return / Replacement
              {eligibility.daysRemaining ? ` (${eligibility.daysRemaining}d left)` : ''}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={onDownloadInvoice}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-btn-ink text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Invoice</span>
        </button>

        <button
          type="button"
          onClick={onReorder}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-btn-secondary text-zinc-900 hover:text-amber-800 text-xs font-semibold transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reorder Items</span>
        </button>

        <a
          href={orderHelpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-btn-secondary text-zinc-800 text-xs font-semibold transition-all"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
          <span>Order Help</span>
        </a>

        {canCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-red-600 hover:bg-red-50/90 transition-all"
          >
            Cancel Order
          </button>
        )}
      </div>
    </div>
  );
}
