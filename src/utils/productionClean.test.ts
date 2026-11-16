import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAllLocalTestCaches,
  PRODUCTION_CLEAN_VERSION_KEY,
  runProductionCleanMigration,
  StorageLike,
  TEST_STORAGE_KEYS_TO_PURGE,
} from './productionClean';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    store,
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

test('runProductionCleanMigration purges old mock/test storage keys once and preserves cart/theme', () => {
  const storage = createMemoryStorage({
    bee4_orders_v3: '[{"orderNumber":"BEE4-2042"}]',
    bee4_customers_v2: '[{"id":"cust-ananya"}]',
    bee4_returns: '[{"id":"rma-1041"}]',
    bee4_mock_seeded: 'true',
    bee4_cart_v3: '[{"productId":"bee4-karakuri-trick-box"}]',
    bee4_theme_mode_v1: 'aurora',
  });

  const firstRun = runProductionCleanMigration(storage);
  assert.equal(firstRun, true);
  assert.equal(storage.getItem(PRODUCTION_CLEAN_VERSION_KEY), '1');
  for (const key of TEST_STORAGE_KEYS_TO_PURGE) {
    assert.equal(storage.getItem(key), null, `Expected ${key} to be purged`);
  }
  assert.ok(storage.getItem('bee4_cart_v3'));
  assert.equal(storage.getItem('bee4_theme_mode_v1'), 'aurora');

  // Re-running migration should NOT erase subsequent real data stored under bee4_orders_v3
  storage.setItem('bee4_orders_v3', '[{"orderNumber":"BEE4-REAL-1"}]');
  const secondRun = runProductionCleanMigration(storage);
  assert.equal(secondRun, false);
  assert.equal(storage.getItem('bee4_orders_v3'), '[{"orderNumber":"BEE4-REAL-1"}]');
});

test('clearAllLocalTestCaches removes all transactional keys while preserving clean flag', () => {
  const storage = createMemoryStorage({
    [PRODUCTION_CLEAN_VERSION_KEY]: '1',
    bee4_orders_v3: '[{"orderNumber":"BEE4-1"}]',
    bee4_product_reviews_v1: '[{"id":"rev-1"}]',
  });
  clearAllLocalTestCaches(storage);
  assert.equal(storage.getItem('bee4_orders_v3'), null);
  assert.equal(storage.getItem('bee4_product_reviews_v1'), null);
  assert.equal(storage.getItem(PRODUCTION_CLEAN_VERSION_KEY), '1');
});
