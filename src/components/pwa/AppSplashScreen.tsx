import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PWA_SPLASH_SHOWN_SESSION_KEY } from '../../utils/pwaLogic';

interface AppSplashScreenProps {
  isStandalone: boolean;
  disabled?: boolean;
}

export function AppSplashScreen({ isStandalone, disabled = false }: AppSplashScreenProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(() => {
    if (disabled || typeof window === 'undefined') return false;
    try {
      if (window.sessionStorage.getItem(PWA_SPLASH_SHOWN_SESSION_KEY) === '1') {
        return false;
      }
      const isMobileViewport = window.innerWidth < 768;
      return isStandalone || isMobileViewport;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    try {
      window.sessionStorage.setItem(PWA_SPLASH_SHOWN_SESSION_KEY, '1');
    } catch {
      // Ignore sessionStorage errors
    }
    const durationMs = prefersReducedMotion ? 180 : 800;
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, durationMs);
    return () => window.clearTimeout(timer);
  }, [visible, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-label="Loading BEE4 App"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.08 : 0.22 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0f172a] text-white px-6 select-none-nav pointer-events-none"
        >
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center space-y-4"
          >
            <div className="w-24 h-24 rounded-3xl bg-slate-900 border border-white/15 shadow-2xl p-2 flex items-center justify-center overflow-hidden">
              <img
                src="/icons/icon-192.png"
                alt="BEE4"
                className="w-full h-full object-contain rounded-2xl"
              />
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold tracking-tight text-white">
                BEE4
              </p>
              <p className="mt-1 text-xs font-medium text-amber-300 tracking-wide">
                3D Crafts, Toys &amp; Custom Studio
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
