import { ClipboardEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  resendCustomerVerificationEmailSupabase,
  sendCustomerEmailLoginOtpSupabase,
  sendCustomerPasswordResetEmailSupabase,
  sendSupabasePhoneOtp,
  signInCustomerWithEmailPasswordSupabase,
  signUpCustomerSupabase,
  updateSupabaseUserPassword,
  verifyCustomerEmailLoginOtpSupabase,
  verifyCustomerEmailOtpSupabase,
  verifySupabasePhoneOtp,
} from '../../services/supabaseStoreService';
import {
  CustomerGender,
  CustomerProfile,
  OrderRecord,
  ReturnRequestRecord,
} from '../../types';
import {
  createDeviceSession,
  DEFAULT_NOTIFICATION_PREFERENCES,
  formatEntryIdentifier,
  joinFirstLastName,
  upsertDeviceSession,
} from '../../utils/customerAccountLogic';
import {
  CUSTOMER_RETURN_TRACKER_STEPS,
  buildCustomerReturnStepIndex,
  getOrderRmaStatusBadge,
  lookupGuestOrderByOrderAndPhone,
} from '../../utils/rmaLogic';
import { formatINR, normalizeIndianPhone10 } from '../../utils/storeLogic';

export type UnifiedAuthStep = 'entry' | 'verify' | 'profile';
export type AuthEntryMode = 'phone' | 'email';

export interface UnifiedAuthViewProps {
  existingCustomers: CustomerProfile[];
  orders: OrderRecord[];
  returns?: ReturnRequestRecord[];
  guestWishlistIds: string[];
  isCloudConnected: boolean;
  authRecoveryMode?: boolean;
  authVerificationNotice?: string;
  onClearAuthVerificationNotice?: () => void;
  onClearAuthRecoveryMode?: () => void;
  onGoogleSignIn?: () => Promise<void>;
  onSyncAuthenticatedUser?: (
    user: SupabaseUser,
    hints?: { fullName?: string; phone?: string }
  ) => Promise<void>;
  onCompleteCustomerAuth: (customer: CustomerProfile) => void;
  onContinueShopping: () => void;
}

const GENDERS: CustomerGender[] = ['Male', 'Female', 'Other'];

export function UnifiedAuthView({
  existingCustomers,
  orders,
  returns = [],
  guestWishlistIds,
  isCloudConnected,
  authRecoveryMode = false,
  authVerificationNotice = '',
  onClearAuthVerificationNotice,
  onClearAuthRecoveryMode,
  onGoogleSignIn,
  onSyncAuthenticatedUser,
  onCompleteCustomerAuth,
  onContinueShopping,
}: UnifiedAuthViewProps) {
  const [step, setStep] = useState<UnifiedAuthStep>('entry');
  const [entryMode, setEntryMode] = useState<AuthEntryMode>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [identifierValue, setIdentifierValue] = useState('');

  // Step 2: 6-digit OTP + Password toggle
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [generatedCode, setGeneratedCode] = useState('');
  const [usingCloudOtp, setUsingCloudOtp] = useState(false);
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Step 3: Create Profile
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<CustomerGender>('Male');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // Recovery flow
  const [newRecoveryPassword, setNewRecoveryPassword] = useState('');
  const [confirmRecoveryPassword, setConfirmRecoveryPassword] = useState('');

  // UI feedback
  const [isBusy, setIsBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Guest tracker toggle
  const [showGuestTracker, setShowGuestTracker] = useState(false);
  const [guestOrderNumber, setGuestOrderNumber] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestLookupError, setGuestLookupError] = useState<string | null>(null);
  const [guestLookupResult, setGuestLookupResult] = useState<{
    order: OrderRecord;
    rma?: ReturnRequestRecord;
  } | null>(null);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = window.setTimeout(() => setResendCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const findMatchedCustomer = (mode: AuthEntryMode, cleanVal: string): CustomerProfile | undefined => {
    if (mode === 'phone') {
      const target = normalizeIndianPhone10(cleanVal);
      return existingCustomers.find((c) => normalizeIndianPhone10(c.phone) === target);
    }
    const lowerEmail = cleanVal.trim().toLowerCase();
    return existingCustomers.find((c) => c.email.trim().toLowerCase() === lowerEmail);
  };

  const generateVerificationCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 899999));
    setGeneratedCode(code);
    return code;
  };

  const handleEntryContinue = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (entryMode === 'phone') {
      const normalized = normalizeIndianPhone10(phoneInput);
      if (normalized.length !== 10) {
        setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
      setIdentifierValue(normalized);
      const matched = findMatchedCustomer('phone', normalized);
      if (matched?.accountStatus === 'Suspended') {
        setErrorMsg(
          'Your BEE4 account has been paused. Please contact BEE4 Support for assistance.'
        );
        return;
      }

      setIsBusy(true);
      let cloudSent = false;
      if (isCloudConnected) {
        try {
          await sendSupabasePhoneOtp(`+91${normalized}`);
          cloudSent = true;
        } catch {
          cloudSent = false;
        }
      }
      setUsingCloudOtp(cloudSent);
      if (!cloudSent) {
        const otp = generateVerificationCode();
        const maskedPhone = formatEntryIdentifier(normalized).masked || `+91 ${normalized}`;
        setStatusMsg(`Instant verification code for ${maskedPhone}: ${otp}`);
      } else {
        const maskedPhone = formatEntryIdentifier(normalized).masked || `+91 ${normalized}`;
        setStatusMsg(`6-digit OTP sent via SMS to ${maskedPhone}.`);
      }
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(25);
      setShowPasswordLogin(false);
      setShowForgotPassword(false);
      setStep('verify');
      setIsBusy(false);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
      return;
    }

    // Email mode
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setIdentifierValue(cleanEmail);
    const matched = findMatchedCustomer('email', cleanEmail);
    if (matched?.accountStatus === 'Suspended') {
      setErrorMsg(
        'Your BEE4 account has been paused. Please contact BEE4 Support for assistance.'
      );
      return;
    }

    setIsBusy(true);
    let cloudSent = false;
    if (isCloudConnected) {
      try {
        await sendCustomerEmailLoginOtpSupabase(cleanEmail);
        cloudSent = true;
      } catch {
        cloudSent = false;
      }
    }
    setUsingCloudOtp(cloudSent);
    if (!cloudSent) {
      const otp = generateVerificationCode();
      setStatusMsg(`Instant verification code for ${cleanEmail}: ${otp}`);
    } else {
      setStatusMsg(`6-digit login code sent to ${cleanEmail}. Check your inbox.`);
    }
    setOtpDigits(['', '', '', '', '', '']);
    setResendCountdown(25);
    setShowPasswordLogin(false);
    setShowForgotPassword(false);
    setStep('verify');
    setIsBusy(false);
    setTimeout(() => otpRefs.current[0]?.focus(), 80);
  };

  const handleOtpDigitChange = (idx: number, rawVal: string) => {
    const cleaned = rawVal.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[idx] = cleaned;
    setOtpDigits(next);
    setErrorMsg(null);
    if (cleaned && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[idx] && idx > 0) {
      const prev = [...otpDigits];
      prev[idx - 1] = '';
      setOtpDigits(prev);
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const digits = Array.from({ length: 6 }, (_, i) => pasted[i] ?? '');
    setOtpDigits(digits);
    const focusIdx = Math.min(5, pasted.length);
    otpRefs.current[focusIdx]?.focus();
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setErrorMsg(null);
    setIsBusy(true);
    try {
      if (usingCloudOtp && isCloudConnected) {
        if (entryMode === 'phone') {
          await sendSupabasePhoneOtp(`+91${identifierValue}`);
          setStatusMsg(`New 6-digit OTP sent to +91 ${identifierValue}.`);
        } else {
          await sendCustomerEmailLoginOtpSupabase(identifierValue);
          setStatusMsg(`New 6-digit code sent to ${identifierValue}.`);
        }
      } else {
        const otp = generateVerificationCode();
        const maskedTarget = formatEntryIdentifier(identifierValue).masked || identifierValue;
        setStatusMsg(`New verification code for ${maskedTarget}: ${otp}`);
      }
      setOtpDigits(['', '', '', '', '', '']);
      setResendCountdown(25);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to resend code right now. Try again.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const completeLoginForExistingCustomer = (customer: CustomerProfile) => {
    if (customer.accountStatus === 'Suspended') {
      setErrorMsg(
        'Your BEE4 account is currently paused. Please contact BEE4 Support.'
      );
      return;
    }
    const newSession = createDeviceSession();
    const updatedCustomer: CustomerProfile = {
      ...customer,
      devices: upsertDeviceSession(customer.devices, newSession),
      wishlistIds: Array.from(new Set([...(customer.wishlistIds ?? []), ...guestWishlistIds])),
    };
    onCompleteCustomerAuth(updatedCustomer);
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const token = otpDigits.join('').trim();
    if (token.length !== 6) {
      setErrorMsg('Please enter all 6 digits of your verification code.');
      return;
    }

    setIsBusy(true);
    try {
      if (usingCloudOtp && isCloudConnected) {
        if (entryMode === 'phone') {
          const user = await verifySupabasePhoneOtp(`+91${identifierValue}`, token);
          if (onSyncAuthenticatedUser) {
            await onSyncAuthenticatedUser(user, { phone: identifierValue });
          }
          setIsBusy(false);
          return;
        }
        try {
          const user = await verifyCustomerEmailLoginOtpSupabase(identifierValue, token);
          if (onSyncAuthenticatedUser) {
            await onSyncAuthenticatedUser(user);
          }
          setIsBusy(false);
          return;
        } catch {
          const user = await verifyCustomerEmailOtpSupabase(identifierValue, token);
          if (onSyncAuthenticatedUser) {
            await onSyncAuthenticatedUser(user);
          }
          setIsBusy(false);
          return;
        }
      }

      if (token !== generatedCode) {
        setErrorMsg('Incorrect 6-digit verification code. Please check and try again.');
        setIsBusy(false);
        return;
      }

      const matched = findMatchedCustomer(entryMode, identifierValue);
      if (matched) {
        completeLoginForExistingCustomer(matched);
      } else {
        // Proceed to Step 3: Profile Creation
        setProfileEmail(entryMode === 'email' ? identifierValue : '');
        setStep('profile');
        setStatusMsg(null);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Invalid or expired verification code.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handlePasswordSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (loginPassword.trim().length < 6) {
      setErrorMsg('Please enter your password (minimum 6 characters).');
      return;
    }

    const emailTarget =
      entryMode === 'email'
        ? identifierValue
        : findMatchedCustomer('phone', identifierValue)?.email ?? '';

    setIsBusy(true);
    try {
      if (isCloudConnected && emailTarget) {
        const user = await signInCustomerWithEmailPasswordSupabase(emailTarget, loginPassword);
        if (onSyncAuthenticatedUser) {
          await onSyncAuthenticatedUser(user);
        }
        setIsBusy(false);
        return;
      }

      const matched = findMatchedCustomer(entryMode, identifierValue);
      if (!matched) {
        setErrorMsg('No BEE4 account found for this identifier. Verify with OTP to register.');
        setIsBusy(false);
        return;
      }
      completeLoginForExistingCustomer(matched);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Sign-in failed. Check your credentials.';
      setErrorMsg(
        msg.toLowerCase().includes('email not confirmed')
          ? 'Please verify your email address first using the 6-digit code sent to your inbox.'
          : msg
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const targetEmail =
      entryMode === 'email' ? identifierValue : emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setErrorMsg('Please enter a valid registered email address for password recovery.');
      return;
    }
    setIsBusy(true);
    try {
      if (isCloudConnected) {
        await sendCustomerPasswordResetEmailSupabase(targetEmail);
      }
      setStatusMsg(`Password reset instructions sent to ${targetEmail}.`);
      setShowForgotPassword(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to send reset link.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleCompleteProfileCreation = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (cleanFirst.length < 2) {
      setErrorMsg('Please enter your First Name (minimum 2 characters).');
      return;
    }
    if (cleanLast.length < 1) {
      setErrorMsg('Please enter your Last Name.');
      return;
    }

    const cleanEmail = profileEmail.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Please enter a valid Email ID or leave it blank.');
      return;
    }

    const fullName = joinFirstLastName(cleanFirst, cleanLast);
    const phone = entryMode === 'phone' ? identifierValue : '';

    setIsBusy(true);
    try {
      if (isCloudConnected && cleanEmail && profilePassword.trim().length >= 6) {
        const res = await signUpCustomerSupabase({
          fullName,
          email: cleanEmail,
          phone,
          password: profilePassword,
        });
        if (res.user && !res.requiresEmailVerification && onSyncAuthenticatedUser) {
          await onSyncAuthenticatedUser(res.user, { fullName, phone });
          setIsBusy(false);
          return;
        }
        if (res.requiresEmailVerification) {
          await resendCustomerVerificationEmailSupabase(cleanEmail).catch(() => {});
        }
      }

      const initialDevice = createDeviceSession();
      const newCustomer: CustomerProfile = {
        id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        firstName: cleanFirst,
        lastName: cleanLast,
        fullName,
        gender,
        phone,
        email: cleanEmail,
        emailVerified: entryMode === 'email' && Boolean(cleanEmail),
        preferredPayment: 'UPI / Prepaid',
        preferredLanguage: 'en',
        notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        savedUpiIds: [],
        devices: [initialDevice],
        accountStatus: 'Active',
        walletBalance: 0,
        walletTransactions: [],
        customDesigns: [],
        createdAt: new Date().toISOString(),
        addresses: [],
        wishlistIds: [...guestWishlistIds],
      };
      onCompleteCustomerAuth(newCustomer);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to create your profile. Please retry.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveNewRecoveryPassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (newRecoveryPassword.trim().length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newRecoveryPassword !== confirmRecoveryPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setIsBusy(true);
    try {
      if (isCloudConnected) {
        const updatedUser = await updateSupabaseUserPassword(newRecoveryPassword);
        if (onSyncAuthenticatedUser) {
          await onSyncAuthenticatedUser(updatedUser);
        }
      }
      onClearAuthRecoveryMode?.();
      setStatusMsg('Password updated successfully! Welcome back to BEE4.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to save new password.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleGuestLookup = (e: FormEvent) => {
    e.preventDefault();
    setGuestLookupError(null);
    const res = lookupGuestOrderByOrderAndPhone(
      orders,
      guestOrderNumber,
      guestPhone
    );
    if (!res.order) {
      setGuestLookupResult(null);
      setGuestLookupError(res.error || 'Order not found.');
      return;
    }
    const matchedRma = returns.find((r) => r.orderNumber === res.order!.orderNumber);
    setGuestLookupResult({ order: res.order, rma: matchedRma });
  };

  if (authRecoveryMode) {
    return (
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="glass-surface rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                Set New BEE4 Password
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Choose a new password for your BEE4 account
              </p>
            </div>
          </div>

          {errorMsg && (
            <div role="alert" className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveNewRecoveryPassword} className="space-y-4">
            <div>
              <label htmlFor="recovery-new-pass" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                New Password (6+ characters)
              </label>
              <input
                id="recovery-new-pass"
                type="password"
                required
                minLength={6}
                value={newRecoveryPassword}
                onChange={(e) => setNewRecoveryPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="recovery-confirm-pass" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                Confirm New Password
              </label>
              <input
                id="recovery-confirm-pass"
                type="password"
                required
                minLength={6}
                value={confirmRecoveryPassword}
                onChange={(e) => setConfirmRecoveryPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={isBusy}
                className="flex-1 h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold disabled:opacity-60"
              >
                {isBusy ? 'Saving...' : 'Update Password'}
              </button>
              <button
                type="button"
                onClick={() => onClearAuthRecoveryMode?.()}
                className="h-11 px-4 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700 dark:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1040px] mx-auto px-4 sm:px-6 py-8 sm:py-14">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onContinueShopping}
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to BEE4 Store</span>
        </button>

        <button
          type="button"
          onClick={() => setShowGuestTracker((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-800 dark:text-zinc-100"
        >
          <Package className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{showGuestTracker ? 'Hide Guest Tracker' : 'Track Guest Order / Return'}</span>
        </button>
      </div>

      {authVerificationNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{authVerificationNotice}</span>
          </div>
          {onClearAuthVerificationNotice && (
            <button
              type="button"
              onClick={onClearAuthVerificationNotice}
              className="text-xs font-semibold underline text-emerald-800 dark:text-emerald-200"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {showGuestTracker && (
        <div className="mb-8 glass-surface rounded-3xl p-6 sm:p-7 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Guest Order &amp; Return Tracker
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Track any order placed on bee4.in using your Order ID and mobile number.
              </p>
            </div>
          </div>

          <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={guestOrderNumber}
              onChange={(e) => setGuestOrderNumber(e.target.value)}
              placeholder="Order ID (e.g. BEE4-1001)"
              className="h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
            />
            <input
              type="tel"
              inputMode="numeric"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="10-digit Mobile Number"
              className="h-11 px-3.5 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
            >
              Track Order
            </button>
          </form>

          {guestLookupError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">
              {guestLookupError}
            </p>
          )}

          {guestLookupResult && (
            <div className="p-4 rounded-2xl glass-subtle space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                    {guestLookupResult.order.orderNumber}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    {guestLookupResult.order.customer.fullName} ·{' '}
                    <span className="tabular-nums font-semibold">
                      {formatINR(guestLookupResult.order.total)}
                    </span>
                  </p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  {guestLookupResult.order.status}
                </span>
              </div>

              {guestLookupResult.rma && (
                <div className="pt-2 border-t border-zinc-900/10 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      RMA {guestLookupResult.rma.rmaNumber}
                    </span>
                    <span className="font-semibold text-amber-700 dark:text-amber-300">
                      {getOrderRmaStatusBadge(guestLookupResult.order.orderNumber, returns)
                        ?.shortLabel ?? guestLookupResult.rma.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {CUSTOMER_RETURN_TRACKER_STEPS.map((label, idx) => {
                      const activeIdx = buildCustomerReturnStepIndex(guestLookupResult.rma!.status);
                      const active = idx <= activeIdx;
                      return (
                        <div
                          key={label}
                          className={`p-2 rounded-lg text-[10px] font-semibold text-center ${
                            active
                              ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                              : 'bg-zinc-200/60 dark:bg-white/5 text-zinc-500'
                          }`}
                        >
                          {label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Brand Spotlight Panel (100% White-Label BEE4) */}
        <div className="lg:col-span-5 glass-surface rounded-3xl p-7 sm:p-8 space-y-6">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>BEE4 Account Studio</span>
          </div>

          <div className="space-y-2.5">
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white leading-tight">
              Track orders, wallet credits &amp; custom gifts in one place.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Manage delivery addresses across India, redeem BEE4 Gift Cards, download GST
              invoices, and view saved custom 3D print designs.
            </p>
          </div>

          <div className="space-y-3 pt-2 text-xs text-zinc-700 dark:text-zinc-200">
            <div className="flex items-start gap-2.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>Real-time delivery updates, invoices &amp; 7-day easy replacement requests</span>
            </div>
            <div className="flex items-start gap-2.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>BEE4 Digital Gift Cards &amp; instant Wallet balance at checkout</span>
            </div>
            <div className="flex items-start gap-2.5">
              <BadgeCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>Saved UPI IDs &amp; multi-address book for Home, Work &amp; Gift sends</span>
            </div>
          </div>

          {/* 3-Step Visual Indicator */}
          <div className="pt-4 border-t border-zinc-900/10 dark:border-white/10">
            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2">
              Quick 3-Step Sign-In
            </p>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
              <div
                className={`px-2.5 py-2 rounded-xl text-center ${
                  step === 'entry'
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                1. Phone / Email
              </div>
              <div
                className={`px-2.5 py-2 rounded-xl text-center ${
                  step === 'verify'
                    ? 'bg-amber-600 text-white'
                    : step === 'profile'
                      ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
                      : 'bg-zinc-200/70 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                2. 6-Digit OTP
              </div>
              <div
                className={`px-2.5 py-2 rounded-xl text-center ${
                  step === 'profile'
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-200/70 dark:bg-white/10 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                3. Profile
              </div>
            </div>
          </div>
        </div>

        {/* Right Interactive Auth Flow */}
        <div className="lg:col-span-7 glass-surface rounded-3xl p-6 sm:p-9 space-y-6">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-700 dark:text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div
              role="status"
              className="p-3.5 rounded-2xl bg-emerald-500/12 border border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* STEP 1: UNIFIED ENTRY */}
          {step === 'entry' && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                  Log in for the best experience
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Enter your {entryMode === 'phone' ? 'phone number' : 'email ID'} to continue
                </p>
              </div>

              <form onSubmit={handleEntryContinue} className="space-y-4">
                {entryMode === 'phone' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-phone-input"
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                      >
                        Mobile Number *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEntryMode('email');
                          setErrorMsg(null);
                          setStatusMsg(null);
                        }}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        Use Email-ID
                      </button>
                    </div>
                    <div className="flex items-center rounded-xl glass-input overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/40">
                      <span className="px-3.5 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-200 border-r border-zinc-900/10 dark:border-white/10 bg-white/40 dark:bg-white/5 inline-flex items-center gap-1.5 shrink-0 tabular-nums">
                        <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        +91
                      </span>
                      <input
                        id="auth-phone-input"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        required
                        value={phoneInput}
                        onChange={(e) => {
                          setPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 10));
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full h-12 px-3.5 bg-transparent text-sm font-medium text-zinc-900 dark:text-white tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="auth-email-input"
                        className="text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                      >
                        Email Address *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setEntryMode('phone');
                          setErrorMsg(null);
                          setStatusMsg(null);
                        }}
                        className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                      >
                        Use Mobile Number
                      </button>
                    </div>
                    <div className="flex items-center rounded-xl glass-input overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/40">
                      <span className="px-3.5 py-3 text-zinc-500 dark:text-zinc-300 border-r border-zinc-900/10 dark:border-white/10 bg-white/40 dark:bg-white/5 shrink-0">
                        <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </span>
                      <input
                        id="auth-email-input"
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="you@example.com"
                        className="w-full h-12 px-3.5 bg-transparent text-sm font-medium text-zinc-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  By continuing, you agree to BEE4&apos;s{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    Terms of Use
                  </span>{' '}
                  and{' '}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                    Privacy Policy
                  </span>
                  .
                </p>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full h-12 rounded-xl glass-btn-amber text-white text-sm font-bold shadow-sm transition-all disabled:opacity-60"
                >
                  {isBusy ? 'Sending Verification Code...' : 'Continue'}
                </button>
              </form>

              {onGoogleSignIn && isCloudConnected && (
                <div className="pt-2 space-y-3">
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <div className="flex-1 h-px bg-zinc-900/10 dark:bg-white/10" />
                    <span>OR</span>
                    <div className="flex-1 h-px bg-zinc-900/10 dark:bg-white/10" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      void onGoogleSignIn().catch((err) => {
                        setErrorMsg(
                          err instanceof Error
                            ? err.message
                            : 'Google sign-in is unavailable right now.'
                        );
                      });
                    }}
                    className="w-full h-11 rounded-xl glass-btn-secondary text-sm font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center justify-center gap-2.5"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Continue with Google</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: 6-DIGIT OTP VERIFICATION OR PASSWORD */}
          {step === 'verify' && (
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                  Verify Your Account
                </h1>
                <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 flex flex-wrap items-center gap-2">
                  <span>
                    Please enter the verification code sent to{' '}
                    <strong className="text-zinc-900 dark:text-white tabular-nums">
                      {formatEntryIdentifier(identifierValue).masked || identifierValue}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('entry');
                      setErrorMsg(null);
                      setStatusMsg(null);
                    }}
                    className="text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    Edit
                  </button>
                </p>
              </div>

              {showForgotPassword ? (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-zinc-600 dark:text-zinc-300">
                    Enter your registered email address to receive a BEE4 password reset link.
                  </p>
                  <input
                    type="email"
                    required
                    value={entryMode === 'email' ? identifierValue : emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                  />
                  <div className="flex items-center gap-2.5">
                    <button
                      type="submit"
                      disabled={isBusy}
                      className="flex-1 h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold"
                    >
                      {isBusy ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="h-11 px-4 rounded-xl glass-btn-secondary text-xs font-semibold"
                    >
                      Back
                    </button>
                  </div>
                </form>
              ) : showPasswordLogin ? (
                <form onSubmit={handlePasswordSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="auth-password-input"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                    >
                      BEE4 Account Password
                    </label>
                    <div className="relative">
                      <input
                        id="auth-password-input"
                        type={showPasswordText ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full h-11 px-3.5 pr-10 rounded-xl glass-input text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText((s) => !s)}
                        aria-label={showPasswordText ? 'Hide password' : 'Show password'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                      >
                        {showPasswordText ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordLogin(false);
                        setErrorMsg(null);
                      }}
                      className="font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                    >
                      Use 6-Digit OTP instead
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        setErrorMsg(null);
                      }}
                      className="font-semibold text-zinc-600 dark:text-zinc-300 hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-12 rounded-xl glass-btn-amber text-white text-sm font-bold disabled:opacity-60"
                  >
                    {isBusy ? 'Signing In...' : 'Log in with Password'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
                      Enter 6-Digit Verification Code *
                    </span>
                    <div className="grid grid-cols-6 gap-2 sm:gap-3">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => {
                            otpRefs.current[idx] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          aria-label={`OTP digit ${idx + 1}`}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="h-12 sm:h-14 rounded-xl glass-input text-center text-lg font-extrabold tabular-nums text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      disabled={resendCountdown > 0 || isBusy}
                      onClick={handleResendCode}
                      className="font-semibold text-amber-700 dark:text-amber-300 disabled:text-zinc-400 hover:underline tabular-nums"
                    >
                      {resendCountdown > 0
                        ? `Resend code in 00:${String(resendCountdown).padStart(2, '0')}`
                        : 'Resend code'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPasswordLogin(true);
                        setErrorMsg(null);
                      }}
                      className="font-semibold text-zinc-700 dark:text-zinc-200 hover:text-amber-700 dark:hover:text-amber-300 hover:underline"
                    >
                      Log in using Password instead
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isBusy}
                    className="w-full h-12 rounded-xl glass-btn-amber text-white text-sm font-bold disabled:opacity-60"
                  >
                    {isBusy ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* STEP 3: PROFILE CREATION */}
          {step === 'profile' && (
            <div className="space-y-5">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                  <BadgeCheck className="w-4 h-4" />
                  Verified ({formatEntryIdentifier(identifierValue).masked || identifierValue})
                </span>
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                  Create Your BEE4 Profile
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                  Personalize your BEE4 account for faster checkout, GST invoices &amp; rewards.
                </p>
              </div>

              <form onSubmit={handleCompleteProfileCreation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label
                      htmlFor="profile-create-first"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                    >
                      First Name *
                    </label>
                    <input
                      id="profile-create-first"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Aarav"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="profile-create-last"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                    >
                      Last Name *
                    </label>
                    <input
                      id="profile-create-last"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
                    Gender
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {GENDERS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        aria-pressed={gender === g}
                        className={`h-10 rounded-xl text-xs font-semibold border transition-all ${
                          gender === g
                            ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                            : 'border-zinc-900/10 dark:border-white/15 glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="profile-create-email"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Email ID {entryMode === 'email' ? '*' : '(Optional)'}
                  </label>
                  <input
                    id="profile-create-email"
                    type="email"
                    value={profileEmail}
                    readOnly={entryMode === 'email'}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none read-only:opacity-80"
                  />
                  <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    For order invoices &amp; digital gift cards
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="profile-create-password"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                  >
                    Set Password (Optional — 6+ chars for password login)
                  </label>
                  <input
                    id="profile-create-password"
                    type="password"
                    value={profilePassword}
                    onChange={(e) => setProfilePassword(e.target.value)}
                    placeholder="Optional password"
                    className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full h-12 rounded-xl glass-btn-amber text-white text-sm font-bold disabled:opacity-60"
                >
                  {isBusy ? 'Creating Your Profile...' : 'Save & Continue to BEE4 Account'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
