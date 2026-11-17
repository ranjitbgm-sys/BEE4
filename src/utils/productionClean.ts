export const PRODUCTION_CLEAN_VERSION_KEY = 'bee4_production_clean_v1';

export const TEST_STORAGE_KEYS_TO_PURGE: readonly string[] = [
  // Versioned cache keys from previous demo/seeded builds
  'bee4_orders_v3',
  'bee4_returns_v1',
  'bee4_inventory_logs_v1',
  'bee4_inquiries_v1',
  'bee4_customer_messages_v1',
  'bee4_product_reviews_v1',
  'bee4_testimonials_v2',
  'bee4_customers_v2',
  'bee4_print_jobs_v1',
  'bee4_admin_logs_v1',
  'bee4_coupons_v1',
  'bee4_current_customer_id_v1',
  'bee4_customer_flags_v1',
  'bee4_ad_spend_v1',
  // Legacy unversioned keys
  'bee4_orders',
  'bee4_returns',
  'bee4_messages',
  'bee4_reviews',
  'bee4_customers',
  'bee4_mock_seeded',
];

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Runs a one-time clean-slate migration on app startup so legacy mock/demo
 * transactions, reviews, inquiries, and fake customer profiles in localStorage
 * are permanently wiped while keeping real storefront settings and cart intact.
 */
export function runProductionCleanMigration(storage?: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    if (storage.getItem(PRODUCTION_CLEAN_VERSION_KEY) === '1') {
      return false;
    }
    for (const key of TEST_STORAGE_KEYS_TO_PURGE) {
      storage.removeItem(key);
    }
    storage.setItem(PRODUCTION_CLEAN_VERSION_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Explicit cache clear used by Admin Studio -> Settings -> Reset & Purge Test Data.
 */
export function clearAllLocalTestCaches(storage?: StorageLike | null): void {
  if (!storage) return;
  try {
    for (const key of TEST_STORAGE_KEYS_TO_PURGE) {
      storage.removeItem(key);
    }
    storage.setItem(PRODUCTION_CLEAN_VERSION_KEY, '1');
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
}
