import { useCallback, useEffect, useState } from 'react';
import {
  PWA_BANNER_DISMISSED_STORAGE_KEY,
  detectDisplayStandalone,
  detectMobilePlatform,
  incrementLocalPwaInstallCount,
  readLocalPwaInstallCount,
  shouldShowInstallBanner,
  type MobilePlatform,
} from '../utils/pwaLogic';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface UsePwaInstallState {
  platform: MobilePlatform;
  isInstalled: boolean;
  canPromptNative: boolean;
  showBanner: boolean;
  showGuideModal: boolean;
  installCount: number;
  triggerInstall: () => Promise<'prompted' | 'guide' | 'installed'>;
  dismissBanner: () => void;
  closeGuideModal: () => void;
  openGuideModal: () => void;
}

function readDismissedTimestamp(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PWA_BANNER_DISMISSED_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function usePwaInstall(): UsePwaInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState<MobilePlatform>(() =>
    typeof navigator !== 'undefined' ? detectMobilePlatform(navigator.userAgent) : 'desktop'
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const matchStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
    const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    return detectDisplayStandalone(matchStandalone, navStandalone);
  });
  const [dismissedAtMs, setDismissedAtMs] = useState<number | null>(() => readDismissedTimestamp());
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installCount, setInstallCount] = useState<number>(() =>
    typeof window !== 'undefined' ? readLocalPwaInstallCount(window.localStorage) : 0
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayChange = () => {
      const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
      setIsInstalled(detectDisplayStandalone(Boolean(mediaQuery?.matches), navStandalone));
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setShowGuideModal(false);
      const nextCount = incrementLocalPwaInstallCount(window.localStorage);
      setInstallCount(nextCount);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery?.addEventListener?.('change', handleDisplayChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery?.removeEventListener?.('change', handleDisplayChange);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    const now = Date.now();
    setDismissedAtMs(now);
    try {
      window.localStorage.setItem(PWA_BANNER_DISMISSED_STORAGE_KEY, String(now));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const triggerInstall = useCallback(async (): Promise<'prompted' | 'guide' | 'installed'> => {
    if (isInstalled) return 'installed';

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          return 'installed';
        }
        return 'prompted';
      } catch {
        setShowGuideModal(true);
        return 'guide';
      }
    }

    setShowGuideModal(true);
    return 'guide';
  }, [deferredPrompt, isInstalled]);

  const showBanner = shouldShowInstallBanner({
    isInstalled,
    dismissedAtMs,
    nowMs: Date.now(),
  });

  return {
    platform,
    isInstalled,
    canPromptNative: Boolean(deferredPrompt),
    showBanner,
    showGuideModal,
    installCount,
    triggerInstall,
    dismissBanner,
    closeGuideModal: () => setShowGuideModal(false),
    openGuideModal: () => setShowGuideModal(true),
  };
}
