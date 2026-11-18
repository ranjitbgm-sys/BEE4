import type { CustomerProfile } from '../types';

export type BanDurationPreset = '24h' | '7d' | '30d' | 'custom';

export interface CustomerAccessEvaluation {
  allowed: boolean;
  status: 'active' | 'temporary_ban' | 'permanent_block';
  banKind: 'none' | 'temporary' | 'permanent';
  reason: string;
  message: string;
  bannedUntil: string | null;
  remainingHuman: string | null;
}

export function formatRemainingDuration(untilIso: string, nowMs = Date.now()): string | null {
  const targetMs = Date.parse(untilIso);
  if (!Number.isFinite(targetMs)) return null;
  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return null;

  const totalMinutes = Math.ceil(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function evaluateCustomerAccess(
  profile: Partial<CustomerProfile> | null | undefined,
  nowMs = Date.now()
): CustomerAccessEvaluation {
  if (!profile) {
    return {
      allowed: true,
      status: 'active',
      banKind: 'none',
      reason: '',
      message: '',
      bannedUntil: null,
      remainingHuman: null,
    };
  }

  const reason =
    profile.banReason?.trim() ||
    'Your BEE4 account has been restricted for policy or order abuse.';

  if (profile.banType === 'permanent') {
    return {
      allowed: false,
      status: 'permanent_block',
      banKind: 'permanent',
      reason,
      message: `Your BEE4 account has been permanently blocked. Reason: ${reason}`,
      bannedUntil: null,
      remainingHuman: null,
    };
  }

  if (profile.banType === 'temporary') {
    if (!profile.bannedUntil) {
      return {
        allowed: false,
        status: 'temporary_ban',
        banKind: 'temporary',
        reason,
        message: `Your BEE4 account is temporarily suspended. Reason: ${reason}`,
        bannedUntil: null,
        remainingHuman: null,
      };
    }
    const untilMs = Date.parse(profile.bannedUntil);
    if (Number.isFinite(untilMs) && nowMs < untilMs) {
      const remainingHuman = formatRemainingDuration(profile.bannedUntil, nowMs);
      return {
        allowed: false,
        status: 'temporary_ban',
        banKind: 'temporary',
        reason,
        message: `Your BEE4 account is temporarily suspended${
          remainingHuman ? ` (${remainingHuman} remaining)` : ''
        }. Reason: ${reason}`,
        bannedUntil: profile.bannedUntil,
        remainingHuman,
      };
    }
    // Expired temporary ban automatically resolves to active
    return {
      allowed: true,
      status: 'active',
      banKind: 'none',
      reason: '',
      message: '',
      bannedUntil: null,
      remainingHuman: null,
    };
  }

  if (profile.accountStatus === 'Suspended') {
    return {
      allowed: false,
      status: 'permanent_block',
      banKind: 'permanent',
      reason,
      message: `Your BEE4 account has been permanently blocked. Reason: ${reason}`,
      bannedUntil: null,
      remainingHuman: null,
    };
  }

  return {
    allowed: true,
    status: 'active',
    banKind: 'none',
    reason: '',
    message: '',
    bannedUntil: null,
    remainingHuman: null,
  };
}

export function computeTemporaryBanExpiryIso(
  preset: BanDurationPreset,
  customDateIso?: string,
  nowMs = Date.now()
): string {
  if (preset === '24h') {
    return new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
  }
  if (preset === '7d') {
    return new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (preset === '30d') {
    return new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (customDateIso && Number.isFinite(Date.parse(customDateIso))) {
    return new Date(Date.parse(customDateIso)).toISOString();
  }
  return new Date(nowMs + 7 * 24 * 60 * 60 * 1000).toISOString();
}
