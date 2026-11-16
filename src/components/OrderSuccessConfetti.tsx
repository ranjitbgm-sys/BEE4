import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { createConfettiParticles, ConfettiShape } from '../utils/confettiLogic';

interface OrderSuccessConfettiProps {
  active: boolean;
  orderKey: string;
}

function shapeRadius(shape: ConfettiShape): string {
  switch (shape) {
    case 'circle':
    case 'pill':
      return '9999px';
    case 'diamond':
      return '2px';
    case 'square':
    default:
      return '3px';
  }
}

/**
 * Subtle, non-blocking celebratory confetti burst built with framer-motion.
 * Automatically clears cleanly after 4.8s and honors prefers-reduced-motion.
 */
export function OrderSuccessConfetti({ active, orderKey }: OrderSuccessConfettiProps) {
  const prefersReducedMotion = useReducedMotion();
  const [visible, setVisible] = useState<boolean>(active);

  const particles = useMemo(() => createConfettiParticles(40), []);

  useEffect(() => {
    if (!active || prefersReducedMotion) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 4800);

    return () => window.clearTimeout(timer);
  }, [active, orderKey, prefersReducedMotion]);

  if (prefersReducedMotion) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={`confetti-${orderKey}`}
          aria-hidden="true"
          data-testid="order-success-confetti"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="pointer-events-none absolute inset-0 overflow-hidden z-30 rounded-3xl"
        >
          {/* Subtle top celebration aura */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: [0, 0.4, 0], scale: [0.85, 1.06, 1.15] }}
            transition={{ duration: 2.0, ease: 'easeOut' }}
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-32 rounded-full bg-gradient-to-b from-amber-300/35 via-emerald-300/20 to-transparent blur-2xl"
          />

          {particles.map((particle) => (
            <motion.span
              key={particle.id}
              initial={{
                opacity: 0,
                x: 0,
                y: 0,
                scale: 0.5,
                rotate: particle.rotateStart,
              }}
              animate={{
                opacity: [0, particle.opacity, particle.opacity, 0],
                x: [0, particle.driftX * 0.25, particle.driftX * 0.72, particle.driftX],
                y: [0, particle.fallY * 0.16, particle.fallY * 0.68, particle.fallY],
                scale: [0.5, particle.scale, particle.scale, particle.scale * 0.75],
                rotate: particle.rotateEnd,
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                times: [0, 0.12, 0.78, 1],
                ease: 'easeOut',
              }}
              style={{
                left: `${particle.originXPercent}%`,
                top: `${particle.originYPercent}%`,
                width: `${particle.widthPx}px`,
                height: `${particle.heightPx}px`,
                backgroundColor: particle.colorHex,
                borderRadius: shapeRadius(particle.shape),
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.14)',
              }}
              className="absolute block"
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
