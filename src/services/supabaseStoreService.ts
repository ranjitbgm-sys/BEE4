import type { User } from '@supabase/supabase-js';
import {
  getAllowedAdminEmails,
  isSupabaseAdminUser,
  SUPABASE_PRODUCT_BUCKET,
  supabase,
} from '../lib/supabase';
import { DEFAULT_STORE_SETTINGS, hydrateProductAdminFields, INITIAL_PRODUCTS } from '../data/catalog';
import {
  AdminAuditLog,
  AgeGroup,
  AutomationActionType,
  AutomationConditionField,
  AutomationRule,
  AutomationTrigger,
  CancelledByRole,
  CartItem,
  CouponRecord,
  CrmCustomerFlag,
  CustomerAccountStatus,
  CustomerCustomDesign,
  CustomerDeviceSession,
  CustomerGender,
  CustomerInquiry,
  CustomerMessageRecord,
  CustomerMessageStatus,
  CustomerNotificationPreferences,
  CustomerProfile,
  FilamentSpool,
  FulfillmentStage,
  GiftCardRecord,
  GiftOccasion,
  HsnCode,
  InventoryAdjustmentRecord,
  MarketplaceChannel,
  MarketplaceIntegrationConfig,
  MarketplaceListingMap,
  MonthlyAdSpendRecord,
  OperationalOrderBucket,
  OrderChannel,
  OrderRecord,
  OrderSettlementRecord,
  OrderStatus,
  PackingVerificationProof,
  PaymentMethod,
  PaymentStatus,
  PrimaryStoreCategory,
  PrintJobRecord,
  Product,
  ProductAngle,
  ProductCategory,
  ProductQuestionRecord,
  ProductReviewRecord,
  ProductReviewStatus,
  ProductVisibilityStatus,
  RefundMode,
  ReturnItemEntry,
  ReturnReason,
  ReturnRequestRecord,
  ReturnRequestStatus,
  ReturnResolutionType,
  SavedAddress,
  StoreSettings,
  Testimonial,
  WalletTransactionRecord,
} from '../types';
import { sanitizeRichInput, sanitizeSingleLine } from '../utils/adminLogic';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  joinFirstLastName,
  normalizeCustomerPanelControls,
  splitFullName,
} from '../utils/customerAccountLogic';

const VALID_SKILL_CATEGORIES = new Set<string>([
  ProductCategory.ENGINEERING,
  ProductCategory.MATHS_SCIENCE,
  ProductCategory.MOTOR_SKILLS,
  ProductCategory.IMAGINATION,
]);

const VALID_AGE_GROUPS = new Set<string>([
  AgeGroup.AGE_3_5,
  AgeGroup.AGE_6_8,
  AgeGroup.AGE_9_11,
  AgeGroup.AGE_12_15,
]);

const VALID_PRIMARY_CATEGORIES = new Set<string>([
  'Brain-Training Toys',
  '3D Home Decor',
  'Stainless Steel Flasks',
  'Lifestyle Gear',
]);

const VALID_HSN = new Set<string>(['3926', '7323', '4202']);
const VALID_VISIBILITY = new Set<string>(['Active', 'Draft', 'Archived']);
const DEVANAGARI_RE = /[\u0900-\u097F]/;

function sanitizeId(raw: string, fallbackPrefix: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120);
  return cleaned.length >= 2 ? cleaned : `${fallbackPrefix}-${Date.now()}`;
}

function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const sanitized = sanitizeRichInput(val ?? '', maxLen);
  if (!sanitized) return fallback.slice(0, maxLen);
  return sanitized;
}

function clampSingleLine(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const sanitized = sanitizeSingleLine(val ?? '', maxLen);
  if (!sanitized) return fallback.slice(0, maxLen);
  return sanitized;
}

function sanitizeEnglishText(
  raw: unknown,
  seedFallback: string | undefined,
  defaultFallback: string
): string {
  const str = typeof raw === 'string' ? raw.trim() : '';
  if (str && !DEVANAGARI_RE.test(str)) {
    return str;
  }
  return seedFallback ?? defaultFallback;
}

function normalizeAssetPath(url: string): string {
  const trimmed = url.trim();
  const srcMatch = trimmed.match(/^(?:\.?\/)?src\/assets\/images\/(.+)$/);
  if (srcMatch) {
    return `/assets/images/${srcMatch[1]}`;
  }
  const relMatch = trimmed.match(/^(?:\.\/)?assets\/images\/(.+)$/);
  if (relMatch) {
    return `/assets/images/${relMatch[1]}`;
  }
  return trimmed;
}

function buildFallbackGallery(primaryUrl: string): [ProductAngle, ProductAngle, ProductAngle] {
  return [
    {
      id: 'front',
      label: 'View 1: Front',
      shortLabel: 'Front',
      url: normalizeAssetPath(primaryUrl) || '/assets/images/toy_engineering_front_1794767911598.jpg',
      objectPosition: '50% 50%',
    },
    {
      id: 'mechanism',
      label: 'View 2: Mechanism/Inside',
      shortLabel: 'Mechanism',
      url: '/assets/images/toy_mechanism_inside_1794767912639.jpg',
      objectPosition: '50% 50%',
    },
    {
      id: 'scale',
      label: 'View 3: Hands-On Scale',
      shortLabel: 'Scale',
      url: '/assets/images/toy_hands_on_scale_1794767913261.jpg',
      objectPosition: '50% 50%',
    },
  ];
}

// ============================================================================
// Authentication & Admin RBAC
// ============================================================================

export function onSupabaseAuthChange(
  callback: (user: User | null) => void
): () => void {
  if (!supabase) {
    callback(null);
    return () => {};
  }

  void supabase.auth.getSession().then(({ data }) => {
    callback(data.session?.user ?? null);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

export function onSupabaseAuthEvent(
  callback: (event: string, user: User | null) => void
): () => void {
  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session?.user ?? null);
  });

  return () => {
    subscription.unsubscribe();
  };
}

function resolveSiteRedirectUrl(redirectPath = '/account'): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://bee4.in';
  const normalizedPath = redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`;
  return `${origin}${normalizedPath}`;
}

export async function signUpCustomerSupabase(input: {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}): Promise<{ user: User | null; requiresEmailVerification: boolean }> {
  if (!supabase) {
    throw new Error(
      'BEE4 Account verification service is currently in local studio mode.'
    );
  }
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPhone = (input.phone ?? '').replace(/\D/g, '').slice(-10);
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: input.password,
    options: {
      emailRedirectTo: resolveSiteRedirectUrl('/account'),
      data: {
        full_name: clampSingleLine(input.fullName, 100, 'BEE4 Customer'),
        phone: cleanPhone,
      },
    },
  });
  if (error) throw error;
  const user = data.user ?? data.session?.user ?? null;
  const requiresEmailVerification = !data.session || !user?.email_confirmed_at;
  return { user, requiresEmailVerification };
}

export async function verifyCustomerEmailOtpSupabase(
  email: string,
  token: string
): Promise<User> {
  if (!supabase) {
    throw new Error('BEE4 Account verification service is not active.');
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  const { data, error } = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'signup',
  });

  if (!error && data.user) {
    return data.user;
  }

  // Fallback for accounts using magic-link / email OTP token type
  const fallback = await supabase.auth.verifyOtp({
    email: cleanEmail,
    token: cleanToken,
    type: 'email',
  });
  if (fallback.error) throw fallback.error;
  if (!fallback.data.user) {
    throw error || new Error('Invalid or expired verification code.');
  }
  return fallback.data.user;
}

export async function resendCustomerVerificationEmailSupabase(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('BEE4 Account verification service is not active.');
  }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: resolveSiteRedirectUrl('/account'),
    },
  });
  if (error) throw error;
}

export async function sendCustomerEmailLoginOtpSupabase(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('BEE4 Account sign-in service is not active.');
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: resolveSiteRedirectUrl('/account'),
    },
  });
  if (error) throw error;
}

export async function verifyCustomerEmailLoginOtpSupabase(
  email: string,
  token: string
): Promise<User> {
  if (!supabase) {
    throw new Error('BEE4 Account verification service is not active.');
  }
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error('Invalid or expired 6-digit login code.');
  }
  return data.user;
}

export async function signInCustomerWithEmailPasswordSupabase(
  email: string,
  password: string
): Promise<User> {
  if (!supabase) {
    throw new Error('BEE4 Account password sign-in is not active.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error('Sign-in did not return an active BEE4 session.');
  }
  return data.user;
}

export async function sendCustomerPasswordResetEmailSupabase(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('BEE4 Account recovery service is not active.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: resolveSiteRedirectUrl('/account'),
  });
  if (error) throw error;
}

export async function updateSupabaseUserPassword(newPassword: string): Promise<User> {
  if (!supabase) {
    throw new Error('BEE4 Account security service is not active.');
  }
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  if (!data.user) {
    throw new Error('Password update failed to return user profile.');
  }
  return data.user;
}

export async function refreshSupabaseSessionUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? null;
}

export async function signInWithGoogleSupabase(redirectPath = '/admin'): Promise<void> {
  if (!supabase) {
    throw new Error('Google Sign-In is currently unavailable in this session.');
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: resolveSiteRedirectUrl(redirectPath),
    },
  });
  if (error) throw error;
}

export async function signInAdminWithEmailPassword(
  email: string,
  password: string
): Promise<User> {
  if (!supabase) {
    throw new Error('Cloud admin auth is not configured. Use Studio Key for local admin mode.');
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error('Authentication did not return a user session.');
  }
  return data.user;
}

export async function sendSupabasePhoneOtp(phoneE164: string): Promise<void> {
  if (!supabase) {
    throw new Error('BEE4 SMS OTP service is currently in offline verification mode.');
  }
  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
  if (error) throw error;
}

export async function verifySupabasePhoneOtp(
  phoneE164: string,
  token: string
): Promise<User> {
  if (!supabase) {
    throw new Error('BEE4 SMS OTP verification is not active.');
  }
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: token.trim(),
    type: 'sms',
  });
  if (error) throw error;
  if (!data.user) throw new Error('Invalid OTP code.');
  return data.user;
}

export async function signOutFromSupabase(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function verifySupabaseAdminAccess(user: User | null): Promise<{
  authorized: boolean;
  reason?: string;
}> {
  if (!user) {
    return { authorized: false, reason: 'Not signed in.' };
  }

  if (isSupabaseAdminUser(user)) {
    return { authorized: true };
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.is_admin === true) {
        return { authorized: true };
      }
    } catch {
      // Ignore profile table lookup errors if SQL script not yet executed
    }
  }

  const email = user.email?.toLowerCase() ?? '';
  const allowlist = getAllowedAdminEmails();
  return {
    authorized: false,
    reason: email
      ? `${email} is not authorized in admin allowlist (${allowlist.join(', ')}).`
      : 'Your signed-in BEE4 account does not have admin privileges.',
  };
}

// ============================================================================
// Product Row Mapping & Realtime Sync
// ============================================================================

function toProductRow(product: Product): Record<string, unknown> {
  const id = sanitizeId(product.id, 'prod');
  const variants = (product.variants.length > 0 ? product.variants : ['Standard Studio Edition'])
    .slice(0, 10)
    .map((v) => clampSingleLine(v, 80, 'Standard Studio Edition'));

  const primaryCategory: PrimaryStoreCategory = VALID_PRIMARY_CATEGORIES.has(
    product.primaryCategory || ''
  )
    ? (product.primaryCategory as PrimaryStoreCategory)
    : 'Brain-Training Toys';

  const skills = (product.skills && product.skills.length > 0 ? product.skills : [product.category])
    .filter((s) => VALID_SKILL_CATEGORIES.has(s))
    .slice(0, 4);

  const ageGroups = (
    product.ageGroups && product.ageGroups.length > 0 ? product.ageGroups : [product.ageGroup]
  )
    .filter((a) => VALID_AGE_GROUPS.has(a))
    .slice(0, 4);

  const galleryUrls = (product.gallery ?? [])
    .map((g) => normalizeAssetPath(g.url))
    .filter((u) => u.length > 0 && u.length <= 2000)
    .slice(0, 3);

  return {
    id,
    sku: clampSingleLine(product.sku || `BEE4-${id.slice(0, 8).toUpperCase()}`, 64),
    slug: clampSingleLine(product.slug || id, 128),
    title: clampSingleLine(product.title, 140, 'BEE4 Brain Toy'),
    primary_category: primaryCategory,
    category: VALID_SKILL_CATEGORIES.has(product.category)
      ? product.category
      : ProductCategory.ENGINEERING,
    skills: skills.length > 0 ? skills : [ProductCategory.ENGINEERING],
    age_group: VALID_AGE_GROUPS.has(product.ageGroup) ? product.ageGroup : AgeGroup.AGE_6_8,
    age_groups: ageGroups.length > 0 ? ageGroups : [AgeGroup.AGE_6_8],
    origin_concept: clampSingleLine(product.originConcept, 120, 'Japanese Brain-Training Toy'),
    occasion: product.occasion,
    price: Math.max(1, Math.min(500000, Number(product.price) || 449)),
    compare_at_price:
      typeof product.compareAtPrice === 'number' && product.compareAtPrice > 0
        ? Math.min(500000, product.compareAtPrice)
        : null,
    manufacturing_cost: Math.max(
      0,
      Math.min(500000, Number(product.manufacturingCost ?? Math.round((product.price || 449) * 0.34)))
    ),
    image: clampSingleLine(
      normalizeAssetPath(product.image),
      2000,
      '/assets/images/toy_engineering_front_1794767911598.jpg'
    ),
    gallery_urls: galleryUrls,
    variants,
    short_spec: clampSingleLine(product.shortSpec, 200, '3D-printed Bio-PLA+ · Screen-free'),
    description: clampStr(product.description, 2000, 'Custom 3D-printed screen-free brain-training toy.'),
    use_case_hi: clampStr(
      product.useCaseHi,
      1000,
      'Hands-on mechanical puzzle engineered to spark curiosity away from screens.'
    ),
    brain_benefits_hi: clampStr(
      product.brainBenefitsHi,
      1000,
      'Strengthens logical thinking, focus, and spatial dexterity.'
    ),
    why_parents_buy_hi: clampStr(
      product.whyParentsBuyHi,
      1000,
      'Offers a tactile screen-free challenge for kids and families.'
    ),
    materials: clampSingleLine(product.materials, 300, 'Food-Safe Matte Bio-PLA+'),
    care_instruction: clampSingleLine(
      product.careInstruction || 'Keep away from >55°C heat (Eco-PLA)',
      200
    ),
    dimensions: clampSingleLine(product.dimensions, 200, 'Standard'),
    weight_grams: Math.max(0, Math.min(50000, Number(product.weightGrams ?? 180))),
    hsn_code: VALID_HSN.has(product.hsnCode || '') ? product.hsnCode : '3926',
    stock_quantity: Math.max(
      0,
      Math.min(100000, Number(product.stockQuantity ?? (product.inStock ? 10 : 0)))
    ),
    low_stock_threshold: Math.max(0, Math.min(1000, Number(product.lowStockThreshold ?? 5))),
    giftable: Boolean(product.giftable ?? true),
    made_to_order: Boolean(product.madeToOrder ?? false),
    status: VALID_VISIBILITY.has(product.status || '') ? product.status : 'Active',
    damaged_scrap_count: Math.max(0, Number(product.damagedScrapCount ?? 0)),
    cogs_cost:
      typeof product.cogsCost === 'number' && product.cogsCost >= 0 ? product.cogsCost : null,
    reserve_for_website: Math.max(0, Math.round(Number(product.reserveForWebsite ?? 0))),
    marketplace_listings: Array.isArray(product.marketplaceListings)
      ? product.marketplaceListings
      : [],
    in_stock: Boolean(product.inStock),
    featured: Boolean(product.featured),
    tag: product.tag && product.tag.trim() ? clampSingleLine(product.tag, 40) : null,
    updated_at: new Date().toISOString(),
  };
}

function fromProductRow(data: Record<string, unknown>, idx: number): Product | null {
  const cat = String(data.category ?? '');
  const age = String(data.age_group ?? data.ageGroup ?? '');
  if (!VALID_SKILL_CATEGORIES.has(cat) || !VALID_AGE_GROUPS.has(age)) {
    return null;
  }
  const id = String(data.id ?? '');
  if (!id) return null;
  const seedMatch = INITIAL_PRODUCTS.find((p) => p.id === id);
  const image = normalizeAssetPath(
    String(
      data.image ?? seedMatch?.image ?? '/assets/images/toy_engineering_front_1794767911598.jpg'
    )
  );
  const baseGallery = seedMatch?.gallery ?? buildFallbackGallery(image);
  const rawUrlsRaw = data.gallery_urls ?? data.galleryUrls;
  const rawUrls = Array.isArray(rawUrlsRaw) ? rawUrlsRaw.map(String) : [];
  const gallery: [ProductAngle, ProductAngle, ProductAngle] = [
    { ...baseGallery[0], url: rawUrls[0] ? normalizeAssetPath(rawUrls[0]) : image },
    { ...baseGallery[1], url: rawUrls[1] ? normalizeAssetPath(rawUrls[1]) : baseGallery[1].url },
    { ...baseGallery[2], url: rawUrls[2] ? normalizeAssetPath(rawUrls[2]) : baseGallery[2].url },
  ];

  const primaryRaw = String(data.primary_category ?? data.primaryCategory ?? '');
  const hsnRaw = String(data.hsn_code ?? data.hsnCode ?? '');
  const parsed: Product = {
    id,
    sku: typeof data.sku === 'string' ? data.sku : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    title: String(data.title ?? ''),
    primaryCategory: VALID_PRIMARY_CATEGORIES.has(primaryRaw)
      ? (primaryRaw as PrimaryStoreCategory)
      : undefined,
    category: cat as Exclude<ProductCategory, ProductCategory.ALL>,
    skills: Array.isArray(data.skills)
      ? (data.skills
          .map(String)
          .filter((s) => VALID_SKILL_CATEGORIES.has(s)) as Exclude<
          ProductCategory,
          ProductCategory.ALL
        >[])
      : undefined,
    ageGroup: age as Exclude<AgeGroup, AgeGroup.ALL>,
    ageGroups: Array.isArray(data.age_groups ?? data.ageGroups)
      ? ((data.age_groups ?? data.ageGroups) as unknown[])
          .map(String)
          .filter((a) => VALID_AGE_GROUPS.has(a)) as Exclude<AgeGroup, AgeGroup.ALL>[]
      : undefined,
    originConcept: String(
      data.origin_concept ?? data.originConcept ?? seedMatch?.originConcept ?? 'East-Asian Brain Toy'
    ),
    occasion: (data.occasion as Exclude<GiftOccasion, GiftOccasion.ALL>) || GiftOccasion.BIRTHDAY,
    price: Number(data.price ?? 0),
    compareAtPrice:
      typeof (data.compare_at_price ?? data.compareAtPrice) === 'number'
        ? Number(data.compare_at_price ?? data.compareAtPrice)
        : undefined,
    manufacturingCost:
      typeof (data.manufacturing_cost ?? data.manufacturingCost) === 'number'
        ? Number(data.manufacturing_cost ?? data.manufacturingCost)
        : undefined,
    image,
    gallery,
    variants: Array.isArray(data.variants) ? data.variants.map(String) : ['Standard'],
    shortSpec: String(data.short_spec ?? data.shortSpec ?? ''),
    description: String(data.description ?? ''),
    useCaseHi: sanitizeEnglishText(
      data.use_case_hi ?? data.useCaseHi,
      seedMatch?.useCaseHi,
      'Hands-on mechanical puzzle engineered to spark curiosity away from screens.'
    ),
    brainBenefitsHi: sanitizeEnglishText(
      data.brain_benefits_hi ?? data.brainBenefitsHi,
      seedMatch?.brainBenefitsHi,
      'Strengthens logical thinking, focus, and spatial dexterity.'
    ),
    whyParentsBuyHi: sanitizeEnglishText(
      data.why_parents_buy_hi ?? data.whyParentsBuyHi,
      seedMatch?.whyParentsBuyHi,
      'Offers a tactile screen-free challenge for kids and families.'
    ),
    materials: String(data.materials ?? ''),
    careInstruction:
      typeof (data.care_instruction ?? data.careInstruction) === 'string'
        ? String(data.care_instruction ?? data.careInstruction)
        : undefined,
    dimensions: String(data.dimensions ?? ''),
    weightGrams:
      typeof (data.weight_grams ?? data.weightGrams) === 'number'
        ? Number(data.weight_grams ?? data.weightGrams)
        : undefined,
    hsnCode: VALID_HSN.has(hsnRaw) ? (hsnRaw as HsnCode) : undefined,
    stockQuantity:
      typeof (data.stock_quantity ?? data.stockQuantity) === 'number'
        ? Number(data.stock_quantity ?? data.stockQuantity)
        : undefined,
    lowStockThreshold:
      typeof (data.low_stock_threshold ?? data.lowStockThreshold) === 'number'
        ? Number(data.low_stock_threshold ?? data.lowStockThreshold)
        : undefined,
    giftable: typeof data.giftable === 'boolean' ? data.giftable : undefined,
    madeToOrder:
      typeof (data.made_to_order ?? data.madeToOrder) === 'boolean'
        ? Boolean(data.made_to_order ?? data.madeToOrder)
        : undefined,
    status: VALID_VISIBILITY.has(String(data.status ?? ''))
      ? (String(data.status) as ProductVisibilityStatus)
      : 'Active',
    damagedScrapCount:
      typeof (data.damaged_scrap_count ?? data.damagedScrapCount) === 'number'
        ? Number(data.damaged_scrap_count ?? data.damagedScrapCount)
        : 0,
    cogsCost:
      typeof (data.cogs_cost ?? data.cogsCost) === 'number'
        ? Number(data.cogs_cost ?? data.cogsCost)
        : undefined,
    reserveForWebsite:
      typeof (data.reserve_for_website ?? data.reserveForWebsite) === 'number'
        ? Number(data.reserve_for_website ?? data.reserveForWebsite)
        : 0,
    marketplaceListings: Array.isArray(data.marketplace_listings ?? data.marketplaceListings)
      ? ((data.marketplace_listings ?? data.marketplaceListings) as MarketplaceListingMap[])
      : undefined,
    inStock: Boolean(data.in_stock ?? data.inStock),
    featured: Boolean(data.featured),
    tag: typeof data.tag === 'string' && data.tag ? data.tag : undefined,
  };
  return hydrateProductAdminFields(parsed, idx);
}

export function subscribePublicProducts(onData: (products: Product[]) => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const fetchProducts = async () => {
    try {
      const { data, error } = await client.from('products').select('*');
      if (error || !data || data.length === 0) return;
      const list = data
        .map((row, idx) => fromProductRow(row as Record<string, unknown>, idx))
        .filter((p): p is Product => p !== null);
      if (list.length > 0) {
        onData(list);
      }
    } catch {
      // Fallback safely to localStorage seed
    }
  };

  void fetchProducts();

  const channel = client
    .channel('bee4-public-products')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      () => {
        void fetchProducts();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveProductToSupabase(product: Product): Promise<void> {
  if (!supabase) return;
  const row = toProductRow(product);
  const { error } = await supabase.from('products').upsert(row, { onConflict: 'id' });
  if (error && isMissingSchemaError(error)) {
    const legacyRow = { ...row };
    delete legacyRow.cogs_cost;
    delete legacyRow.reserve_for_website;
    delete legacyRow.marketplace_listings;
    await supabase.from('products').upsert(legacyRow, { onConflict: 'id' });
  } else if (error) {
    console.error('Supabase saveProduct error:', error.message);
  }
}

export async function deleteProductFromSupabase(productId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('products').delete().eq('id', sanitizeId(productId, 'prod'));
  if (error) console.error('Supabase deleteProduct error:', error.message);
}

// ============================================================================
// Supabase Storage: 3-Angle Product Image Upload (product-images bucket)
// ============================================================================

export async function uploadProductMediaToSupabaseStorage(
  file: File,
  productId: string,
  angleSlot: 'front' | 'mechanism' | 'scale'
): Promise<{ url: string; storageMode: 'supabase' | 'local-fallback'; note?: string }> {
  const compressedDataUrl = await compressImageToDataUrl(file);
  if (!supabase) {
    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
      note: 'Saved compressed image preview locally.',
    };
  }

  try {
    const safeId = sanitizeId(productId, 'prod');
    const filePath = `products/${safeId}/${angleSlot}-${Date.now()}.jpg`;
    const blob = await fetch(compressedDataUrl).then((r) => r.blob());

    const { error: uploadError } = await supabase.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return {
        url: compressedDataUrl,
        storageMode: 'local-fallback',
        note: `Storage fallback (${uploadError.message}). Saved local optimized preview.`,
      };
    }

    const { data: publicData } = supabase.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .getPublicUrl(filePath);

    if (publicData?.publicUrl) {
      return {
        url: publicData.publicUrl,
        storageMode: 'supabase',
      };
    }

    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
    };
  } catch {
    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
    };
  }
}

export async function uploadReturnProofToSupabaseStorage(
  file: File,
  orderOrRmaId: string
): Promise<{ url: string; storageMode: 'supabase' | 'local-fallback'; note?: string }> {
  const compressedDataUrl = await compressImageToDataUrl(file);
  const client = supabase;
  if (!client) {
    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
      note: 'Saved compressed unpacking proof locally.',
    };
  }

  try {
    const safeRef = sanitizeId(orderOrRmaId, 'rma');
    const filePath = `returns/${safeRef}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const blob = await fetch(compressedDataUrl).then((r) => r.blob());

    const { error: uploadError } = await client.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return {
        url: compressedDataUrl,
        storageMode: 'local-fallback',
        note: `Storage fallback (${uploadError.message}). Saved compressed photo locally.`,
      };
    }

    const { data: publicData } = client.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .getPublicUrl(filePath);

    if (publicData?.publicUrl) {
      return {
        url: publicData.publicUrl,
        storageMode: 'supabase',
      };
    }

    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
    };
  } catch {
    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
    };
  }
}

export async function uploadReviewPhotoToSupabaseStorage(
  file: File,
  productOrReviewId: string
): Promise<{ url: string; storageMode: 'supabase' | 'local-fallback'; note?: string }> {
  const compressedDataUrl = await compressImageToDataUrl(file);
  const client = supabase;
  if (!client) {
    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
      note: 'Saved compressed review photo locally.',
    };
  }

  try {
    const safeRef = sanitizeId(productOrReviewId, 'review');
    const filePath = `reviews/${safeRef}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const blob = await fetch(compressedDataUrl).then((r) => r.blob());

    const { error: uploadError } = await client.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return {
        url: compressedDataUrl,
        storageMode: 'local-fallback',
        note: `Storage fallback (${uploadError.message}). Saved compressed photo locally.`,
      };
    }

    const { data: publicData } = client.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .getPublicUrl(filePath);

    if (publicData?.publicUrl) {
      return {
        url: publicData.publicUrl,
        storageMode: 'supabase',
      };
    }

    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
    };
  } catch {
    return {
      url: compressedDataUrl,
      storageMode: 'local-fallback',
    };
  }
}

function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxWidth = 820;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Store Settings & Realtime CMS Sync
// ============================================================================

export function subscribePublicSettings(onData: (settings: StoreSettings) => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const fetchSettings = async () => {
    try {
      const { data, error } = await client
        .from('store_settings')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();
      if (error || !data) return;
      onData({
        ...DEFAULT_STORE_SETTINGS,
        whatsappNumber: String(data.whatsapp_number ?? DEFAULT_STORE_SETTINGS.whatsappNumber),
        supportEmail: String(data.support_email ?? DEFAULT_STORE_SETTINGS.supportEmail),
        announcementText: String(
          data.announcement_text ?? DEFAULT_STORE_SETTINGS.announcementText
        ),
        announcementEnabled:
          typeof data.announcement_enabled === 'boolean'
            ? data.announcement_enabled
            : DEFAULT_STORE_SETTINGS.announcementEnabled,
        heroHeadline:
          typeof data.hero_headline === 'string' && data.hero_headline
            ? data.hero_headline
            : DEFAULT_STORE_SETTINGS.heroHeadline,
        heroSubheadline:
          typeof data.hero_subheadline === 'string' && data.hero_subheadline
            ? data.hero_subheadline
            : DEFAULT_STORE_SETTINGS.heroSubheadline,
        heroCtaText:
          typeof data.hero_cta_text === 'string' && data.hero_cta_text
            ? data.hero_cta_text
            : DEFAULT_STORE_SETTINGS.heroCtaText,
        featuredBannerEnabled:
          typeof data.featured_banner_enabled === 'boolean'
            ? data.featured_banner_enabled
            : DEFAULT_STORE_SETTINGS.featuredBannerEnabled,
        visibleCategories: Array.isArray(data.visible_categories)
          ? (data.visible_categories
              .map((v: unknown) => String(v))
              .filter((c: string) => VALID_PRIMARY_CATEGORIES.has(c)) as PrimaryStoreCategory[])
          : DEFAULT_STORE_SETTINGS.visibleCategories,
        freeShippingThreshold: Number(
          data.free_shipping_threshold ?? DEFAULT_STORE_SETTINGS.freeShippingThreshold
        ),
        standardShippingFee:
          typeof data.standard_shipping_fee === 'number'
            ? data.standard_shipping_fee
            : DEFAULT_STORE_SETTINGS.standardShippingFee,
        codHandlingFee:
          typeof data.cod_handling_fee === 'number'
            ? data.cod_handling_fee
            : DEFAULT_STORE_SETTINGS.codHandlingFee,
        giftWrapFee:
          typeof data.gift_wrap_fee === 'number'
            ? data.gift_wrap_fee
            : DEFAULT_STORE_SETTINGS.giftWrapFee,
        giftWrapEnabled:
          typeof data.gift_wrap_enabled === 'boolean'
            ? data.gift_wrap_enabled
            : DEFAULT_STORE_SETTINGS.giftWrapEnabled,
        upiEnabled:
          typeof data.upi_enabled === 'boolean'
            ? data.upi_enabled
            : DEFAULT_STORE_SETTINGS.upiEnabled,
        codEnabled:
          typeof data.cod_enabled === 'boolean'
            ? data.cod_enabled
            : DEFAULT_STORE_SETTINGS.codEnabled,
        whatsappOrderEnabled:
          typeof data.whatsapp_order_enabled === 'boolean'
            ? data.whatsapp_order_enabled
            : DEFAULT_STORE_SETTINGS.whatsappOrderEnabled,
        upiVpa:
          typeof data.upi_vpa === 'string' && data.upi_vpa
            ? data.upi_vpa
            : DEFAULT_STORE_SETTINGS.upiVpa,
        promoCode: String(data.promo_code ?? DEFAULT_STORE_SETTINGS.promoCode),
        promoDiscountPercent: Number(
          data.promo_discount_percent ?? DEFAULT_STORE_SETTINGS.promoDiscountPercent
        ),
        giftFinderWeights:
          data.gift_finder_weights && typeof data.gift_finder_weights === 'object'
            ? (data.gift_finder_weights as StoreSettings['giftFinderWeights'])
            : DEFAULT_STORE_SETTINGS.giftFinderWeights,
        customerPanelControls: normalizeCustomerPanelControls({
          customerPanelControls: data.customer_panel_controls as StoreSettings['customerPanelControls'],
        }),
      });
    } catch {
      // Non-fatal fallback
    }
  };

  void fetchSettings();

  const channel = client
    .channel('bee4-store-settings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'store_settings', filter: 'id=eq.main' },
      () => {
        void fetchSettings();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveStoreSettingsToSupabase(settings: StoreSettings): Promise<void> {
  if (!supabase) return;
  const payload = {
    id: 'main',
    whatsapp_number: sanitizeSingleLine(settings.whatsappNumber, 20) || '919800004004',
    support_email: sanitizeSingleLine(settings.supportEmail, 120) || 'hello@bee4.in',
    announcement_text:
      sanitizeSingleLine(settings.announcementText, 200) || 'Free India shipping ₹499+',
    announcement_enabled: settings.announcementEnabled ?? true,
    hero_headline: sanitizeSingleLine(settings.heroHeadline ?? '', 160),
    hero_subheadline: sanitizeSingleLine(settings.heroSubheadline ?? '', 260),
    hero_cta_text: sanitizeSingleLine(settings.heroCtaText ?? '', 60),
    featured_banner_enabled: settings.featuredBannerEnabled ?? true,
    visible_categories: settings.visibleCategories ?? [],
    free_shipping_threshold: Math.max(
      0,
      Math.min(50000, Number(settings.freeShippingThreshold) || 499)
    ),
    standard_shipping_fee: Math.max(
      0,
      Math.min(5000, Number(settings.standardShippingFee ?? 49))
    ),
    cod_handling_fee: Math.max(0, Math.min(5000, Number(settings.codHandlingFee ?? 0))),
    gift_wrap_fee: Math.max(0, Math.min(5000, Number(settings.giftWrapFee ?? 49))),
    gift_wrap_enabled: settings.giftWrapEnabled ?? true,
    upi_enabled: settings.upiEnabled ?? true,
    cod_enabled: settings.codEnabled ?? true,
    whatsapp_order_enabled: settings.whatsappOrderEnabled ?? true,
    upi_vpa: sanitizeSingleLine(settings.upiVpa ?? 'bee4studio@okaxis', 80),
    promo_code: sanitizeSingleLine(settings.promoCode, 32).toUpperCase(),
    promo_discount_percent: Math.max(
      0,
      Math.min(90, Number(settings.promoDiscountPercent) || 0)
    ),
    gift_finder_weights: settings.giftFinderWeights ?? {},
    customer_panel_controls: normalizeCustomerPanelControls(settings),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from('store_settings')
    .upsert(payload, { onConflict: 'id' });
  if (error && isMissingSchemaError(error)) {
    const legacyPayload = { ...payload } as Record<string, unknown>;
    delete legacyPayload.customer_panel_controls;
    await supabase.from('store_settings').upsert(legacyPayload, { onConflict: 'id' });
  } else if (error) {
    console.error('saveStoreSettings error:', error.message);
  }
}

// ============================================================================
// Coupons Realtime Sync & CRUD
// ============================================================================

export function subscribeCoupons(onData: (coupons: CouponRecord[]) => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const fetchCoupons = async () => {
    try {
      const { data, error } = await client.from('coupons').select('*');
      if (error || !data || data.length === 0) return;
      const list: CouponRecord[] = data.map((d) => ({
        id: String(d.id),
        code: String(d.code ?? '').toUpperCase(),
        description: String(d.description ?? ''),
        discountType: d.discount_type === 'flat' ? 'flat' : 'percentage',
        value: Number(d.value ?? 10),
        minOrderValue: Number(d.min_order_value ?? 0),
        prepaidOnly: Boolean(d.prepaid_only),
        usageLimit: Number(d.usage_limit ?? 0),
        usedCount: Number(d.used_count ?? 0),
        expiresAt: String(d.expires_at ?? ''),
        active: Boolean(d.active),
      }));
      onData(list);
    } catch {
      // Fallback to localStorage seed
    }
  };

  void fetchCoupons();

  const channel = client
    .channel('bee4-coupons')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'coupons' },
      () => {
        void fetchCoupons();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveCouponToSupabase(coupon: CouponRecord): Promise<void> {
  if (!supabase) return;
  const id = sanitizeId(coupon.id || `cpn-${coupon.code}`, 'cpn');
  const { error } = await supabase.from('coupons').upsert(
    {
      id,
      code: sanitizeSingleLine(coupon.code, 32).toUpperCase(),
      description: sanitizeSingleLine(coupon.description, 200),
      discount_type: coupon.discountType === 'flat' ? 'flat' : 'percentage',
      value: Math.max(1, Math.min(10000, Number(coupon.value) || 10)),
      min_order_value: Math.max(0, Math.min(100000, Number(coupon.minOrderValue) || 0)),
      prepaid_only: Boolean(coupon.prepaidOnly),
      usage_limit: Math.max(0, Math.min(1000000, Number(coupon.usageLimit) || 0)),
      used_count: Math.max(0, Math.min(1000000, Number(coupon.usedCount) || 0)),
      expires_at: sanitizeSingleLine(coupon.expiresAt, 32),
      active: Boolean(coupon.active),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (error) console.error('Supabase saveCoupon error:', error.message);
}

export async function deleteCouponFromSupabase(couponId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('coupons').delete().eq('id', sanitizeId(couponId, 'cpn'));
  if (error) console.error('Supabase deleteCoupon error:', error.message);
}

// ============================================================================
// Orders Realtime Sync & Fulfillment Logistics
// ============================================================================

function fromOrderRow(d: Record<string, unknown>): OrderRecord {
  const customerRaw = (d.customer ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const items: CartItem[] = itemsRaw.map((it) => ({
    productId: String(it.productId ?? ''),
    title: String(it.title ?? ''),
    price: Number(it.price ?? 0),
    image: normalizeAssetPath(String(it.image ?? '')),
    variant: String(it.variant ?? 'Standard'),
    quantity: Number(it.quantity ?? 1),
    category: String(it.category ?? ''),
  }));

  const rawPayMethod = String(d.payment_method ?? d.paymentMethod ?? 'UPI / Prepaid');
  const payNorm = rawPayMethod.trim().toLowerCase();
  const isCodPay = payNorm === 'cod' || payNorm.includes('cash on delivery');
  const canonicalPaymentMethod: PaymentMethod = isCodPay
    ? 'COD'
    : payNorm.includes('wallet')
      ? 'BEE4 Wallet'
      : 'UPI / Prepaid';
  const walletAmountUsed = Math.max(0, Number(d.wallet_amount_used ?? d.walletAmountUsed ?? 0));
  const rawPayStatus = d.payment_status ?? d.paymentStatus;
  const paymentStatus: PaymentStatus =
    rawPayStatus === 'Pending (Collect on Delivery)' ||
    rawPayStatus === 'Paid' ||
    rawPayStatus === 'Partially Paid' ||
    rawPayStatus === 'Refunded'
      ? (rawPayStatus as PaymentStatus)
      : isCodPay
        ? 'Pending (Collect on Delivery)'
        : 'Paid';

  return {
    orderNumber: String(d.order_number ?? d.orderNumber ?? ''),
    userId: d.user_id ? String(d.user_id) : d.userId ? String(d.userId) : null,
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    items,
    subtotal: Number(d.subtotal ?? 0),
    discount: Number(d.discount ?? 0),
    shippingFee: Number(d.shipping_fee ?? d.shippingFee ?? 0),
    giftWrapFee: Number(d.gift_wrap_fee ?? d.giftWrapFee ?? 0),
    codFee: Number(d.cod_fee ?? d.codFee ?? 0),
    total: Number(d.total ?? 0),
    walletAmountUsed,
    paymentMethod: canonicalPaymentMethod,
    paymentStatus,
    orderChannel:
      ((d.order_channel ?? d.orderChannel) as OrderChannel) ||
      (isCodPay ? 'COD' : 'UPI / Prepaid'),
    couponCode: typeof (d.coupon_code ?? d.couponCode) === 'string'
      ? String(d.coupon_code ?? d.couponCode)
      : '',
    customer: {
      fullName: String(customerRaw.fullName ?? ''),
      phone: String(customerRaw.phone ?? ''),
      email: String(customerRaw.email ?? ''),
      address: String(customerRaw.address ?? ''),
      city: String(customerRaw.city ?? ''),
      state: String(customerRaw.state ?? ''),
      pinCode: String(customerRaw.pinCode ?? ''),
    },
    giftWrap: Boolean(d.gift_wrap ?? d.giftWrap),
    giftMessage: String(d.gift_message ?? d.giftMessage ?? ''),
    status: (d.status as OrderStatus) || 'Pending',
    cancellationReason:
      typeof (d.cancellation_reason ?? d.cancellationReason) === 'string' &&
      String(d.cancellation_reason ?? d.cancellationReason).trim()
        ? String(d.cancellation_reason ?? d.cancellationReason)
        : undefined,
    cancelledBy:
      d.cancelled_by === 'Customer' || d.cancelled_by === 'Admin'
        ? (d.cancelled_by as CancelledByRole)
        : d.cancelledBy === 'Customer' || d.cancelledBy === 'Admin'
          ? (d.cancelledBy as CancelledByRole)
          : undefined,
    cancelledAt:
      typeof (d.cancelled_at ?? d.cancelledAt) === 'string' &&
      String(d.cancelled_at ?? d.cancelledAt)
        ? String(d.cancelled_at ?? d.cancelledAt)
        : undefined,
    fulfillmentStage: (d.fulfillment_stage ?? d.fulfillmentStage) as FulfillmentStage | undefined,
    sourceChannel:
      ((d.source_channel ?? d.sourceChannel) as MarketplaceChannel) ||
      ((d.order_channel ?? d.orderChannel) === 'WhatsApp Order' ? 'WhatsApp' : 'bee4.in'),
    externalOrderId: typeof (d.external_order_id ?? d.externalOrderId) === 'string'
      ? String(d.external_order_id ?? d.externalOrderId)
      : undefined,
    operationalBucket: (d.operational_bucket ?? d.operationalBucket) as
      | OperationalOrderBucket
      | undefined,
    slaDispatchBy:
      typeof (d.sla_dispatch_by ?? d.slaDispatchBy) === 'string'
        ? String(d.sla_dispatch_by ?? d.slaDispatchBy)
        : undefined,
    labelGeneratedAt:
      typeof (d.label_generated_at ?? d.labelGeneratedAt) === 'string'
        ? String(d.label_generated_at ?? d.labelGeneratedAt)
        : undefined,
    picklistGeneratedAt:
      typeof (d.picklist_generated_at ?? d.picklistGeneratedAt) === 'string'
        ? String(d.picklist_generated_at ?? d.picklistGeneratedAt)
        : undefined,
    courierPartner: String(d.courier_partner ?? d.courierPartner ?? ''),
    awbNumber: String(d.awb_number ?? d.awbNumber ?? ''),
    trackingUrl: String(d.tracking_url ?? d.trackingUrl ?? ''),
    internalNotes: String(d.internal_notes ?? d.internalNotes ?? ''),
    refundStatus:
      d.refund_status === 'Refunded' || d.refund_status === 'Partially Refunded'
        ? (d.refund_status as OrderRecord['refundStatus'])
        : d.refundStatus === 'Refunded' || d.refundStatus === 'Partially Refunded'
          ? (d.refundStatus as OrderRecord['refundStatus'])
          : 'None',
    refundedAmount: Number(d.refunded_amount ?? d.refundedAmount ?? 0),
    packingProof:
      (d.packing_proof ?? d.packingProof) &&
      typeof (d.packing_proof ?? d.packingProof) === 'object'
        ? ((d.packing_proof ?? d.packingProof) as PackingVerificationProof)
        : undefined,
    settlement:
      d.settlement && typeof d.settlement === 'object'
        ? (d.settlement as OrderSettlementRecord)
        : undefined,
  };
}

export async function fetchUserOrdersFromSupabase(userId: string): Promise<OrderRecord[]> {
  const client = supabase;
  if (!client) {
    throw new Error('BEE4 order history is unavailable in offline mode.');
  }
  if (!userId) return [];

  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[BEE4 Orders] Failed to fetch user orders:', {
      userId,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw new Error(`Could not load your orders: ${error.message}`);
  }

  return (data ?? []).map((r) => fromOrderRow(r as Record<string, unknown>));
}

export async function fetchAllOrdersAdminFromSupabase(): Promise<OrderRecord[]> {
  const client = supabase;
  if (!client) {
    throw new Error('Cloud order service is not configured. Unable to load admin orders.');
  }

  const { data, error } = await client
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[BEE4 Supabase] Failed to fetch all orders for Admin Studio:', {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw new Error(`Could not load customer orders: ${error.message}`);
  }

  return (data ?? []).map((r) => fromOrderRow(r as Record<string, unknown>));
}

export function subscribeUserOrders(
  userId: string,
  onData: (orders: OrderRecord[]) => void
): () => void {
  const client = supabase;
  if (!client || !userId) return () => {};

  const fetchUserOrders = async () => {
    try {
      const orders = await fetchUserOrdersFromSupabase(userId);
      onData(orders);
    } catch (err) {
      console.error('[BEE4 Supabase] subscribeUserOrders fetch failed:', err);
    }
  };

  void fetchUserOrders();

  const channel = client
    .channel(`bee4-user-orders-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
      () => {
        void fetchUserOrders();
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || err) {
        console.error('[BEE4 Supabase] subscribeUserOrders realtime error:', status, err);
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeAllOrdersAdmin(onData: (orders: OrderRecord[]) => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const fetchAllOrders = async () => {
    try {
      const orders = await fetchAllOrdersAdminFromSupabase();
      onData(orders);
    } catch (err) {
      console.error('[BEE4 Supabase] subscribeAllOrdersAdmin fetch failed:', err);
    }
  };

  void fetchAllOrders();

  const channel = client
    .channel('bee4-admin-orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders' },
      () => {
        void fetchAllOrders();
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' || err) {
        console.error('[BEE4 Supabase] subscribeAllOrdersAdmin realtime error:', status, err);
      }
    });

  return () => {
    void client.removeChannel(channel);
  };
}

export async function createOrderInSupabase(
  order: OrderRecord,
  userId?: string | null,
  options?: { allowUpsert?: boolean }
): Promise<void> {
  const client = supabase;
  if (!client) {
    const err = new Error(
      'Unable to complete cloud checkout right now. Please try again in a moment.'
    );
    console.error('[BEE4 Checkout] Order insert aborted: cloud service unavailable');
    throw err;
  }

  let resolvedUserId = userId || order.userId || null;
  if (!resolvedUserId) {
    try {
      const { data: sessionData } = await client.auth.getSession();
      resolvedUserId = sessionData.session?.user?.id ?? null;
    } catch (sessionErr) {
      console.warn('[BEE4 Checkout] Could not inspect Supabase auth session:', sessionErr);
    }
  }

  const orderNumber = sanitizeId(order.orderNumber, 'BEE4');
  const pinCode = /^[1-9][0-9]{5}$/.test(order.customer.pinCode)
    ? order.customer.pinCode
    : '813103';

  const nowIso = new Date().toISOString();
  const fullRow: Record<string, unknown> = {
    order_number: orderNumber,
    user_id: resolvedUserId || null,
    items: order.items.slice(0, 50),
    subtotal: Math.max(0, Number(order.subtotal) || 0),
    discount: Math.max(0, Number(order.discount) || 0),
    shipping_fee: Math.max(0, Number(order.shippingFee) || 0),
    gift_wrap_fee: Math.max(0, Number(order.giftWrapFee) || 0),
    cod_fee: Math.max(0, Number(order.codFee ?? 0) || 0),
    total: Math.max(0, Number(order.total) || 0),
    wallet_amount_used: Math.max(0, Number(order.walletAmountUsed ?? 0) || 0),
    payment_method: order.paymentMethod,
    payment_status:
      order.paymentStatus ||
      (String(order.paymentMethod).toLowerCase() === 'cod'
        ? 'Pending (Collect on Delivery)'
        : 'Paid'),
    order_channel:
      order.orderChannel ||
      (String(order.paymentMethod).toLowerCase() === 'cod' ? 'COD' : 'UPI / Prepaid'),
    source_channel: order.sourceChannel || 'bee4.in',
    external_order_id: clampSingleLine(order.externalOrderId ?? '', 64),
    coupon_code: clampSingleLine(order.couponCode ?? '', 32),
    customer: {
      fullName: clampSingleLine(order.customer.fullName, 100, 'Customer'),
      phone: clampSingleLine(order.customer.phone, 15, '9800000000'),
      email: clampSingleLine(order.customer.email, 160),
      address: clampSingleLine(order.customer.address, 300, 'India'),
      city: clampSingleLine(order.customer.city, 80, 'Banka'),
      state: clampSingleLine(order.customer.state, 80, 'Bihar'),
      pinCode,
    },
    gift_wrap: Boolean(order.giftWrap),
    gift_message: clampStr(order.giftMessage, 300),
    status: order.status || 'Pending',
    cancellation_reason: clampStr(order.cancellationReason ?? '', 300),
    cancelled_by: order.cancelledBy ?? null,
    cancelled_at: order.cancelledAt ?? null,
    fulfillment_stage: order.fulfillmentStage || 'New / Unverified',
    operational_bucket: order.operationalBucket || 'New / Upcoming',
    sla_dispatch_by: order.slaDispatchBy || null,
    label_generated_at: order.labelGeneratedAt || null,
    picklist_generated_at: order.picklistGeneratedAt || null,
    courier_partner: sanitizeSingleLine(order.courierPartner ?? '', 64),
    awb_number: sanitizeSingleLine(order.awbNumber ?? '', 64),
    tracking_url: sanitizeSingleLine(order.trackingUrl ?? '', 300),
    internal_notes: sanitizeRichInput(order.internalNotes ?? '', 500),
    refund_status: order.refundStatus || 'None',
    refunded_amount: Number(order.refundedAmount ?? 0),
    packing_proof: order.packingProof ?? null,
    settlement: order.settlement ?? null,
    created_at: order.createdAt || nowIso,
    updated_at: nowIso,
  };

  const writeRow = async (row: Record<string, unknown>) => {
    if (options?.allowUpsert) {
      return client.from('orders').upsert(row, { onConflict: 'order_number' });
    }
    // Use .insert() (without .select()) so guests & authenticated users satisfy INSERT RLS
    // without triggering UPDATE or guest SELECT RLS checks.
    return client.from('orders').insert(row);
  };

  let { error } = await writeRow(fullRow);

  if (error && isMissingSchemaError(error)) {
    console.warn(
      '[BEE4 Checkout] Orders table missing newer columns; retrying with core schema:',
      error.message
    );
    const legacyRow = { ...fullRow };
    delete legacyRow.wallet_amount_used;
    delete legacyRow.payment_status;
    delete legacyRow.cancellation_reason;
    delete legacyRow.cancelled_by;
    delete legacyRow.cancelled_at;
    delete legacyRow.source_channel;
    delete legacyRow.external_order_id;
    delete legacyRow.operational_bucket;
    delete legacyRow.sla_dispatch_by;
    delete legacyRow.label_generated_at;
    delete legacyRow.picklist_generated_at;
    delete legacyRow.packing_proof;
    delete legacyRow.settlement;
    const legacyRes = await writeRow(legacyRow);
    error = legacyRes.error;
  }

  if (error && isMissingSchemaError(error)) {
    console.warn(
      '[BEE4 Checkout] Retrying order insert with minimal core columns:',
      error.message
    );
    const minimalRow: Record<string, unknown> = {
      order_number: fullRow.order_number,
      user_id: fullRow.user_id,
      customer: fullRow.customer,
      items: fullRow.items,
      total: fullRow.total,
      payment_method: fullRow.payment_method,
      status: fullRow.status,
      created_at: fullRow.created_at,
    };
    const minimalRes = await writeRow(minimalRow);
    error = minimalRes.error;
  }

  if (error) {
    console.error('[BEE4 Checkout] Failed to insert order into Supabase orders table:', {
      orderNumber,
      userId: resolvedUserId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(
      `Could not complete your order (${orderNumber}). Please try again.`
    );
  }
}

export async function updateOrderStatusInSupabase(
  orderNumber: string,
  status: OrderStatus
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('order_number', sanitizeId(orderNumber, 'BEE4'));
  if (error) console.error('Supabase updateOrderStatus error:', error.message);
}

export async function cancelOrderInSupabase(input: {
  orderNumber: string;
  reason: string;
  cancelledBy: CancelledByRole;
  autoRestock: boolean;
  refundStatus?: OrderRecord['refundStatus'];
  refundedAmount?: number;
  paymentStatus?: PaymentStatus;
  updatedProductsToRestock?: { id: string; stockQuantity: number; inStock: boolean }[];
}): Promise<void> {
  const client = supabase;
  if (!client) return;

  const cleanOrderNumber = sanitizeId(input.orderNumber, 'BEE4');
  const cleanReason = clampStr(input.reason, 300, 'Cancelled upon request');
  const nowIso = new Date().toISOString();

  // Attempt atomic RPC first (handles customer RLS + automatic product restock under security definer)
  let rpcSucceeded = false;
  try {
    const { error: rpcError } = await client.rpc('cancel_bee4_order_and_restock', {
      p_order_number: cleanOrderNumber,
      p_reason: cleanReason,
      p_cancelled_by: input.cancelledBy,
      p_auto_restock: input.autoRestock,
    });
    if (!rpcError) {
      rpcSucceeded = true;
    } else if (!isMissingSchemaError(rpcError) && !rpcError.message.toLowerCase().includes('function')) {
      console.warn('[BEE4 Cancel] RPC returned error, attempting table update:', rpcError.message);
    }
  } catch {
    // RPC not installed yet — fall back to direct table update
  }

  const updatePayload: Record<string, unknown> = {
    status: 'Cancelled',
    fulfillment_stage: 'Cancelled',
    operational_bucket: 'Cancelled / RTO',
    cancellation_reason: cleanReason,
    cancelled_by: input.cancelledBy,
    cancelled_at: nowIso,
    updated_at: nowIso,
  };
  if (input.refundStatus !== undefined) updatePayload.refund_status = input.refundStatus;
  if (input.refundedAmount !== undefined) updatePayload.refunded_amount = input.refundedAmount;
  if (input.paymentStatus !== undefined) updatePayload.payment_status = input.paymentStatus;

  if (!rpcSucceeded || input.refundStatus !== undefined || input.paymentStatus !== undefined) {
    let { error } = await client
      .from('orders')
      .update(updatePayload)
      .eq('order_number', cleanOrderNumber);

    if (error && isMissingSchemaError(error)) {
      const legacyUpdate = {
        status: 'Cancelled',
        fulfillment_stage: 'Cancelled',
        internal_notes: `[${input.cancelledBy} Cancelled: ${cleanReason}]`,
        updated_at: nowIso,
      };
      const retry = await client
        .from('orders')
        .update(legacyUpdate)
        .eq('order_number', cleanOrderNumber);
      error = retry.error;
    }

    if (error && !rpcSucceeded) {
      console.error('[BEE4 Cancel] Order cancellation failed:', error.message);
      throw new Error(`Could not cancel order ${cleanOrderNumber}. Please try again.`);
    }
  }

  // If RPC wasn't present and Admin triggered restock, update product quantities directly
  if (!rpcSucceeded && input.autoRestock && input.updatedProductsToRestock?.length) {
    await Promise.all(
      input.updatedProductsToRestock.map((prod) =>
        client
          .from('products')
          .update({
            stock_quantity: prod.stockQuantity,
            in_stock: prod.inStock,
            updated_at: nowIso,
          })
          .eq('id', sanitizeId(prod.id, 'prod'))
      )
    );
  }
}

export async function updateOrderLogisticsInSupabase(
  orderNumber: string,
  updates: {
    status: string;
    fulfillmentStage: string;
    courierPartner?: string;
    awbNumber?: string;
    trackingUrl?: string;
    internalNotes?: string;
    operationalBucket?: OperationalOrderBucket;
    labelGeneratedAt?: string;
    picklistGeneratedAt?: string;
    packingProof?: PackingVerificationProof;
    settlement?: OrderSettlementRecord;
  }
): Promise<void> {
  if (!supabase) return;
  const payload: Record<string, unknown> = {
    status: updates.status,
    fulfillment_stage: updates.fulfillmentStage,
    courier_partner: sanitizeSingleLine(updates.courierPartner ?? '', 64),
    awb_number: sanitizeSingleLine(updates.awbNumber ?? '', 64),
    tracking_url: sanitizeSingleLine(updates.trackingUrl ?? '', 300),
    internal_notes: sanitizeRichInput(updates.internalNotes ?? '', 500),
    updated_at: new Date().toISOString(),
  };
  if (updates.operationalBucket !== undefined) {
    payload.operational_bucket = updates.operationalBucket;
  }
  if (updates.labelGeneratedAt !== undefined) {
    payload.label_generated_at = updates.labelGeneratedAt;
  }
  if (updates.picklistGeneratedAt !== undefined) {
    payload.picklist_generated_at = updates.picklistGeneratedAt;
  }
  if (updates.packingProof !== undefined) {
    payload.packing_proof = updates.packingProof;
  }
  if (updates.settlement !== undefined) {
    payload.settlement = updates.settlement;
  }

  const cleanNo = sanitizeId(orderNumber, 'BEE4');
  const { error } = await supabase.from('orders').update(payload).eq('order_number', cleanNo);
  if (error && isMissingSchemaError(error)) {
    const legacy = { ...payload };
    delete legacy.operational_bucket;
    delete legacy.label_generated_at;
    delete legacy.picklist_generated_at;
    delete legacy.packing_proof;
    delete legacy.settlement;
    await supabase.from('orders').update(legacy).eq('order_number', cleanNo);
  } else if (error) {
    console.error('Supabase updateOrderLogistics error:', error.message);
  }
}

// ============================================================================
// Print Lab, Spools, Inquiries, Testimonials & Audit Logs
// ============================================================================

export function subscribePrintJobsAdmin(onData: (jobs: PrintJobRecord[]) => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client.from('print_jobs').select('*');
      if (error || !data) return;
      onData(
        data.map((d) => ({
          id: String(d.id),
          productId: String(d.product_id ?? ''),
          productTitle: String(d.product_title ?? ''),
          orderNumber: typeof d.order_number === 'string' ? d.order_number : undefined,
          batchQty: Number(d.batch_qty ?? 1),
          material: String(d.material ?? 'Eco-PLA'),
          estimatedGrams: Number(d.estimated_grams ?? 100),
          stage: (d.stage as PrintJobRecord['stage']) || 'Queued',
          printerName: String(d.printer_name ?? 'Banka Lab Printer'),
          updatedAt: String(d.updated_at ?? new Date().toISOString()),
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-print-jobs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'print_jobs' }, () => {
      void load();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function savePrintJobToSupabase(job: PrintJobRecord): Promise<void> {
  if (!supabase) return;
  const id = sanitizeId(job.id, 'job');
  await supabase.from('print_jobs').upsert(
    {
      id,
      product_id: sanitizeSingleLine(job.productId, 128) || 'custom',
      product_title: sanitizeSingleLine(job.productTitle, 160) || '3D Print Batch',
      order_number: job.orderNumber ? sanitizeSingleLine(job.orderNumber, 64) : null,
      batch_qty: Math.max(1, Math.min(1000, Number(job.batchQty) || 1)),
      material: sanitizeSingleLine(job.material, 100) || 'Matte Bio-PLA+',
      estimated_grams: Math.max(1, Math.min(50000, Number(job.estimatedGrams) || 100)),
      stage: job.stage,
      printer_name: sanitizeSingleLine(job.printerName, 100) || 'Bambu A1 Mini #1 (Banka Lab)',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

export function subscribeFilamentSpoolsAdmin(onData: (spools: FilamentSpool[]) => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data } = await client.from('filament_spools').select('*');
      if (!data || data.length === 0) return;
      onData(
        data.map((d) => ({
          id: String(d.id),
          name: String(d.name ?? ''),
          material: (d.material as FilamentSpool['material']) || 'Eco-PLA',
          colorHex: String(d.color_hex ?? '#d97706'),
          colorName: String(d.color_name ?? 'Amber'),
          remainingGrams: Number(d.remaining_grams ?? 0),
          capacityGrams: Number(d.capacity_grams ?? 1000),
          costPerKg: Number(d.cost_per_kg ?? 1200),
          gramsPerToyAvg: Number(d.grams_per_toy_avg ?? 110),
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  return () => {};
}

export async function saveFilamentSpoolToSupabase(spool: FilamentSpool): Promise<void> {
  if (!supabase) return;
  const id = sanitizeId(spool.id, 'spool');
  await supabase.from('filament_spools').upsert(
    {
      id,
      name: sanitizeSingleLine(spool.name, 120) || 'Bio-PLA+ Spool',
      material: spool.material,
      color_hex: sanitizeSingleLine(spool.colorHex, 16) || '#d97706',
      color_name: sanitizeSingleLine(spool.colorName, 60) || 'Amber',
      remaining_grams: Math.max(0, Math.min(20000, Number(spool.remainingGrams) || 0)),
      capacity_grams: Math.max(100, Math.min(20000, Number(spool.capacityGrams) || 1000)),
      cost_per_kg: Math.max(0, Math.min(20000, Number(spool.costPerKg) || 1200)),
      grams_per_toy_avg: Math.max(1, Math.min(5000, Number(spool.gramsPerToyAvg) || 110)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

export function subscribeAdminAuditLogs(onData: (logs: AdminAuditLog[]) => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client
        .from('admin_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(120);
      if (error || !data) return;
      onData(
        data.map((d) => ({
          id: String(d.id),
          timestamp: String(d.timestamp ?? new Date().toISOString()),
          adminEmail: String(d.admin_email ?? 'admin@bee4.in'),
          action: String(d.action ?? 'MUTATION'),
          entityType: (d.entity_type as AdminAuditLog['entityType']) || 'settings',
          entityId: String(d.entity_id ?? 'main'),
          summary: String(d.summary ?? ''),
        }))
      );
    } catch {
      // Non-fatal fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-logs')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_logs' }, () => {
      void load();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function writeAdminAuditLogToSupabase(
  log: Omit<AdminAuditLog, 'timestamp'>
): Promise<void> {
  if (!supabase) return;
  const id = sanitizeId(log.id, 'log');
  await supabase.from('admin_logs').insert({
    id,
    admin_email: sanitizeSingleLine(log.adminEmail || 'admin@bee4.in', 160),
    action: sanitizeSingleLine(log.action, 80),
    entity_type: log.entityType,
    entity_id: sanitizeSingleLine(log.entityId, 128) || 'main',
    summary: sanitizeRichInput(log.summary, 400),
    timestamp: new Date().toISOString(),
  });
}

export function subscribePublicTestimonials(
  onData: (testimonials: Testimonial[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(
        data.map((d) => ({
          id: String(d.id),
          customerName: String(d.customer_name ?? ''),
          cityOrRole: String(d.city_or_role ?? ''),
          productName: String(d.product_name ?? ''),
          rating: Math.max(1, Math.min(5, Math.round(Number(d.rating ?? 5)))) as
            | 1
            | 2
            | 3
            | 4
            | 5,
          feedback: String(d.feedback ?? ''),
          createdAt: String(d.created_at ?? new Date().toISOString()),
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-public-testimonials')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'testimonials' }, () => {
      void load();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function addTestimonialToSupabase(
  testimonial: Testimonial,
  userId?: string | null
): Promise<void> {
  if (!supabase) return;
  const id = sanitizeId(testimonial.id, 'rev');
  await supabase.from('testimonials').upsert(
    {
      id,
      user_id: userId || null,
      customer_name: clampStr(testimonial.customerName, 80, 'BEE4 Shopper'),
      city_or_role: clampStr(testimonial.cityOrRole, 80, 'Verified Buyer'),
      product_name: clampStr(testimonial.productName, 160, 'BEE4 Gift Order'),
      rating: Math.max(1, Math.min(5, Number(testimonial.rating) || 5)),
      feedback: clampStr(testimonial.feedback, 600, 'Great quality product.'),
      created_at: testimonial.createdAt || new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

export function subscribeAllInquiriesAdmin(
  onData: (inquiries: CustomerInquiry[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(
        data.map((d) => ({
          id: String(d.id),
          createdAt: String(d.created_at ?? new Date().toISOString()),
          name: String(d.name ?? ''),
          contact: String(d.contact ?? ''),
          topic: String(d.topic ?? ''),
          message: String(d.message ?? ''),
          status: (d.status as 'New' | 'Resolved') || 'New',
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-inquiries')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, () => {
      void load();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function submitInquiryToSupabase(
  inquiry: CustomerInquiry,
  userId?: string | null
): Promise<void> {
  if (!supabase) return;
  const id = sanitizeId(inquiry.id, 'inq');
  await supabase.from('inquiries').upsert(
    {
      id,
      user_id: userId || null,
      name: clampStr(inquiry.name, 100, 'Customer'),
      contact: clampStr(inquiry.contact, 160, 'N/A'),
      topic: clampStr(inquiry.topic, 100, 'General Inquiry'),
      message: clampStr(inquiry.message, 1500, 'Inquiry details'),
      status: 'New',
      created_at: inquiry.createdAt || new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

export async function toggleInquiryStatusInSupabase(
  id: string,
  status: 'New' | 'Resolved'
): Promise<void> {
  if (!supabase) return;
  await supabase
    .from('inquiries')
    .update({ status })
    .eq('id', sanitizeId(id, 'inq'));
}

// ============================================================================
// Customer Profile & CRM Sync (profiles + customers tables)
// ============================================================================

function normalizeProfileRowToCustomer(d: Record<string, unknown>): CustomerProfile {
  const fullNameRaw = String(d.full_name ?? d.fullName ?? 'BEE4 Customer');
  const parsedSplit = splitFullName(fullNameRaw);
  const firstName =
    typeof (d.first_name ?? d.firstName) === 'string' && String(d.first_name ?? d.firstName).trim()
      ? String(d.first_name ?? d.firstName).trim()
      : parsedSplit.firstName;
  const lastName =
    typeof (d.last_name ?? d.lastName) === 'string'
      ? String(d.last_name ?? d.lastName).trim()
      : parsedSplit.lastName;
  const rawNotif = d.notification_preferences ?? d.notificationPreferences;
  const notifObj =
    rawNotif && typeof rawNotif === 'object'
      ? (rawNotif as Partial<CustomerNotificationPreferences>)
      : {};
  const notificationPreferences: CustomerNotificationPreferences = {
    orderUpdates: notifObj.orderUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.orderUpdates,
    returnAlerts: notifObj.returnAlerts ?? DEFAULT_NOTIFICATION_PREFERENCES.returnAlerts,
    offersAndLaunches:
      notifObj.offersAndLaunches ?? DEFAULT_NOTIFICATION_PREFERENCES.offersAndLaunches,
  };

  return {
    id: String(d.id ?? ''),
    firstName,
    lastName,
    fullName: joinFirstLastName(firstName, lastName) || fullNameRaw,
    gender:
      d.gender === 'Male' || d.gender === 'Female' || d.gender === 'Other'
        ? (d.gender as CustomerGender)
        : undefined,
    avatarUrl:
      typeof (d.avatar_url ?? d.avatarUrl) === 'string' &&
      String(d.avatar_url ?? d.avatarUrl).trim()
        ? String(d.avatar_url ?? d.avatarUrl)
        : undefined,
    phone: String(d.phone ?? ''),
    email: String(d.email ?? ''),
    emailVerified: Boolean(d.email_verified ?? d.emailVerified ?? d.email_confirmed_at),
    emailConfirmedAt:
      typeof (d.email_confirmed_at ?? d.emailConfirmedAt) === 'string'
        ? String(d.email_confirmed_at ?? d.emailConfirmedAt)
        : undefined,
    preferredPayment:
      ((d.preferred_payment ?? d.preferredPayment) as PaymentMethod) || 'UPI / Prepaid',
    preferredLanguage:
      (d.preferred_language ?? d.preferredLanguage) === 'hi' ? 'hi' : 'en',
    notificationPreferences,
    savedUpiIds: Array.isArray(d.saved_upi_ids ?? d.savedUpiIds)
      ? ((d.saved_upi_ids ?? d.savedUpiIds) as string[]).map(String).slice(0, 10)
      : [],
    devices: Array.isArray(d.devices)
      ? (d.devices as CustomerDeviceSession[]).slice(0, 12)
      : [],
    accountStatus:
      (d.account_status ?? d.accountStatus) === 'Suspended'
        ? ('Suspended' as CustomerAccountStatus)
        : ('Active' as CustomerAccountStatus),
    deactivationRequested: Boolean(d.deactivation_requested ?? d.deactivationRequested),
    deactivationRequestedAt:
      typeof (d.deactivation_requested_at ?? d.deactivationRequestedAt) === 'string'
        ? String(d.deactivation_requested_at ?? d.deactivationRequestedAt)
        : undefined,
    forceLoggedOutAt:
      typeof (d.force_logged_out_at ?? d.forceLoggedOutAt) === 'string'
        ? String(d.force_logged_out_at ?? d.forceLoggedOutAt)
        : undefined,
    celebrationMonth:
      typeof (d.celebration_month ?? d.celebrationMonth) === 'string' &&
      (d.celebration_month ?? d.celebrationMonth)
        ? String(d.celebration_month ?? d.celebrationMonth)
        : undefined,
    crmFlag: ((d.crm_flag ?? d.crmFlag) as CrmCustomerFlag) || 'Standard',
    walletBalance: Math.max(0, Number(d.wallet_balance ?? d.walletBalance ?? 0)),
    walletTransactions: Array.isArray(d.wallet_transactions ?? d.walletTransactions)
      ? ((d.wallet_transactions ?? d.walletTransactions) as WalletTransactionRecord[])
      : [],
    customDesigns: Array.isArray(d.custom_designs ?? d.customDesigns)
      ? ((d.custom_designs ?? d.customDesigns) as CustomerCustomDesign[])
      : [],
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    addresses: Array.isArray(d.addresses) ? (d.addresses as SavedAddress[]) : [],
    wishlistIds: Array.isArray(d.wishlist_ids) ? d.wishlist_ids.map(String) : [],
  };
}

function buildExtendedCustomerFields(profile: CustomerProfile): Record<string, unknown> {
  const split = splitFullName(profile.fullName);
  const firstName = clampSingleLine(profile.firstName ?? split.firstName, 60, 'BEE4');
  const lastName = clampSingleLine(profile.lastName ?? split.lastName, 60);
  return {
    first_name: firstName,
    last_name: lastName,
    gender: profile.gender ?? null,
    avatar_url: clampSingleLine(profile.avatarUrl ?? '', 500),
    preferred_language: profile.preferredLanguage === 'hi' ? 'hi' : 'en',
    notification_preferences:
      profile.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
    saved_upi_ids: (profile.savedUpiIds ?? []).slice(0, 10),
    devices: (profile.devices ?? []).slice(0, 12),
    account_status: profile.accountStatus === 'Suspended' ? 'Suspended' : 'Active',
    deactivation_requested: Boolean(profile.deactivationRequested),
    deactivation_requested_at: profile.deactivationRequestedAt ?? null,
    force_logged_out_at: profile.forceLoggedOutAt ?? null,
  };
}

async function syncCustomerRecordToSupabaseCustomersTable(
  profile: CustomerProfile,
  userId?: string | null
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const baseRow = {
      id: sanitizeId(profile.id, 'cust'),
      user_id: userId ?? profile.id,
      full_name: clampSingleLine(profile.fullName, 100, 'BEE4 Customer'),
      phone: clampSingleLine(profile.phone, 20),
      email: clampSingleLine(profile.email, 160),
      preferred_payment: profile.preferredPayment,
      celebration_month: clampStr(profile.celebrationMonth, 40) || null,
      crm_flag: profile.crmFlag ?? 'Standard',
      addresses: profile.addresses.slice(0, 12),
      wishlist_ids: profile.wishlistIds.slice(0, 50).map((id) => clampStr(id, 128)),
      created_at: profile.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const coreWithWallet = {
      ...baseRow,
      email_verified: Boolean(profile.emailVerified),
      email_confirmed_at: profile.emailConfirmedAt ?? null,
      wallet_balance: Math.max(0, Number(profile.walletBalance ?? 0)),
      wallet_transactions: (profile.walletTransactions ?? []).slice(0, 60),
      custom_designs: (profile.customDesigns ?? []).slice(0, 30),
    };
    const { error } = await client
      .from('customers')
      .upsert(
        {
          ...coreWithWallet,
          ...buildExtendedCustomerFields(profile),
        },
        { onConflict: 'id' }
      );
    if (error && isMissingSchemaError(error)) {
      const retry = await client
        .from('customers')
        .upsert(coreWithWallet, { onConflict: 'id' });
      if (retry.error && isMissingSchemaError(retry.error)) {
        await client.from('customers').upsert(baseRow, { onConflict: 'id' });
      }
    }
  } catch {
    // Non-fatal fallback if customers table isn't provisioned yet
  }
}

export async function ensureSupabaseCustomerProfile(
  sbUser: User,
  guestWishlistIds: string[],
  hints?: { fullName?: string; phone?: string }
): Promise<{ profile: CustomerProfile }> {
  const displayName = clampStr(
    (sbUser.user_metadata?.full_name as string | undefined) ||
      hints?.fullName ||
      sbUser.email?.split('@')[0],
    100,
    'BEE4 Shopper'
  );
  const split = splitFullName(displayName);
  const rawHintPhone =
    typeof sbUser.user_metadata?.phone === 'string'
      ? sbUser.user_metadata.phone
      : hints?.phone || '';
  const metaPhone = rawHintPhone.replace(/\D/g, '').slice(-10);
  const safeEmail = clampStr(sbUser.email, 160);
  const emailVerified = Boolean(sbUser.email_confirmed_at);
  const emailConfirmedAt = sbUser.email_confirmed_at ?? undefined;
  const boundedWishlist = guestWishlistIds.slice(0, 50).map((id) => clampStr(id, 128));

  const fallbackProfile: CustomerProfile = {
    id: sbUser.id,
    firstName: split.firstName,
    lastName: split.lastName,
    fullName: displayName,
    gender: undefined,
    phone: metaPhone,
    email: safeEmail,
    emailVerified,
    emailConfirmedAt,
    preferredPayment: 'UPI / Prepaid',
    preferredLanguage: 'en',
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    savedUpiIds: [],
    devices: [],
    accountStatus: 'Active',
    walletBalance: 0,
    walletTransactions: [],
    customDesigns: [],
    createdAt: sbUser.created_at || new Date().toISOString(),
    addresses: [],
    wishlistIds: boundedWishlist,
  };

  if (!supabase) return { profile: fallbackProfile };

  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sbUser.id)
      .maybeSingle();

    if (existing) {
      const existingWishlist = Array.isArray(existing.wishlist_ids)
        ? existing.wishlist_ids.map(String)
        : [];
      const mergedWishlist = Array.from(
        new Set([...existingWishlist, ...boundedWishlist])
      ).slice(0, 50);

      const resolvedPhone = String(existing.phone || metaPhone || '');
      const needsUpdate =
        mergedWishlist.length > existingWishlist.length ||
        Boolean(existing.email_verified) !== emailVerified ||
        (!existing.phone && Boolean(metaPhone));

      if (needsUpdate) {
        const updatePayload = {
          wishlist_ids: mergedWishlist,
          phone: resolvedPhone,
          email_verified: emailVerified,
          email_confirmed_at: emailConfirmedAt ?? null,
          updated_at: new Date().toISOString(),
        };
        const { error: updErr } = await supabase
          .from('profiles')
          .update(updatePayload)
          .eq('id', sbUser.id);
        if (updErr && isMissingSchemaError(updErr)) {
          await supabase
            .from('profiles')
            .update({
              wishlist_ids: mergedWishlist,
              phone: resolvedPhone,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sbUser.id);
        }
      }

      const mapped = normalizeProfileRowToCustomer(existing as Record<string, unknown>);
      const hydratedProfile: CustomerProfile = {
        ...mapped,
        id: sbUser.id,
        fullName: mapped.fullName || displayName,
        phone: resolvedPhone,
        email: mapped.email || safeEmail,
        emailVerified,
        emailConfirmedAt,
        wishlistIds: mergedWishlist,
      };
      void syncCustomerRecordToSupabaseCustomersTable(hydratedProfile, sbUser.id);
      return { profile: hydratedProfile };
    }

    const baseInsert = {
      id: sbUser.id,
      email: safeEmail,
      full_name: displayName,
      phone: metaPhone,
      preferred_payment: 'UPI / Prepaid',
      wishlist_ids: boundedWishlist,
      addresses: [],
      updated_at: new Date().toISOString(),
    };
    const coreWalletInsert = {
      ...baseInsert,
      email_verified: emailVerified,
      email_confirmed_at: emailConfirmedAt ?? null,
      wallet_balance: 0,
      wallet_transactions: [],
      custom_designs: [],
    };
    const { error: upsertErr } = await supabase.from('profiles').upsert(
      {
        ...coreWalletInsert,
        ...buildExtendedCustomerFields(fallbackProfile),
      },
      { onConflict: 'id' }
    );
    if (upsertErr && isMissingSchemaError(upsertErr)) {
      const retry = await supabase
        .from('profiles')
        .upsert(coreWalletInsert, { onConflict: 'id' });
      if (retry.error && isMissingSchemaError(retry.error)) {
        await supabase.from('profiles').upsert(baseInsert, { onConflict: 'id' });
      }
    }
    void syncCustomerRecordToSupabaseCustomersTable(fallbackProfile, sbUser.id);
  } catch {
    // Non-fatal fallback
  }

  return { profile: fallbackProfile };
}

export async function updateSupabaseCustomerProfile(profile: CustomerProfile): Promise<void> {
  if (!supabase) return;
  const baseUpdate = {
    full_name: clampStr(profile.fullName, 100, 'BEE4 Customer'),
    phone: clampStr(profile.phone, 20),
    email: clampStr(profile.email, 160),
    preferred_payment: profile.preferredPayment,
    celebration_month: clampStr(profile.celebrationMonth, 40) || null,
    wishlist_ids: profile.wishlistIds.slice(0, 50).map((id) => clampStr(id, 128)),
    addresses: profile.addresses.slice(0, 12),
    updated_at: new Date().toISOString(),
  };
  const walletUpdate = {
    ...baseUpdate,
    email_verified: Boolean(profile.emailVerified),
    email_confirmed_at: profile.emailConfirmedAt ?? null,
    wallet_balance: Math.max(0, Number(profile.walletBalance ?? 0)),
    wallet_transactions: (profile.walletTransactions ?? []).slice(0, 60),
    custom_designs: (profile.customDesigns ?? []).slice(0, 30),
  };
  const { error } = await supabase
    .from('profiles')
    .update({
      ...walletUpdate,
      ...buildExtendedCustomerFields(profile),
    })
    .eq('id', profile.id);
  if (error && isMissingSchemaError(error)) {
    const retry = await supabase
      .from('profiles')
      .update(walletUpdate)
      .eq('id', profile.id);
    if (retry.error && isMissingSchemaError(retry.error)) {
      await supabase.from('profiles').update(baseUpdate).eq('id', profile.id);
    }
  }
  await syncCustomerRecordToSupabaseCustomersTable(profile, profile.id);
}

export async function updateCustomerRecordAdminSupabase(profile: CustomerProfile): Promise<void> {
  const client = supabase;
  if (!client) return;
  await syncCustomerRecordToSupabaseCustomersTable(profile, profile.id);
  try {
    const profilePatch = {
      full_name: clampSingleLine(profile.fullName, 100, 'BEE4 Customer'),
      phone: clampSingleLine(profile.phone, 20),
      email: clampSingleLine(profile.email, 160),
      wallet_balance: Math.max(0, Number(profile.walletBalance ?? 0)),
      wallet_transactions: (profile.walletTransactions ?? []).slice(0, 60),
      ...buildExtendedCustomerFields(profile),
      updated_at: new Date().toISOString(),
    };
    const { error } = await client
      .from('profiles')
      .update(profilePatch)
      .eq('id', profile.id);
    if (error && isMissingSchemaError(error)) {
      await client
        .from('profiles')
        .update({
          full_name: profilePatch.full_name,
          phone: profilePatch.phone,
          email: profilePatch.email,
          wallet_balance: profilePatch.wallet_balance,
          wallet_transactions: profilePatch.wallet_transactions,
          updated_at: profilePatch.updated_at,
        })
        .eq('id', profile.id);
    }
  } catch {
    // Non-fatal fallback
  }
}

export function subscribeAllCustomersAdmin(
  onData: (customers: CustomerProfile[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        onData(data.map((r) => normalizeProfileRowToCustomer(r as Record<string, unknown>)));
        return;
      }
      // Fallback to profiles if customers table hasn't been created yet
      if (error && isMissingSchemaError(error)) {
        const prof = await client
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (!prof.error && prof.data) {
          onData(prof.data.map((r) => normalizeProfileRowToCustomer(r as Record<string, unknown>)));
        }
      }
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-admin-customers')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
      void load();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// ============================================================================
// Returns, Refunds & Replacement (RMA) & Inventory Adjustment Sync
// ============================================================================

function fromReturnRow(d: Record<string, unknown>): ReturnRequestRecord {
  const rawItems = Array.isArray(d.items) ? (d.items as Record<string, unknown>[]) : [];
  const items: ReturnItemEntry[] = rawItems.map((it) => ({
    productId: String(it.productId ?? ''),
    title: String(it.title ?? ''),
    variant: String(it.variant ?? 'Standard'),
    quantity: Math.max(1, Number(it.quantity ?? 1)),
    unitPrice: Number(it.unitPrice ?? 0),
    image: normalizeAssetPath(String(it.image ?? '')),
  }));

  const rawProofs = Array.isArray(d.proof_images)
    ? d.proof_images.map(String)
    : Array.isArray(d.proofImages)
      ? d.proofImages.map(String)
      : [];

  return {
    id: String(d.id ?? ''),
    rmaNumber: String(d.rma_number ?? d.rmaNumber ?? ''),
    orderNumber: String(d.order_number ?? d.orderNumber ?? ''),
    customerName: String(d.customer_name ?? d.customerName ?? ''),
    customerPhone: String(d.customer_phone ?? d.customerPhone ?? ''),
    customerEmail: String(d.customer_email ?? d.customerEmail ?? ''),
    orderPaymentMethod: (d.order_payment_method ?? d.orderPaymentMethod ?? 'upi') as PaymentMethod,
    orderTotal: Number(d.order_total ?? d.orderTotal ?? 0),
    items,
    reason: (d.reason as ReturnReason) || 'Damaged in Transit',
    resolutionType:
      (d.resolution_type ?? d.resolutionType ?? 'Free Instant Replacement') as ReturnResolutionType,
    customerComments: String(d.customer_comments ?? d.customerComments ?? ''),
    proofImages: rawProofs.map(normalizeAssetPath),
    refundUpiId: String(d.refund_upi_id ?? d.refundUpiId ?? ''),
    refundBankAccount: String(d.refund_bank_account ?? d.refundBankAccount ?? ''),
    refundBankIfsc: String(d.refund_bank_ifsc ?? d.refundBankIfsc ?? ''),
    status: (d.status as ReturnRequestStatus) || 'Return Requested',
    rejectionReason: String(d.rejection_reason ?? d.rejectionReason ?? ''),
    adminNote: String(d.admin_note ?? d.adminNote ?? ''),
    reverseCourier: String(d.reverse_courier ?? d.reverseCourier ?? ''),
    reverseAwb: String(d.reverse_awb ?? d.reverseAwb ?? ''),
    replacementAwb: String(d.replacement_awb ?? d.replacementAwb ?? ''),
    autoRestockEnabled: Boolean(d.auto_restock_enabled ?? d.autoRestockEnabled),
    isRestocked: Boolean(d.is_restocked ?? d.isRestocked),
    scrapRecorded: Boolean(d.scrap_recorded ?? d.scrapRecorded),
    replacementPrintQueued: Boolean(d.replacement_print_queued ?? d.replacementPrintQueued),
    refundAmount:
      typeof (d.refund_amount ?? d.refundAmount) === 'number'
        ? Number(d.refund_amount ?? d.refundAmount)
        : undefined,
    refundMode: (d.refund_mode ?? d.refundMode) as RefundMode | undefined,
    refundUtr: String(d.refund_utr ?? d.refundUtr ?? ''),
    issuedCouponCode: String(d.issued_coupon_code ?? d.issuedCouponCode ?? ''),
    sourceChannel: ((d.source_channel ?? d.sourceChannel) as MarketplaceChannel) || 'bee4.in',
    receivedAtHub: Boolean(d.received_at_hub ?? d.receivedAtHub),
    receivedAtHubDate:
      typeof (d.received_at_hub_date ?? d.receivedAtHubDate) === 'string'
        ? String(d.received_at_hub_date ?? d.receivedAtHubDate)
        : undefined,
    claimFiled: Boolean(d.claim_filed ?? d.claimFiled),
    claimFiledAt:
      typeof (d.claim_filed_at ?? d.claimFiledAt) === 'string'
        ? String(d.claim_filed_at ?? d.claimFiledAt)
        : undefined,
    claimReferenceId: String(d.claim_reference_id ?? d.claimReferenceId ?? ''),
    qcOutcome: (d.qc_outcome ?? d.qcOutcome) as ReturnRequestRecord['qcOutcome'] | undefined,
    cancelledAfterLabel: Boolean(d.cancelled_after_label ?? d.cancelledAfterLabel),
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    updatedAt: String(d.updated_at ?? d.updatedAt ?? new Date().toISOString()),
  };
}

function toReturnRow(rma: ReturnRequestRecord, userId?: string | null): Record<string, unknown> {
  return {
    id: sanitizeId(rma.id, 'rma'),
    rma_number: sanitizeSingleLine(rma.rmaNumber, 32),
    order_number: sanitizeSingleLine(rma.orderNumber, 32),
    user_id: userId || null,
    customer_name: clampSingleLine(rma.customerName, 100, 'Customer'),
    customer_phone: clampSingleLine(rma.customerPhone, 15, '9800000000'),
    customer_email: clampSingleLine(rma.customerEmail, 160),
    order_payment_method: rma.orderPaymentMethod,
    order_total: Math.max(0, Number(rma.orderTotal) || 0),
    items: rma.items.slice(0, 20),
    reason: rma.reason,
    resolution_type: rma.resolutionType,
    customer_comments: clampStr(rma.customerComments, 800),
    proof_images: rma.proofImages.slice(0, 4),
    refund_upi_id: clampSingleLine(rma.refundUpiId ?? '', 120),
    refund_bank_account: clampSingleLine(rma.refundBankAccount ?? '', 32),
    refund_bank_ifsc: clampSingleLine(rma.refundBankIfsc ?? '', 20).toUpperCase(),
    status: rma.status,
    rejection_reason: clampSingleLine(rma.rejectionReason ?? '', 240),
    admin_note: clampStr(rma.adminNote ?? '', 500),
    reverse_courier: clampSingleLine(rma.reverseCourier ?? '', 80),
    reverse_awb: clampSingleLine(rma.reverseAwb ?? '', 64),
    replacement_awb: clampSingleLine(rma.replacementAwb ?? '', 64),
    auto_restock_enabled: Boolean(rma.autoRestockEnabled),
    is_restocked: Boolean(rma.isRestocked),
    scrap_recorded: Boolean(rma.scrapRecorded),
    replacement_print_queued: Boolean(rma.replacementPrintQueued),
    refund_amount: typeof rma.refundAmount === 'number' ? Math.max(0, rma.refundAmount) : null,
    refund_mode: rma.refundMode ?? null,
    refund_utr: clampSingleLine(rma.refundUtr ?? '', 80),
    issued_coupon_code: clampSingleLine(rma.issuedCouponCode ?? '', 40),
    source_channel: rma.sourceChannel || 'bee4.in',
    received_at_hub: Boolean(rma.receivedAtHub),
    received_at_hub_date: rma.receivedAtHubDate || null,
    claim_filed: Boolean(rma.claimFiled),
    claim_filed_at: rma.claimFiledAt || null,
    claim_reference_id: clampSingleLine(rma.claimReferenceId ?? '', 64),
    qc_outcome: rma.qcOutcome || 'Pending',
    cancelled_after_label: Boolean(rma.cancelledAfterLabel),
    created_at: rma.createdAt || new Date().toISOString(),
    updated_at: rma.updatedAt || new Date().toISOString(),
  };
}

export function subscribeAllReturnsAdmin(
  onData: (returns: ReturnRequestRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('returns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromReturnRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-admin-returns')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'returns' }, () => {
      void load();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeUserReturns(
  userId: string,
  onData: (returns: ReturnRequestRecord[]) => void
): () => void {
  const client = supabase;
  if (!client || !userId) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('returns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromReturnRow(r as Record<string, unknown>)));
    } catch {
      // Optional fallback
    }
  };

  void load();

  const channel = client
    .channel(`bee4-user-returns-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'returns', filter: `user_id=eq.${userId}` },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

function isMissingSchemaError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === 'PGRST204' ||
    error.code === '42P01' ||
    error.code === '42703' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  );
}

export async function createReturnRequestInSupabase(
  rma: ReturnRequestRecord,
  userId?: string | null
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('returns')
      .upsert(toReturnRow(rma, userId), { onConflict: 'id' });
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase createReturnRequest error:', error.message);
    }
  } catch {
    // Fallback safely to local storage
  }
}

export async function updateReturnRequestInSupabase(rma: ReturnRequestRecord): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const row = toReturnRow(rma);
    delete row.user_id;
    const { error } = await client.from('returns').update(row).eq('id', sanitizeId(rma.id, 'rma'));
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase updateReturnRequest error:', error.message);
    }
  } catch {
    // Fallback safely to local storage
  }
}

export async function updateOrderRefundInSupabase(
  orderNumber: string,
  refundStatus: OrderRecord['refundStatus'],
  refundedAmount: number
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('orders')
      .update({
        refund_status: refundStatus ?? 'None',
        refunded_amount: Math.max(0, Number(refundedAmount) || 0),
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', sanitizeId(orderNumber, 'BEE4'));
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase updateOrderRefund error:', error.message);
    }
  } catch {
    // Fallback safely to local storage
  }
}

export function subscribeInventoryAdjustmentsAdmin(
  onData: (logs: InventoryAdjustmentRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client
        .from('inventory_adjustments')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(80);
      if (error || !data) return;
      onData(
        data.map((d) => ({
          id: String(d.id),
          timestamp: String(d.timestamp ?? new Date().toISOString()),
          productId: String(d.product_id ?? ''),
          productTitle: String(d.product_title ?? ''),
          sku: typeof d.sku === 'string' ? d.sku : undefined,
          delta: Number(d.delta ?? 0),
          adjustmentType:
            (d.adjustment_type as InventoryAdjustmentRecord['adjustmentType']) || 'manual_adjust',
          referenceId: String(d.reference_id ?? ''),
          note: String(d.note ?? ''),
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-inventory-adjustments')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventory_adjustments' },
      () => {
        void load();
      }
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function writeInventoryAdjustmentToSupabase(
  entry: InventoryAdjustmentRecord
): Promise<void> {
  const client = supabase;
  if (!client) return;
  await client.from('inventory_adjustments').upsert(
    {
      id: sanitizeId(entry.id, 'inv'),
      product_id: sanitizeSingleLine(entry.productId, 128),
      product_title: sanitizeSingleLine(entry.productTitle, 160),
      sku: entry.sku ? sanitizeSingleLine(entry.sku, 64) : null,
      delta: Number(entry.delta) || 0,
      adjustment_type: entry.adjustmentType,
      reference_id: sanitizeSingleLine(entry.referenceId, 64),
      note: sanitizeRichInput(entry.note, 300),
      timestamp: entry.timestamp || new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

// ============================================================================
// Customer Messages ('Send Us a Note') & Product Reviews Realtime CRUD Sync
// ============================================================================

function fromCustomerMessageRow(d: Record<string, unknown>): CustomerMessageRecord {
  const rawStatus = String(d.status ?? 'Unread');
  const status: CustomerMessageStatus =
    rawStatus === 'Read' ||
    rawStatus === 'Replied / Resolved' ||
    rawStatus === 'Archived'
      ? rawStatus
      : 'Unread';

  return {
    id: String(d.id ?? ''),
    customerName: String(d.customer_name ?? d.customerName ?? ''),
    phone: String(d.phone ?? ''),
    email: typeof d.email === 'string' ? d.email : '',
    topic: String(d.topic ?? 'General Note'),
    message: String(d.message ?? ''),
    status,
    adminNote: typeof (d.admin_note ?? d.adminNote) === 'string'
      ? String(d.admin_note ?? d.adminNote)
      : '',
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    updatedAt: String(d.updated_at ?? d.updatedAt ?? new Date().toISOString()),
  };
}

function toCustomerMessageRow(
  msg: CustomerMessageRecord,
  userId?: string | null
): Record<string, unknown> {
  return {
    id: sanitizeId(msg.id, 'msg'),
    user_id: userId || null,
    customer_name: clampSingleLine(msg.customerName, 120, 'Customer'),
    phone: clampSingleLine(msg.phone, 20, '9800000000'),
    email: clampSingleLine(msg.email ?? '', 160),
    topic: clampSingleLine(msg.topic, 100, 'General Note'),
    message: clampStr(msg.message, 2000, 'Customer inquiry note'),
    status: msg.status || 'Unread',
    admin_note: sanitizeRichInput(msg.adminNote ?? '', 600),
    created_at: msg.createdAt || new Date().toISOString(),
    updated_at: msg.updatedAt || new Date().toISOString(),
  };
}

export function subscribeAllCustomerMessagesAdmin(
  onData: (messages: CustomerMessageRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('customer_messages')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromCustomerMessageRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-admin-customer-messages')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customer_messages' },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function submitCustomerMessageToSupabase(
  msg: CustomerMessageRecord,
  userId?: string | null
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('customer_messages')
      .upsert(toCustomerMessageRow(msg, userId), { onConflict: 'id' });
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase submitCustomerMessage error:', error.message);
    }
  } catch {
    // Fallback safely to local storage
  }
}

export async function updateCustomerMessageInSupabase(
  msg: CustomerMessageRecord
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const row = toCustomerMessageRow(msg);
    delete row.user_id;
    const { error } = await client
      .from('customer_messages')
      .update(row)
      .eq('id', sanitizeId(msg.id, 'msg'));
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase updateCustomerMessage error:', error.message);
    }
  } catch {
    // Fallback safely
  }
}

export async function deleteCustomerMessageFromSupabase(id: string): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('customer_messages')
      .delete()
      .eq('id', sanitizeId(id, 'msg'));
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase deleteCustomerMessage error:', error.message);
    }
  } catch {
    // Fallback safely
  }
}

export async function bulkDeleteCustomerMessagesFromSupabase(ids: string[]): Promise<void> {
  const client = supabase;
  if (!client || ids.length === 0) return;
  try {
    const cleanIds = ids.map((id) => sanitizeId(id, 'msg'));
    const { error } = await client.from('customer_messages').delete().in('id', cleanIds);
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase bulkDeleteCustomerMessages error:', error.message);
    }
  } catch {
    // Fallback safely
  }
}

function fromProductReviewRow(d: Record<string, unknown>): ProductReviewRecord {
  const rawStatus = String(d.status ?? 'Pending');
  const status: ProductReviewStatus =
    rawStatus === 'Published' || rawStatus === 'Hidden' ? rawStatus : 'Pending';
  const clampedRating = Math.max(1, Math.min(5, Math.round(Number(d.rating ?? 5)))) as
    | 1
    | 2
    | 3
    | 4
    | 5;

  return {
    id: String(d.id ?? ''),
    productId: String(d.product_id ?? d.productId ?? ''),
    productName: String(d.product_name ?? d.productName ?? ''),
    customerName: String(d.customer_name ?? d.customerName ?? ''),
    customerContact: typeof (d.customer_contact ?? d.customerContact) === 'string'
      ? String(d.customer_contact ?? d.customerContact)
      : '',
    cityOrRole: typeof (d.city_or_role ?? d.cityOrRole) === 'string'
      ? String(d.city_or_role ?? d.cityOrRole)
      : '',
    rating: clampedRating,
    comment: String(d.comment ?? ''),
    photoUrl: (d.photo_url ?? d.photoUrl)
      ? normalizeAssetPath(String(d.photo_url ?? d.photoUrl))
      : '',
    verifiedBuyer: Boolean(d.verified_buyer ?? d.verifiedBuyer),
    featuredOnHomepage: Boolean(d.featured_on_homepage ?? d.featuredOnHomepage),
    status,
    adminReply: typeof (d.admin_reply ?? d.adminReply) === 'string'
      ? String(d.admin_reply ?? d.adminReply)
      : '',
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    updatedAt: String(d.updated_at ?? d.updatedAt ?? new Date().toISOString()),
  };
}

function toProductReviewRow(
  review: ProductReviewRecord,
  userId?: string | null
): Record<string, unknown> {
  return {
    id: sanitizeId(review.id, 'rev'),
    user_id: userId || null,
    product_id: clampSingleLine(review.productId, 128, 'bee4-product'),
    product_name: clampSingleLine(review.productName, 180, 'BEE4 Brain Toy'),
    customer_name: clampSingleLine(review.customerName, 100, 'BEE4 Parent'),
    customer_contact: clampSingleLine(review.customerContact ?? '', 160),
    city_or_role: clampSingleLine(review.cityOrRole ?? '', 100),
    rating: Math.max(1, Math.min(5, Math.round(Number(review.rating) || 5))),
    comment: clampStr(review.comment, 1200, 'Great toy.'),
    photo_url: sanitizeSingleLine(review.photoUrl ?? '', 500),
    verified_buyer: Boolean(review.verifiedBuyer),
    featured_on_homepage: Boolean(review.featuredOnHomepage),
    status: review.status || 'Pending',
    admin_reply: sanitizeRichInput(review.adminReply ?? '', 600),
    created_at: review.createdAt || new Date().toISOString(),
    updated_at: review.updatedAt || new Date().toISOString(),
  };
}

export function subscribePublicPublishedReviews(
  onData: (reviews: ProductReviewRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('product_reviews')
        .select('*')
        .eq('status', 'Published')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromProductReviewRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-public-product-reviews')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_reviews' },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeAllProductReviewsAdmin(
  onData: (reviews: ProductReviewRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromProductReviewRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-admin-product-reviews')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_reviews' },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function submitProductReviewToSupabase(
  review: ProductReviewRecord,
  userId?: string | null
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('product_reviews')
      .upsert(toProductReviewRow(review, userId), { onConflict: 'id' });
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase submitProductReview error:', error.message);
    }
  } catch {
    // Fallback safely to local storage
  }
}

export async function updateProductReviewInSupabase(
  review: ProductReviewRecord
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const row = toProductReviewRow(review);
    delete row.user_id;
    const { error } = await client
      .from('product_reviews')
      .update(row)
      .eq('id', sanitizeId(review.id, 'rev'));
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase updateProductReview error:', error.message);
    }
  } catch {
    // Fallback safely
  }
}

export async function deleteProductReviewFromSupabase(id: string): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('product_reviews')
      .delete()
      .eq('id', sanitizeId(id, 'rev'));
    if (error && !isMissingSchemaError(error)) {
      console.error('Supabase deleteProductReview error:', error.message);
    }
  } catch {
    // Fallback safely
  }
}

// ============================================================================
// One-Click Seed Helper for Supabase Admin
// ============================================================================

export async function seedSupabaseDataAsAdmin(input: {
  products: Product[];
  orders: OrderRecord[];
  coupons: CouponRecord[];
  settings: StoreSettings;
  printJobs: PrintJobRecord[];
  spools: FilamentSpool[];
  testimonials: Testimonial[];
  returns?: ReturnRequestRecord[];
  customerMessages?: CustomerMessageRecord[];
  productReviews?: ProductReviewRecord[];
}): Promise<void> {
  const client = supabase;
  if (!client) return;

  await Promise.all([
    client
      .from('products')
      .upsert(input.products.map(toProductRow), { onConflict: 'id' }),
    saveStoreSettingsToSupabase(input.settings),
    Promise.all(input.coupons.map((c) => saveCouponToSupabase(c))),
    Promise.all(
      input.orders.map((o) =>
        createOrderInSupabase(o, o.userId ?? null, { allowUpsert: true })
      )
    ),
    Promise.all(input.printJobs.map((j) => savePrintJobToSupabase(j))),
    Promise.all(input.spools.map((s) => saveFilamentSpoolToSupabase(s))),
    Promise.all(input.testimonials.map((t) => addTestimonialToSupabase(t, null))),
    Promise.all((input.returns ?? []).map((r) => createReturnRequestInSupabase(r, null))),
    Promise.all(
      (input.customerMessages ?? []).map((m) => submitCustomerMessageToSupabase(m, null))
    ),
    Promise.all(
      (input.productReviews ?? []).map((rev) => submitProductReviewToSupabase(rev, null))
    ),
  ]);
}

/**
 * Purges transactional & user/test records across live Supabase tables while
 * safely preserving the 16 live products, SMARTKID15 coupon, store_settings,
 * and Banka Lab filament spools.
 */
export async function purgeTestDataInSupabase(): Promise<{
  clearedTables: string[];
  errors: string[];
}> {
  const client = supabase;
  if (!client) {
    return { clearedTables: [], errors: [] };
  }

  const targets: { table: string; pk: string }[] = [
    { table: 'orders', pk: 'order_number' },
    { table: 'returns', pk: 'id' },
    { table: 'customer_messages', pk: 'id' },
    { table: 'product_reviews', pk: 'id' },
    { table: 'inquiries', pk: 'id' },
    { table: 'testimonials', pk: 'id' },
    { table: 'print_jobs', pk: 'id' },
    { table: 'inventory_adjustments', pk: 'id' },
    { table: 'admin_logs', pk: 'id' },
    { table: 'customers', pk: 'id' },
    { table: 'ad_spend_logs', pk: 'id' },
  ];

  const clearedTables: string[] = [];
  const errors: string[] = [];

  await Promise.all(
    targets.map(async ({ table, pk }) => {
      try {
        const { error } = await client.from(table).delete().neq(pk, '__preserve_none__');
        if (!error) {
          clearedTables.push(table);
        } else if (!isMissingSchemaError(error)) {
          errors.push(`${table}: ${error.message}`);
        }
      } catch (err) {
        errors.push(`${table}: ${err instanceof Error ? err.message : 'delete failed'}`);
      }
    })
  );

  return { clearedTables, errors };
}

// ============================================================================
// Omnichannel Marketplace Integrations, Automation Rules & Ad Spend Logs
// ============================================================================

export function subscribeMarketplaceIntegrationsAdmin(
  onData: (configs: MarketplaceIntegrationConfig[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client.from('marketplace_integrations').select('*');
      if (error || !data || data.length === 0) return;
      onData(
        data.map((d) => ({
          id: String(d.id ?? ''),
          key: String(d.key ?? ''),
          name: String(d.name ?? ''),
          category: ((d.category as MarketplaceIntegrationConfig['category']) || 'marketplace'),
          active: Boolean(d.active),
          sellerId: String(d.seller_id ?? ''),
          apiKey: String(d.api_key ?? ''),
          webhookUrl: String(d.webhook_url ?? ''),
          notes: typeof d.notes === 'string' ? d.notes : '',
          lastSyncedAt: typeof d.last_synced_at === 'string' ? d.last_synced_at : undefined,
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-marketplace-integrations')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'marketplace_integrations' },
      () => {
        void load();
      }
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveMarketplaceIntegrationToSupabase(
  config: MarketplaceIntegrationConfig
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    await client.from('marketplace_integrations').upsert(
      {
        id: sanitizeId(config.id, 'conn'),
        key: sanitizeSingleLine(config.key, 64),
        name: sanitizeSingleLine(config.name, 120),
        category: config.category,
        active: Boolean(config.active),
        seller_id: sanitizeSingleLine(config.sellerId, 120),
        api_key: sanitizeSingleLine(config.apiKey, 240),
        webhook_url: sanitizeSingleLine(config.webhookUrl, 300),
        notes: sanitizeRichInput(config.notes ?? '', 400),
        last_synced_at: config.lastSyncedAt || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful localStorage fallback
  }
}

export function subscribeAutomationRulesAdmin(
  onData: (rules: AutomationRule[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client
        .from('automation_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data || data.length === 0) return;
      onData(
        data.map((d) => ({
          id: String(d.id ?? ''),
          name: String(d.name ?? ''),
          enabled: Boolean(d.enabled),
          trigger: (d.trigger as AutomationTrigger) || 'new_order_placed',
          conditionField: (d.condition_field as AutomationConditionField) || 'always',
          conditionValue: String(d.condition_value ?? ''),
          actionType: (d.action_type as AutomationActionType) || 'auto_accept_order',
          actionValue: String(d.action_value ?? ''),
          executionCount: Number(d.execution_count ?? 0),
          lastExecutedAt: typeof d.last_executed_at === 'string' ? d.last_executed_at : undefined,
          createdAt: String(d.created_at ?? new Date().toISOString()),
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-automation-rules')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'automation_rules' }, () => {
      void load();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveAutomationRuleToSupabase(rule: AutomationRule): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    await client.from('automation_rules').upsert(
      {
        id: sanitizeId(rule.id, 'rule'),
        name: sanitizeSingleLine(rule.name, 140),
        enabled: Boolean(rule.enabled),
        trigger: rule.trigger,
        condition_field: rule.conditionField,
        condition_value: sanitizeSingleLine(rule.conditionValue, 120),
        action_type: rule.actionType,
        action_value: sanitizeSingleLine(rule.actionValue, 120),
        execution_count: Math.max(0, Number(rule.executionCount) || 0),
        last_executed_at: rule.lastExecutedAt || null,
        created_at: rule.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful localStorage fallback
  }
}

export async function deleteAutomationRuleFromSupabase(ruleId: string): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    await client.from('automation_rules').delete().eq('id', sanitizeId(ruleId, 'rule'));
  } catch {
    // Ignore
  }
}

export function subscribeAdSpendLogsAdmin(
  onData: (logs: MonthlyAdSpendRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const load = async () => {
    try {
      const { data, error } = await client
        .from('ad_spend_logs')
        .select('*')
        .order('month', { ascending: false });
      if (error || !data) return;
      onData(
        data.map((d) => ({
          id: String(d.id ?? ''),
          month: String(d.month ?? ''),
          channel: ((d.channel as MonthlyAdSpendRecord['channel']) || 'All Channels'),
          amount: Number(d.amount ?? 0),
          notes: typeof d.notes === 'string' ? d.notes : '',
          updatedAt: String(d.updated_at ?? new Date().toISOString()),
        }))
      );
    } catch {
      // Optional table fallback
    }
  };
  void load();
  const channel = client
    .channel('bee4-admin-ad-spend')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_spend_logs' }, () => {
      void load();
    })
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function saveAdSpendLogToSupabase(entry: MonthlyAdSpendRecord): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    await client.from('ad_spend_logs').upsert(
      {
        id: sanitizeId(entry.id, 'ad'),
        month: sanitizeSingleLine(entry.month, 20),
        channel: entry.channel,
        amount: Math.max(0, Number(entry.amount) || 0),
        notes: sanitizeRichInput(entry.notes ?? '', 240),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // Graceful localStorage fallback
  }
}

// ============================================================================
// Digital Gift Cards, Customer Support Tickets & Custom Uploads Storage
// ============================================================================

function fromGiftCardRow(d: Record<string, unknown>): GiftCardRecord {
  return {
    id: String(d.id ?? ''),
    code: String(d.code ?? '').toUpperCase(),
    pin: String(d.pin ?? ''),
    initialAmount: Number(d.initial_amount ?? d.initialAmount ?? 0),
    balance: Number(d.balance ?? 0),
    purchaserUserId: d.purchaser_user_id ? String(d.purchaser_user_id) : null,
    purchaserName: String(d.purchaser_name ?? d.purchaserName ?? 'BEE4 Customer'),
    purchaserEmail: String(d.purchaser_email ?? d.purchaserEmail ?? ''),
    purchaserPhone: String(d.purchaser_phone ?? d.purchaserPhone ?? ''),
    recipientName: String(d.recipient_name ?? d.recipientName ?? ''),
    recipientEmail: String(d.recipient_email ?? d.recipientEmail ?? ''),
    message: typeof d.message === 'string' ? d.message : '',
    active: d.active !== false,
    issuedReason:
      (d.issued_reason ?? d.issuedReason ?? 'Purchased') as GiftCardRecord['issuedReason'],
    redeemedByUserId: d.redeemed_by_user_id ? String(d.redeemed_by_user_id) : null,
    redeemedAt:
      typeof (d.redeemed_at ?? d.redeemedAt) === 'string'
        ? String(d.redeemed_at ?? d.redeemedAt)
        : undefined,
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    expiresAt:
      typeof (d.expires_at ?? d.expiresAt) === 'string'
        ? String(d.expires_at ?? d.expiresAt)
        : undefined,
  };
}

export function subscribeGiftCards(
  onData: (cards: GiftCardRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromGiftCardRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-gift-cards')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'gift_cards' }, () => {
      void load();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function createGiftCardInSupabase(card: GiftCardRecord): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client.from('gift_cards').insert({
      id: sanitizeId(card.id, 'gc'),
      code: clampSingleLine(card.code, 32).toUpperCase(),
      pin: clampSingleLine(card.pin, 8),
      initial_amount: Math.max(1, Number(card.initialAmount) || 0),
      balance: Math.max(0, Number(card.balance) || 0),
      purchaser_user_id: card.purchaserUserId || null,
      purchaser_name: clampSingleLine(card.purchaserName, 100, 'BEE4 Customer'),
      purchaser_email: clampSingleLine(card.purchaserEmail, 160),
      purchaser_phone: clampSingleLine(card.purchaserPhone ?? '', 20),
      recipient_name: clampSingleLine(card.recipientName, 100, 'Recipient'),
      recipient_email: clampSingleLine(card.recipientEmail, 160),
      message: clampStr(card.message ?? '', 300),
      active: Boolean(card.active),
      issued_reason: card.issuedReason ?? 'Purchased',
      redeemed_by_user_id: card.redeemedByUserId ?? null,
      redeemed_at: card.redeemedAt ?? null,
      expires_at: card.expiresAt ?? null,
      created_at: card.createdAt || new Date().toISOString(),
    });
    if (error && !isMissingSchemaError(error)) {
      console.error('[BEE4 GiftCard] Supabase insert error:', error.message);
    }
  } catch {
    // Fallback to local state
  }
}

export async function updateGiftCardInSupabase(card: GiftCardRecord): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('gift_cards')
      .update({
        balance: Math.max(0, Number(card.balance) || 0),
        active: Boolean(card.active),
        redeemed_by_user_id: card.redeemedByUserId ?? null,
        redeemed_at: card.redeemedAt ?? null,
      })
      .eq('id', sanitizeId(card.id, 'gc'));
    if (error && !isMissingSchemaError(error)) {
      console.error('[BEE4 GiftCard] Supabase update error:', error.message);
    }
  } catch {
    // Fallback to local state
  }
}

export async function redeemGiftCardViaSupabaseRpc(
  code: string,
  pin: string
): Promise<{ usedRpc: boolean; creditedAmount?: number; code?: string; redeemedAt?: string }> {
  const client = supabase;
  if (!client) return { usedRpc: false };

  try {
    const { data, error } = await client.rpc('redeem_bee4_gift_card', {
      p_code: code.trim().toUpperCase(),
      p_pin: pin.trim(),
    });
    if (!error && data && typeof data === 'object') {
      const payload = data as Record<string, unknown>;
      return {
        usedRpc: true,
        creditedAmount: Number(payload.credited_amount ?? 0),
        code: String(payload.code ?? code).toUpperCase(),
        redeemedAt: String(payload.redeemed_at ?? new Date().toISOString()),
      };
    }
    if (
      error &&
      !isMissingSchemaError(error) &&
      !error.message.toLowerCase().includes('function')
    ) {
      throw new Error(error.message);
    }
  } catch (err) {
    if (
      err instanceof Error &&
      !err.message.toLowerCase().includes('function') &&
      !err.message.toLowerCase().includes('schema')
    ) {
      throw err;
    }
  }
  return { usedRpc: false };
}

export function subscribeUserCustomerMessages(
  userId: string,
  email: string | undefined,
  onData: (messages: CustomerMessageRecord[]) => void
): () => void {
  const client = supabase;
  if (!client || (!userId && !email)) return () => {};

  const load = async () => {
    try {
      const cleanEmail = (email ?? '').trim().toLowerCase();
      const query = client
        .from('customer_messages')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = cleanEmail
        ? await query.or(`user_id.eq.${userId},email.ilike.${cleanEmail}`)
        : await query.eq('user_id', userId);

      if (error || !data) return;
      onData(data.map((r) => fromCustomerMessageRow(r as Record<string, unknown>)));
    } catch {
      // Optional fallback
    }
  };

  void load();

  const channel = client
    .channel(`bee4-user-messages-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customer_messages' },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function uploadCustomDesignToSupabaseStorage(
  file: File,
  userId: string
): Promise<{ url: string; storageMode: 'supabase' | 'local-fallback' }> {
  const compressedDataUrl = await compressImageToDataUrl(file);
  const client = supabase;
  if (!client) {
    return { url: compressedDataUrl, storageMode: 'local-fallback' };
  }
  try {
    const safeUid = sanitizeId(userId || 'guest', 'cust');
    const filePath = `custom-uploads/${safeUid}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`;
    const blob = await fetch(compressedDataUrl).then((r) => r.blob());

    const { error: uploadError } = await client.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return { url: compressedDataUrl, storageMode: 'local-fallback' };
    }

    const { data: publicData } = client.storage
      .from(SUPABASE_PRODUCT_BUCKET)
      .getPublicUrl(filePath);

    if (publicData?.publicUrl) {
      return { url: publicData.publicUrl, storageMode: 'supabase' };
    }
    return { url: compressedDataUrl, storageMode: 'local-fallback' };
  } catch {
    return { url: compressedDataUrl, storageMode: 'local-fallback' };
  }
}

// ============================================================================
// Product Questions & Answers (PDP <-> Customer Account <-> Admin Q&A)
// ============================================================================

function fromProductQuestionRow(d: Record<string, unknown>): ProductQuestionRecord {
  return {
    id: String(d.id ?? ''),
    userId: d.user_id ? String(d.user_id) : null,
    productId: String(d.product_id ?? d.productId ?? ''),
    productName: String(d.product_name ?? d.productName ?? 'BEE4 Product'),
    customerName: String(d.customer_name ?? d.customerName ?? 'BEE4 Shopper'),
    customerContact: String(d.customer_contact ?? d.customerContact ?? ''),
    question: String(d.question ?? ''),
    answer: typeof d.answer === 'string' && d.answer.trim() ? d.answer : undefined,
    answeredBy:
      typeof (d.answered_by ?? d.answeredBy) === 'string' &&
      String(d.answered_by ?? d.answeredBy).trim()
        ? String(d.answered_by ?? d.answeredBy)
        : undefined,
    status: d.status === 'Answered' ? 'Answered' : 'Pending',
    createdAt: String(d.created_at ?? d.createdAt ?? new Date().toISOString()),
    updatedAt: String(d.updated_at ?? d.updatedAt ?? new Date().toISOString()),
  };
}

export function subscribePublicProductQuestions(
  onData: (questions: ProductQuestionRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('product_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromProductQuestionRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-public-product-questions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_questions' },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function subscribeAllProductQuestionsAdmin(
  onData: (questions: ProductQuestionRecord[]) => void
): () => void {
  const client = supabase;
  if (!client) return () => {};

  const load = async () => {
    try {
      const { data, error } = await client
        .from('product_questions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return;
      onData(data.map((r) => fromProductQuestionRow(r as Record<string, unknown>)));
    } catch {
      // Optional table fallback
    }
  };

  void load();

  const channel = client
    .channel('bee4-admin-product-questions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'product_questions' },
      () => {
        void load();
      }
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export async function submitProductQuestionToSupabase(
  question: ProductQuestionRecord,
  userId?: string | null
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client.from('product_questions').upsert(
      {
        id: sanitizeId(question.id, 'qa'),
        user_id: userId || question.userId || null,
        product_id: sanitizeId(question.productId, 'prod'),
        product_name: clampSingleLine(question.productName, 160, 'BEE4 Product'),
        customer_name: clampSingleLine(question.customerName, 100, 'BEE4 Shopper'),
        customer_contact: clampSingleLine(question.customerContact ?? '', 160),
        question: clampStr(question.question, 600, ''),
        answer: clampStr(question.answer ?? '', 1000),
        answered_by: clampSingleLine(question.answeredBy ?? '', 80),
        status: question.status === 'Answered' ? 'Answered' : 'Pending',
        created_at: question.createdAt || new Date().toISOString(),
        updated_at: question.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error && !isMissingSchemaError(error)) {
      console.error('[BEE4 QA] submit error:', error.message);
    }
  } catch {
    // Graceful local fallback
  }
}

export async function updateProductQuestionInSupabase(
  question: ProductQuestionRecord
): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('product_questions')
      .update({
        answer: clampStr(question.answer ?? '', 1000),
        answered_by: clampSingleLine(question.answeredBy ?? 'Team BEE4', 80),
        status: question.status === 'Answered' ? 'Answered' : 'Pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sanitizeId(question.id, 'qa'));
    if (error && !isMissingSchemaError(error)) {
      console.error('[BEE4 QA] update error:', error.message);
    }
  } catch {
    // Graceful local fallback
  }
}

export async function deleteProductQuestionFromSupabase(id: string): Promise<void> {
  const client = supabase;
  if (!client) return;
  try {
    const { error } = await client
      .from('product_questions')
      .delete()
      .eq('id', sanitizeId(id, 'qa'));
    if (error && !isMissingSchemaError(error)) {
      console.error('[BEE4 QA] delete error:', error.message);
    }
  } catch {
    // Graceful local fallback
  }
}


