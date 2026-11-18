import { Download, Smartphone, X } from 'lucide-react';

interface PwaInstallBannerProps {
  visible: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallBanner({ visible, onInstall, onDismiss }: PwaInstallBannerProps) {
  if (!visible) return null;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-3">
      <div
        role="region"
        aria-label="Install BEE4 App"
        className="glass-surface rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 border border-amber-500/25"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#0f172a] border border-white/15 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            <img
              src="/icons/icon-192.png"
              alt="BEE4 App Icon"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate inline-flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 hidden sm:inline" />
              <span>Install BEE4 App</span>
            </p>
            <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300 truncate">
              Faster Checkout &amp; Order Alerts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onInstall}
            className="min-h-[44px] sm:min-h-[38px] px-3.5 rounded-xl glass-btn-amber text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Install App</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss install banner"
            className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] rounded-xl glass-btn-secondary text-zinc-600 dark:text-zinc-300 inline-flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
