export type ConfettiShape = 'circle' | 'pill' | 'square' | 'diamond';

export interface ConfettiParticle {
  id: number;
  originXPercent: number;
  originYPercent: number;
  driftX: number;
  fallY: number;
  rotateStart: number;
  rotateEnd: number;
  scale: number;
  delay: number;
  duration: number;
  opacity: number;
  colorHex: string;
  shape: ConfettiShape;
  widthPx: number;
  heightPx: number;
}

export const BEE4_CONFETTI_HEX_COLORS = [
  '#f59e0b', // warm amber
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f97316', // coral orange
  '#14b8a6', // teal
  '#ec4899', // rose
] as const;

const CONFETTI_SHAPES: readonly ConfettiShape[] = ['pill', 'circle', 'square', 'diamond'];

function seededUnit(index: number, salt: number): number {
  const x = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generates deterministic, restrained confetti particles balanced across both
 * desktop and mobile viewports so checkout confirmations feel celebratory
 * without visually overwhelming the order receipt.
 */
export function createConfettiParticles(count = 40): ConfettiParticle[] {
  const safeCount = Math.max(0, Math.min(80, Math.round(count)));
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const r1 = seededUnit(i, 1);
    const r2 = seededUnit(i, 2);
    const r3 = seededUnit(i, 3);
    const r4 = seededUnit(i, 4);
    const r5 = seededUnit(i, 5);
    const r6 = seededUnit(i, 6);

    const originXPercent = Math.round((8 + r1 * 84) * 10) / 10;
    const originYPercent = Math.round((1 + r2 * 8) * 10) / 10;

    const spreadDirection = r3 - 0.5;
    const driftX = Math.round(spreadDirection * 180);
    const fallY = Math.round(150 + r4 * 250);

    const rotateStart = Math.round((r5 - 0.5) * 90);
    const rotateEnd = rotateStart + Math.round((r6 > 0.5 ? 1 : -1) * (160 + r2 * 220));

    const shape = CONFETTI_SHAPES[i % CONFETTI_SHAPES.length];
    const colorHex = BEE4_CONFETTI_HEX_COLORS[i % BEE4_CONFETTI_HEX_COLORS.length];

    particles.push({
      id: i,
      originXPercent,
      originYPercent,
      driftX,
      fallY,
      rotateStart,
      rotateEnd,
      scale: Math.round((0.85 + r4 * 0.35) * 100) / 100,
      delay: Math.round(r2 * 0.4 * 100) / 100,
      duration: Math.round((3.0 + r5 * 1.0) * 100) / 100,
      opacity: Math.round((0.78 + r3 * 0.18) * 100) / 100,
      colorHex,
      shape,
      widthPx: shape === 'pill' ? 6 : 8,
      heightPx: shape === 'pill' ? 14 : 8,
    });
  }

  return particles;
}
