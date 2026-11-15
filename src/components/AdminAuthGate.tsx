import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import {
  ADMIN_LOCKOUT_DURATION_MS,
  getAdminLockoutState,
  MAX_ADMIN_FAILED_ATTEMPTS,
  verifyAdminPassword,
} from '../utils/adminAuth';

interface AdminAuthGateProps {
  expectedPasswordHash: string;
  onUnlock: () => void;
  onBackToStore: () => void;
}

export function AdminAuthGate({
  expectedPasswordHash,
  onUnlock,
  onBackToStore,
}: AdminAuthGateProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntilMs, setLockedUntilMs] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const lockout = getAdminLockoutState(lockedUntilMs, nowMs);

  useEffect(() => {
    if (!lockout.isLocked) return;
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [lockout.isLocked]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const currentNow = Date.now();
    setNowMs(currentNow);

    const currentLock = getAdminLockoutState(lockedUntilMs, currentNow);
    if (currentLock.isLocked) {
      setError(`Too many incorrect attempts. Try again in ${currentLock.remainingSeconds}s.`);
      return;
    }

    if (!password.trim()) {
      setError('Please enter your admin password.');
      return;
    }

    if (verifyAdminPassword(password, expectedPasswordHash)) {
      setPassword('');
      setError('');
      setFailedAttempts(0);
      setLockedUntilMs(0);
      onUnlock();
      return;
    }

    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    setPassword('');

    if (nextAttempts >= MAX_ADMIN_FAILED_ATTEMPTS) {
      const nextLockedUntil = currentNow + ADMIN_LOCKOUT_DURATION_MS;
      setLockedUntilMs(nextLockedUntil);
      setFailedAttempts(0);
      setError('Too many incorrect attempts. Try again in 30s.');
      return;
    }

    const remaining = MAX_ADMIN_FAILED_ATTEMPTS - nextAttempts;
    setError(
      `Incorrect admin password. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining before temporary lock.`
    );
  };

  return (
    <section className="max-w-[500px] mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <button
        type="button"
        onClick={onBackToStore}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Storefront</span>
      </button>

      <div className="glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-full glass-orb flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Restricted Store Access</p>
            <h1 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">
              Store Owner Sign-In
            </h1>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Enter your BEE4 admin password to unlock catalog, customer orders, and store settings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="admin-password-input" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1.5">
              Admin Password *
            </label>
            <div className="relative">
              <input
                id="admin-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                disabled={lockout.isLocked}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter admin password"
                className="w-full h-11 pl-3.5 pr-11 rounded-xl glass-input text-sm focus:outline-none disabled:opacity-60 disabled:text-zinc-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-zinc-500 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {(error || lockout.isLocked) && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-red-50/90 dark:bg-red-950/60 backdrop-blur-md border border-red-200 dark:border-red-500/30 text-xs font-medium text-red-700 dark:text-red-300 tabular-nums"
            >
              {lockout.isLocked
                ? `Too many incorrect attempts. Try again in ${lockout.remainingSeconds}s.`
                : error}
            </div>
          )}

          <button
            type="submit"
            disabled={lockout.isLocked}
            className="w-full h-11 rounded-xl glass-btn-ink disabled:opacity-50 text-sm font-semibold transition-all"
          >
            {lockout.isLocked ? `Locked (${lockout.remainingSeconds}s)` : 'Unlock Admin Panel'}
          </button>
        </form>

        <p className="pt-4 border-t border-zinc-900/8 dark:border-white/10 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>Protected session · Locks automatically when you sign out or close this tab.</span>
        </p>
      </div>
    </section>
  );
}
