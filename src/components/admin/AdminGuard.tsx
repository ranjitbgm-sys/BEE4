import { FormEvent, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  CloudOff,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { getAllowedAdminEmails, supabaseDiagnostics } from '../../lib/supabase';
import {
  sendSupabasePhoneOtp,
  signInAdminWithEmailPassword,
  verifySupabaseAdminAccess,
  verifySupabasePhoneOtp,
} from '../../services/supabaseStoreService';
import {
  ADMIN_LOCKOUT_DURATION_MS,
  getAdminLockoutState,
  MAX_ADMIN_FAILED_ATTEMPTS,
  verifyAdminPassword,
} from '../../utils/adminAuth';
import type { ThemeMode } from '../../types';

type AuthMethodTab = 'google' | 'email' | 'phone' | 'passphrase';

interface AdminGuardProps {
  isSessionUnlocked: boolean;
  expectedPasswordHash: string;
  supabaseUser: User | null;
  isSupabaseAdmin: boolean;
  theme: ThemeMode;
  inactivityNotice?: string;
  onToggleTheme: () => void;
  onGoogleSignIn: () => Promise<void>;
  onSignOutSupabase: () => Promise<void>;
  onUnlockSession: () => void;
  onBackToStore: () => void;
  children: React.ReactNode;
}

export function AdminGuard({
  isSessionUnlocked,
  expectedPasswordHash,
  supabaseUser,
  isSupabaseAdmin,
  theme,
  inactivityNotice,
  onToggleTheme,
  onGoogleSignIn,
  onSignOutSupabase,
  onUnlockSession,
  onBackToStore,
  children,
}: AdminGuardProps) {
  const [rbacChecked, setRbacChecked] = useState(false);
  const [rbacAuthorized, setRbacAuthorized] = useState(false);
  const [rbacReason, setRbacReason] = useState('');

  const [authTab, setAuthTab] = useState<AuthMethodTab>(
    supabaseDiagnostics.isConfigured ? 'email' : 'passphrase'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email/password state
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  // Phone OTP state
  const [phoneInput, setPhoneInput] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // Studio Passphrase state (used in LocalStorage fallback mode & emergency lock bypass)
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntilMs, setLockedUntilMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const lockout = getAdminLockoutState(lockedUntilMs, nowMs);
  const unlockedViaSupabaseRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    if (!supabaseUser) {
      setRbacChecked(true);
      setRbacAuthorized(false);
      setRbacReason('');
      unlockedViaSupabaseRef.current = false;
      return;
    }

    setRbacChecked(false);
    void verifySupabaseAdminAccess(supabaseUser).then((res) => {
      if (cancelled) return;
      setRbacAuthorized(res.authorized);
      setRbacReason(res.reason ?? '');
      setRbacChecked(true);
      if (res.authorized && !isSessionUnlocked && !unlockedViaSupabaseRef.current) {
        unlockedViaSupabaseRef.current = true;
        onUnlockSession();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [supabaseUser, isSessionUnlocked, onUnlockSession]);

  useEffect(() => {
    if (!lockout.isLocked) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [lockout.isLocked]);

  // Authorized via either verified Supabase Admin OR unlocked Studio Key session
  if ((isSupabaseAdmin || rbacAuthorized) && isSessionUnlocked) {
    return <>{children}</>;
  }

  if (isSessionUnlocked && (!supabaseUser || rbacAuthorized || isSupabaseAdmin)) {
    return <>{children}</>;
  }

  // Unauthorized authenticated Supabase user -> strict 403 Restricted Access screen
  if (supabaseUser && rbacChecked && !rbacAuthorized && !isSupabaseAdmin) {
    return (
      <section className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="max-w-lg w-full glass-surface rounded-3xl p-6 sm:p-8 space-y-6 border border-red-500/25">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 tabular-nums">
                HTTP 403 · Restricted Access
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">
                Admin Privileges Required
              </h1>
              <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {rbacReason ||
                  'This Supabase account is not authorized to access the BEE4 Studio Command Suite.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl glass-subtle p-4 text-xs text-zinc-700 dark:text-zinc-300 space-y-1.5">
            <div>
              Signed-in Identity:{' '}
              <strong className="text-zinc-900 dark:text-white">
                {supabaseUser.email || supabaseUser.phone || supabaseUser.id}
              </strong>
            </div>
            <div>
              Allowed Admin Email (VITE_ADMIN_EMAIL):{' '}
              <span className="font-mono">{getAllowedAdminEmails().join(', ')}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => void onSignOutSupabase()}
              className="flex-1 h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold whitespace-nowrap"
            >
              Sign Out &amp; Switch Account
            </button>
            <button
              type="button"
              onClick={onBackToStore}
              className="flex-1 h-11 rounded-xl glass-btn-secondary text-zinc-800 dark:text-zinc-200 text-sm font-semibold whitespace-nowrap"
            >
              Back to bee4.in
            </button>
          </div>
        </div>
      </section>
    );
  }

  const handleGoogleAction = async () => {
    setError('');
    setLoading(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Google OAuth failed. Enable Google provider in Supabase Auth or use Studio Key.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !emailPassword) {
      setError('Enter both admin email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInAdminWithEmailPassword(email, emailPassword);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not verify Supabase Email/Password credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const formatted = phoneInput.trim().startsWith('+')
      ? phoneInput.trim()
      : `+91${phoneInput.replace(/\D/g, '').slice(-10)}`;
    if (!/^\+\d{10,14}$/.test(formatted)) {
      setError('Enter a valid phone number in +91XXXXXXXXXX format.');
      return;
    }
    setLoading(true);
    try {
      await sendSupabasePhoneOtp(formatted);
      setOtpSent(true);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to dispatch SMS OTP via Supabase Auth.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const formatted = phoneInput.trim().startsWith('+')
      ? phoneInput.trim()
      : `+91${phoneInput.replace(/\D/g, '').slice(-10)}`;
    setLoading(true);
    try {
      await verifySupabasePhoneOtp(formatted, otpCode);
    } catch {
      setError('Invalid SMS OTP code. Please verify and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassphraseSubmit = (event: FormEvent) => {
    event.preventDefault();
    const currentNow = Date.now();
    setNowMs(currentNow);
    const currentLock = getAdminLockoutState(lockedUntilMs, currentNow);
    if (currentLock.isLocked) {
      setError(`Too many attempts. Retry in ${currentLock.remainingSeconds}s.`);
      return;
    }
    if (!passphrase.trim()) {
      setError('Enter the BEE4 Studio owner passphrase.');
      return;
    }
    if (verifyAdminPassword(passphrase, expectedPasswordHash)) {
      setPassphrase('');
      setError('');
      setFailedAttempts(0);
      setLockedUntilMs(0);
      onUnlockSession();
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setPassphrase('');
    if (nextAttempts >= MAX_ADMIN_FAILED_ATTEMPTS) {
      setLockedUntilMs(currentNow + ADMIN_LOCKOUT_DURATION_MS);
      setFailedAttempts(0);
      setError('Too many attempts. Locked for 30s.');
      return;
    }
    const rem = MAX_ADMIN_FAILED_ATTEMPTS - nextAttempts;
    setError(`Incorrect passphrase. ${rem} attempt${rem === 1 ? '' : 's'} left.`);
  };

  return (
    <section className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-[520px] w-full space-y-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to bee4.in Storefront</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200"
          >
            {theme === 'aurora' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
            <span>{theme === 'aurora' ? 'Daylight Glass' : 'Dark Aurora'}</span>
          </button>
        </div>

        <div className="glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl glass-orb flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                BEE4 Enterprise RBAC · Banka, Bihar
              </p>
              <h1 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">
                BEE4 Command Authentication
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                Sign in with Supabase Auth ({getAllowedAdminEmails()[0]}) or Studio Key.
              </p>
            </div>
          </div>

          {!supabaseDiagnostics.isConfigured && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <CloudOff className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">
                  Running in LocalStorage Fallback Mode (Free Preview)
                </p>
                <p className="mt-0.5 text-[11px] opacity-90">
                  Supabase env vars are not set yet, so all 16 products, sample orders, and{' '}
                  <code>SMARTKID15</code> work locally. Unlock with the <strong>Studio Key</strong>{' '}
                  tab or grab the 1-click SQL setup script inside <code>/admin/settings</code>.
                </p>
              </div>
            </div>
          )}

          {inactivityNotice && (
            <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300/60 dark:border-amber-500/30 text-xs font-medium text-amber-800 dark:text-amber-200">
              {inactivityNotice}
            </div>
          )}

          {/* Auth Method Tabs */}
          <div
            role="tablist"
            aria-label="Admin sign in method"
            className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl glass-subtle"
          >
            {[
              { id: 'google' as const, label: 'Google', icon: ShieldCheck },
              { id: 'email' as const, label: 'Email', icon: Mail },
              { id: 'phone' as const, label: 'Phone OTP', icon: Phone },
              { id: 'passphrase' as const, label: 'Studio Key', icon: KeyRound },
            ].map((item) => {
              const Icon = item.icon;
              const active = authTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setAuthTab(item.id);
                    setError('');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                    active
                      ? 'glass-btn-ink'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50/90 dark:bg-red-950/60 border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {authTab === 'google' && (
            <div className="space-y-4">
              <div className="rounded-2xl glass-subtle p-4 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Supabase Google OAuth unlocks real-time Postgres sync and{' '}
                <code>product-images</code> Storage uploads for{' '}
                <code className="font-semibold text-zinc-900 dark:text-white">
                  {getAllowedAdminEmails()[0]}
                </code>
                .
              </div>
              <button
                type="button"
                disabled={loading || !supabaseDiagnostics.isConfigured}
                onClick={() => void handleGoogleAction()}
                className="w-full h-11 rounded-xl glass-btn-amber text-white text-sm font-semibold disabled:opacity-60"
              >
                {loading
                  ? 'Redirecting to Supabase OAuth...'
                  : supabaseDiagnostics.isConfigured
                    ? 'Continue with Google Admin'
                    : 'Configure VITE_SUPABASE_URL to Enable OAuth'}
              </button>
            </div>
          )}

          {authTab === 'email' && (
            <form onSubmit={handleEmailSignIn} className="space-y-3.5">
              <div>
                <label
                  htmlFor="admin-email-auth"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1"
                >
                  Supabase Admin Email
                </label>
                <input
                  id="admin-email-auth"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ranjitbgm@gmail.com"
                  className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-email-pass"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1"
                >
                  Password
                </label>
                <input
                  id="admin-email-pass"
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Enter Supabase password"
                  className="w-full h-11 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !supabaseDiagnostics.isConfigured}
                className="w-full h-11 rounded-xl glass-btn-ink text-sm font-semibold disabled:opacity-60"
              >
                {loading
                  ? 'Verifying...'
                  : supabaseDiagnostics.isConfigured
                    ? 'Sign In with Supabase Email'
                    : 'Configure Supabase Env or Use Studio Key'}
              </button>
            </form>
          )}

          {authTab === 'phone' && (
            <div className="space-y-3.5">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="admin-phone-otp"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1"
                    >
                      Admin Phone (+91)
                    </label>
                    <input
                      id="admin-phone-otp"
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="+91 9800004004"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !supabaseDiagnostics.isConfigured}
                    className="w-full h-11 rounded-xl glass-btn-ink text-sm font-semibold disabled:opacity-60"
                  >
                    {loading
                      ? 'Sending SMS OTP...'
                      : supabaseDiagnostics.isConfigured
                        ? 'Send Supabase OTP'
                        : 'Configure Supabase Env or Use Studio Key'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmOtp} className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="admin-otp-code"
                      className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1"
                    >
                      6-Digit Verification OTP
                    </label>
                    <input
                      id="admin-otp-code"
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full h-11 px-3.5 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="px-4 h-11 rounded-xl glass-btn-secondary text-xs font-semibold"
                    >
                      Change Phone
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-11 rounded-xl glass-btn-ink text-sm font-semibold disabled:opacity-60"
                    >
                      {loading ? 'Confirming...' : 'Verify OTP & Enter'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {authTab === 'passphrase' && (
            <form onSubmit={handlePassphraseSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="admin-password-input"
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5"
                >
                  Studio Owner Passphrase
                </label>
                <div className="relative">
                  <input
                    id="admin-password-input"
                    type={showPassphrase ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={lockout.isLocked}
                    value={passphrase}
                    onChange={(e) => {
                      setPassphrase(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="Enter studio passphrase"
                    className="w-full h-11 pl-3.5 pr-11 rounded-xl glass-input text-sm focus:outline-none disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase((p) => !p)}
                    aria-label={showPassphrase ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={lockout.isLocked}
                className="w-full h-11 rounded-xl glass-btn-ink disabled:opacity-50 text-sm font-semibold"
              >
                {lockout.isLocked
                  ? `Locked (${lockout.remainingSeconds}s)`
                  : 'Unlock Studio Workspace'}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-zinc-900/10 dark:border-white/10 flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>30-min idle auto-lock active</span>
            </span>
            <span className="tabular-nums font-medium">
              Backend:{' '}
              {supabaseDiagnostics.isConfigured ? 'Supabase Cloud' : 'LocalStorage Fallback'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
