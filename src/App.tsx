/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseAdminUser, supabaseDiagnostics } from './lib/supabase';
import {
  addTestimonialToSupabase,
  createOrderInSupabase,
  createReturnRequestInSupabase,
  deleteCouponFromSupabase,
  deleteProductFromSupabase,
  ensureSupabaseCustomerProfile,
  onSupabaseAuthChange,
  saveCouponToSupabase,
  saveFilamentSpoolToSupabase,
  savePrintJobToSupabase,
  saveProductToSupabase,
  saveStoreSettingsToSupabase,
  seedSupabaseDataAsAdmin,
  signInWithGoogleSupabase,
  signOutFromSupabase,
  submitInquiryToSupabase,
  subscribeAdminAuditLogs,
  subscribeAllInquiriesAdmin,
  subscribeAllOrdersAdmin,
  subscribeAllReturnsAdmin,
  subscribeCoupons,
  subscribeFilamentSpoolsAdmin,
  subscribeInventoryAdjustmentsAdmin,
  subscribePrintJobsAdmin,
  subscribePublicProducts,
  subscribePublicSettings,
  subscribePublicTestimonials,
  subscribeUserOrders,
  subscribeUserReturns,
  toggleInquiryStatusInSupabase,
  updateOrderLogisticsInSupabase,
  updateOrderRefundInSupabase,
  updateOrderStatusInSupabase,
  updateReturnRequestInSupabase,
  updateSupabaseCustomerProfile,
  writeAdminAuditLogToSupabase,
  writeInventoryAdjustmentToSupabase,
} from './services/supabaseStoreService';
import {
  DEFAULT_STORE_SETTINGS,
  INITIAL_ADMIN_LOGS,
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_DEMO_RETURN_ORDERS,
  INITIAL_FILAMENT_SPOOLS,
  INITIAL_INQUIRIES,
  INITIAL_INVENTORY_LOGS,
  INITIAL_ORDERS,
  INITIAL_PRINT_JOBS,
  INITIAL_PRODUCTS,
  INITIAL_RETURNS,
  INITIAL_TESTIMONIALS,
  hydrateProductAdminFields,
} from './data/catalog';
import {
  AdminAuditLog,
  AdminModuleRoute,
  AgeGroup,
  CartItem,
  CouponRecord,
  CrmCustomerFlag,
  CustomerInquiry,
  CustomerProfile,
  FilamentSpool,
  FulfillmentStage,
  GiftOccasion,
  InventoryAdjustmentRecord,
  OrderRecord,
  OrderStatus,
  PrintJobRecord,
  Product,
  ProductCategory,
  ReturnRequestRecord,
  SavedAddress,
  SortOption,
  StorePage,
  StoreSettings,
  Testimonial,
  ThemeMode,
} from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { HomeView } from './components/HomeView';
import { ShopView } from './components/ShopView';
import { GiftIdeasView } from './components/GiftIdeasView';
import { ProductDetailView } from './components/ProductDetailView';
import { ProductQuickViewModal } from './components/ProductQuickViewModal';
import { CheckoutView } from './components/CheckoutView';
import { AboutView, ContactView } from './components/AboutContactView';
import { AdminPanelView } from './components/AdminPanelView';
import { AdminGuard } from './components/admin/AdminGuard';
import { CustomerAccountView } from './components/CustomerAccountView';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { resolveExpectedAdminHash } from './utils/adminAuth';
import { mapFulfillmentStageToOrderStatus } from './utils/adminLogic';
import { applyRmaTransitionSync, RmaTransitionUpdates } from './utils/rmaLogic';
import { applyDocumentSeoMetadata, resolvePageSeoMetadata } from './utils/seoMeta';
import { hydrateCustomersWithStarterHashes } from './utils/storeLogic';

const STORAGE_PRODUCTS_KEY = 'bee4_products_v3';
const STORAGE_CART_KEY = 'bee4_cart_v1';
const STORAGE_ORDERS_KEY = 'bee4_orders_v3';
const STORAGE_RETURNS_KEY = 'bee4_returns_v1';
const STORAGE_INVENTORY_LOGS_KEY = 'bee4_inventory_logs_v1';
const STORAGE_INQUIRIES_KEY = 'bee4_inquiries_v1';
const STORAGE_SETTINGS_KEY = 'bee4_settings_v3';
const STORAGE_TESTIMONIALS_KEY = 'bee4_testimonials_v2';
const STORAGE_CUSTOMERS_KEY = 'bee4_customers_v2';
const STORAGE_CURRENT_CUSTOMER_ID_KEY = 'bee4_current_customer_id_v1';
const STORAGE_GUEST_WISHLIST_KEY = 'bee4_guest_wishlist_v1';
const STORAGE_ADMIN_PASS_HASH_KEY = 'bee4_admin_pass_hash_v1';
const STORAGE_THEME_KEY = 'bee4_theme_v1';
const STORAGE_COUPONS_KEY = 'bee4_coupons_v1';
const STORAGE_PRINT_JOBS_KEY = 'bee4_print_jobs_v1';
const STORAGE_SPOOLS_KEY = 'bee4_filament_spools_v1';
const STORAGE_AUDIT_LOGS_KEY = 'bee4_admin_logs_v1';
const STORAGE_CRM_FLAGS_KEY = 'bee4_crm_flags_v1';
const SESSION_ADMIN_TOKEN_KEY = 'bee4_admin_session_v1';

const ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

const VALID_ADMIN_MODULES = new Set<AdminModuleRoute>([
  'dashboard',
  'orders',
  'returns',
  'products',
  'inventory',
  'discounts',
  'customers',
  'settings',
]);

const VALID_CATEGORIES = new Set<string>([
  ProductCategory.ENGINEERING,
  ProductCategory.MATHS_SCIENCE,
  ProductCategory.MOTOR_SKILLS,
  ProductCategory.IMAGINATION,
]);

function parseAdminRouteFromLocation(): { isAdminPath: boolean; module: AdminModuleRoute } {
  if (typeof window === 'undefined') {
    return { isAdminPath: false, module: 'dashboard' };
  }
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(search);
  const cleanPath = pathname.replace(/\/+$/, '');
  const isAdminUrlPath = cleanPath === '/admin' || cleanPath.startsWith('/admin/');
  const isAdminTrigger = isAdminUrlPath || hash === '#admin' || params.get('admin') === '1';

  let module: AdminModuleRoute = 'dashboard';
  if (cleanPath.startsWith('/admin/')) {
    const seg = cleanPath.slice('/admin/'.length).split('/')[0] as AdminModuleRoute;
    if (VALID_ADMIN_MODULES.has(seg)) {
      module = seg;
    }
  }
  return { isAdminPath: isAdminTrigger, module };
}

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(() => {
    const stored = loadStoredJson<Product[]>(STORAGE_PRODUCTS_KEY, INITIAL_PRODUCTS);
    if (!Array.isArray(stored) || stored.length === 0) {
      return INITIAL_PRODUCTS.map((p, idx) => hydrateProductAdminFields(p, idx));
    }
    const valid = stored.filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        VALID_CATEGORIES.has(p.category) &&
        Array.isArray(p.gallery) &&
        p.gallery.length === 3
    );
    const source = valid.length > 0 ? valid : INITIAL_PRODUCTS;
    return source.map((p, idx) => hydrateProductAdminFields(p, idx));
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_THEME_KEY);
      return saved === 'aurora' ? 'aurora' : 'daylight';
    } catch {
      return 'daylight';
    }
  });
  const [cart, setCart] = useState<CartItem[]>(() =>
    loadStoredJson<CartItem[]>(STORAGE_CART_KEY, [])
  );
  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    const starterOrders: OrderRecord[] = [...INITIAL_ORDERS, ...INITIAL_DEMO_RETURN_ORDERS];
    const stored = loadStoredJson<OrderRecord[]>(STORAGE_ORDERS_KEY, starterOrders);
    if (!Array.isArray(stored) || stored.length === 0) return starterOrders;
    const existingSet = new Set(stored.map((o) => o.orderNumber));
    const missingSeed = starterOrders.filter((o) => !existingSet.has(o.orderNumber));
    return [...stored, ...missingSeed];
  });
  const [returns, setReturns] = useState<ReturnRequestRecord[]>(() =>
    loadStoredJson<ReturnRequestRecord[]>(STORAGE_RETURNS_KEY, INITIAL_RETURNS)
  );
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustmentRecord[]>(
    () => loadStoredJson<InventoryAdjustmentRecord[]>(STORAGE_INVENTORY_LOGS_KEY, INITIAL_INVENTORY_LOGS)
  );
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(() =>
    loadStoredJson<CustomerInquiry[]>(STORAGE_INQUIRIES_KEY, INITIAL_INQUIRIES)
  );
  const [settings, setSettings] = useState<StoreSettings>(() => ({
    ...DEFAULT_STORE_SETTINGS,
    ...loadStoredJson<StoreSettings>(STORAGE_SETTINGS_KEY, DEFAULT_STORE_SETTINGS),
  }));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() =>
    loadStoredJson<Testimonial[]>(STORAGE_TESTIMONIALS_KEY, INITIAL_TESTIMONIALS)
  );
  const [customers, setCustomers] = useState<CustomerProfile[]>(() =>
    hydrateCustomersWithStarterHashes(
      loadStoredJson<CustomerProfile[]>(STORAGE_CUSTOMERS_KEY, INITIAL_CUSTOMERS),
      INITIAL_CUSTOMERS
    )
  );
  const [coupons, setCoupons] = useState<CouponRecord[]>(() =>
    loadStoredJson<CouponRecord[]>(STORAGE_COUPONS_KEY, INITIAL_COUPONS)
  );
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>(() =>
    loadStoredJson<PrintJobRecord[]>(STORAGE_PRINT_JOBS_KEY, INITIAL_PRINT_JOBS)
  );
  const [spools, setSpools] = useState<FilamentSpool[]>(() =>
    loadStoredJson<FilamentSpool[]>(STORAGE_SPOOLS_KEY, INITIAL_FILAMENT_SPOOLS)
  );
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() =>
    loadStoredJson<AdminAuditLog[]>(STORAGE_AUDIT_LOGS_KEY, INITIAL_ADMIN_LOGS)
  );
  const [crmFlagsByPhone, setCrmFlagsByPhone] = useState<Record<string, CrmCustomerFlag>>(() =>
    loadStoredJson<Record<string, CrmCustomerFlag>>(STORAGE_CRM_FLAGS_KEY, {})
  );
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(() =>
    loadStoredJson<string | null>(STORAGE_CURRENT_CUSTOMER_ID_KEY, null)
  );
  const [guestWishlistIds, setGuestWishlistIds] = useState<string[]>(() =>
    loadStoredJson<string[]>(STORAGE_GUEST_WISHLIST_KEY, [])
  );
  const [storedAdminHash, setStoredAdminHash] = useState<string>(() =>
    loadStoredJson<string>(STORAGE_ADMIN_PASS_HASH_KEY, '')
  );

  const expectedAdminHash = resolveExpectedAdminHash(
    storedAdminHash,
    import.meta.env?.VITE_ADMIN_PASSWORD_HASH
  );

  const [adminSessionToken, setAdminSessionToken] = useState<string>(() => {
    try {
      return window.sessionStorage.getItem(SESSION_ADMIN_TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const isAdminAuthenticated = adminSessionToken === expectedAdminHash;
  const [inactivityNotice, setInactivityNotice] = useState('');

  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [supabaseAuthReady, setSupabaseAuthReady] = useState(false);
  const [supabaseCustomer, setSupabaseCustomer] = useState<CustomerProfile | null>(null);
  const isSupabaseAdmin = isSupabaseAdminUser(supabaseUser);
  const guestWishlistRef = useRef<string[]>(guestWishlistIds);
  guestWishlistRef.current = guestWishlistIds;

  const initialAdminRoute = useMemo(() => parseAdminRouteFromLocation(), []);

  const [activeAdminModule, setActiveAdminModule] = useState<AdminModuleRoute>(
    initialAdminRoute.module
  );

  const [activePage, setActivePage] = useState<StorePage>(() => {
    if (typeof window !== 'undefined') {
      if (initialAdminRoute.isAdminPath) {
        return 'manager';
      }
      const params = new URLSearchParams(window.location.search);
      const productParam = params.get('product');
      if (productParam && INITIAL_PRODUCTS.some((p) => p.id === productParam)) {
        return 'product';
      }
      const pageParam = params.get('page');
      if (
        pageParam === 'shop' ||
        pageParam === 'gifts' ||
        pageParam === 'about' ||
        pageParam === 'contact' ||
        pageParam === 'account'
      ) {
        return pageParam;
      }
      if (params.get('category') || params.get('age')) {
        return 'shop';
      }
    }
    return 'home';
  });
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const productParam = new URLSearchParams(window.location.search).get('product');
      if (productParam && INITIAL_PRODUCTS.some((p) => p.id === productParam)) {
        return productParam;
      }
    }
    return INITIAL_PRODUCTS[0].id;
  });
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync Daylight / Dark Aurora theme class & persistence
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', theme === 'aurora');
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Track Supabase Authentication readiness
  useEffect(() => {
    const unsubscribe = onSupabaseAuthChange((sbUser) => {
      setSupabaseUser(sbUser);
      setSupabaseAuthReady(true);
      if (!sbUser) {
        setSupabaseCustomer(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Public Supabase Postgres & Realtime listeners for catalog, store settings, testimonials & coupons
  useEffect(() => {
    if (!supabaseDiagnostics.isConfigured) return;
    const unsubProducts = subscribePublicProducts((cloudProducts) => {
      setProducts(cloudProducts.map((p, idx) => hydrateProductAdminFields(p, idx)));
    });
    const unsubSettings = subscribePublicSettings((cloudSettings) => {
      setSettings((prev) => ({ ...prev, ...cloudSettings }));
    });
    const unsubTestimonials = subscribePublicTestimonials((cloudTestimonials) => {
      setTestimonials(cloudTestimonials);
    });
    const unsubCoupons = subscribeCoupons((cloudCoupons) => {
      setCoupons(cloudCoupons);
    });
    return () => {
      unsubProducts();
      unsubSettings();
      unsubTestimonials();
      unsubCoupons();
    };
  }, []);

  // Authenticated Supabase user profile + orders sync
  useEffect(() => {
    if (!supabaseAuthReady || !supabaseUser || !supabaseDiagnostics.isConfigured) return;

    let cancelled = false;
    void ensureSupabaseCustomerProfile(supabaseUser, guestWishlistRef.current)
      .then(({ profile }) => {
        if (cancelled) return;
        setSupabaseCustomer(profile);
        if (guestWishlistRef.current.length > 0) {
          setGuestWishlistIds([]);
        }
      })
      .catch((err) => {
        console.error(err);
      });

    const unsubUserOrders = subscribeUserOrders(supabaseUser.id, (cloudOrders) => {
      setOrders((prev) => {
        const cloudIds = new Set(cloudOrders.map((o) => o.orderNumber));
        const localRemaining = prev.filter((o) => !cloudIds.has(o.orderNumber));
        return [...cloudOrders, ...localRemaining];
      });
    });

    const unsubUserReturns = subscribeUserReturns(supabaseUser.id, (cloudReturns) => {
      setReturns((prev) => {
        const cloudIds = new Set(cloudReturns.map((r) => r.id));
        const localRemaining = prev.filter((r) => !cloudIds.has(r.id));
        return [...cloudReturns, ...localRemaining];
      });
    });

    return () => {
      cancelled = true;
      unsubUserOrders();
      unsubUserReturns();
    };
  }, [supabaseAuthReady, supabaseUser]);

  // Verified Admin Supabase Realtime sync (orders, returns, inquiries, 3D print queue, spools, audit logs)
  useEffect(() => {
    if (!supabaseAuthReady || !supabaseUser || !isSupabaseAdmin || !supabaseDiagnostics.isConfigured) {
      return;
    }

    const unsubAdminOrders = subscribeAllOrdersAdmin((cloudOrders) => {
      setOrders((prev) => {
        const cloudIds = new Set(cloudOrders.map((o) => o.orderNumber));
        const localOnly = prev.filter((o) => !cloudIds.has(o.orderNumber));
        return [...cloudOrders, ...localOnly];
      });
    });

    const unsubAdminReturns = subscribeAllReturnsAdmin((cloudReturns) => {
      setReturns((prev) => {
        const cloudIds = new Set(cloudReturns.map((r) => r.id));
        const localOnly = prev.filter((r) => !cloudIds.has(r.id));
        return [...cloudReturns, ...localOnly];
      });
    });

    const unsubInventoryAdjustments = subscribeInventoryAdjustmentsAdmin((cloudAdjustments) => {
      setInventoryAdjustments((prev) => {
        const cloudIds = new Set(cloudAdjustments.map((a) => a.id));
        const localOnly = prev.filter((a) => !cloudIds.has(a.id));
        return [...cloudAdjustments, ...localOnly].slice(0, 80);
      });
    });

    const unsubAdminInquiries = subscribeAllInquiriesAdmin((cloudInquiries) => {
      setInquiries((prev) => {
        const cloudIds = new Set(cloudInquiries.map((i) => i.id));
        const localOnly = prev.filter((i) => !cloudIds.has(i.id));
        return [...cloudInquiries, ...localOnly];
      });
    });

    const unsubPrintJobs = subscribePrintJobsAdmin((cloudJobs) => {
      setPrintJobs(cloudJobs);
    });

    const unsubSpools = subscribeFilamentSpoolsAdmin((cloudSpools) => {
      setSpools(cloudSpools);
    });

    const unsubLogs = subscribeAdminAuditLogs((cloudLogs) => {
      setAuditLogs(cloudLogs);
    });

    return () => {
      unsubAdminOrders();
      unsubAdminReturns();
      unsubInventoryAdjustments();
      unsubAdminInquiries();
      unsubPrintJobs();
      unsubSpools();
      unsubLogs();
    };
  }, [supabaseAuthReady, supabaseUser, isSupabaseAdmin]);

  // Sync URL navigation (/admin/*, #admin, ?admin=1, browser back/forward)
  useEffect(() => {
    const syncRoute = () => {
      const parsed = parseAdminRouteFromLocation();
      if (parsed.isAdminPath) {
        setActivePage('manager');
        setActiveAdminModule(parsed.module);
      } else if (activePage === 'manager') {
        setActivePage('home');
      }
    };
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, [activePage]);

  // LocalStorage persistence hooks
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(products));
    } catch {
      // Ignore quota errors
    }
  }, [products]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CART_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
    } catch {
      // Ignore storage errors
    }
  }, [orders]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_RETURNS_KEY, JSON.stringify(returns));
    } catch {
      // Ignore storage errors
    }
  }, [returns]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_INVENTORY_LOGS_KEY,
        JSON.stringify(inventoryAdjustments)
      );
    } catch {
      // Ignore storage errors
    }
  }, [inventoryAdjustments]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_INQUIRIES_KEY, JSON.stringify(inquiries));
    } catch {
      // Ignore storage errors
    }
  }, [inquiries]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
  }, [settings]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_TESTIMONIALS_KEY, JSON.stringify(testimonials));
    } catch {
      // Ignore storage errors
    }
  }, [testimonials]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CUSTOMERS_KEY, JSON.stringify(customers));
    } catch {
      // Ignore storage errors
    }
  }, [customers]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_COUPONS_KEY, JSON.stringify(coupons));
    } catch {
      // Ignore storage errors
    }
  }, [coupons]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRINT_JOBS_KEY, JSON.stringify(printJobs));
    } catch {
      // Ignore storage errors
    }
  }, [printJobs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_SPOOLS_KEY, JSON.stringify(spools));
    } catch {
      // Ignore storage errors
    }
  }, [spools]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_AUDIT_LOGS_KEY, JSON.stringify(auditLogs));
    } catch {
      // Ignore storage errors
    }
  }, [auditLogs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_CRM_FLAGS_KEY, JSON.stringify(crmFlagsByPhone));
    } catch {
      // Ignore storage errors
    }
  }, [crmFlagsByPhone]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_CURRENT_CUSTOMER_ID_KEY,
        JSON.stringify(currentCustomerId)
      );
    } catch {
      // Ignore storage errors
    }
  }, [currentCustomerId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_GUEST_WISHLIST_KEY, JSON.stringify(guestWishlistIds));
    } catch {
      // Ignore storage errors
    }
  }, [guestWishlistIds]);

  useEffect(() => {
    try {
      if (storedAdminHash) {
        window.localStorage.setItem(STORAGE_ADMIN_PASS_HASH_KEY, JSON.stringify(storedAdminHash));
      }
    } catch {
      // Ignore storage errors
    }
  }, [storedAdminHash]);

  // Shop filter state
  const [shopCategory, setShopCategory] = useState<ProductCategory>(() => {
    if (typeof window !== 'undefined') {
      const rawCat = new URLSearchParams(window.location.search).get('category');
      if (rawCat && VALID_CATEGORIES.has(rawCat)) {
        return rawCat as ProductCategory;
      }
    }
    return ProductCategory.ALL;
  });
  const [shopAgeGroup, setShopAgeGroup] = useState<AgeGroup>(() => {
    if (typeof window !== 'undefined') {
      const rawAge = new URLSearchParams(window.location.search).get('age');
      if (
        rawAge === AgeGroup.AGE_3_5 ||
        rawAge === AgeGroup.AGE_6_8 ||
        rawAge === AgeGroup.AGE_9_11 ||
        rawAge === AgeGroup.AGE_12_15
      ) {
        return rawAge;
      }
    }
    return AgeGroup.ALL;
  });
  const [shopOccasion, setShopOccasion] = useState<GiftOccasion>(GiftOccasion.ALL);
  const [shopSearch, setShopSearch] = useState('');
  const [shopMaxPrice, setShopMaxPrice] = useState<number | null>(null);
  const [shopInStockOnly, setShopInStockOnly] = useState<boolean>(false);
  const [shopSortBy, setShopSortBy] = useState<SortOption>('featured');
  const [giftFinderOccasion, setGiftFinderOccasion] = useState<GiftOccasion>(GiftOccasion.ALL);

  const handleUnlockAdmin = useCallback(() => {
    setInactivityNotice('');
    setAdminSessionToken(expectedAdminHash);
    try {
      window.sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, expectedAdminHash);
    } catch {
      // Ignore storage errors
    }
  }, [expectedAdminHash]);

  const handleLockAdmin = useCallback(() => {
    setAdminSessionToken('');
    try {
      window.sessionStorage.removeItem(SESSION_ADMIN_TOKEN_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Enterprise 30-Minute Idle Auto-Lock for Admin Session
  useEffect(() => {
    if (activePage !== 'manager' || !isAdminAuthenticated) return;

    let idleTimer: number | undefined;
    const resetIdleTimer = () => {
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
      }
      idleTimer = window.setTimeout(() => {
        handleLockAdmin();
        setInactivityNotice(
          'Admin session auto-locked after 30 minutes of inactivity. Please re-authenticate.'
        );
        if (supabaseUser) {
          void signOutFromSupabase().catch(() => {});
        }
      }, ADMIN_INACTIVITY_TIMEOUT_MS);
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ];
    events.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (idleTimer !== undefined) {
        window.clearTimeout(idleTimer);
      }
      events.forEach((evt) => window.removeEventListener(evt, resetIdleTimer));
    };
  }, [activePage, isAdminAuthenticated, supabaseUser, handleLockAdmin]);

  const recordAuditLog = useCallback(
    (
      action: string,
      entityType: AdminAuditLog['entityType'],
      entityId: string,
      summary: string
    ) => {
      const adminEmail =
        supabaseUser?.email || supabaseUser?.phone || 'studio-owner@bee4.in';
      const entry: AdminAuditLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        adminEmail,
        action,
        entityType,
        entityId,
        summary,
      };
      setAuditLogs((prev) => [entry, ...prev].slice(0, 120));
      if (isSupabaseAdmin) {
        void writeAdminAuditLogToSupabase({
          id: entry.id,
          adminEmail: entry.adminEmail,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          summary: entry.summary,
        }).catch(() => {});
      }
    },
    [supabaseUser, isSupabaseAdmin]
  );

  const handleChangeAdminPasswordHash = (nextHash: string) => {
    setStoredAdminHash(nextHash);
    setAdminSessionToken(nextHash);
    try {
      window.sessionStorage.setItem(SESSION_ADMIN_TOKEN_KEY, nextHash);
    } catch {
      // Ignore storage errors
    }
    recordAuditLog(
      'ADMIN_PASSPHRASE_ROTATED',
      'auth',
      'studio-key',
      'Rotated BEE4 Studio owner passphrase hash.'
    );
  };

  const navigateTo = (page: StorePage) => {
    setActivePage(page);
    if (typeof window !== 'undefined') {
      if (page === 'manager') {
        const targetPath =
          activeAdminModule === 'dashboard' ? '/admin' : `/admin/${activeAdminModule}`;
        if (!window.location.pathname.startsWith('/admin')) {
          window.history.pushState(null, '', targetPath);
        }
      } else {
        const params = new URLSearchParams(window.location.search);
        if (params.has('admin')) params.delete('admin');
        const query = params.toString();
        const nextUrl =
          window.location.pathname.startsWith('/admin')
            ? `/${query ? `?${query}` : ''}`
            : window.location.pathname + (query ? `?${query}` : '');
        if (
          window.location.pathname.startsWith('/admin') ||
          window.location.hash === '#admin' ||
          new URLSearchParams(window.location.search).has('admin')
        ) {
          window.history.pushState(null, '', nextUrl);
        }
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectAdminModule = (module: AdminModuleRoute) => {
    setActiveAdminModule(module);
    setActivePage('manager');
    if (typeof window !== 'undefined') {
      const targetPath = module === 'dashboard' ? '/admin' : `/admin/${module}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, '', targetPath);
      }
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId);
    navigateTo('product');
  };

  const handleAddToCart = (
    product: Product,
    variant: string,
    quantity: number,
    openDrawer: boolean
  ) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.variant === variant
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + quantity,
        };
        return next;
      }
      return [
        ...prev,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          image: product.image,
          variant,
          quantity,
          category: product.category,
        },
      ];
    });

    if (openDrawer) {
      setIsCartOpen(true);
    }
  };

  const handleQuickAdd = (product: Product) => {
    handleAddToCart(product, product.variants[0] ?? 'Standard Edition', 1, false);
  };

  const handleBuyNow = (product: Product, variant: string, quantity: number) => {
    handleAddToCart(product, variant, quantity, false);
    navigateTo('checkout');
  };

  const handleUpdateCartQuantity = (productId: string, variant: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.productId === productId && item.variant === variant
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveCartItem = (productId: string, variant: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.productId === productId && item.variant === variant))
    );
  };

  const handleOrderComplete = (order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
    setCart([]);
    if (order.couponCode) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code.toUpperCase() === order.couponCode?.toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        )
      );
    }
    if (supabaseDiagnostics.isConfigured) {
      void createOrderInSupabase(order, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
  };

  const handleSaveProduct = (saved: Product) => {
    const hydrated = hydrateProductAdminFields(saved, products.length);
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === hydrated.id);
      if (exists) {
        return prev.map((p) => (p.id === hydrated.id ? hydrated : p));
      }
      return [hydrated, ...prev];
    });
    if (isSupabaseAdmin) {
      void saveProductToSupabase(hydrated).catch((err) => console.error(err));
    }
    recordAuditLog(
      'PRODUCT_SAVED',
      'product',
      hydrated.sku || hydrated.id,
      `Saved product "${hydrated.title}" (₹${hydrated.price}, Stock: ${hydrated.stockQuantity ?? 0}, Status: ${hydrated.status ?? 'Active'}).`
    );
  };

  const handleAdjustProductStock = (productId: string, nextQuantity: number) => {
    const safeQty = Math.max(0, Math.round(nextQuantity));
    let updatedProduct: Product | undefined;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          updatedProduct = {
            ...p,
            stockQuantity: safeQty,
            inStock: safeQty > 0,
          };
          return updatedProduct;
        }
        return p;
      })
    );
    if (isSupabaseAdmin && updatedProduct) {
      void saveProductToSupabase(updatedProduct).catch((err) => console.error(err));
    }
    if (updatedProduct) {
      recordAuditLog(
        'STOCK_ADJUSTED',
        'inventory',
        updatedProduct.sku || productId,
        `Adjusted stock for "${updatedProduct.title}" to ${safeQty} units.`
      );
    }
  };

  const handleDeleteProduct = (productId: string) => {
    const target = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    if (isSupabaseAdmin) {
      void deleteProductFromSupabase(productId).catch((err) => console.error(err));
    }
    recordAuditLog(
      'PRODUCT_DELETED',
      'product',
      target?.sku || productId,
      `Deleted product "${target?.title || productId}" from catalog.`
    );
  };

  const handleResetCatalog = () => {
    const seeded = INITIAL_PRODUCTS.map((p, idx) => hydrateProductAdminFields(p, idx));
    setProducts(seeded);
    if (isSupabaseAdmin) {
      void Promise.all(seeded.map((p) => saveProductToSupabase(p))).catch((err) =>
        console.error(err)
      );
    }
    recordAuditLog(
      'CATALOG_RESET',
      'product',
      'all',
      'Restored all 16 starter BEE4 products to catalog.'
    );
  };

  const handleUpdateSettings = (next: StoreSettings) => {
    setSettings(next);
    if (isSupabaseAdmin) {
      void saveStoreSettingsToSupabase(next).catch((err) => console.error(err));
    }
    recordAuditLog(
      'SETTINGS_PUBLISHED',
      'settings',
      'main',
      `Published storefront CMS & fee settings (Free Ship: ₹${next.freeShippingThreshold}, Promo: ${next.promoCode}).`
    );
  };

  const handleUpdateOrderStatus = (orderNumber: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => (order.orderNumber === orderNumber ? { ...order, status } : order))
    );
    if (supabaseDiagnostics.isConfigured) {
      void updateOrderStatusInSupabase(orderNumber, status).catch((err) => console.error(err));
    }
  };

  const handleUpdateOrderLogistics = (
    orderNumber: string,
    updates: {
      fulfillmentStage: FulfillmentStage;
      courierPartner?: string;
      awbNumber?: string;
      trackingUrl?: string;
      internalNotes?: string;
    }
  ) => {
    const mappedStatus = mapFulfillmentStageToOrderStatus(updates.fulfillmentStage);
    setOrders((prev) =>
      prev.map((order) =>
        order.orderNumber === orderNumber
          ? {
              ...order,
              status: mappedStatus,
              fulfillmentStage: updates.fulfillmentStage,
              courierPartner: updates.courierPartner,
              awbNumber: updates.awbNumber,
              trackingUrl: updates.trackingUrl,
              internalNotes: updates.internalNotes,
            }
          : order
      )
    );
    if (isSupabaseAdmin) {
      void updateOrderLogisticsInSupabase(orderNumber, {
        status: mappedStatus,
        fulfillmentStage: updates.fulfillmentStage,
        courierPartner: updates.courierPartner,
        awbNumber: updates.awbNumber,
        trackingUrl: updates.trackingUrl,
        internalNotes: updates.internalNotes,
      }).catch((err) => console.error(err));
    }
    recordAuditLog(
      'ORDER_LOGISTICS_UPDATED',
      'order',
      orderNumber,
      `Stage -> ${updates.fulfillmentStage}${updates.courierPartner ? ` · ${updates.courierPartner} ${updates.awbNumber || ''}` : ''}`
    );
  };

  const handleCreateReturnRequest = (rma: ReturnRequestRecord) => {
    setReturns((prev) => [rma, ...prev]);
    if (supabaseDiagnostics.isConfigured) {
      void createReturnRequestInSupabase(rma, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
    recordAuditLog(
      'RMA_REQUESTED',
      'rma',
      rma.rmaNumber,
      `Customer requested ${rma.resolutionType} for Order ${rma.orderNumber} (${rma.reason}).`
    );
  };

  const handleUpdateReturnRequest = (
    prevReturn: ReturnRequestRecord,
    nextUpdates: RmaTransitionUpdates,
    options?: { forceQueuePrint?: boolean }
  ): string => {
    const syncRes = applyRmaTransitionSync({
      prevReturn,
      nextUpdates,
      products,
      orders,
      spools,
      coupons,
      forceQueuePrint: options?.forceQueuePrint,
    });

    setReturns((prev) =>
      prev.map((r) => (r.id === syncRes.updatedReturn.id ? syncRes.updatedReturn : r))
    );
    setProducts(syncRes.updatedProducts);
    setOrders(syncRes.updatedOrders);
    setSpools(syncRes.updatedSpools);

    const newPrintJob = syncRes.newPrintJob;
    if (newPrintJob) {
      setPrintJobs((prev) => [newPrintJob, ...prev]);
    }
    const newCoupon = syncRes.newCoupon;
    if (newCoupon) {
      setCoupons((prev) => [newCoupon, ...prev]);
    }
    if (syncRes.inventoryAdjustments.length > 0) {
      setInventoryAdjustments((prev) =>
        [...syncRes.inventoryAdjustments, ...prev].slice(0, 80)
      );
    }

    if (isSupabaseAdmin) {
      void updateReturnRequestInSupabase(syncRes.updatedReturn).catch((err) => console.error(err));

      if (syncRes.inventoryAdjustments.length > 0) {
        const affectedProductIds = new Set(syncRes.inventoryAdjustments.map((a) => a.productId));
        for (const p of syncRes.updatedProducts) {
          if (affectedProductIds.has(p.id)) {
            void saveProductToSupabase(p).catch((err) => console.error(err));
          }
        }
        for (const entry of syncRes.inventoryAdjustments) {
          void writeInventoryAdjustmentToSupabase(entry).catch((err) => console.error(err));
        }
      }

      if (newPrintJob) {
        void savePrintJobToSupabase(newPrintJob).catch((err) => console.error(err));
        for (const sp of syncRes.updatedSpools) {
          void saveFilamentSpoolToSupabase(sp).catch((err) => console.error(err));
        }
      }

      if (newCoupon) {
        void saveCouponToSupabase(newCoupon).catch((err) => console.error(err));
      }

      if (syncRes.updatedReturn.status === 'Refund Completed') {
        const updatedParentOrder = syncRes.updatedOrders.find(
          (o) => o.orderNumber === syncRes.updatedReturn.orderNumber
        );
        if (updatedParentOrder) {
          void updateOrderRefundInSupabase(
            updatedParentOrder.orderNumber,
            updatedParentOrder.refundStatus,
            updatedParentOrder.refundedAmount ?? 0
          ).catch((err) => console.error(err));
        }
      }
    }

    recordAuditLog(
      'RMA_UPDATED',
      'rma',
      syncRes.updatedReturn.rmaNumber,
      syncRes.auditSummary
    );
    return syncRes.auditSummary;
  };

  const handleSaveCoupon = (coupon: CouponRecord) => {
    setCoupons((prev) => {
      const exists = prev.some((c) => c.id === coupon.id);
      if (exists) {
        return prev.map((c) => (c.id === coupon.id ? coupon : c));
      }
      return [coupon, ...prev];
    });
    if (isSupabaseAdmin) {
      void saveCouponToSupabase(coupon).catch((err) => console.error(err));
    }
    recordAuditLog(
      'COUPON_SAVED',
      'coupon',
      coupon.code,
      `Saved coupon ${coupon.code} (${coupon.discountType === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`}, ${coupon.active ? 'Active' : 'Paused'}).`
    );
  };

  const handleDeleteCoupon = (couponId: string) => {
    const target = coupons.find((c) => c.id === couponId);
    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    if (isSupabaseAdmin) {
      void deleteCouponFromSupabase(couponId).catch((err) => console.error(err));
    }
    recordAuditLog(
      'COUPON_DELETED',
      'coupon',
      target?.code || couponId,
      `Deleted coupon ${target?.code || couponId}.`
    );
  };

  const handleSavePrintJob = (job: PrintJobRecord) => {
    setPrintJobs((prev) => {
      const exists = prev.some((j) => j.id === job.id);
      if (exists) {
        return prev.map((j) => (j.id === job.id ? job : j));
      }
      return [job, ...prev];
    });
    if (isSupabaseAdmin) {
      void savePrintJobToSupabase(job).catch((err) => console.error(err));
    }
    recordAuditLog(
      'PRINT_JOB_UPDATED',
      'inventory',
      job.id,
      `3D Print batch "${job.productTitle}" (×${job.batchQty}) -> ${job.stage}.`
    );
  };

  const handleSaveFilamentSpool = (spool: FilamentSpool) => {
    setSpools((prev) => {
      const exists = prev.some((s) => s.id === spool.id);
      if (exists) {
        return prev.map((s) => (s.id === spool.id ? spool : s));
      }
      return [spool, ...prev];
    });
    if (isSupabaseAdmin) {
      void saveFilamentSpoolToSupabase(spool).catch((err) => console.error(err));
    }
    recordAuditLog(
      'SPOOL_UPDATED',
      'inventory',
      spool.id,
      `Updated spool "${spool.name}" to ${spool.remainingGrams}g remaining.`
    );
  };

  const handleSetCustomerFlag = (phoneKey: string, flag: CrmCustomerFlag) => {
    setCrmFlagsByPhone((prev) => ({ ...prev, [phoneKey]: flag }));
    recordAuditLog(
      'CUSTOMER_CRM_FLAGGED',
      'customer',
      phoneKey,
      `Flagged customer ${phoneKey} as ${flag}.`
    );
  };

  const handleSubmitInquiry = (inquiry: {
    name: string;
    contact: string;
    topic: string;
    message: string;
  }) => {
    const newRecord: CustomerInquiry = {
      id: `inq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...inquiry,
      status: 'New',
    };
    setInquiries((prev) => [newRecord, ...prev]);
    if (supabaseDiagnostics.isConfigured) {
      void submitInquiryToSupabase(newRecord, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
  };

  const handleToggleInquiryStatus = (id: string) => {
    let nextStatus: 'New' | 'Resolved' = 'Resolved';
    setInquiries((prev) =>
      prev.map((inq) => {
        if (inq.id === id) {
          nextStatus = inq.status === 'New' ? 'Resolved' : 'New';
          return { ...inq, status: nextStatus };
        }
        return inq;
      })
    );
    if (isSupabaseAdmin) {
      void toggleInquiryStatusInSupabase(id, nextStatus).catch((err) => console.error(err));
    }
    recordAuditLog(
      'INQUIRY_STATUS_TOGGLED',
      'customer',
      id,
      `Marked inquiry ${id} as ${nextStatus}.`
    );
  };

  const handleAddTestimonial = (testimonial: Testimonial) => {
    setTestimonials((prev) => [testimonial, ...prev]);
    if (supabaseDiagnostics.isConfigured) {
      void addTestimonialToSupabase(testimonial, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
  };

  const localCustomer =
    customers.find((c) => c.id === currentCustomerId && Boolean(c.passwordHash)) ?? null;
  const currentCustomer = supabaseUser ? supabaseCustomer : localCustomer;
  const activeWishlistIds = currentCustomer ? currentCustomer.wishlistIds : guestWishlistIds;

  const handleGoogleSignIn = async () => {
    await signInWithGoogleSupabase(activePage === 'manager' ? '/admin' : '/?page=account');
  };

  const handleSyncCatalogToCloud = async () => {
    if (!supabaseUser || !isSupabaseAdmin) return;
    await seedSupabaseDataAsAdmin({
      products,
      orders,
      coupons,
      settings,
      printJobs,
      spools,
      testimonials,
      returns,
    });
    recordAuditLog(
      'CLOUD_SYNC_COMPLETED',
      'settings',
      'supabase',
      'Synchronized full BEE4 catalog, orders, returns, coupons, 3D print queue, and settings to Supabase Postgres.'
    );
  };

  const handleCustomerSignUp = (newCustomer: CustomerProfile) => {
    setCustomers((prev) => [newCustomer, ...prev]);
    setCurrentCustomerId(newCustomer.id);
    setGuestWishlistIds([]);
  };

  const handleCustomerSignIn = (customerId: string) => {
    if (guestWishlistIds.length > 0) {
      setCustomers((prev) =>
        prev.map((cust) => {
          if (cust.id !== customerId) return cust;
          const merged = Array.from(new Set([...cust.wishlistIds, ...guestWishlistIds]));
          return { ...cust, wishlistIds: merged };
        })
      );
      setGuestWishlistIds([]);
    }
    setCurrentCustomerId(customerId);
  };

  const handleCustomerSignOut = () => {
    setCurrentCustomerId(null);
    setSupabaseCustomer(null);
    if (supabaseUser) {
      void signOutFromSupabase().catch((err) => console.error(err));
    }
  };

  const handleUpdateCustomer = (updated: CustomerProfile) => {
    if (supabaseUser && updated.id === supabaseUser.id) {
      setSupabaseCustomer(updated);
      void updateSupabaseCustomerProfile(updated).catch((err) => console.error(err));
      return;
    }
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleToggleWishlist = (productId: string) => {
    if (currentCustomer) {
      const exists = currentCustomer.wishlistIds.includes(productId);
      const nextIds = exists
        ? currentCustomer.wishlistIds.filter((id) => id !== productId)
        : [productId, ...currentCustomer.wishlistIds];
      handleUpdateCustomer({ ...currentCustomer, wishlistIds: nextIds });
      return;
    }

    setGuestWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [productId, ...prev]
    );
  };

  const handleReorderItems = (itemsToReorder: CartItem[]) => {
    setCart((prev) => {
      const next = [...prev];
      for (const item of itemsToReorder) {
        const liveProduct = products.find((p) => p.id === item.productId);
        const unitPrice = liveProduct ? liveProduct.price : item.price;
        const idx = next.findIndex(
          (c) => c.productId === item.productId && c.variant === item.variant
        );
        if (idx >= 0) {
          next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
        } else {
          next.push({ ...item, price: unitPrice });
        }
      }
      return next;
    });
    setIsCartOpen(true);
  };

  const handleCancelCustomerOrder = (orderNumber: string) => {
    handleUpdateOrderStatus(orderNumber, 'Cancelled');
  };

  const handleSaveAddressFromCheckout = (addr: Omit<SavedAddress, 'id' | 'isDefault'>) => {
    if (!currentCustomer) return;
    const duplicate = currentCustomer.addresses.some(
      (existing) =>
        existing.pinCode === addr.pinCode &&
        existing.address.trim().toLowerCase() === addr.address.trim().toLowerCase()
    );
    if (duplicate) return;

    const newAddr: SavedAddress = {
      id: `addr-${Date.now()}`,
      isDefault: currentCustomer.addresses.length === 0,
      ...addr,
    };
    handleUpdateCustomer({
      ...currentCustomer,
      addresses: [...currentCustomer.addresses, newAddr],
    });
  };

  const handleResetShopFilters = () => {
    setShopCategory(ProductCategory.ALL);
    setShopAgeGroup(AgeGroup.ALL);
    setShopOccasion(GiftOccasion.ALL);
    setShopSearch('');
    setShopMaxPrice(null);
    setShopInStockOnly(false);
    setShopSortBy('featured');
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'daylight' ? 'aurora' : 'daylight'));
  };

  // Storefront displays only Active products matching enabled primary categories
  const publicProducts = useMemo(() => {
    const visibleSet =
      settings.visibleCategories && settings.visibleCategories.length > 0
        ? new Set(settings.visibleCategories)
        : null;
    const filtered = products.filter((p) => {
      if (p.status === 'Draft' || p.status === 'Archived') return false;
      if (visibleSet && p.primaryCategory && !visibleSet.has(p.primaryCategory)) return false;
      return true;
    });
    return filtered.length > 0 ? filtered : products.filter((p) => p.status !== 'Archived');
  }, [products, settings.visibleCategories]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeProduct =
    publicProducts.find((p) => p.id === selectedProductId) ??
    publicProducts[0] ??
    products[0] ??
    INITIAL_PRODUCTS[0];
  const relatedProducts = publicProducts
    .filter(
      (p) =>
        p.id !== activeProduct.id &&
        (p.ageGroup === activeProduct.ageGroup || p.category === activeProduct.category)
    )
    .slice(0, 3);
  const customerFirstName = currentCustomer
    ? currentCustomer.fullName.trim().split(/\s+/)[0]
    : null;

  useEffect(() => {
    const seoMeta = resolvePageSeoMetadata({
      page: activePage,
      activeProduct,
      quickViewProduct,
      shopCategory,
      shopAgeGroup,
      origin: window.location.origin,
      pathname: window.location.pathname,
    });
    applyDocumentSeoMetadata(seoMeta);
  }, [activePage, activeProduct, quickViewProduct, shopCategory, shopAgeGroup]);

  return (
    <div className="relative isolate min-h-screen flex flex-col text-zinc-900 dark:text-zinc-100 overflow-x-clip">
      {/* iOS 27 Ambient Frosted Bokeh & Soft Glass Bubble Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      >
        <div className="glass-bokeh-amber absolute -top-24 -left-20 w-[440px] h-[440px] rounded-full blur-3xl opacity-85 animate-bubble-slow" />
        <div className="glass-bokeh-sky absolute top-[14%] -right-24 w-[520px] h-[520px] rounded-full blur-3xl opacity-85 animate-bubble-reverse" />
        <div className="glass-bokeh-peach absolute top-[50%] -left-20 w-[430px] h-[430px] rounded-full blur-3xl opacity-80 animate-bubble-reverse" />
        <div className="glass-bokeh-mint absolute -bottom-24 right-[8%] w-[480px] h-[480px] rounded-full blur-3xl opacity-80 animate-bubble-slow" />

        <div className="absolute top-24 right-[4%] sm:right-[6%] w-16 h-16 sm:w-24 sm:h-24 rounded-full glass-orb opacity-85 animate-bubble-slow" />
        <div className="hidden md:block absolute top-[44%] left-[2.5%] w-20 h-20 rounded-full glass-orb opacity-80 animate-bubble-reverse" />
        <div className="hidden md:block absolute bottom-[22%] right-[11%] w-24 h-24 rounded-full glass-orb opacity-75 animate-bubble-reverse" />
        <div className="absolute bottom-14 left-[5%] sm:left-[10%] w-12 h-12 sm:w-16 sm:h-16 rounded-full glass-orb opacity-80 animate-bubble-slow" />
      </div>

      {activePage !== 'manager' && (
        <Header
          activePage={activePage}
          cartCount={totalCartItems}
          announcementText={settings.announcementText}
          announcementEnabled={settings.announcementEnabled}
          customerFirstName={customerFirstName}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onNavigate={navigateTo}
          onOpenCart={() => setIsCartOpen(true)}
        />
      )}

      <main className="flex-1 relative z-10">
        {activePage === 'home' && (
          <HomeView
            products={publicProducts}
            testimonials={testimonials}
            wishlistIds={activeWishlistIds}
            heroHeadline={settings.heroHeadline}
            heroSubheadline={settings.heroSubheadline}
            heroCtaText={settings.heroCtaText}
            featuredBannerEnabled={settings.featuredBannerEnabled}
            onNavigate={navigateTo}
            onSelectProduct={handleSelectProduct}
            onQuickView={setQuickViewProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
            onBrowseOccasion={(occ) => {
              setGiftFinderOccasion(occ);
              navigateTo('gifts');
            }}
            onAddTestimonial={handleAddTestimonial}
          />
        )}

        {activePage === 'shop' && (
          <ShopView
            products={publicProducts}
            wishlistIds={activeWishlistIds}
            category={shopCategory}
            ageGroup={shopAgeGroup}
            occasion={shopOccasion}
            search={shopSearch}
            maxPrice={shopMaxPrice}
            inStockOnly={shopInStockOnly}
            sortBy={shopSortBy}
            onChangeCategory={setShopCategory}
            onChangeAgeGroup={setShopAgeGroup}
            onChangeOccasion={setShopOccasion}
            onChangeSearch={setShopSearch}
            onChangeMaxPrice={setShopMaxPrice}
            onToggleInStockOnly={() => setShopInStockOnly((prev) => !prev)}
            onChangeSortBy={setShopSortBy}
            onResetFilters={handleResetShopFilters}
            onSelectProduct={handleSelectProduct}
            onQuickView={setQuickViewProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'gifts' && (
          <GiftIdeasView
            products={publicProducts}
            wishlistIds={activeWishlistIds}
            initialOccasion={giftFinderOccasion}
            giftWrapFee={settings.giftWrapFee}
            giftWrapEnabled={settings.giftWrapEnabled}
            giftFinderWeights={settings.giftFinderWeights}
            onSelectProduct={handleSelectProduct}
            onQuickView={setQuickViewProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'product' && activeProduct && (
          <ProductDetailView
            key={activeProduct.id}
            product={activeProduct}
            relatedProducts={relatedProducts}
            wishlistIds={activeWishlistIds}
            whatsappNumber={settings.whatsappNumber}
            onBackToShop={() => navigateTo('shop')}
            onSelectProduct={handleSelectProduct}
            onQuickView={setQuickViewProduct}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'checkout' && (
          <CheckoutView
            key={currentCustomer?.id ?? 'guest'}
            items={cart}
            currentCustomer={currentCustomer}
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            freeShippingThreshold={settings.freeShippingThreshold}
            standardShippingFee={settings.standardShippingFee}
            giftWrapFee={settings.giftWrapFee}
            giftWrapEnabled={settings.giftWrapEnabled}
            codHandlingFee={settings.codHandlingFee}
            upiEnabled={settings.upiEnabled}
            codEnabled={settings.codEnabled}
            whatsappOrderEnabled={settings.whatsappOrderEnabled}
            upiVpa={settings.upiVpa}
            coupons={coupons}
            expectedPromoCode={settings.promoCode}
            promoDiscountPercent={settings.promoDiscountPercent}
            onBackToShop={() => navigateTo('shop')}
            onOrderComplete={handleOrderComplete}
            onSaveAddress={handleSaveAddressFromCheckout}
            onNavigateToAccount={() => navigateTo('account')}
          />
        )}

        {activePage === 'account' && (
          <CustomerAccountView
            currentCustomer={currentCustomer}
            customers={customers}
            orders={orders}
            returns={returns}
            products={publicProducts}
            guestWishlistIds={guestWishlistIds}
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            cloudUserEmail={supabaseUser?.email ?? null}
            onGoogleSignIn={handleGoogleSignIn}
            onSignIn={handleCustomerSignIn}
            onSignUp={handleCustomerSignUp}
            onSignOut={handleCustomerSignOut}
            onUpdateCustomer={handleUpdateCustomer}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onReorderItems={handleReorderItems}
            onCancelOrder={handleCancelCustomerOrder}
            onCreateReturnRequest={handleCreateReturnRequest}
            onSelectProduct={handleSelectProduct}
            onContinueShopping={() => navigateTo('shop')}
          />
        )}

        {activePage === 'about' && <AboutView onNavigate={navigateTo} />}

        {activePage === 'contact' && (
          <ContactView
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            onSubmitInquiry={handleSubmitInquiry}
          />
        )}

        {activePage === 'manager' && (
          <AdminGuard
            isSessionUnlocked={isAdminAuthenticated}
            expectedPasswordHash={expectedAdminHash}
            supabaseUser={supabaseUser}
            isSupabaseAdmin={isSupabaseAdmin}
            theme={theme}
            inactivityNotice={inactivityNotice}
            onToggleTheme={handleToggleTheme}
            onGoogleSignIn={handleGoogleSignIn}
            onSignOutSupabase={signOutFromSupabase}
            onUnlockSession={handleUnlockAdmin}
            onBackToStore={() => navigateTo('home')}
          >
            <AdminPanelView
              activeModule={activeAdminModule}
              theme={theme}
              products={products}
              orders={orders}
              returns={returns}
              inventoryAdjustments={inventoryAdjustments}
              inquiries={inquiries}
              customers={customers}
              coupons={coupons}
              printJobs={printJobs}
              spools={spools}
              auditLogs={auditLogs}
              crmFlagsByPhone={crmFlagsByPhone}
              settings={settings}
              adminPasswordHash={expectedAdminHash}
              cloudAdminEmail={isSupabaseAdmin ? supabaseUser?.email ?? null : null}
              cloudSignedInEmail={supabaseUser?.email ?? null}
              supabaseConfigured={supabaseDiagnostics.isConfigured}
              onSelectModule={handleSelectAdminModule}
              onToggleTheme={handleToggleTheme}
              onConnectCloudAdmin={handleGoogleSignIn}
              onSyncCatalogToCloud={handleSyncCatalogToCloud}
              onUpdateSettings={handleUpdateSettings}
              onSaveProduct={handleSaveProduct}
              onAdjustProductStock={handleAdjustProductStock}
              onDeleteProduct={handleDeleteProduct}
              onResetCatalog={handleResetCatalog}
              onUpdateOrderLogistics={handleUpdateOrderLogistics}
              onUpdateReturnRequest={handleUpdateReturnRequest}
              onSaveCoupon={handleSaveCoupon}
              onDeleteCoupon={handleDeleteCoupon}
              onSavePrintJob={handleSavePrintJob}
              onSaveFilamentSpool={handleSaveFilamentSpool}
              onSetCustomerFlag={handleSetCustomerFlag}
              onToggleInquiryStatus={handleToggleInquiryStatus}
              onChangeAdminPasswordHash={handleChangeAdminPasswordHash}
              onLockAdmin={handleLockAdmin}
              onBackToStore={() => navigateTo('home')}
            />
          </AdminGuard>
        )}
      </main>

      {activePage !== 'manager' && (
        <Footer
          whatsappNumber={settings.whatsappNumber}
          supportEmail={settings.supportEmail}
          promoCode={settings.promoCode}
          promoDiscountPercent={settings.promoDiscountPercent}
          onNavigate={navigateTo}
        />
      )}

      {activePage !== 'manager' && (
        <WhatsAppWidget
          whatsappNumber={settings.whatsappNumber}
          cart={cart}
          activeProduct={activePage === 'product' ? activeProduct : null}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        items={cart}
        whatsappNumber={settings.whatsappNumber}
        freeShippingThreshold={settings.freeShippingThreshold}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => navigateTo('checkout')}
        onBrowseShop={() => navigateTo('shop')}
      />

      {quickViewProduct && (
        <ProductQuickViewModal
          product={quickViewProduct}
          isWishlisted={activeWishlistIds.includes(quickViewProduct.id)}
          whatsappNumber={settings.whatsappNumber}
          onClose={() => setQuickViewProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onToggleWishlist={handleToggleWishlist}
          onOpenFullPage={(productId) => {
            setQuickViewProduct(null);
            handleSelectProduct(productId);
          }}
        />
      )}
    </div>
  );
}
