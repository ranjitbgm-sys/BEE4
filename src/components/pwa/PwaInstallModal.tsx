import { useEffect } from 'react';
import { MoreVertical, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import type { MobilePlatform } from '../../utils/pwaLogic';

interface PwaInstallModalProps {
  isOpen: boolean;
  platform: MobilePlatform;
  onClose: () => void;
}

export function PwaInstallModal({ isOpen, platform, onClose }: PwaInstallModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isIOS = platform === 'ios';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How to Install BEE4 App"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-drawer rounded-3xl p-6 space-y-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0f172a] border border-white/15 p-1 flex items-center justify-center shrink-0">
              <img
                src="/icons/icon-192.png"
                alt="BEE4"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
            <div>
              <h2 className="font-display text-lg font-extrabold text-zinc-900 dark:text-white">
                Install BEE4 App
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                1-tap home screen access &amp; instant order tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close install instructions"
            className="w-10 h-10 rounded-xl glass-btn-secondary flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Share className="w-4 h-4" />
              </span>
              <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-100">
                <p className="font-bold">1. Tap the Share icon below</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Look for the square with an upward arrow in Safari&apos;s toolbar.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <PlusSquare className="w-4 h-4" />
              </span>
              <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-100">
                <p className="font-bold">
                  2. Tap &apos;Add to Home Screen&apos; to install BEE4 App
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Then tap &ldquo;Add&rdquo; in the top corner to launch BEE4 full-screen.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <MoreVertical className="w-4 h-4" />
              </span>
              <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-100">
                <p className="font-bold">1. Open your browser menu (⋮)</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  In Chrome or Edge, look at the browser address bar or top-right menu icon.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4" />
              </span>
              <div className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-100">
                <p className="font-bold">
                  2. Choose &apos;Install BEE4&apos; or &apos;Add to Home Screen&apos;
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Enjoy an app icon, faster checkout, and instant access to BEE4 Account.
                </p>
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full h-11 rounded-xl glass-btn-amber text-white text-sm font-bold"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
