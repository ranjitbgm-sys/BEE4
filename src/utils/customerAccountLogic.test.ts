import test from 'node:test';
import assert from 'node:assert/strict';
import type { CustomerProfile } from '../types';
import {
  adjustCustomerWalletBalance,
  createDeviceSession,
  findForbiddenStorefrontLeaks,
  formatEntryIdentifier,
  getAccountUiCopy,
  isSessionInvalidatedByAdmin,
  joinFirstLastName,
  logoutOtherDeviceSessions,
  normalizeCustomerPanelControls,
  splitFullName,
  upsertDeviceSession,
  validateUpiId,
} from './customerAccountLogic';

const BASE_PROFILE: CustomerProfile = {
  id: 'cust-1',
  fullName: 'Ananya Sharma',
  firstName: 'Ananya',
  lastName: 'Sharma',
  gender: 'Female',
  phone: '9876543210',
  email: 'ananya@bee4.in',
  preferredPayment: 'UPI / Prepaid',
  walletBalance: 250,
  walletTransactions: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  addresses: [],
  wishlistIds: [],
};

test('formatEntryIdentifier classifies 10-digit Indian phone and email accurately', () => {
  const phoneRes = formatEntryIdentifier('+91 98765 43210');
  assert.equal(phoneRes.type, 'phone');
  assert.equal(phoneRes.normalized, '9876543210');
  assert.ok(phoneRes.masked.endsWith('3210'));

  const emailRes = formatEntryIdentifier('  Kabir.Mehta@Example.com ');
  assert.equal(emailRes.type, 'email');
  assert.equal(emailRes.normalized, 'kabir.mehta@example.com');

  const badRes = formatEntryIdentifier('1234');
  assert.equal(badRes.type, 'invalid');
});

test('splitFullName and joinFirstLastName round-trip cleanly', () => {
  assert.deepEqual(splitFullName('Ananya Devi Sharma'), {
    firstName: 'Ananya',
    lastName: 'Devi Sharma',
  });
  assert.equal(joinFirstLastName('Ananya', 'Sharma'), 'Ananya Sharma');
});

test('validateUpiId validates handle format cleanly', () => {
  assert.equal(validateUpiId('ananya.sharma@okaxis').valid, true);
  assert.equal(validateUpiId('invalid-upi').valid, false);
});

test('device session helpers support multi-device listing and logout others', () => {
  const dev1 = createDeviceSession('Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/120.0');
  const dev2 = { ...createDeviceSession('Mozilla/5.0 (iPhone) Safari/604.1'), id: 'dev-old', isCurrent: false };
  const merged = upsertDeviceSession([dev2], dev1);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].isCurrent, true);
  assert.equal(merged[1].isCurrent, false);

  const afterLogout = logoutOtherDeviceSessions(merged, dev1.id);
  assert.equal(afterLogout.length, 1);
  assert.equal(afterLogout[0].id, dev1.id);
});

test('isSessionInvalidatedByAdmin catches Suspended accounts and forced logouts', () => {
  assert.equal(
    isSessionInvalidatedByAdmin({ ...BASE_PROFILE, accountStatus: 'Suspended' }, '2026-02-01T00:00:00.000Z'),
    true
  );
  assert.equal(
    isSessionInvalidatedByAdmin(
      { ...BASE_PROFILE, forceLoggedOutAt: '2026-02-02T12:00:00.000Z' },
      '2026-02-02T11:00:00.000Z'
    ),
    true
  );
  assert.equal(
    isSessionInvalidatedByAdmin(
      { ...BASE_PROFILE, forceLoggedOutAt: '2026-02-02T10:00:00.000Z' },
      '2026-02-02T11:00:00.000Z'
    ),
    false
  );
});

test('adjustCustomerWalletBalance credits and debits safely without negative balance', () => {
  const credit = adjustCustomerWalletBalance({
    profile: BASE_PROFILE,
    deltaAmount: 500,
    note: 'Festival reward credit',
    adminEmail: 'owner@bee4.in',
  });
  assert.equal(credit.updatedProfile.walletBalance, 750);
  assert.equal(credit.updatedProfile.walletTransactions?.[0].type, 'credit_admin_bonus');

  const debitClamped = adjustCustomerWalletBalance({
    profile: credit.updatedProfile,
    deltaAmount: -2000,
    note: 'Manual reversal',
  });
  assert.equal(debitClamped.updatedProfile.walletBalance, 0);
  assert.equal(debitClamped.appliedDelta, -750);
});

test('normalizeCustomerPanelControls & getAccountUiCopy provide defaults and bilingual labels', () => {
  const defaults = normalizeCustomerPanelControls(undefined);
  assert.equal(defaults.enableGiftCards, true);
  assert.equal(defaults.enableProductQa, true);

  const enCopy = getAccountUiCopy('en');
  const hiCopy = getAccountUiCopy('hi');
  assert.equal(enCopy.ordersLabel, 'Orders');
  assert.ok(hiCopy.ordersLabel.length > 0 && hiCopy.ordersLabel !== enCopy.ordersLabel);
});

test('findForbiddenStorefrontLeaks detects prohibited platform/admin strings', () => {
  assert.deepEqual(findForbiddenStorefrontLeaks('Welcome to your BEE4 Account'), []);
  const leaks = findForbiddenStorefrontLeaks('Synced with Supabase and bee4official@gmail.com');
  assert.equal(leaks.length, 2);
});
