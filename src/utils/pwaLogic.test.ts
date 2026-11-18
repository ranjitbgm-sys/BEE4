import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectDisplayStandalone,
  detectMobilePlatform,
  incrementLocalPwaInstallCount,
  readLocalPwaInstallCount,
  shouldShowInstallBanner,
  validatePwaManifest,
} from './pwaLogic';

test('detectMobilePlatform distinguishes iOS, Android, and desktop user agents accurately', () => {
  assert.equal(
    detectMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    'ios'
  );
  assert.equal(detectMobilePlatform('Mozilla/5.0 (Linux; Android 14; Pixel 8)'), 'android');
  assert.equal(detectMobilePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'), 'desktop');
});

test('detectDisplayStandalone returns true when either display-mode or iOS standalone is active', () => {
  assert.equal(detectDisplayStandalone(true, false), true);
  assert.equal(detectDisplayStandalone(false, true), true);
  assert.equal(detectDisplayStandalone(false, false), false);
});

test('shouldShowInstallBanner suppresses when installed or recently dismissed', () => {
  const now = 1_700_000_000_000;
  assert.equal(
    shouldShowInstallBanner({ isInstalled: true, dismissedAtMs: null, nowMs: now }),
    false
  );
  assert.equal(
    shouldShowInstallBanner({ isInstalled: false, dismissedAtMs: null, nowMs: now }),
    true
  );
  assert.equal(
    shouldShowInstallBanner({
      isInstalled: false,
      dismissedAtMs: now - 10 * 60 * 60 * 1000,
      nowMs: now,
      cooldownHours: 72,
    }),
    false
  );
  assert.equal(
    shouldShowInstallBanner({
      isInstalled: false,
      dismissedAtMs: now - 80 * 60 * 60 * 1000,
      nowMs: now,
      cooldownHours: 72,
    }),
    true
  );
});

test('local PWA install counter reads and increments safely across storage', () => {
  const map = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
  };
  assert.equal(readLocalPwaInstallCount(mockStorage), 0);
  assert.equal(incrementLocalPwaInstallCount(mockStorage), 1);
  assert.equal(incrementLocalPwaInstallCount(mockStorage), 2);
  assert.equal(readLocalPwaInstallCount(mockStorage), 2);
});

test('public/manifest.webmanifest passes 100% PWABuilder compliance checks', () => {
  const manifestRaw = fs.readFileSync(
    path.resolve(process.cwd(), 'public', 'manifest.webmanifest'),
    'utf-8'
  );
  const manifest = JSON.parse(manifestRaw);
  const report = validatePwaManifest(manifest);
  assert.equal(report.manifestValid, true);
  assert.equal(report.hasRequiredIcons, true);
  assert.equal(report.hasSeparateMaskableIcon, true);
  assert.equal(report.shortNameWithinLimit, true);
  assert.equal(report.storeReadyScore, 100);
  assert.equal(manifest.name, 'BEE4 — 3D Crafts, Toys & Custom Studio');
  assert.equal(manifest.short_name, 'BEE4');
  assert.equal(manifest.theme_color, '#0f172a');
  assert.equal(manifest.background_color, '#0f172a');
});
