import test from 'node:test';
import assert from 'node:assert/strict';
import { BEE4_CONFETTI_HEX_COLORS, createConfettiParticles } from './confettiLogic';

test('createConfettiParticles generates subtle, bounded deterministic particles', () => {
  const firstRun = createConfettiParticles(40);
  const secondRun = createConfettiParticles(40);

  assert.equal(firstRun.length, 40);
  assert.deepEqual(firstRun, secondRun);

  for (const p of firstRun) {
    assert.ok(p.originXPercent >= 8 && p.originXPercent <= 92);
    assert.ok(p.originYPercent >= 1 && p.originYPercent <= 9);
    assert.ok(p.fallY >= 150 && p.fallY <= 400);
    assert.ok(p.delay >= 0 && p.delay <= 0.4);
    assert.ok(p.duration >= 3.0 && p.duration <= 4.0);
    assert.ok(p.opacity >= 0.78 && p.opacity <= 0.96);
    assert.ok(p.widthPx > 0 && p.heightPx > 0);
    assert.ok((BEE4_CONFETTI_HEX_COLORS as readonly string[]).includes(p.colorHex));
  }
});

test('createConfettiParticles clamps extreme or negative counts safely', () => {
  assert.equal(createConfettiParticles(-5).length, 0);
  assert.equal(createConfettiParticles(0).length, 0);
  assert.equal(createConfettiParticles(500).length, 80);
});
