import { RefreshCw, WifiOff } from 'lucide-react';

interface OfflineFallbackNoticeProps {
  isOnline: boolean;
}

export function OfflineFallbackNotice({ isOnline }: OfflineFallbackNoticeProps) {
  if (isOnline) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-3">
      <div
        role="status"
        aria-live="polite"
        className="glass-surface rounded-2xl p-3.5 border border-rose-500/35 bg-rose-500/10 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
            <WifiOff className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
              You&apos;re Offline — Check Connection to Continue Shopping on BEE4
            </p>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300">
              Live prices, stock, orders, and BEE4 Wallet update automatically when online.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[40px] px-3.5 rounded-xl glass-btn-secondary text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      </div>
    </div>
  );
}
