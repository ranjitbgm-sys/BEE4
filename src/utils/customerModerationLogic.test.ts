import assert from 'node:assert/strict';
import test from 'node:test';
import { computeTemporaryBanExpiryIso, evaluateCustomerAccess } from './customerModerationLogic';

test('active customer is allowed', () => {
  const res = evaluateCustomerAccess({ accountStatus: 'Active' }, 1_000_000);
  assert.equal(res.allowed, true);
  assert.equal(res.status, 'active');
});

test('permanently blocked customer is denied with reason', () => {
  const res = evaluateCustomerAccess(
    {
      accountStatus: 'Suspended',
      banType: 'permanent',
      banReason: 'Repeated fake COD refusals',
    },
    1_000_000
  );
  assert.equal(res.allowed, false);
  assert.equal(res.status, 'permanent_block');
  assert.equal(res.reason, 'Repeated fake COD refusals');
});

test('temporary ban blocks customer before expiry and unlocks automatically after expiry', () => {
  const now = Date.parse('2026-05-01T10:00:00.000Z');
  const until = computeTemporaryBanExpiryIso('24h', undefined, now);

  const duringBan = evaluateCustomerAccess(
    {
      accountStatus: 'Suspended',
      banType: 'temporary',
      bannedUntil: until,
      banReason: 'Spam messages',
    },
    now + 60 * 60 * 1000
  );
  assert.equal(duringBan.allowed, false);
  assert.equal(duringBan.status, 'temporary_ban');
  assert.ok(duringBan.remainingHuman);

  const afterBan = evaluateCustomerAccess(
    {
      accountStatus: 'Suspended',
      banType: 'temporary',
      bannedUntil: until,
      banReason: 'Spam messages',
    },
    now + 25 * 60 * 60 * 1000
  );
  assert.equal(afterBan.allowed, true);
  assert.equal(afterBan.status, 'active');
});
