import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  ADMIN_LOCKOUT_DURATION_MS,
  DEFAULT_ADMIN_PASSWORD_HASH,
  getAdminLockoutState,
  resolveExpectedAdminHash,
  sha256Hex,
  validateAdminPasswordChange,
  verifyAdminPassword,
} from './adminAuth';

test('sha256Hex matches Node crypto SHA-256 across ASCII and UTF-8 strings', () => {
  const samples = ['', 'BEE4@Admin2026', 'bee4-owner-password-₹999', 'test-123456'];
  for (const sample of samples) {
    const expected = createHash('sha256').update(sample, 'utf8').digest('hex');
    assert.equal(sha256Hex(sample), expected);
  }
});

test('verifyAdminPassword validates correct password and rejects invalid inputs', () => {
  const expectedHash = resolveExpectedAdminHash();
  assert.equal(expectedHash, DEFAULT_ADMIN_PASSWORD_HASH);
  assert.equal(verifyAdminPassword('BEE4@Admin2026', expectedHash), true);
  assert.equal(verifyAdminPassword('wrong-password', expectedHash), false);
  assert.equal(verifyAdminPassword('', expectedHash), false);

  const customHash = sha256Hex('CustomOwner#2026');
  const resolvedCustom = resolveExpectedAdminHash(customHash);
  assert.equal(verifyAdminPassword('CustomOwner#2026', resolvedCustom), true);
  assert.equal(verifyAdminPassword('BEE4@Admin2026', resolvedCustom), false);
});

test('getAdminLockoutState reports remaining cooldown until expiry', () => {
  const start = 1_000_000;
  const lockedUntil = start + ADMIN_LOCKOUT_DURATION_MS;

  const active = getAdminLockoutState(lockedUntil, start + 5_200);
  assert.equal(active.isLocked, true);
  assert.equal(active.remainingSeconds, 25);

  const expired = getAdminLockoutState(lockedUntil, lockedUntil);
  assert.equal(expired.isLocked, false);
  assert.equal(expired.remainingSeconds, 0);
});

test('validateAdminPasswordChange verifies current password, minimum length, and confirmation', () => {
  const hash = DEFAULT_ADMIN_PASSWORD_HASH;

  assert.equal(
    validateAdminPasswordChange({
      currentPassword: 'wrong',
      newPassword: 'NewPassword123',
      confirmPassword: 'NewPassword123',
      expectedHash: hash,
    }).error,
    'Current admin password is incorrect.'
  );

  assert.equal(
    validateAdminPasswordChange({
      currentPassword: 'BEE4@Admin2026',
      newPassword: 'short',
      confirmPassword: 'short',
      expectedHash: hash,
    }).error,
    'New password must be at least 8 characters long.'
  );

  assert.equal(
    validateAdminPasswordChange({
      currentPassword: 'BEE4@Admin2026',
      newPassword: 'NewPassword123',
      confirmPassword: 'DifferentPassword123',
      expectedHash: hash,
    }).error,
    'New password and confirmation do not match.'
  );

  const valid = validateAdminPasswordChange({
    currentPassword: 'BEE4@Admin2026',
    newPassword: 'BEE4@Owner99',
    confirmPassword: 'BEE4@Owner99',
    expectedHash: hash,
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.nextHash, sha256Hex('BEE4@Owner99'));
});
