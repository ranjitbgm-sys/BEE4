/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseAdminUser, supabaseDiagnostics } from './lib/supabase';
import {
  addTestimonialToSupabase,
  bulkDeleteCustomerMessagesFromSupabase,
  cancelOrderInSupabase,
  createGiftCardInSupabase,
  createOrderInSupabase,
  createReturnRequestInSupabase,
  deleteAutomationRuleFromSupabase,
  deleteCouponFromSupabase,
  deleteCustomerMessageFromSupabase,
  deleteProductFromSupabase,
  deleteProductQuestionFromSupabase,
  deleteProductReviewFromSupabase,
  ensureSupabaseCustomerProfile,
  fetchAllOrdersAdminFromSupabase,
  fetchUserOrdersFromSupabase,
  onSupabaseAuthChange,
  onSupabaseAuthEvent,
  purgeTestDataInSupabase,
  redeemGiftCardViaSupabaseRpc,
  saveAdSpendLogToSupabase,
  saveAutomationRuleToSupabase,
  saveCouponToSupabase,
  saveFilamentSpoolToSupabase,
  saveMarketplaceIntegrationToSupabase,
  savePrintJobToSupabase,
  saveProductToSupabase,
  saveStoreSettingsToSupabase,
  seedSupabaseDataAsAdmin,
  signInWithGoogleSupabase,
  signOutFromSupabase,
  submitCustomerMessageToSupabase,
  submitInquiryToSupabase,
  submitProductQuestionToSupabase,
  submitProductReviewToSupabase,
  subscribeAdSpendLogsAdmin,
  subscribeAdminAuditLogs,
  subscribeAllCustomerMessagesAdmin,
  subscribeAllCustomersAdmin,
  subscribeAllInquiriesAdmin,
  subscribeAllOrdersAdmin,
  subscribeAllProductQuestionsAdmin,
  subscribeAllProductReviewsAdmin,
  subscribeAllReturnsAdmin,
  subscribeAutomationRulesAdmin,
  subscribeCoupons,
  subscribeFilamentSpoolsAdmin,
  subscribeGiftCards,
  subscribeInventoryAdjustmentsAdmin,
  subscribeMarketplaceIntegrationsAdmin,
  subscribePrintJobsAdmin,
  subscribePublicProductQuestions,
  subscribePublicProducts,
  subscribePublicPublishedReviews,
  subscribePublicSettings,
  subscribePublicTestimonials,
  subscribeUserCustomerMessages,
  subscribeUserOrders,
  subscribeUserReturns,
  toggleInquiryStatusInSupabase,
  updateCustomerMessageInSupabase,
  updateCustomerRecordAdminSupabase,
  updateGiftCardInSupabase,
  updateOrderLogisticsInSupabase,
  updateOrderRefundInSupabase,
  updateOrderStatusInSupabase,
  updateProductQuestionInSupabase,
  updateProductReviewInSupabase,
  updateReturnRequestInSupabase,
  updateSupabaseCustomerProfile,
  writeAdminAuditLogToSupabase,
  writeInventoryAdjustmentToSupabase,
} from './services/supabaseStoreService';
import {
  DEFAULT_STORE_SETTINGS,
  INITIAL_COUPONS,
  INITIAL_FILAMENT_SPOOLS,
  INITIAL_PRODUCTS,
  hydrateProductAdminFields,
} from './data/catalog';
import {
  AdminAuditLog,
  AdminModuleRoute,
  AgeGroup,
  AutomationRule,
  CartItem,
  CouponRecord,
  CrmCustomerFlag,
  CustomerInquiry,
  CustomerMessageRecord,
  CustomerProfile,
  FilamentSpool,
  FulfillmentStage,
  GiftCardRecord,
  GiftOccasion,
  InventoryAdjustmentRecord,
  MarketplaceChannel,
  MarketplaceIntegrationConfig,
  MonthlyAdSpendRecord,
  OperationalOrderBucket,
  OrderRecord,
  OrderSettlementRecord,
  OrderStatus,
  PackingVerificationProof,
  PrintJobRecord,
  Product,
  ProductCategory,
  ProductQuestionRecord,
  ProductReviewRecord,
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
import { BuyGiftCardModal } from './components/BuyGiftCardModal';
import { CustomerAccountTab, CustomerAccountView } from './components/CustomerAccountView';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { AppSplashScreen } from './components/pwa/AppSplashScreen';
import { MobileBottomNav } from './components/pwa/MobileBottomNav';
import { MobileCategoriesSheet } from './components/pwa/MobileCategoriesSheet';
import { OfflineFallbackNotice } from './components/pwa/OfflineFallbackNotice';
import { PwaInstallBanner } from './components/pwa/PwaInstallBanner';
import { PwaInstallModal } from './components/pwa/PwaInstallModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { usePwaInstall } from './hooks/usePwaInstall';
import { resolveExpectedAdminHash } from './utils/adminAuth';
import { mapFulfillmentStageToOrderStatus } from './utils/adminLogic';
import {
  adjustCustomerWalletBalance,
  isSessionInvalidatedByAdmin,
} from './utils/customerAccountLogic';
import {
  applyOrderCancellation,
  createDigitalGiftCard,
  deductWalletOnOrder,
  redeemGiftCardIntoProfile,
} from './utils/giftCardWalletLogic';
import {
  DEFAULT_AUTOMATION_RULE_TEMPLATES,
  DEFAULT_MARKETPLACE_INTEGRATIONS,
  deductMasterInventoryForItems,
  evaluateOrderAutomations,
} from './utils/omnichannelLogic';
import { clearAllLocalTestCaches, runProductionCleanMigration } from './utils/productionClean';
import { applyRmaTransitionSync, RmaTransitionUpdates } from './utils/rmaLogic';
import { applyDocumentSeoMetadata, resolvePageSeoMetadata } from './utils/seoMeta';

const STORAGE_PRODUCTS_KEY = 'bee4_products_v3';
const STORAGE_CART_KEY = 'bee4_cart_v1';
const STORAGE_ORDERS_KEY = 'bee4_orders_v3';
const STORAGE_RETURNS_KEY = 'bee4_returns_v1';
const STORAGE_INVENTORY_LOGS_KEY = 'bee4_inventory_logs_v1';
const STORAGE_INQUIRIES_KEY = 'bee4_inquiries_v1';
const STORAGE_CUSTOMER_MESSAGES_KEY = 'bee4_customer_messages_v1';
const STORAGE_PRODUCT_REVIEWS_KEY = 'bee4_product_reviews_v1';
const STORAGE_PRODUCT_QUESTIONS_KEY = 'bee4_product_questions_v1';
const STORAGE_SETTINGS_KEY = 'bee4_settings_v3';
const STORAGE_TESTIMONIALS_KEY = 'bee4_testimonials_v2';
const STORAGE_CUSTOMERS_KEY = 'bee4_customers_v2';
const STORAGE_CURRENT_CUSTOMER_ID_KEY = 'bee4_current_customer_id_v1';
const STORAGE_CUSTOMER_SESSION_ISSUED_KEY = 'bee4_customer_session_issued_v1';
const STORAGE_GUEST_WISHLIST_KEY = 'bee4_guest_wishlist_v1';
const STORAGE_ADMIN_PASS_HASH_KEY = 'bee4_admin_pass_hash_v1';
const STORAGE_THEME_KEY = 'bee4_theme_v1';
const STORAGE_COUPONS_KEY = 'bee4_coupons_v1';
const STORAGE_GIFT_CARDS_KEY = 'bee4_gift_cards_v1';
const STORAGE_PRINT_JOBS_KEY = 'bee4_print_jobs_v1';
const STORAGE_SPOOLS_KEY = 'bee4_filament_spools_v1';
const STORAGE_AUDIT_LOGS_KEY = 'bee4_admin_logs_v1';
const STORAGE_CRM_FLAGS_KEY = 'bee4_crm_flags_v1';
const STORAGE_INTEGRATIONS_KEY = 'bee4_marketplace_integrations_v1';
const STORAGE_AUTOMATION_RULES_KEY = 'bee4_automation_rules_v1';
const STORAGE_AD_SPEND_KEY = 'bee4_ad_spend_v1';
const SESSION_ADMIN_TOKEN_KEY = 'bee4_admin_session_v1';

const ADMIN_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

const VALID_ADMIN_MODULES = new Set<AdminModuleRoute>([
  'dashboard',
  'orders',
  'returns',
  'products',
  'inventory',
  'integrations',
  'automations',
  'reconciliation',
  'analytics',
  'discounts',
  'customers',
  'messages-reviews',
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
  // Run one-time production clean migration synchronously before loading state from localStorage
  useState(() => {
    if (typeof window !== 'undefined') {
      runProductionCleanMigration(window.localStorage);
    }
    return true;
  });

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
  const [orders, setOrders] = useState<OrderRecord[]>(() =>
    loadStoredJson<OrderRecord[]>(STORAGE_ORDERS_KEY, [])
  );
  const [returns, setReturns] = useState<ReturnRequestRecord[]>(() =>
    loadStoredJson<ReturnRequestRecord[]>(STORAGE_RETURNS_KEY, [])
  );
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustmentRecord[]>(
    () => loadStoredJson<InventoryAdjustmentRecord[]>(STORAGE_INVENTORY_LOGS_KEY, [])
  );
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(() =>
    loadStoredJson<CustomerInquiry[]>(STORAGE_INQUIRIES_KEY, [])
  );
  const [customerMessages, setCustomerMessages] = useState<CustomerMessageRecord[]>(() =>
    loadStoredJson<CustomerMessageRecord[]>(STORAGE_CUSTOMER_MESSAGES_KEY, [])
  );
  const [productReviews, setProductReviews] = useState<ProductReviewRecord[]>(() =>
    loadStoredJson<ProductReviewRecord[]>(STORAGE_PRODUCT_REVIEWS_KEY, [])
  );
  const [productQuestions, setProductQuestions] = useState<ProductQuestionRecord[]>(() =>
    loadStoredJson<ProductQuestionRecord[]>(STORAGE_PRODUCT_QUESTIONS_KEY, [])
  );
  const [settings, setSettings] = useState<StoreSettings>(() => ({
    ...DEFAULT_STORE_SETTINGS,
    ...loadStoredJson<StoreSettings>(STORAGE_SETTINGS_KEY, DEFAULT_STORE_SETTINGS),
  }));
  const [testimonials, setTestimonials] = useState<Testimonial[]>(() =>
    loadStoredJson<Testimonial[]>(STORAGE_TESTIMONIALS_KEY, [])
  );
  const [customers, setCustomers] = useState<CustomerProfile[]>(() =>
    loadStoredJson<CustomerProfile[]>(STORAGE_CUSTOMERS_KEY, [])
  );
  const [coupons, setCoupons] = useState<CouponRecord[]>(() =>
    loadStoredJson<CouponRecord[]>(STORAGE_COUPONS_KEY, INITIAL_COUPONS)
  );
  const [giftCards, setGiftCards] = useState<GiftCardRecord[]>(() =>
    loadStoredJson<GiftCardRecord[]>(STORAGE_GIFT_CARDS_KEY, [])
  );
  const [showBuyGiftCardModal, setShowBuyGiftCardModal] = useState(false);
  const [giftCardModalMode, setGiftCardModalMode] = useState<'personal' | 'bulk'>('personal');
  const [printJobs, setPrintJobs] = useState<PrintJobRecord[]>(() =>
    loadStoredJson<PrintJobRecord[]>(STORAGE_PRINT_JOBS_KEY, [])
  );
  const [spools, setSpools] = useState<FilamentSpool[]>(() =>
    loadStoredJson<FilamentSpool[]>(STORAGE_SPOOLS_KEY, INITIAL_FILAMENT_SPOOLS)
  );
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>(() =>
    loadStoredJson<AdminAuditLog[]>(STORAGE_AUDIT_LOGS_KEY, [])
  );
  const [crmFlagsByPhone, setCrmFlagsByPhone] = useState<Record<string, CrmCustomerFlag>>(() =>
    loadStoredJson<Record<string, CrmCustomerFlag>>(STORAGE_CRM_FLAGS_KEY, {})
  );
  const [marketplaceIntegrations, setMarketplaceIntegrations] = useState<
    MarketplaceIntegrationConfig[]
  >(() => {
    const stored = loadStoredJson<MarketplaceIntegrationConfig[]>(STORAGE_INTEGRATIONS_KEY, []);
    if (!Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_MARKETPLACE_INTEGRATIONS;
    }
    return DEFAULT_MARKETPLACE_INTEGRATIONS.map(
      (def) => stored.find((s) => s.id === def.id || s.key === def.key) ?? def
    );
  });
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => {
    const stored = loadStoredJson<AutomationRule[]>(STORAGE_AUTOMATION_RULES_KEY, []);
    if (!Array.isArray(stored) || stored.length === 0) {
      return DEFAULT_AUTOMATION_RULE_TEMPLATES;
    }
    return stored;
  });
  const [adSpendLogs, setAdSpendLogs] = useState<MonthlyAdSpendRecord[]>(() =>
    loadStoredJson<MonthlyAdSpendRecord[]>(STORAGE_AD_SPEND_KEY, [])
  );
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(() =>
    loadStoredJson<string | null>(STORAGE_CURRENT_CUSTOMER_ID_KEY, null)
  );
  const [sessionIssuedAt, setSessionIssuedAt] = useState<string | null>(() =>
    loadStoredJson<string | null>(STORAGE_CUSTOMER_SESSION_ISSUED_KEY, null)
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
  const [authRecoveryMode, setAuthRecoveryMode] = useState(false);
  const [authVerificationNotice, setAuthVerificationNotice] = useState('');
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
      const cleanPath = window.location.pathname.replace(/\/+$/, '');
      if (cleanPath === '/account') {
        return 'account';
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
  const [isCategoriesSheetOpen, setIsCategoriesSheetOpen] = useState(false);
  const [requestedAccountTab, setRequestedAccountTab] = useState<CustomerAccountTab | null>(null);
  const [currentAccountTab, setCurrentAccountTab] = useState<CustomerAccountTab>('overview');
  const isOnline = useOnlineStatus();
  const pwaInstall = usePwaInstall();

  // Sync Daylight / Dark Aurora theme class & persistence
  useEffect(() => {
    try {
      document.documentElement.classList.toggle('dark', theme === 'aurora');
      window.localStorage.setItem(STORAGE_THEME_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Track Supabase Authentication readiness & live email verification / recovery callbacks
  useEffect(() => {
    const hashParams =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null;
    const searchParams =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const authType = hashParams?.get('type') || searchParams?.get('type') || '';
    const hasEmailCallback =
      authType === 'signup' ||
      authType === 'email' ||
      Boolean(searchParams?.get('code') && window.location.pathname.includes('account'));

    const unsubscribe = onSupabaseAuthChange((sbUser) => {
      setSupabaseUser(sbUser);
      setSupabaseAuthReady(true);
      if (!sbUser) {
        setSupabaseCustomer(null);
      } else if (hasEmailCallback && sbUser.email_confirmed_at) {
        setAuthVerificationNotice('Email Verified Successfully! Welcome to BEE4.');
        setActivePage('account');
      }
    });

    const unsubEvents = onSupabaseAuthEvent((event, sbUser) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthRecoveryMode(true);
        setActivePage('account');
      } else if (event === 'SIGNED_IN' && hasEmailCallback && sbUser?.email_confirmed_at) {
        setAuthVerificationNotice('Email Verified Successfully! Welcome to BEE4.');
        setActivePage('account');
      }
    });

    return () => {
      unsubscribe();
      unsubEvents();
    };
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
    const unsubPublicReviews = subscribePublicPublishedReviews((cloudPublishedReviews) => {
      setProductReviews(cloudPublishedReviews);
    });
    const unsubPublicQuestions = subscribePublicProductQuestions((cloudQuestions) => {
      setProductQuestions(cloudQuestions);
    });
    const unsubCoupons = subscribeCoupons((cloudCoupons) => {
      setCoupons(cloudCoupons);
    });
    const unsubGiftCards = subscribeGiftCards((cloudCards) => {
      setGiftCards(cloudCards);
    });
    return () => {
      unsubProducts();
      unsubSettings();
      unsubTestimonials();
      unsubPublicReviews();
      unsubPublicQuestions();
      unsubCoupons();
      unsubGiftCards();
    };
  }, []);

  // Authenticated Supabase user profile + live personal orders & returns sync
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

    // When signed in as Admin, subscribeAllOrdersAdmin/subscribeAllReturnsAdmin handle fetching
    // ALL customer records without racing against user-scoped subscriptions.
    if (isSupabaseAdmin) {
      return () => {
        cancelled = true;
      };
    }

    const unsubUserOrders = subscribeUserOrders(supabaseUser.id, (cloudOrders) => {
      setOrders(cloudOrders);
    });

    const unsubUserReturns = subscribeUserReturns(supabaseUser.id, (cloudReturns) => {
      setReturns(cloudReturns);
    });

    const unsubUserMessages = subscribeUserCustomerMessages(
      supabaseUser.id,
      supabaseUser.email ?? undefined,
      (cloudMsgs) => {
        setCustomerMessages(cloudMsgs);
      }
    );

    return () => {
      cancelled = true;
      unsubUserOrders();
      unsubUserReturns();
      unsubUserMessages();
    };
  }, [supabaseAuthReady, supabaseUser, isSupabaseAdmin]);

  // Verified Admin Supabase Realtime sync (orders, returns, customers, messages, reviews, spools, audit logs)
  useEffect(() => {
    if (!supabaseAuthReady || !supabaseUser || !isSupabaseAdmin || !supabaseDiagnostics.isConfigured) {
      return;
    }

    const unsubAdminOrders = subscribeAllOrdersAdmin((cloudOrders) => {
      setOrders(cloudOrders);
    });

    const unsubAdminReturns = subscribeAllReturnsAdmin((cloudReturns) => {
      setReturns(cloudReturns);
    });

    const unsubAdminCustomers = subscribeAllCustomersAdmin((cloudCustomers) => {
      setCustomers(cloudCustomers);
    });

    const unsubInventoryAdjustments = subscribeInventoryAdjustmentsAdmin((cloudAdjustments) => {
      setInventoryAdjustments(cloudAdjustments);
    });

    const unsubAdminInquiries = subscribeAllInquiriesAdmin((cloudInquiries) => {
      setInquiries(cloudInquiries);
    });

    const unsubAdminCustomerMessages = subscribeAllCustomerMessagesAdmin((cloudMsgs) => {
      setCustomerMessages(cloudMsgs);
    });

    const unsubAdminReviews = subscribeAllProductReviewsAdmin((cloudReviews) => {
      setProductReviews(cloudReviews);
    });

    const unsubAdminQuestions = subscribeAllProductQuestionsAdmin((cloudQuestions) => {
      setProductQuestions(cloudQuestions);
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

    const unsubIntegrations = subscribeMarketplaceIntegrationsAdmin((cloudConfigs) => {
      setMarketplaceIntegrations(
        DEFAULT_MARKETPLACE_INTEGRATIONS.map(
          (def) => cloudConfigs.find((c) => c.id === def.id || c.key === def.key) ?? def
        )
      );
    });

    const unsubRules = subscribeAutomationRulesAdmin((cloudRules) => {
      setAutomationRules(cloudRules);
    });

    const unsubAdSpend = subscribeAdSpendLogsAdmin((cloudAdSpends) => {
      setAdSpendLogs(cloudAdSpends);
    });

    return () => {
      unsubAdminOrders();
      unsubAdminReturns();
      unsubAdminCustomers();
      unsubInventoryAdjustments();
      unsubAdminInquiries();
      unsubAdminCustomerMessages();
      unsubAdminReviews();
      unsubAdminQuestions();
      unsubPrintJobs();
      unsubSpools();
      unsubLogs();
      unsubIntegrations();
      unsubRules();
      unsubAdSpend();
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
      window.localStorage.setItem(
        STORAGE_CUSTOMER_MESSAGES_KEY,
        JSON.stringify(customerMessages)
      );
    } catch {
      // Ignore storage errors
    }
  }, [customerMessages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRODUCT_REVIEWS_KEY, JSON.stringify(productReviews));
    } catch {
      // Ignore storage errors
    }
  }, [productReviews]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_PRODUCT_QUESTIONS_KEY, JSON.stringify(productQuestions));
    } catch {
      // Ignore storage errors
    }
  }, [productQuestions]);

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
      window.localStorage.setItem(STORAGE_GIFT_CARDS_KEY, JSON.stringify(giftCards));
    } catch {
      // Ignore storage errors
    }
  }, [giftCards]);

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
        STORAGE_INTEGRATIONS_KEY,
        JSON.stringify(marketplaceIntegrations)
      );
    } catch {
      // Ignore storage errors
    }
  }, [marketplaceIntegrations]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_AUTOMATION_RULES_KEY,
        JSON.stringify(automationRules)
      );
    } catch {
      // Ignore storage errors
    }
  }, [automationRules]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_AD_SPEND_KEY, JSON.stringify(adSpendLogs));
    } catch {
      // Ignore storage errors
    }
  }, [adSpendLogs]);

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
      window.localStorage.setItem(
        STORAGE_CUSTOMER_SESSION_ISSUED_KEY,
        JSON.stringify(sessionIssuedAt)
      );
    } catch {
      // Ignore storage errors
    }
  }, [sessionIssuedAt]);

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

  const handleRefreshUserOrders = useCallback(async () => {
    if (!supabaseUser || !supabaseDiagnostics.isConfigured) return;
    if (isSupabaseAdmin) {
      const allOrders = await fetchAllOrdersAdminFromSupabase();
      setOrders(allOrders);
      return;
    }
    const cloudOrders = await fetchUserOrdersFromSupabase(supabaseUser.id);
    setOrders(cloudOrders);
  }, [supabaseUser, isSupabaseAdmin]);

  const handleRefreshAdminOrders = useCallback(async () => {
    if (!supabaseDiagnostics.isConfigured) return;
    const cloudOrders = await fetchAllOrdersAdminFromSupabase();
    setOrders(cloudOrders);
  }, []);

  const handleOrderComplete = async (order: OrderRecord): Promise<void> => {
    const channel: MarketplaceChannel = order.sourceChannel ?? 'bee4.in';
    const orderWithChannel: OrderRecord = {
      ...order,
      userId: order.userId ?? supabaseUser?.id ?? null,
      sourceChannel: channel,
      operationalBucket: order.operationalBucket ?? 'New / Upcoming',
    };

    const autoRes = evaluateOrderAutomations(
      orderWithChannel,
      automationRules,
      'new_order_placed'
    );
    const finalOrder: OrderRecord = {
      ...autoRes.updatedOrder,
      userId: orderWithChannel.userId,
    };

    // Persist directly to Supabase `orders` before confirming or clearing cart
    await createOrderInSupabase(finalOrder, supabaseUser?.id ?? null);

    const { updatedProducts, deductions } = deductMasterInventoryForItems(
      products,
      finalOrder.items,
      channel
    );
    if (deductions.length > 0) {
      setProducts(updatedProducts);
      if (isSupabaseAdmin) {
        const changedIds = new Set(deductions.map((d) => d.productId));
        for (const p of updatedProducts) {
          if (changedIds.has(p.id)) {
            void saveProductToSupabase(p).catch((err) => console.error(err));
          }
        }
      }
    }

    if (autoRes.triggeredLogs.length > 0) {
      setAutomationRules(autoRes.updatedRules);
      if (isSupabaseAdmin) {
        for (const r of autoRes.updatedRules) {
          void saveAutomationRuleToSupabase(r).catch((err) => console.error(err));
        }
      }
    }
    if (autoRes.queuedPrintJobs.length > 0) {
      setPrintJobs((prev) => [...autoRes.queuedPrintJobs, ...prev]);
      if (isSupabaseAdmin) {
        for (const pj of autoRes.queuedPrintJobs) {
          void savePrintJobToSupabase(pj).catch((err) => console.error(err));
        }
      }
    }

    setOrders((prev) => [
      finalOrder,
      ...prev.filter((o) => o.orderNumber !== finalOrder.orderNumber),
    ]);
    setCart([]);

    if (finalOrder.walletAmountUsed && finalOrder.walletAmountUsed > 0 && currentCustomer) {
      const debitedProfile = deductWalletOnOrder({
        profile: currentCustomer,
        walletAmountUsed: finalOrder.walletAmountUsed,
        orderNumber: finalOrder.orderNumber,
      });
      handleUpdateCustomer(debitedProfile);
    }

    if (finalOrder.couponCode) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code.toUpperCase() === finalOrder.couponCode?.toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        )
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
      operationalBucket?: OperationalOrderBucket;
      labelGeneratedAt?: string;
      picklistGeneratedAt?: string;
      packingProof?: PackingVerificationProof;
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
              ...(updates.operationalBucket !== undefined
                ? { operationalBucket: updates.operationalBucket }
                : {}),
              ...(updates.labelGeneratedAt !== undefined
                ? { labelGeneratedAt: updates.labelGeneratedAt }
                : {}),
              ...(updates.picklistGeneratedAt !== undefined
                ? { picklistGeneratedAt: updates.picklistGeneratedAt }
                : {}),
              ...(updates.packingProof !== undefined
                ? { packingProof: updates.packingProof }
                : {}),
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
        operationalBucket: updates.operationalBucket,
        labelGeneratedAt: updates.labelGeneratedAt,
        picklistGeneratedAt: updates.picklistGeneratedAt,
        packingProof: updates.packingProof,
      }).catch((err) => console.error(err));
    }
    recordAuditLog(
      'ORDER_LOGISTICS_UPDATED',
      'order',
      orderNumber,
      `Stage -> ${updates.fulfillmentStage}${updates.courierPartner ? ` · ${updates.courierPartner} ${updates.awbNumber || ''}` : ''}`
    );
  };

  const handleBulkUpdateOrders = (updatedSubset: OrderRecord[], summaryLabel: string) => {
    const byOrderNo = new Map(updatedSubset.map((o) => [o.orderNumber, o]));
    setOrders((prev) => prev.map((o) => byOrderNo.get(o.orderNumber) ?? o));
    if (isSupabaseAdmin) {
      for (const ord of updatedSubset) {
        void updateOrderLogisticsInSupabase(ord.orderNumber, {
          status: ord.status,
          fulfillmentStage: ord.fulfillmentStage || 'Confirmed',
          courierPartner: ord.courierPartner,
          awbNumber: ord.awbNumber,
          trackingUrl: ord.trackingUrl,
          internalNotes: ord.internalNotes,
          operationalBucket: ord.operationalBucket,
          labelGeneratedAt: ord.labelGeneratedAt,
          picklistGeneratedAt: ord.picklistGeneratedAt,
          packingProof: ord.packingProof,
        }).catch((err) => console.error(err));
      }
    }
    recordAuditLog('ORDERS_BULK_UPDATED', 'order', `bulk-${updatedSubset.length}`, summaryLabel);
  };

  const handleUpdateOrderSettlement = (
    orderNumber: string,
    settlement: OrderSettlementRecord
  ) => {
    const target = orders.find((o) => o.orderNumber === orderNumber);
    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === orderNumber ? { ...o, settlement } : o))
    );
    if (isSupabaseAdmin && target) {
      void updateOrderLogisticsInSupabase(orderNumber, {
        status: target.status,
        fulfillmentStage: target.fulfillmentStage || 'Confirmed',
        courierPartner: target.courierPartner,
        awbNumber: target.awbNumber,
        trackingUrl: target.trackingUrl,
        internalNotes: target.internalNotes,
        settlement,
      }).catch((err) => console.error(err));
    }
    recordAuditLog(
      'ORDER_SETTLEMENT_UPDATED',
      'settlement',
      orderNumber,
      `Settled ₹${Math.round(settlement.actualSettlementReceived)} (UTR: ${settlement.utrNumber || 'Pending'}).`
    );
  };

  const handleSaveIntegration = (config: MarketplaceIntegrationConfig) => {
    setMarketplaceIntegrations((prev) =>
      prev.some((c) => c.id === config.id)
        ? prev.map((c) => (c.id === config.id ? config : c))
        : [config, ...prev]
    );
    if (isSupabaseAdmin) {
      void saveMarketplaceIntegrationToSupabase(config).catch((err) => console.error(err));
    }
    recordAuditLog(
      'INTEGRATION_UPDATED',
      'integration',
      config.key,
      `Saved ${config.name} (${config.active ? 'Active' : 'Paused'}).`
    );
  };

  const handleImportMarketplaceOrders = (
    importedOrders: OrderRecord[],
    channel: MarketplaceChannel
  ) => {
    const existingIds = new Set(orders.map((o) => o.orderNumber));
    const uniqueNew = importedOrders.filter((o) => !existingIds.has(o.orderNumber));
    if (uniqueNew.length === 0) return;

    let runningRules = [...automationRules];
    let runningProducts = [...products];
    const extraPrintJobs: PrintJobRecord[] = [];
    const processedOrders: OrderRecord[] = [];
    const touchedProductIds = new Set<string>();

    for (const rawOrder of uniqueNew) {
      const autoRes = evaluateOrderAutomations(
        rawOrder,
        runningRules,
        'marketplace_csv_imported'
      );
      runningRules = autoRes.updatedRules;
      if (autoRes.queuedPrintJobs.length > 0) {
        extraPrintJobs.push(...autoRes.queuedPrintJobs);
      }
      const stockRes = deductMasterInventoryForItems(
        runningProducts,
        autoRes.updatedOrder.items,
        channel
      );
      runningProducts = stockRes.updatedProducts;
      for (const d of stockRes.deductions) {
        touchedProductIds.add(d.productId);
      }
      processedOrders.push(autoRes.updatedOrder);
    }

    setOrders((prev) => [...processedOrders, ...prev]);
    setProducts(runningProducts);
    setAutomationRules(runningRules);
    if (extraPrintJobs.length > 0) {
      setPrintJobs((prev) => [...extraPrintJobs, ...prev]);
    }

    if (isSupabaseAdmin) {
      for (const ord of processedOrders) {
        void createOrderInSupabase(ord, null).catch((err) => console.error(err));
      }
      for (const prod of runningProducts) {
        if (touchedProductIds.has(prod.id)) {
          void saveProductToSupabase(prod).catch((err) => console.error(err));
        }
      }
      for (const r of runningRules) {
        void saveAutomationRuleToSupabase(r).catch((err) => console.error(err));
      }
      for (const pj of extraPrintJobs) {
        void savePrintJobToSupabase(pj).catch((err) => console.error(err));
      }
    }

    recordAuditLog(
      'MARKETPLACE_ORDERS_IMPORTED',
      'order',
      channel,
      `Imported ${processedOrders.length} order(s) from ${channel} CSV and synchronized master inventory.`
    );
  };

  const handleSaveAutomationRule = (rule: AutomationRule) => {
    setAutomationRules((prev) =>
      prev.some((r) => r.id === rule.id)
        ? prev.map((r) => (r.id === rule.id ? rule : r))
        : [rule, ...prev]
    );
    if (isSupabaseAdmin) {
      void saveAutomationRuleToSupabase(rule).catch((err) => console.error(err));
    }
    recordAuditLog(
      'AUTOMATION_RULE_SAVED',
      'automation',
      rule.id,
      `${rule.enabled ? 'Enabled' : 'Paused'} rule "${rule.name}".`
    );
  };

  const handleDeleteAutomationRule = (ruleId: string) => {
    const target = automationRules.find((r) => r.id === ruleId);
    setAutomationRules((prev) => prev.filter((r) => r.id !== ruleId));
    if (isSupabaseAdmin) {
      void deleteAutomationRuleFromSupabase(ruleId).catch((err) => console.error(err));
    }
    recordAuditLog(
      'AUTOMATION_RULE_DELETED',
      'automation',
      ruleId,
      `Deleted automation rule "${target?.name || ruleId}".`
    );
  };

  const handleRunAutomationRulesNow = (): string => {
    const activeRules = automationRules.filter((r) => r.enabled);
    if (activeRules.length === 0) {
      return 'No active automation rules enabled yet. Toggle at least one rule ON first.';
    }
    let runningRules = [...automationRules];
    const extraPrintJobs: PrintJobRecord[] = [];
    let matchedCount = 0;

    const nextOrders = orders.map((ord) => {
      if (ord.status === 'Delivered' || ord.status === 'Cancelled') return ord;
      let cur = ord;
      for (const trig of ['new_order_placed', 'marketplace_csv_imported', 'order_status_changed'] as const) {
        const res = evaluateOrderAutomations(cur, runningRules, trig);
        runningRules = res.updatedRules;
        if (res.triggeredLogs.length > 0) {
          matchedCount += res.triggeredLogs.length;
          cur = res.updatedOrder;
          extraPrintJobs.push(...res.queuedPrintJobs);
        }
      }
      return cur;
    });

    setOrders(nextOrders);
    setAutomationRules(runningRules);
    if (extraPrintJobs.length > 0) {
      setPrintJobs((prev) => [...extraPrintJobs, ...prev]);
    }
    if (isSupabaseAdmin) {
      for (const r of runningRules) {
        void saveAutomationRuleToSupabase(r).catch((err) => console.error(err));
      }
      for (const pj of extraPrintJobs) {
        void savePrintJobToSupabase(pj).catch((err) => console.error(err));
      }
    }
    return matchedCount > 0
      ? `Executed ${matchedCount} active automation action(s) across ${nextOrders.length} open orders.`
      : `Evaluated ${activeRules.length} active rule(s) on ${orders.length} order(s): 0 pending matches.`;
  };

  const handleSaveAdSpend = (entry: MonthlyAdSpendRecord) => {
    setAdSpendLogs((prev) => [entry, ...prev.filter((a) => a.id !== entry.id)]);
    if (isSupabaseAdmin) {
      void saveAdSpendLogToSupabase(entry).catch((err) => console.error(err));
    }
    recordAuditLog(
      'AD_SPEND_LOGGED',
      'settlement',
      entry.id,
      `Logged ₹${Math.round(entry.amount)} ad spend (${entry.channel}) for ${entry.month}.`
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
    options?: {
      forceQueuePrint?: boolean;
      receivedAtHub?: boolean;
      claimFiled?: boolean;
      claimReferenceId?: string;
      qcOutcome?: ReturnRequestRecord['qcOutcome'];
    }
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

    const nowIso = new Date().toISOString();
    const enrichedReturn: ReturnRequestRecord = {
      ...syncRes.updatedReturn,
      ...(options?.receivedAtHub !== undefined
        ? {
            receivedAtHub: options.receivedAtHub,
            receivedAtHubDate: options.receivedAtHub
              ? syncRes.updatedReturn.receivedAtHubDate || nowIso
              : undefined,
          }
        : {}),
      ...(options?.claimFiled !== undefined
        ? {
            claimFiled: options.claimFiled,
            claimFiledAt: options.claimFiled
              ? syncRes.updatedReturn.claimFiledAt || nowIso
              : undefined,
            claimReferenceId: options.claimReferenceId ?? syncRes.updatedReturn.claimReferenceId,
          }
        : {}),
      ...(options?.qcOutcome !== undefined ? { qcOutcome: options.qcOutcome } : {}),
    };

    setReturns((prev) =>
      prev.map((r) => (r.id === enrichedReturn.id ? enrichedReturn : r))
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
      void updateReturnRequestInSupabase(enrichedReturn).catch((err) => console.error(err));

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

      if (enrichedReturn.status === 'Refund Completed') {
        const updatedParentOrder = syncRes.updatedOrders.find(
          (o) => o.orderNumber === enrichedReturn.orderNumber
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
      enrichedReturn.rmaNumber,
      options?.claimFiled
        ? `Filed SPF Claim ${options.claimReferenceId || enrichedReturn.rmaNumber}`
        : syncRes.auditSummary
    );
    return options?.claimFiled
      ? `Filed SPF Claim (${options.claimReferenceId || enrichedReturn.rmaNumber})`
      : syncRes.auditSummary;
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

  const handleSubmitCustomerMessage = (msg: CustomerMessageRecord) => {
    setCustomerMessages((prev) => [msg, ...prev]);
    if (supabaseDiagnostics.isConfigured) {
      void submitCustomerMessageToSupabase(msg, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
  };

  const handleUpdateCustomerMessage = (updated: CustomerMessageRecord) => {
    setCustomerMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (isSupabaseAdmin) {
      void updateCustomerMessageInSupabase(updated).catch((err) => console.error(err));
    }
    recordAuditLog(
      'MESSAGE_UPDATED',
      'message',
      updated.id,
      `Updated note from ${updated.customerName} (${updated.topic}) -> ${updated.status}.`
    );
  };

  const handleDeleteCustomerMessage = (id: string) => {
    const target = customerMessages.find((m) => m.id === id);
    setCustomerMessages((prev) => prev.filter((m) => m.id !== id));
    if (isSupabaseAdmin) {
      void deleteCustomerMessageFromSupabase(id).catch((err) => console.error(err));
    }
    recordAuditLog(
      'MESSAGE_DELETED',
      'message',
      id,
      `Deleted customer note from ${target?.customerName || id}.`
    );
  };

  const handleBulkDeleteCustomerMessages = (ids: string[]) => {
    const idSet = new Set(ids);
    setCustomerMessages((prev) => prev.filter((m) => !idSet.has(m.id)));
    if (isSupabaseAdmin) {
      void bulkDeleteCustomerMessagesFromSupabase(ids).catch((err) => console.error(err));
    }
    recordAuditLog(
      'MESSAGES_BULK_DELETED',
      'message',
      `bulk-${ids.length}`,
      `Bulk deleted ${ids.length} customer message(s).`
    );
  };

  const handleSubmitProductReview = (review: ProductReviewRecord) => {
    setProductReviews((prev) => [review, ...prev]);
    if (supabaseDiagnostics.isConfigured) {
      void submitProductReviewToSupabase(review, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
  };

  const handleSaveProductReview = (review: ProductReviewRecord, isNew?: boolean) => {
    setProductReviews((prev) => {
      const exists = prev.some((r) => r.id === review.id);
      if (exists) {
        return prev.map((r) => (r.id === review.id ? review : r));
      }
      return [review, ...prev];
    });
    if (isSupabaseAdmin) {
      if (isNew) {
        void submitProductReviewToSupabase(review, null).catch((err) => console.error(err));
      } else {
        void updateProductReviewInSupabase(review).catch((err) => console.error(err));
      }
    }
    recordAuditLog(
      isNew ? 'REVIEW_CREATED_ADMIN' : 'REVIEW_MODERATED',
      'review',
      review.id,
      `${isNew ? 'Added' : 'Updated'} review by ${review.customerName} for "${review.productName}" (${review.rating}★, ${review.status}).`
    );
  };

  const handleDeleteProductReview = (id: string) => {
    const target = productReviews.find((r) => r.id === id);
    setProductReviews((prev) => prev.filter((r) => r.id !== id));
    if (isSupabaseAdmin) {
      void deleteProductReviewFromSupabase(id).catch((err) => console.error(err));
    }
    recordAuditLog(
      'REVIEW_DELETED',
      'review',
      id,
      `Deleted review by ${target?.customerName || id} on "${target?.productName || 'product'}".`
    );
  };

  const handleSubmitProductQuestion = (question: ProductQuestionRecord) => {
    setProductQuestions((prev) => [question, ...prev]);
    if (supabaseDiagnostics.isConfigured) {
      void submitProductQuestionToSupabase(question, supabaseUser?.id ?? null).catch((err) =>
        console.error(err)
      );
    }
  };

  const handleSaveProductQuestionAdmin = (updated: ProductQuestionRecord) => {
    setProductQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)));
    if (isSupabaseAdmin) {
      void updateProductQuestionInSupabase(updated).catch((err) => console.error(err));
    }
    recordAuditLog(
      'PRODUCT_QA_ANSWERED',
      'qa',
      updated.id,
      `Answered question on "${updated.productName}" by ${updated.customerName}.`
    );
  };

  const handleDeleteProductQuestionAdmin = (id: string) => {
    const target = productQuestions.find((q) => q.id === id);
    setProductQuestions((prev) => prev.filter((q) => q.id !== id));
    if (isSupabaseAdmin) {
      void deleteProductQuestionFromSupabase(id).catch((err) => console.error(err));
    }
    recordAuditLog(
      'PRODUCT_QA_DELETED',
      'qa',
      id,
      `Deleted product question on "${target?.productName || id}".`
    );
  };

  const rawActiveCustomer = supabaseUser
    ? supabaseCustomer
    : customers.find((c) => c.id === currentCustomerId) ?? null;

  const isActiveCustomerBlocked = isSessionInvalidatedByAdmin(rawActiveCustomer, sessionIssuedAt);

  useEffect(() => {
    if (!rawActiveCustomer || !isActiveCustomerBlocked) return;
    const isSuspended = rawActiveCustomer.accountStatus === 'Suspended';
    setCurrentCustomerId(null);
    setSessionIssuedAt(null);
    setSupabaseCustomer(null);
    setAuthVerificationNotice(
      isSuspended
        ? 'Your BEE4 account is currently suspended. Please contact BEE4 support for assistance.'
        : 'Your BEE4 session was signed out for security. Please log in again.'
    );
    if (supabaseUser) {
      void signOutFromSupabase().catch(() => {});
    }
  }, [rawActiveCustomer, isActiveCustomerBlocked, supabaseUser]);

  const currentCustomer = isActiveCustomerBlocked ? null : rawActiveCustomer;
  const activeWishlistIds = currentCustomer ? currentCustomer.wishlistIds : guestWishlistIds;

  const handleGoogleSignIn = async () => {
    await signInWithGoogleSupabase(activePage === 'manager' ? '/admin' : '/account');
  };

  const handleSyncAuthenticatedUser = async (
    sbUser: User,
    hints?: { fullName?: string; phone?: string }
  ) => {
    setSupabaseUser(sbUser);
    setSessionIssuedAt(new Date().toISOString());
    const { profile } = await ensureSupabaseCustomerProfile(
      sbUser,
      guestWishlistRef.current,
      hints
    );
    setSupabaseCustomer(profile);
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === profile.id);
      return exists ? prev.map((c) => (c.id === profile.id ? profile : c)) : [profile, ...prev];
    });
    if (guestWishlistRef.current.length > 0) {
      setGuestWishlistIds([]);
    }
    if (sbUser.email_confirmed_at) {
      setAuthVerificationNotice('Email Verified Successfully! Welcome to BEE4.');
    }
  };

  const handleCompleteCustomerAuth = (profile: CustomerProfile) => {
    const mergedWishlist = Array.from(
      new Set([...(profile.wishlistIds ?? []), ...guestWishlistRef.current])
    );
    const enriched: CustomerProfile = {
      ...profile,
      wishlistIds: mergedWishlist,
    };
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === enriched.id);
      return exists ? prev.map((c) => (c.id === enriched.id ? enriched : c)) : [enriched, ...prev];
    });
    setCurrentCustomerId(enriched.id);
    setSessionIssuedAt(new Date().toISOString());
    if (supabaseUser && enriched.id === supabaseUser.id) {
      setSupabaseCustomer(enriched);
      void updateSupabaseCustomerProfile(enriched).catch((err) => console.error(err));
    }
    if (guestWishlistRef.current.length > 0) {
      setGuestWishlistIds([]);
    }
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
      customerMessages,
      productReviews,
    });
    recordAuditLog(
      'CLOUD_SYNC_COMPLETED',
      'settings',
      'supabase',
      'Synchronized full BEE4 catalog, orders, returns, messages, reviews, 3D print queue, and settings to Supabase Postgres.'
    );
  };

  const handlePurgeTestData = async () => {
    if (typeof window !== 'undefined') {
      clearAllLocalTestCaches(window.localStorage);
    }
    const supaRes = await purgeTestDataInSupabase();
    setOrders([]);
    setReturns([]);
    setInventoryAdjustments([]);
    setInquiries([]);
    setCustomerMessages([]);
    setProductReviews([]);
    setProductQuestions([]);
    setTestimonials([]);
    setCustomers([]);
    setGiftCards([]);
    setPrintJobs([]);
    setAuditLogs([]);
    setCrmFlagsByPhone({});
    setAdSpendLogs([]);
    setCoupons(INITIAL_COUPONS);
    return supaRes;
  };

  const handleCustomerSignOut = () => {
    setCurrentCustomerId(null);
    setSessionIssuedAt(null);
    setSupabaseCustomer(null);
    setAuthRecoveryMode(false);
    setAuthVerificationNotice('');
    if (supabaseUser) {
      void signOutFromSupabase().catch((err) => console.error(err));
    }
  };

  const handleUpdateCustomer = (updated: CustomerProfile) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      return exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...prev];
    });
    if (supabaseUser && updated.id === supabaseUser.id) {
      setSupabaseCustomer(updated);
      void updateSupabaseCustomerProfile(updated).catch((err) => console.error(err));
    }
  };

  const handleUpdateCustomerAdmin = (updated: CustomerProfile) => {
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      return exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...prev];
    });
    if (supabaseCustomer?.id === updated.id) {
      setSupabaseCustomer(updated);
    }
    if (isSupabaseAdmin) {
      void updateCustomerRecordAdminSupabase(updated).catch((err) => console.error(err));
    }
    recordAuditLog(
      'CUSTOMER_PROFILE_UPDATED_ADMIN',
      'customer',
      updated.id,
      `Admin updated customer profile for ${updated.fullName}.`
    );
  };

  const handleAdjustCustomerWalletAdmin = (
    customer: CustomerProfile,
    deltaAmount: number,
    note: string
  ) => {
    const adminEmail = supabaseUser?.email || 'studio-owner@bee4.in';
    const { updatedProfile, appliedDelta } = adjustCustomerWalletBalance({
      profile: customer,
      deltaAmount,
      note,
      adminEmail,
    });
    handleUpdateCustomerAdmin(updatedProfile);
    recordAuditLog(
      'CUSTOMER_WALLET_ADJUSTED',
      'customer',
      customer.id,
      `${appliedDelta >= 0 ? 'Credited' : 'Debited'} ₹${Math.abs(appliedDelta)} on ${customer.fullName}'s BEE4 Wallet (${note || 'Studio Adjustment'}).`
    );
  };

  const handleForceLogoutCustomerAdmin = (customer: CustomerProfile) => {
    const updated: CustomerProfile = {
      ...customer,
      forceLoggedOutAt: new Date().toISOString(),
      devices: [],
    };
    handleUpdateCustomerAdmin(updated);
    recordAuditLog(
      'CUSTOMER_FORCE_LOGOUT',
      'customer',
      customer.id,
      `Forced logout on all active devices for ${customer.fullName}.`
    );
  };

  const handleToggleCustomerStatusAdmin = (customer: CustomerProfile) => {
    const nextStatus = customer.accountStatus === 'Suspended' ? 'Active' : 'Suspended';
    const updated: CustomerProfile = {
      ...customer,
      accountStatus: nextStatus,
    };
    handleUpdateCustomerAdmin(updated);
    recordAuditLog(
      'CUSTOMER_STATUS_UPDATED',
      'customer',
      customer.id,
      `Set customer ${customer.fullName} account status to ${nextStatus}.`
    );
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

  const handleCancelCustomerOrder = async (
    orderNumber: string,
    reason = 'Ordered by mistake'
  ): Promise<void> => {
    const targetOrder = orders.find((o) => o.orderNumber === orderNumber);
    if (!targetOrder) return;

    const res = applyOrderCancellation({
      order: targetOrder,
      products,
      reason,
      cancelledBy: 'Customer',
      autoRestock: true,
      issueRefundCredit: true,
    });

    if (supabaseDiagnostics.isConfigured) {
      await cancelOrderInSupabase({
        orderNumber,
        reason,
        cancelledBy: 'Customer',
        autoRestock: true,
        refundStatus: res.updatedOrder.refundStatus,
        refundedAmount: res.updatedOrder.refundedAmount,
        paymentStatus: res.updatedOrder.paymentStatus,
        updatedProductsToRestock: res.restoredLogs.map((log) => {
          const prod = res.updatedProducts.find((p) => p.id === log.productId);
          return {
            id: log.productId,
            stockQuantity: prod?.stockQuantity ?? 25,
            inStock: prod?.inStock ?? true,
          };
        }),
      });
    }

    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === orderNumber ? res.updatedOrder : o))
    );
    setProducts(res.updatedProducts);
    if (res.restoredLogs.length > 0) {
      setInventoryAdjustments((prev) => [...res.restoredLogs, ...prev].slice(0, 80));
    }

    if (res.issuedGiftCard) {
      if (currentCustomer && res.refundAmountToCredit > 0) {
        const nowIso = new Date().toISOString();
        const prevBalance = Math.max(0, Math.round(Number(currentCustomer.walletBalance ?? 0)));
        const nextBalance = prevBalance + res.refundAmountToCredit;
        handleUpdateCustomer({
          ...currentCustomer,
          walletBalance: nextBalance,
          walletTransactions: [
            {
              id: `wtx-cancel-${Date.now()}`,
              type: 'credit_refund',
              amount: res.refundAmountToCredit,
              balanceAfter: nextBalance,
              referenceId: orderNumber,
              note: `Automatic store credit refund for cancelled order ${orderNumber}`,
              createdAt: nowIso,
            },
            ...(currentCustomer.walletTransactions ?? []),
          ],
        });
      } else {
        setGiftCards((prev) => [res.issuedGiftCard!, ...prev]);
        void createGiftCardInSupabase(res.issuedGiftCard).catch((err) => console.error(err));
      }
    }
  };

  const handleAdminCancelOrder = async (payload: {
    orderNumber: string;
    reason: string;
    autoRestock: boolean;
    issueRefundCredit: boolean;
  }): Promise<void> => {
    const targetOrder = orders.find((o) => o.orderNumber === payload.orderNumber);
    if (!targetOrder) return;

    const res = applyOrderCancellation({
      order: targetOrder,
      products,
      reason: payload.reason,
      cancelledBy: 'Admin',
      autoRestock: payload.autoRestock,
      issueRefundCredit: payload.issueRefundCredit,
    });

    if (supabaseDiagnostics.isConfigured) {
      await cancelOrderInSupabase({
        orderNumber: payload.orderNumber,
        reason: payload.reason,
        cancelledBy: 'Admin',
        autoRestock: payload.autoRestock,
        refundStatus: res.updatedOrder.refundStatus,
        refundedAmount: res.updatedOrder.refundedAmount,
        paymentStatus: res.updatedOrder.paymentStatus,
        updatedProductsToRestock: res.restoredLogs.map((log) => {
          const prod = res.updatedProducts.find((p) => p.id === log.productId);
          return {
            id: log.productId,
            stockQuantity: prod?.stockQuantity ?? 25,
            inStock: prod?.inStock ?? true,
          };
        }),
      });

      if (isSupabaseAdmin) {
        const restockedIds = new Set(res.restoredLogs.map((l) => l.productId));
        for (const p of res.updatedProducts) {
          if (restockedIds.has(p.id)) {
            void saveProductToSupabase(p).catch((err) => console.error(err));
          }
        }
        for (const log of res.restoredLogs) {
          void writeInventoryAdjustmentToSupabase(log).catch((err) => console.error(err));
        }
      }
    }

    setOrders((prev) =>
      prev.map((o) => (o.orderNumber === payload.orderNumber ? res.updatedOrder : o))
    );
    setProducts(res.updatedProducts);
    if (res.restoredLogs.length > 0) {
      setInventoryAdjustments((prev) => [...res.restoredLogs, ...prev].slice(0, 80));
    }

    if (res.issuedGiftCard) {
      setGiftCards((prev) => [res.issuedGiftCard!, ...prev]);
      void createGiftCardInSupabase(res.issuedGiftCard).catch((err) => console.error(err));
    }

    recordAuditLog(
      'ORDER_CANCELLED_ADMIN',
      'order',
      payload.orderNumber,
      `Admin cancelled ${payload.orderNumber} (${payload.reason})${
        payload.autoRestock ? ' + auto-restocked' : ''
      }${res.issuedGiftCard ? ` + issued ₹${res.refundAmountToCredit} credit` : ''}.`
    );
  };

  const handleIssueGiftCard = async (input: {
    amount: number;
    recipientName: string;
    recipientEmail: string;
    message: string;
    issuedBy?: 'Customer' | 'Admin';
  }): Promise<GiftCardRecord> => {
    const isAdminIssued = input.issuedBy === 'Admin';
    const card = createDigitalGiftCard({
      amount: input.amount,
      purchaserUserId: supabaseUser?.id ?? currentCustomer?.id ?? null,
      purchaserName: isAdminIssued
        ? 'BEE4 Studio'
        : currentCustomer?.fullName || 'BEE4 Customer',
      purchaserEmail: isAdminIssued
        ? settings.supportEmail
        : currentCustomer?.email || settings.supportEmail,
      purchaserPhone: currentCustomer?.phone || '',
      recipientName: input.recipientName,
      recipientEmail: input.recipientEmail,
      message: input.message,
      issuedReason: isAdminIssued ? 'Admin Promo' : 'Purchased',
    });
    setGiftCards((prev) => [card, ...prev]);
    await createGiftCardInSupabase(card);
    if (isAdminIssued) {
      recordAuditLog(
        'GIFTCARD_ISSUED',
        'giftcard',
        card.code,
        `Issued ₹${card.initialAmount} digital gift card for ${card.recipientName} (${card.recipientEmail}).`
      );
    }
    return card;
  };

  const handleRedeemGiftCard = async (
    code: string,
    pin: string
  ): Promise<{ ok: boolean; creditedAmount?: number; error?: string }> => {
    if (!currentCustomer) {
      return { ok: false, error: 'Please sign in to redeem a BEE4 Gift Card to your Wallet.' };
    }

    if (supabaseDiagnostics.isConfigured && supabaseUser) {
      try {
        const rpcRes = await redeemGiftCardViaSupabaseRpc(code, pin);
        if (rpcRes.usedRpc && rpcRes.creditedAmount && rpcRes.creditedAmount > 0) {
          const prevBal = Math.max(0, Math.round(Number(currentCustomer.walletBalance ?? 0)));
          const balanceAfter = prevBal + Math.round(rpcRes.creditedAmount);
          const nowIso = rpcRes.redeemedAt || new Date().toISOString();
          const tx = {
            id: `wtx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'credit_gift_card' as const,
            amount: Math.round(rpcRes.creditedAmount),
            balanceAfter,
            referenceId: rpcRes.code || code.trim().toUpperCase(),
            note: `Redeemed Gift Card ${rpcRes.code || code.trim().toUpperCase()}`,
            createdAt: nowIso,
          };
          const updatedProfile: CustomerProfile = {
            ...currentCustomer,
            walletBalance: balanceAfter,
            walletTransactions: [tx, ...(currentCustomer.walletTransactions ?? [])],
          };
          setGiftCards((prev) =>
            prev.map((c) =>
              c.code.toUpperCase() === (rpcRes.code || code.trim().toUpperCase())
                ? { ...c, balance: 0, redeemedAt: nowIso, redeemedByUserId: currentCustomer.id }
                : c
            )
          );
          handleUpdateCustomer(updatedProfile);
          return { ok: true, creditedAmount: Math.round(rpcRes.creditedAmount) };
        }
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'Unable to verify gift card.',
        };
      }
    }

    const localRes = redeemGiftCardIntoProfile({
      code,
      pin,
      giftCards,
      profile: currentCustomer,
    });
    if (localRes.ok === false) {
      return { ok: false, error: localRes.error };
    }
    setGiftCards(localRes.updatedGiftCards);
    void updateGiftCardInSupabase(localRes.redeemedCard).catch((err) => console.error(err));
    handleUpdateCustomer(localRes.updatedProfile);
    return { ok: true, creditedAmount: localRes.creditedAmount };
  };

  const handleToggleGiftCardActive = (card: GiftCardRecord) => {
    const updated: GiftCardRecord = { ...card, active: !card.active };
    setGiftCards((prev) => prev.map((c) => (c.id === card.id ? updated : c)));
    void updateGiftCardInSupabase(updated).catch((err) => console.error(err));
    recordAuditLog(
      'GIFTCARD_TOGGLED',
      'giftcard',
      card.code,
      `${updated.active ? 'Activated' : 'Disabled'} digital gift card ${card.code}.`
    );
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
        <AppSplashScreen isStandalone={pwaInstall.isInstalled} />
      )}

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
        {activePage !== 'manager' && <OfflineFallbackNotice isOnline={isOnline} />}
        {activePage !== 'manager' && activePage !== 'checkout' && (
          <PwaInstallBanner
            visible={pwaInstall.showBanner}
            onInstall={() => void pwaInstall.triggerInstall()}
            onDismiss={pwaInstall.dismissBanner}
          />
        )}
        {activePage === 'home' && (
          <HomeView
            products={publicProducts}
            testimonials={testimonials}
            reviews={productReviews}
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
            onSubmitReview={handleSubmitProductReview}
          />
        )}

        {activePage === 'shop' && (
          <ShopView
            products={publicProducts}
            reviews={productReviews}
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
            reviews={productReviews}
            wishlistIds={activeWishlistIds}
            initialOccasion={giftFinderOccasion}
            giftWrapFee={settings.giftWrapFee}
            giftWrapEnabled={settings.giftWrapEnabled}
            giftFinderWeights={settings.giftFinderWeights}
            onSelectProduct={handleSelectProduct}
            onQuickView={setQuickViewProduct}
            onQuickAdd={handleQuickAdd}
            onToggleWishlist={handleToggleWishlist}
            onOpenGiftCardModal={() => {
              setGiftCardModalMode('personal');
              setShowBuyGiftCardModal(true);
            }}
          />
        )}

        {activePage === 'product' && activeProduct && (
          <ProductDetailView
            key={activeProduct.id}
            product={activeProduct}
            relatedProducts={relatedProducts}
            reviews={productReviews}
            productQuestions={productQuestions}
            qaEnabled={settings.customerPanelControls?.enableProductQa ?? true}
            wishlistIds={activeWishlistIds}
            whatsappNumber={settings.whatsappNumber}
            cartCount={totalCartItems}
            onOpenCart={() => setIsCartOpen(true)}
            onBackToShop={() => navigateTo('shop')}
            onSelectProduct={handleSelectProduct}
            onQuickView={setQuickViewProduct}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onToggleWishlist={handleToggleWishlist}
            onSubmitReview={handleSubmitProductReview}
            onSubmitProductQuestion={handleSubmitProductQuestion}
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
            existingCustomers={customers}
            orders={orders}
            returns={returns}
            giftCards={giftCards}
            customerMessages={customerMessages}
            productQuestions={productQuestions}
            products={publicProducts}
            guestWishlistIds={guestWishlistIds}
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            cloudUserEmail={supabaseUser?.email ?? null}
            isCloudConnected={supabaseDiagnostics.isConfigured}
            customerPanelControls={settings.customerPanelControls}
            requestedTab={requestedAccountTab}
            onConsumeRequestedTab={() => setRequestedAccountTab(null)}
            onTabChange={setCurrentAccountTab}
            showInstallApp={!pwaInstall.isInstalled}
            onInstallApp={() => void pwaInstall.triggerInstall()}
            authRecoveryMode={authRecoveryMode}
            authVerificationNotice={authVerificationNotice}
            onClearAuthVerificationNotice={() => setAuthVerificationNotice('')}
            onClearAuthRecoveryMode={() => setAuthRecoveryMode(false)}
            onGoogleSignIn={handleGoogleSignIn}
            onSyncAuthenticatedUser={handleSyncAuthenticatedUser}
            onCompleteCustomerAuth={handleCompleteCustomerAuth}
            onSignOut={handleCustomerSignOut}
            onUpdateCustomer={handleUpdateCustomer}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onReorderItems={handleReorderItems}
            onCancelOrder={handleCancelCustomerOrder}
            onCreateReturnRequest={handleCreateReturnRequest}
            onOpenBuyGiftCardModal={(mode = 'personal') => {
              setGiftCardModalMode(mode);
              setShowBuyGiftCardModal(true);
            }}
            onRedeemGiftCard={handleRedeemGiftCard}
            onSubmitCustomerMessage={handleSubmitCustomerMessage}
            onSubmitProductReview={handleSubmitProductReview}
            onSubmitProductQuestion={handleSubmitProductQuestion}
            onSelectProduct={handleSelectProduct}
            onContinueShopping={() => navigateTo('shop')}
            onRefreshOrders={handleRefreshUserOrders}
          />
        )}

        {activePage === 'about' && <AboutView onNavigate={navigateTo} />}

        {activePage === 'contact' && (
          <ContactView
            whatsappNumber={settings.whatsappNumber}
            supportEmail={settings.supportEmail}
            onSubmitInquiry={handleSubmitInquiry}
            onSubmitCustomerMessage={handleSubmitCustomerMessage}
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
              customerMessages={customerMessages}
              productReviews={productReviews}
              productQuestions={productQuestions}
              customers={customers}
              coupons={coupons}
              giftCards={giftCards}
              printJobs={printJobs}
              spools={spools}
              auditLogs={auditLogs}
              crmFlagsByPhone={crmFlagsByPhone}
              integrations={marketplaceIntegrations}
              automationRules={automationRules}
              adSpendLogs={adSpendLogs}
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
              onBulkUpdateOrders={handleBulkUpdateOrders}
              onCancelOrderAdmin={handleAdminCancelOrder}
              onUpdateOrderSettlement={handleUpdateOrderSettlement}
              onUpdateReturnRequest={handleUpdateReturnRequest}
              onSaveCoupon={handleSaveCoupon}
              onDeleteCoupon={handleDeleteCoupon}
              onCreateGiftCardAdmin={handleIssueGiftCard}
              onToggleGiftCardActive={handleToggleGiftCardActive}
              onSavePrintJob={handleSavePrintJob}
              onSaveFilamentSpool={handleSaveFilamentSpool}
              onSetCustomerFlag={handleSetCustomerFlag}
              onUpdateCustomerAdmin={handleUpdateCustomerAdmin}
              onAdjustCustomerWallet={handleAdjustCustomerWalletAdmin}
              onForceLogoutCustomer={handleForceLogoutCustomerAdmin}
              onToggleCustomerStatus={handleToggleCustomerStatusAdmin}
              onToggleInquiryStatus={handleToggleInquiryStatus}
              onUpdateCustomerMessage={handleUpdateCustomerMessage}
              onDeleteCustomerMessage={handleDeleteCustomerMessage}
              onBulkDeleteCustomerMessages={handleBulkDeleteCustomerMessages}
              onSaveProductReview={handleSaveProductReview}
              onDeleteProductReview={handleDeleteProductReview}
              onSaveProductQuestion={handleSaveProductQuestionAdmin}
              onDeleteProductQuestion={handleDeleteProductQuestionAdmin}
              onSaveIntegration={handleSaveIntegration}
              onImportOrders={handleImportMarketplaceOrders}
              onSaveAutomationRule={handleSaveAutomationRule}
              onDeleteAutomationRule={handleDeleteAutomationRule}
              onRunAutomationRulesNow={handleRunAutomationRulesNow}
              onSaveAdSpend={handleSaveAdSpend}
              onChangeAdminPasswordHash={handleChangeAdminPasswordHash}
              onPurgeTestData={handlePurgeTestData}
              onRefreshOrders={handleRefreshAdminOrders}
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
          showInstallApp={!pwaInstall.isInstalled}
          onInstallApp={() => void pwaInstall.triggerInstall()}
          onNavigate={navigateTo}
          onOpenGiftCardModal={() => {
            setGiftCardModalMode('personal');
            setShowBuyGiftCardModal(true);
          }}
        />
      )}

      {activePage !== 'manager' && (
        <WhatsAppWidget
          whatsappNumber={settings.whatsappNumber}
          cart={cart}
          activeProduct={activePage === 'product' ? activeProduct : null}
        />
      )}

      {activePage !== 'manager' && activePage !== 'product' && activePage !== 'checkout' && (
        <MobileBottomNav
          activePage={activePage}
          activeAccountTab={currentAccountTab}
          categoriesOpen={isCategoriesSheetOpen}
          cartCount={totalCartItems}
          isSignedIn={Boolean(currentCustomer)}
          onSelectHome={() => {
            setIsCategoriesSheetOpen(false);
            navigateTo('home');
          }}
          onOpenCategories={() => setIsCategoriesSheetOpen(true)}
          onOpenCart={() => {
            setIsCategoriesSheetOpen(false);
            setIsCartOpen(true);
          }}
          onSelectOrders={() => {
            setIsCategoriesSheetOpen(false);
            setRequestedAccountTab('orders');
            navigateTo('account');
          }}
          onSelectAccount={() => {
            setIsCategoriesSheetOpen(false);
            setRequestedAccountTab('overview');
            navigateTo('account');
          }}
        />
      )}

      <MobileCategoriesSheet
        isOpen={isCategoriesSheetOpen}
        selectedCategory={shopCategory}
        selectedAgeGroup={shopAgeGroup}
        searchQuery={shopSearch}
        onClose={() => setIsCategoriesSheetOpen(false)}
        onApplyFilter={({ category, ageGroup, search, page }) => {
          if (category !== undefined) setShopCategory(category);
          if (ageGroup !== undefined) setShopAgeGroup(ageGroup);
          if (search !== undefined) setShopSearch(search);
          navigateTo(page ?? 'shop');
        }}
      />

      <PwaInstallModal
        isOpen={pwaInstall.showGuideModal}
        platform={pwaInstall.platform}
        onClose={pwaInstall.closeGuideModal}
      />

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
          reviews={productReviews}
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

      {showBuyGiftCardModal && (
        <BuyGiftCardModal
          currentCustomer={currentCustomer}
          initialMode={giftCardModalMode}
          onClose={() => setShowBuyGiftCardModal(false)}
          onIssueGiftCard={handleIssueGiftCard}
          onRedeemImmediately={handleRedeemGiftCard}
        />
      )}
    </div>
  );
}
