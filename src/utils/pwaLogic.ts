export const PWA_INSTALL_COUNT_STORAGE_KEY = 'bee4_pwa_installs_v1';
export const PWA_BANNER_DISMISSED_STORAGE_KEY = 'bee4_pwa_banner_dismissed_at_v1';
export const PWA_SPLASH_SHOWN_SESSION_KEY = 'bee4_pwa_splash_shown_v1';

export type MobilePlatform = 'ios' | 'android' | 'desktop';

export interface ManifestCheckInput {
  id?: string;
  name?: string;
  short_name?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  theme_color?: string;
  background_color?: string;
  icons?: Array<{
    src: string;
    sizes?: string;
    type?: string;
    purpose?: string;
  }>;
}

export interface PwaReadinessReport {
  manifestValid: boolean;
  manifestIssues: string[];
  hasRequiredIcons: boolean;
  hasSeparateMaskableIcon: boolean;
  shortNameWithinLimit: boolean;
  storeReadyScore: number;
}

export function detectMobilePlatform(userAgent: string): MobilePlatform {
  const ua = (userAgent || '').toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  if (/android/.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

export function detectDisplayStandalone(
  matchMediaStandalone: boolean,
  navigatorStandalone?: boolean
): boolean {
  return Boolean(matchMediaStandalone || navigatorStandalone === true);
}

export function shouldShowInstallBanner(params: {
  isInstalled: boolean;
  dismissedAtMs: number | null;
  nowMs: number;
  cooldownHours?: number;
}): boolean {
  if (params.isInstalled) return false;
  if (!params.dismissedAtMs) return true;
  const cooldownMs = (params.cooldownHours ?? 72) * 60 * 60 * 1000;
  return params.nowMs - params.dismissedAtMs >= cooldownMs;
}

export function readLocalPwaInstallCount(storage?: Pick<Storage, 'getItem'> | null): number {
  if (!storage) return 0;
  try {
    const raw = storage.getItem(PWA_INSTALL_COUNT_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

export function incrementLocalPwaInstallCount(
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null
): number {
  const next = readLocalPwaInstallCount(storage) + 1;
  if (storage) {
    try {
      storage.setItem(PWA_INSTALL_COUNT_STORAGE_KEY, String(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}

export function validatePwaManifest(manifest: ManifestCheckInput): PwaReadinessReport {
  const issues: string[] = [];

  if (!manifest.id) issues.push('Missing manifest id');
  if (!manifest.name || !manifest.name.trim()) issues.push('Missing manifest name');
  if (!manifest.short_name || !manifest.short_name.trim()) issues.push('Missing short_name');
  const shortNameWithinLimit = Boolean(
    manifest.short_name && manifest.short_name.trim().length <= 12
  );
  if (manifest.short_name && !shortNameWithinLimit) {
    issues.push('short_name exceeds 12 characters');
  }
  if (manifest.start_url !== '/') issues.push('start_url should be "/"');
  if (manifest.scope !== '/') issues.push('scope should be "/"');
  if (manifest.display !== 'standalone') issues.push('display should be "standalone"');

  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  const has192 = icons.some((icon) => icon.sizes?.includes('192x192') && icon.type === 'image/png');
  const has512 = icons.some((icon) => icon.sizes?.includes('512x512') && icon.type === 'image/png');
  const hasRequiredIcons = has192 && has512;
  if (!hasRequiredIcons) {
    issues.push('Missing required 192x192 and 512x512 PNG icons');
  }

  const hasSeparateMaskableIcon = icons.some(
    (icon) => icon.purpose === 'maskable' && icon.sizes?.includes('512x512')
  );
  if (!hasSeparateMaskableIcon) {
    issues.push('Missing dedicated maskable 512x512 icon');
  }

  const checks = [
    Boolean(manifest.id),
    Boolean(manifest.name?.trim()),
    shortNameWithinLimit,
    manifest.display === 'standalone',
    manifest.start_url === '/' && manifest.scope === '/',
    hasRequiredIcons,
    hasSeparateMaskableIcon,
  ];
  const passed = checks.filter(Boolean).length;
  const storeReadyScore = Math.round((passed / checks.length) * 100);

  return {
    manifestValid: issues.length === 0,
    manifestIssues: issues,
    hasRequiredIcons,
    hasSeparateMaskableIcon,
    shortNameWithinLimit,
    storeReadyScore,
  };
}
