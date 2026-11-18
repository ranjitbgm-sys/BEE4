import type {
  CustomerDeviceSession,
  CustomerNotificationPreferences,
  CustomerPanelControls,
  CustomerProfile,
  StoreSettings,
} from '../types';
import { maskContactTarget, parseContactIdentifier } from './storeLogic';

export const DEFAULT_CUSTOMER_PANEL_CONTROLS: CustomerPanelControls = {
  enableGiftCards: true,
  enableLanguageSwitcher: true,
  enableSelfServiceCancel: true,
  enableProductQa: true,
};

export const DEFAULT_NOTIFICATION_PREFERENCES: CustomerNotificationPreferences = {
  orderUpdates: true,
  returnAlerts: true,
  offersAndLaunches: false,
};

export function normalizeCustomerPanelControls(
  settings?: Partial<StoreSettings> | null
): CustomerPanelControls {
  const raw = settings?.customerPanelControls;
  return {
    enableGiftCards: raw?.enableGiftCards ?? true,
    enableLanguageSwitcher: raw?.enableLanguageSwitcher ?? true,
    enableSelfServiceCancel: raw?.enableSelfServiceCancel ?? true,
    enableProductQa: raw?.enableProductQa ?? true,
  };
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export function joinFirstLastName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ').trim();
}

export function formatEntryIdentifier(raw: string): {
  type: 'phone' | 'email' | 'invalid';
  normalized: string;
  masked: string;
} {
  const parsed = parseContactIdentifier(raw);
  if (parsed.type === 'invalid') {
    return { type: 'invalid', normalized: raw.trim(), masked: '' };
  }
  return {
    type: parsed.type,
    normalized: parsed.normalized,
    masked: maskContactTarget(parsed.type, parsed.normalized),
  };
}

export function validateUpiId(raw: string): { valid: boolean; normalized: string; error?: string } {
  const normalized = raw.trim().toLowerCase();
  if (!normalized) {
    return { valid: false, normalized: '', error: 'Please enter a valid UPI ID (e.g. name@okaxis).' };
  }
  if (!/^[a-z0-9._-]{2,64}@[a-z0-9]{2,32}$/.test(normalized)) {
    return { valid: false, normalized, error: 'Enter a valid UPI ID such as yourname@okicici or 98xxxxxx10@ybl.' };
  }
  return { valid: true, normalized };
}

export function createDeviceSession(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Desktop Browser',
  nowIso = new Date().toISOString()
): CustomerDeviceSession {
  const ua = userAgent.toLowerCase();
  const isMobile = /iphone|android|mobile/.test(ua);
  const browser = ua.includes('edg')
    ? 'Edge'
    : ua.includes('firefox')
      ? 'Firefox'
      : ua.includes('chrome')
        ? 'Chrome'
        : ua.includes('safari')
          ? 'Safari'
          : 'Web Browser';
  const platform = ua.includes('iphone') || ua.includes('ipad')
    ? 'iOS'
    : ua.includes('android')
      ? 'Android'
      : ua.includes('mac')
        ? 'macOS'
        : ua.includes('windows')
          ? 'Windows'
          : 'Desktop';

  return {
    id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    deviceLabel: `${browser} on ${isMobile ? 'Mobile' : platform}`,
    browser,
    platform,
    lastActiveAt: nowIso,
    isCurrent: true,
  };
}

export function upsertDeviceSession(
  existingDevices: CustomerDeviceSession[] | undefined,
  nextDevice: CustomerDeviceSession
): CustomerDeviceSession[] {
  const base = Array.isArray(existingDevices) ? existingDevices : [];
  const filtered = base
    .filter((d) => d.id !== nextDevice.id)
    .map((d) => ({ ...d, isCurrent: false }));
  return [{ ...nextDevice, isCurrent: true }, ...filtered].slice(0, 6);
}

export function logoutOtherDeviceSessions(
  devices: CustomerDeviceSession[] | undefined,
  currentDeviceId?: string
): CustomerDeviceSession[] {
  const base = Array.isArray(devices) ? devices : [];
  if (base.length === 0) return [];
  const current = base.find((d) => d.id === currentDeviceId || d.isCurrent);
  return current ? [{ ...current, isCurrent: true }] : [base[0]];
}

export function isSessionInvalidatedByAdmin(
  profile: CustomerProfile | null | undefined,
  sessionIssuedAtIso?: string | null
): boolean {
  if (!profile) return false;
  if (profile.accountStatus === 'Suspended') return true;
  if (!profile.forceLoggedOutAt || !sessionIssuedAtIso) return false;
  const forceMs = Date.parse(profile.forceLoggedOutAt);
  const issuedMs = Date.parse(sessionIssuedAtIso);
  if (!Number.isFinite(forceMs) || !Number.isFinite(issuedMs)) return false;
  return forceMs > issuedMs;
}

export function adjustCustomerWalletBalance(input: {
  profile: CustomerProfile;
  deltaAmount: number;
  note: string;
  adminEmail?: string;
  nowIso?: string;
}): { updatedProfile: CustomerProfile; appliedDelta: number } {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const prevBalance = Math.max(0, Math.round(Number(input.profile.walletBalance ?? 0)));
  const rawDelta = Math.round(Number(input.deltaAmount) || 0);
  const nextBalance = Math.max(0, prevBalance + rawDelta);
  const appliedDelta = nextBalance - prevBalance;
  const isCredit = appliedDelta >= 0;

  const tx = {
    id: `wtx-admin-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: isCredit ? ('credit_admin_bonus' as const) : ('debit_order' as const),
    amount: Math.abs(appliedDelta),
    balanceAfter: nextBalance,
    referenceId: input.adminEmail ? `STUDIO (${input.adminEmail})` : 'BEE4 STUDIO',
    note:
      input.note.trim() ||
      (isCredit ? 'Studio Wallet Credit Adjustment' : 'Studio Wallet Debit Adjustment'),
    createdAt: nowIso,
  };

  return {
    appliedDelta,
    updatedProfile: {
      ...input.profile,
      walletBalance: nextBalance,
      walletTransactions: [tx, ...(input.profile.walletTransactions ?? [])].slice(0, 60),
    },
  };
}

export interface AccountUiCopy {
  greetingPrefix: string;
  ordersLabel: string;
  wishlistLabel: string;
  giftCardsLabel: string;
  helpCenterLabel: string;
  rateDeliveredHeading: string;
  accountSettingsHeading: string;
  paymentsHeading: string;
  privacyHeading: string;
  activityHelpHeading: string;
  editProfileLabel: string;
  savedAddressesLabel: string;
  languageLabel: string;
  notificationsLabel: string;
  giftWalletLabel: string;
  savedPaymentsLabel: string;
  privacyCenterLabel: string;
  manageDevicesLabel: string;
  myOrdersLabel: string;
  qaLabel: string;
  supportTicketsLabel: string;
  customUploadsLabel: string;
  faqsPoliciesLabel: string;
}

export function getAccountUiCopy(lang: 'en' | 'hi' = 'en'): AccountUiCopy {
  if (lang === 'hi') {
    return {
      greetingPrefix: 'नमस्ते,',
      ordersLabel: 'मेरे ऑर्डर',
      wishlistLabel: 'विशलिस्ट',
      giftCardsLabel: 'गिफ्ट कार्ड',
      helpCenterLabel: 'सहायता केंद्र',
      rateDeliveredHeading: 'डिलीवर किए गए उत्पादों को रेट करें',
      accountSettingsHeading: 'प्रोफ़ाइल और प्राथमिकताएँ',
      paymentsHeading: 'भुगतान और वॉलेट',
      privacyHeading: 'गोपनीयता और सुरक्षा',
      activityHelpHeading: 'गतिविधि और सहायता',
      editProfileLabel: 'प्रोफ़ाइल संपादित करें',
      savedAddressesLabel: 'सहेजे गए पते',
      languageLabel: 'भाषा बदलें',
      notificationsLabel: 'सूचना सेटिंग्स',
      giftWalletLabel: 'गिफ्ट कार्ड और BEE4 वॉलेट',
      savedPaymentsLabel: 'सहेजे गए भुगतान तरीके',
      privacyCenterLabel: 'गोपनीयता केंद्र',
      manageDevicesLabel: 'डिवाइस प्रबंधित करें',
      myOrdersLabel: 'मेरे ऑर्डर',
      qaLabel: 'प्रश्न और उत्तर',
      supportTicketsLabel: 'सहायता टिकट',
      customUploadsLabel: 'कस्टम अपलोड इतिहास',
      faqsPoliciesLabel: 'FAQs और नीतियाँ',
    };
  }

  return {
    greetingPrefix: 'Hey!',
    ordersLabel: 'Orders',
    wishlistLabel: 'Wishlist',
    giftCardsLabel: 'Gift Cards',
    helpCenterLabel: 'Help Center',
    rateDeliveredHeading: 'Rate your delivered toys',
    accountSettingsHeading: 'Profile Settings',
    paymentsHeading: 'Payments & Wallets',
    privacyHeading: 'Privacy & Security',
    activityHelpHeading: 'My Activity & Help',
    editProfileLabel: 'Edit Profile',
    savedAddressesLabel: 'Saved Addresses',
    languageLabel: 'Change Language',
    notificationsLabel: 'Notification Settings',
    giftWalletLabel: 'Gift Card & BEE4 Wallet',
    savedPaymentsLabel: 'Saved Payment Methods',
    privacyCenterLabel: 'Privacy Center',
    manageDevicesLabel: 'Manage Devices',
    myOrdersLabel: 'My Orders',
    qaLabel: 'Questions & Answers',
    supportTicketsLabel: 'Support Tickets',
    customUploadsLabel: 'Custom Uploads History',
    faqsPoliciesLabel: 'FAQs & Policies',
  };
}

const FORBIDDEN_STOREFRONT_PATTERNS = [
  /\bsupabase\b/i,
  /\bfirebase\b/i,
  /\bnetlify\b/i,
  /\bgoogle ai studio\b/i,
  /\bbee4official@gmail\.com\b/i,
  /\branjitbgm@gmail\.com\b/i,
];

export function findForbiddenStorefrontLeaks(text: string): string[] {
  const hits: string[] = [];
  for (const rx of FORBIDDEN_STOREFRONT_PATTERNS) {
    const m = text.match(rx);
    if (m) hits.push(m[0]);
  }
  return hits;
}
