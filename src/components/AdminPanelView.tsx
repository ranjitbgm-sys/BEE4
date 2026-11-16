import { ChangeEvent, FormEvent, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Cloud,
  Inbox,
  LayoutDashboard,
  Lock,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AgeGroup,
  CustomerInquiry,
  GiftOccasion,
  OrderRecord,
  OrderStatus,
  Product,
  ProductCategory,
  StoreSettings,
} from '../types';
import { AGE_GROUP_META } from '../data/catalog';
import {
  buildWhatsAppUrl,
  calculateAdminMetrics,
  filterAndSortProducts,
  filterOrders,
  formatINR,
  formatWhatsAppDisplay,
  normalizeWhatsAppNumber,
} from '../utils/storeLogic';
import { validateAdminPasswordChange } from '../utils/adminAuth';
import { ProductImage } from './ProductImage';

type AdminTab = 'overview' | 'products' | 'orders' | 'inquiries' | 'settings';

interface AdminPanelViewProps {
  products: Product[];
  orders: OrderRecord[];
  inquiries: CustomerInquiry[];
  settings: StoreSettings;
  adminPasswordHash: string;
  firebaseAdminEmail?: string | null;
  firebaseSignedInEmail?: string | null;
  onConnectGoogleAdmin?: () => Promise<void>;
  onSyncCatalogToCloud?: () => Promise<void>;
  onUpdateSettings: (next: StoreSettings) => void;
  onSaveProduct: (product: Product) => void;
  onToggleProductStock: (productId: string) => void;
  onDeleteProduct: (productId: string) => void;
  onResetCatalog: () => void;
  onUpdateOrderStatus: (orderNumber: string, status: OrderStatus) => void;
  onToggleInquiryStatus: (id: string) => void;
  onChangeAdminPasswordHash: (nextHash: string) => void;
  onLockAdmin: () => void;
  onBackToStore: () => void;
}

const EDITABLE_CATEGORIES = Object.values(ProductCategory).filter(
  (c) => c !== ProductCategory.ALL
) as Exclude<ProductCategory, ProductCategory.ALL>[];

const EDITABLE_AGE_GROUPS = Object.values(AgeGroup).filter(
  (a) => a !== AgeGroup.ALL
) as Exclude<AgeGroup, AgeGroup.ALL>[];

const EDITABLE_OCCASIONS = Object.values(GiftOccasion).filter(
  (o) => o !== GiftOccasion.ALL
) as Exclude<GiftOccasion, GiftOccasion.ALL>[];

const ORDER_STATUSES: OrderStatus[] = [
  'Confirmed',
  'Preparing Shipment',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const DEFAULT_CUSTOM_IMAGE = '/assets/images/toy_engineering_front_1794767911598.jpg';

function emptyProductDraft(): Product {
  return {
    id: `bee4-custom-${Date.now()}`,
    title: '',
    category: ProductCategory.ENGINEERING,
    ageGroup: AgeGroup.AGE_6_8,
    originConcept: '🇯🇵 Japanese Brain-Training Mechanism',
    occasion: GiftOccasion.BIRTHDAY,
    price: 499,
    compareAtPrice: 899,
    image: DEFAULT_CUSTOM_IMAGE,
    gallery: [
      {
        id: 'front',
        label: 'View 1: Front',
        shortLabel: 'Front',
        url: DEFAULT_CUSTOM_IMAGE,
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
    ],
    variants: ['Standard Studio Edition'],
    shortSpec: 'Custom 3D-printed Bio-PLA · Precision interlocking fit',
    description: '',
    useCaseHi: 'Custom 3D-printed mechanism engineered for effortless hands-on assembly and play.',
    brainBenefitsHi: 'Strengthens spatial IQ, logical sequencing, and bilateral coordination.',
    whyParentsBuyHi: 'Replaces passive screen habits with engaging, quiet tactile focus.',
    materials: 'Food-Safe Matte Bio-PLA+',
    dimensions: 'Standard Tabletop Size',
    inStock: true,
    featured: false,
    tag: 'New Release',
  };
}

function resizeUploadedImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        const maxWidth = 720;
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
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function statusTone(status: OrderStatus): string {
  switch (status) {
    case 'Delivered':
      return 'text-emerald-700';
    case 'Shipped':
      return 'text-blue-700';
    case 'Cancelled':
      return 'text-red-600';
    case 'Preparing Shipment':
    case 'Confirmed':
    default:
      return 'text-amber-700';
  }
}

export function AdminPanelView({
  products,
  orders,
  inquiries,
  settings,
  adminPasswordHash,
  firebaseAdminEmail = null,
  firebaseSignedInEmail = null,
  onConnectGoogleAdmin,
  onSyncCatalogToCloud,
  onUpdateSettings,
  onSaveProduct,
  onToggleProductStock,
  onDeleteProduct,
  onResetCatalog,
  onUpdateOrderStatus,
  onToggleInquiryStatus,
  onChangeAdminPasswordHash,
  onLockAdmin,
  onBackToStore,
}: AdminPanelViewProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [statusNotice, setStatusNotice] = useState('');
  const [cloudActionLoading, setCloudActionLoading] = useState(false);
  const [cloudActionError, setCloudActionError] = useState('');

  // Product management state
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState<ProductCategory>(ProductCategory.ALL);
  const [editing, setEditing] = useState<Product | null>(null);
  const [variantsText, setVariantsText] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  // Order management state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Store settings draft
  const [waDraft, setWaDraft] = useState(() => settings.whatsappNumber.replace(/^91/, ''));
  const [emailDraft, setEmailDraft] = useState(settings.supportEmail);
  const [bannerDraft, setBannerDraft] = useState(settings.announcementText);
  const [shippingDraft, setShippingDraft] = useState(String(settings.freeShippingThreshold));
  const [promoCodeDraft, setPromoCodeDraft] = useState(settings.promoCode);
  const [promoPercentDraft, setPromoPercentDraft] = useState(String(settings.promoDiscountPercent));
  const [settingsError, setSettingsError] = useState('');

  // Admin password change draft
  const [currPassDraft, setCurrPassDraft] = useState('');
  const [newPassDraft, setNewPassDraft] = useState('');
  const [confirmPassDraft, setConfirmPassDraft] = useState('');
  const [passError, setPassError] = useState('');

  const metrics = calculateAdminMetrics(products, orders);
  const newInquiriesCount = inquiries.filter((i) => i.status === 'New').length;

  const filteredProducts = filterAndSortProducts(products, {
    category: productCatFilter,
    occasion: GiftOccasion.ALL,
    search: productSearch,
    maxPrice: null,
    sortBy: 'featured',
  });

  const filteredOrders = filterOrders(orders, {
    search: orderSearch,
    status: orderStatusFilter,
  });

  const openEditor = (product: Product) => {
    setActiveTab('products');
    setEditing({ ...product });
    setVariantsText(product.variants.join(', '));
    setFormError('');
    setStatusNotice('');
  };

  const openNewProduct = () => {
    const fresh = emptyProductDraft();
    setActiveTab('products');
    setEditing(fresh);
    setVariantsText(fresh.variants.join(', '));
    setFormError('');
    setStatusNotice('');
  };

  const handlePhotoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    try {
      const compressedDataUrl = await resizeUploadedImage(file);
      setEditing({ ...editing, image: compressedDataUrl });
      setFormError('');
    } catch {
      setFormError('Could not load that image file. Please try a JPG or PNG.');
    }
  };

  const handleSaveProduct = (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    if (editing.title.trim().length < 2) {
      setFormError('Please enter a product title.');
      return;
    }
    if (!Number.isFinite(editing.price) || editing.price < 1) {
      setFormError('Please enter a valid selling price in ₹.');
      return;
    }

    const parsedVariants = variantsText
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const syncedGallery: Product['gallery'] = editing.gallery
      ? [
          { ...editing.gallery[0], url: editing.image },
          editing.gallery[1],
          editing.gallery[2],
        ]
      : [
          { id: 'front', label: 'View 1: Front', shortLabel: 'Front', url: editing.image, objectPosition: '50% 50%' },
          { id: 'mechanism', label: 'View 2: Mechanism/Inside', shortLabel: 'Mechanism', url: '/assets/images/toy_mechanism_inside_1794767912639.jpg', objectPosition: '50% 50%' },
          { id: 'scale', label: 'View 3: Hands-On Scale', shortLabel: 'Scale', url: '/assets/images/toy_hands_on_scale_1794767913261.jpg', objectPosition: '50% 50%' },
        ];

    const saved: Product = {
      ...editing,
      title: editing.title.trim(),
      originConcept: editing.originConcept.trim() || '🇯🇵 East-Asian Brain Toy',
      price: Math.round(editing.price),
      compareAtPrice:
        editing.compareAtPrice && editing.compareAtPrice > editing.price
          ? Math.round(editing.compareAtPrice)
          : undefined,
      gallery: syncedGallery,
      variants: parsedVariants.length > 0 ? parsedVariants : ['Standard Studio Edition'],
      description:
        editing.description.trim() ||
        'Screen-free East-Asian brain-training toy precision 3D-printed in small batches.',
      shortSpec: editing.shortSpec.trim() || '3D-printed Bio-PLA+ · Worldwide shipping',
      useCaseHi: editing.useCaseHi.trim() || 'Hands-on mechanical puzzle engineered to spark curiosity away from screens.',
      brainBenefitsHi: editing.brainBenefitsHi.trim() || 'Strengthens logical thinking, focus, and spatial dexterity.',
      whyParentsBuyHi: editing.whyParentsBuyHi.trim() || 'Ideal for nurturing screen-free concentration and creative thinking.',
    };

    onSaveProduct(saved);
    setEditing(null);
    setStatusNotice(`Saved "${saved.title}" to your live BEE4 catalog.`);
  };

  const handleSaveSettings = (event: FormEvent) => {
    event.preventDefault();
    const digits = waDraft.replace(/\D/g, '');
    if (!/^([6-9]\d{9}|91[6-9]\d{9})$/.test(digits)) {
      setSettingsError('Enter a valid 10-digit Indian WhatsApp number (e.g. 9876543210).');
      return;
    }
    const thresholdNum = Number(shippingDraft);
    const discountNum = Number(promoPercentDraft);
    if (!Number.isFinite(thresholdNum) || thresholdNum < 0) {
      setSettingsError('Enter a valid free-shipping threshold in ₹.');
      return;
    }
    if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 80) {
      setSettingsError('Promo discount must be between 0% and 80%.');
      return;
    }

    const normalizedWa = normalizeWhatsAppNumber(digits);
    onUpdateSettings({
      whatsappNumber: normalizedWa,
      supportEmail: emailDraft.trim() || 'hello@bee4.in',
      announcementText:
        bannerDraft.trim() ||
        'Free delivery across India on orders ₹499+ · UPI & Cash on Delivery accepted',
      freeShippingThreshold: Math.round(thresholdNum),
      promoCode: promoCodeDraft.trim().toUpperCase(),
      promoDiscountPercent: Math.round(discountNum),
    });
    setSettingsError('');
    setStatusNotice('Store settings updated across the live BEE4 storefront.');
  };

  const handlePasswordChange = (event: FormEvent) => {
    event.preventDefault();
    const result = validateAdminPasswordChange({
      currentPassword: currPassDraft,
      newPassword: newPassDraft,
      confirmPassword: confirmPassDraft,
      expectedHash: adminPasswordHash,
    });
    if (result.error || !result.nextHash) {
      setPassError(result.error || 'Could not update password.');
      return;
    }
    onChangeAdminPasswordHash(result.nextHash);
    setCurrPassDraft('');
    setNewPassDraft('');
    setConfirmPassDraft('');
    setPassError('');
    setStatusNotice('Admin password updated successfully.');
  };

  const handleConnectGoogleCloud = async () => {
    if (!onConnectGoogleAdmin) return;
    setCloudActionError('');
    setCloudActionLoading(true);
    try {
      await onConnectGoogleAdmin();
      setStatusNotice('Google account connected for Cloud Firestore admin sync.');
    } catch (err) {
      setCloudActionError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to connect Google account. Please allow popups and retry.'
      );
    } finally {
      setCloudActionLoading(false);
    }
  };

  const handleSyncCatalogCloud = async () => {
    if (!onSyncCatalogToCloud) return;
    setCloudActionError('');
    setCloudActionLoading(true);
    try {
      await onSyncCatalogToCloud();
      setStatusNotice('Catalog, settings, and testimonials synced to Cloud Firestore.');
    } catch (err) {
      setCloudActionError(
        err instanceof Error && err.message
          ? err.message
          : 'Unable to sync catalog to Cloud Firestore.'
      );
    } finally {
      setCloudActionLoading(false);
    }
  };

  const tabTitle: Record<AdminTab, string> = {
    overview: 'Overview',
    products: 'Products & Photos',
    orders: 'Customer Orders',
    inquiries: 'Inquiries',
    settings: 'Store Settings',
  };

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: Box, count: products.length },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, count: orders.length },
    { id: 'inquiries', label: 'Inquiries', icon: Inbox, count: newInquiriesCount || undefined },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-6 pb-16">
      {/* Top Workspace Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/75">
        <div>
          <p className="text-xs font-medium text-zinc-500">
            BEE4 Admin <span aria-hidden="true">/</span>{' '}
            <span className="text-zinc-900 font-semibold">{tabTitle[activeTab]}</span>
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-zinc-900">
            Store Admin Panel
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onBackToStore}
            className="px-4 py-2 rounded-xl glass-btn-secondary text-zinc-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </button>

          <button
            type="button"
            onClick={onLockAdmin}
            className="px-4 py-2 rounded-xl glass-btn-secondary hover:bg-red-50/90 hover:text-red-700 text-zinc-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-all"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Admin</span>
          </button>

          <button
            type="button"
            onClick={openNewProduct}
            className="px-4 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Cloud Firestore Sync Bar */}
      <div className="mt-4 glass-subtle rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          {firebaseAdminEmail ? (
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <Cloud className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div className="text-xs text-zinc-700 min-w-0">
            {firebaseAdminEmail ? (
              <span>
                <strong className="font-semibold text-zinc-900">Cloud Firestore Active</strong> ·{' '}
                <span className="text-emerald-700 font-medium">{firebaseAdminEmail}</span>
              </span>
            ) : firebaseSignedInEmail ? (
              <span>
                Signed in as <strong className="text-zinc-900">{firebaseSignedInEmail}</strong>. Connect
                the store admin Google account (<code className="text-[11px]">ranjitbgm@gmail.com</code>)
                for live Firestore writes.
              </span>
            ) : (
              <span>
                <strong className="font-semibold text-zinc-900">Local Store Mode</strong> · Connect
                Google Cloud Sync to save catalog, orders, inquiries, and settings to Firestore.
              </span>
            )}
            {cloudActionError && (
              <p className="mt-1 text-xs font-medium text-red-600">{cloudActionError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {firebaseAdminEmail ? (
            onSyncCatalogToCloud && (
              <button
                type="button"
                onClick={handleSyncCatalogCloud}
                disabled={cloudActionLoading}
                className="px-3.5 py-2 rounded-xl glass-btn-secondary text-zinc-900 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 whitespace-nowrap transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cloudActionLoading ? 'animate-spin' : ''}`} />
                <span>{cloudActionLoading ? 'Syncing...' : 'Sync Catalog to Cloud'}</span>
              </button>
            )
          ) : (
            onConnectGoogleAdmin && (
              <button
                type="button"
                onClick={handleConnectGoogleCloud}
                disabled={cloudActionLoading}
                className="px-3.5 py-2 rounded-xl glass-btn-ink text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-60 whitespace-nowrap transition-all"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>
                  {cloudActionLoading
                    ? 'Connecting...'
                    : firebaseSignedInEmail
                      ? 'Switch Google Account'
                      : 'Connect Google Cloud Sync'}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Workspace Layout: Sidebar + Main Content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Navigation */}
        <aside className="lg:col-span-3 glass-surface rounded-3xl p-3">
          <nav aria-label="Admin sections" className="flex lg:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setStatusNotice('');
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'glass-btn-ink font-semibold'
                      : 'text-zinc-700 dark:text-zinc-200 hover:bg-white/65 dark:hover:bg-white/10 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`text-xs tabular-nums font-semibold ${
                        isActive ? 'text-amber-300 dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Admin Content */}
        <div className="lg:col-span-9 space-y-6 min-w-0">
          {statusNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/85 backdrop-blur-md border border-emerald-200/80 text-sm text-emerald-800 font-medium">
              {statusNotice}
            </div>
          )}

          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 4-Column KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Total Revenue</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {formatINR(metrics.totalRevenue)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                    Avg {formatINR(metrics.averageOrderValue)} / order
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Total Orders</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {metrics.totalOrders}
                  </p>
                  <p className="mt-1 text-xs text-amber-700 font-medium tabular-nums">
                    {metrics.pendingOrders} awaiting dispatch
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Catalog Products</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {metrics.totalProducts}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700 font-medium tabular-nums">
                    {metrics.inStockCount} in stock · {metrics.outOfStockCount} out
                  </p>
                </div>

                <div className="p-4 rounded-2xl glass-surface">
                  <p className="text-xs font-medium text-zinc-500">Open Inquiries</p>
                  <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-zinc-900">
                    {newInquiriesCount}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                    {inquiries.length} total messages
                  </p>
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="glass-surface rounded-3xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/75 flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-zinc-900">
                    Recent Orders
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800"
                  >
                    Manage All Orders →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <p className="p-6 text-sm text-zinc-500">No orders placed yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/45 text-xs font-semibold text-zinc-600 border-b border-white/75">
                          <th className="py-2.5 px-2.5 sm:px-4 whitespace-nowrap">Order</th>
                          <th className="py-2.5 px-2.5 sm:px-4">Customer</th>
                          <th className="hidden sm:table-cell py-2.5 px-4">Payment</th>
                          <th className="py-2.5 px-2.5 sm:px-4">Status</th>
                          <th className="py-2.5 px-2.5 sm:px-4 text-right whitespace-nowrap">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/6 text-xs sm:text-sm">
                        {orders.slice(0, 5).map((order) => (
                          <tr key={order.orderNumber} className="hover:bg-white/55">
                            <td className="py-3 px-2.5 sm:px-4 font-semibold tabular-nums text-zinc-900 whitespace-nowrap">
                              {order.orderNumber}
                            </td>
                            <td className="py-3 px-2.5 sm:px-4 text-zinc-700">
                              <span className="font-medium text-zinc-900">{order.customer.fullName}</span>
                              <span className="hidden sm:inline"> · {order.customer.city}</span>
                            </td>
                            <td className="hidden sm:table-cell py-3 px-4 text-xs font-medium text-zinc-600 uppercase">
                              {order.paymentMethod}
                            </td>
                            <td className={`py-3 px-2.5 sm:px-4 text-xs font-semibold ${statusTone(order.status)}`}>
                              {order.status}
                            </td>
                            <td className="py-3 px-2.5 sm:px-4 text-right font-semibold tabular-nums text-zinc-900 whitespace-nowrap">
                              {formatINR(order.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Category Mix */}
              <div className="glass-surface rounded-3xl p-5">
                <h2 className="font-display text-base font-bold text-zinc-900 mb-4">
                  Inventory by Category
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {metrics.categoryCounts.map((entry) => (
                    <div
                      key={entry.category}
                      className="p-3 rounded-2xl glass-subtle"
                    >
                      <p className="text-xs font-medium text-zinc-600 truncate">{entry.category}</p>
                      <p className="mt-1 font-display text-lg font-bold tabular-nums text-zinc-900">
                        {entry.count}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              {editing && (
                <form
                  onSubmit={handleSaveProduct}
                  className="glass-surface rounded-3xl p-6 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-bold text-zinc-900">
                      {products.some((p) => p.id === editing.id) ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      Cancel
                    </button>
                  </div>

                  {formError && (
                    <p className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700">
                      {formError}
                    </p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-4 space-y-3">
                      <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/50 border border-white/75">
                        <ProductImage
                          src={editing.image}
                          alt={editing.title || 'Product preview'}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <label className="w-full py-2.5 px-4 rounded-xl glass-btn-secondary text-zinc-900 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer">
                        <Upload className="w-4 h-4 text-amber-700" />
                        <span>Upload Product Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="sr-only"
                        />
                      </label>
                    </div>

                    <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label htmlFor="adm-title" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Product Title *
                        </label>
                        <input
                          id="adm-title"
                          type="text"
                          value={editing.title}
                          onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                          placeholder="e.g. Ceramic Chai Cup Set"
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="adm-cat" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          Skill Category
                        </label>
                        <select
                          id="adm-cat"
                          value={editing.category}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              category: e.target.value as Exclude<ProductCategory, ProductCategory.ALL>,
                            })
                          }
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        >
                          {EDITABLE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="adm-age" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          Child Age Group
                        </label>
                        <select
                          id="adm-age"
                          value={editing.ageGroup}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              ageGroup: e.target.value as Exclude<AgeGroup, AgeGroup.ALL>,
                            })
                          }
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        >
                          {EDITABLE_AGE_GROUPS.map((age) => {
                            const meta = AGE_GROUP_META.find((m) => m.ageGroup === age);
                            return (
                              <option key={age} value={age}>
                                {meta?.filterLabel ?? age}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="adm-origin" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          East-Asian Origin Badge
                        </label>
                        <input
                          id="adm-origin"
                          type="text"
                          value={editing.originConcept}
                          onChange={(e) => setEditing({ ...editing, originConcept: e.target.value })}
                          placeholder="e.g. 🇯🇵 Japanese Karakuri"
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="adm-occ" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          Gift Occasion
                        </label>
                        <select
                          id="adm-occ"
                          value={editing.occasion}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              occasion: e.target.value as Exclude<GiftOccasion, GiftOccasion.ALL>,
                            })
                          }
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        >
                          {EDITABLE_OCCASIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="adm-price" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Selling Price (₹) *
                        </label>
                        <input
                          id="adm-price"
                          type="number"
                          min={1}
                          value={editing.price}
                          onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor="adm-mrp" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Compare-at MRP (₹, optional)
                        </label>
                        <input
                          id="adm-mrp"
                          type="number"
                          min={0}
                          value={editing.compareAtPrice ?? ''}
                          onChange={(e) =>
                            setEditing({
                              ...editing,
                              compareAtPrice: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="adm-variants" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Color / Style Options (comma separated)
                        </label>
                        <input
                          id="adm-variants"
                          type="text"
                          value={variantsText}
                          onChange={(e) => setVariantsText(e.target.value)}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="adm-spec" className="block text-xs font-semibold text-zinc-700 mb-1">
                          Short Highlight Line
                        </label>
                        <input
                          id="adm-spec"
                          type="text"
                          value={editing.shortSpec}
                          onChange={(e) => setEditing({ ...editing, shortSpec: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="adm-desc" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          Description
                        </label>
                        <textarea
                          id="adm-desc"
                          rows={2}
                          value={editing.description}
                          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="adm-usehi" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          How It Works (Mechanism &amp; Play Guide)
                        </label>
                        <textarea
                          id="adm-usehi"
                          rows={2}
                          value={editing.useCaseHi}
                          onChange={(e) => setEditing({ ...editing, useCaseHi: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="adm-brainhi" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          Cognitive Benefits (Brain Development)
                        </label>
                        <textarea
                          id="adm-brainhi"
                          rows={2}
                          value={editing.brainBenefitsHi}
                          onChange={(e) => setEditing({ ...editing, brainBenefitsHi: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label htmlFor="adm-parentshi" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-200 mb-1">
                          Why Families Choose It
                        </label>
                        <textarea
                          id="adm-parentshi"
                          rows={2}
                          value={editing.whyParentsBuyHi}
                          onChange={(e) => setEditing({ ...editing, whyParentsBuyHi: e.target.value })}
                          className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2 flex flex-wrap items-center gap-6">
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          <input
                            type="checkbox"
                            checked={editing.inStock}
                            onChange={(e) => setEditing({ ...editing, inStock: e.target.checked })}
                            className="w-4 h-4 accent-amber-600"
                          />
                          <span>In Stock</span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          <input
                            type="checkbox"
                            checked={Boolean(editing.featured)}
                            onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                            className="w-4 h-4 accent-amber-600"
                          />
                          <span>Featured on Home</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2 border-t border-zinc-900/8 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-700 dark:text-zinc-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
                    >
                      Save Product
                    </button>
                  </div>
                </form>
              )}

              {/* Product Toolbar */}
              <div className="glass-surface rounded-3xl overflow-hidden">
                <div className="p-4 border-b border-white/75 dark:border-white/12 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 flex-1">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <label htmlFor="adm-prod-search" className="sr-only">
                        Search inventory
                      </label>
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="adm-prod-search"
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-9 pr-3 py-2 text-xs glass-input rounded-xl focus:outline-none"
                      />
                    </div>

                    <select
                      aria-label="Filter inventory by category"
                      value={productCatFilter}
                      onChange={(e) => setProductCatFilter(e.target.value as ProductCategory)}
                      className="px-3 py-2 text-xs glass-input rounded-xl font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none"
                    >
                      {Object.values(ProductCategory).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!confirmReset ? (
                    <button
                      type="button"
                      onClick={() => setConfirmReset(true)}
                      className="px-3 py-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Default Catalog</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-amber-50/85 dark:bg-amber-950/60 backdrop-blur-md border border-amber-200 dark:border-amber-500/30 px-3 py-1.5 rounded-xl">
                      <span className="text-xs font-medium text-amber-900 dark:text-amber-200">Restore 16 defaults?</span>
                      <button
                        type="button"
                        onClick={() => {
                          onResetCatalog();
                          setConfirmReset(false);
                          setEditing(null);
                          setStatusNotice('Restored default 16-product BEE4 Brain-Training catalog.');
                        }}
                        className="text-xs font-bold text-amber-800 dark:text-amber-300 underline"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReset(false)}
                        className="text-xs text-zinc-600 dark:text-zinc-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm font-semibold text-zinc-900">No matching products</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Clear your filter or add a new item to your catalog.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearch('');
                        setProductCatFilter(ProductCategory.ALL);
                      }}
                      className="mt-4 px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-900"
                    >
                      Clear Filter
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-white/45 text-xs font-semibold text-zinc-600 border-b border-white/75">
                          <th className="py-2.5 px-4">Product</th>
                          <th className="py-2.5 px-4">Category</th>
                          <th className="py-2.5 px-4 text-right">Price</th>
                          <th className="py-2.5 px-4">Stock</th>
                          <th className="py-2.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/6 text-sm">
                        {filteredProducts.map((product) => (
                          <tr key={product.id} className="hover:bg-white/55">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-8 rounded-lg overflow-hidden bg-white/50 border border-white/75 shrink-0">
                                  <ProductImage
                                    src={product.image}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <span className="font-semibold text-zinc-900">{product.title}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-xs text-zinc-600">{product.category}</td>
                            <td className="py-2.5 px-4 text-right font-semibold tabular-nums text-zinc-900">
                              {formatINR(product.price)}
                            </td>
                            <td className="py-2.5 px-4">
                              <button
                                type="button"
                                onClick={() => onToggleProductStock(product.id)}
                                className={`text-xs font-semibold underline underline-offset-2 ${
                                  product.inStock ? 'text-emerald-700' : 'text-red-600'
                                }`}
                              >
                                {product.inStock ? 'In Stock' : 'Out of Stock'}
                              </button>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditor(product)}
                                  aria-label={`Edit ${product.title}`}
                                  className="p-1.5 rounded-xl glass-btn-secondary text-zinc-700"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteProduct(product.id);
                                    setStatusNotice(`Removed "${product.title}" from catalog.`);
                                  }}
                                  aria-label={`Delete ${product.title}`}
                                  className="p-1.5 rounded-xl glass-btn-secondary hover:bg-red-50/90 text-zinc-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="glass-surface rounded-3xl overflow-hidden">
              <div className="p-4 border-b border-white/75 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-xs">
                  <label htmlFor="adm-order-search" className="sr-only">
                    Search orders
                  </label>
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="adm-order-search"
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search order #, name, city, PIN..."
                    className="w-full pl-9 pr-3 py-2 text-xs glass-input rounded-xl focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(['All', ...ORDER_STATUSES] as const).map((st) => {
                    const active = orderStatusFilter === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          active
                            ? 'glass-btn-ink'
                            : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-zinc-900">No matching orders</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Try another status filter or clear your search query.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-900/6">
                  {filteredOrders.map((order) => {
                    const isExpanded = expandedOrder === order.orderNumber;
                    return (
                      <li key={order.orderNumber} className="p-4 sm:p-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-display text-sm font-bold tabular-nums text-zinc-900">
                                {order.orderNumber}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-sm font-semibold text-zinc-800">
                                {order.customer.fullName}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-xs text-zinc-500 tabular-nums">
                                {order.customer.phone}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-600">
                              {order.customer.address}, {order.customer.city}, {order.customer.state}{' '}
                              (PIN {order.customer.pinCode}) · {order.paymentMethod.toUpperCase()}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-display text-sm font-bold tabular-nums text-zinc-900">
                              {formatINR(order.total)}
                            </span>

                            <select
                              aria-label={`Order status for ${order.orderNumber}`}
                              value={order.status}
                              onChange={(e) => {
                                const nextStatus = e.target.value as OrderStatus;
                                onUpdateOrderStatus(order.orderNumber, nextStatus);
                                setStatusNotice(
                                  `Updated ${order.orderNumber} status to ${nextStatus}.`
                                );
                              }}
                              className={`px-3 py-1.5 text-xs font-semibold glass-input rounded-xl focus:outline-none ${statusTone(order.status)}`}
                            >
                              {ORDER_STATUSES.map((st) => (
                                <option key={st} value={st} className="text-zinc-900">
                                  {st}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrder(isExpanded ? null : order.orderNumber)
                              }
                              className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold text-zinc-800"
                            >
                              {isExpanded ? 'Hide Items' : `Items (${order.items.length})`}
                            </button>

                            <a
                              href={buildWhatsAppUrl(
                                `Hi ${order.customer.fullName}! Update on your BEE4 order ${order.orderNumber}: Status is now "${order.status}".`,
                                order.customer.phone
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Message ${order.customer.fullName} on WhatsApp`}
                              className="p-2 rounded-xl glass-btn-secondary hover:bg-emerald-50/90 text-emerald-700"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-3 border-t border-zinc-900/8 space-y-2 text-xs text-zinc-700">
                            {order.items.map((item) => (
                              <div
                                key={`${item.productId}::${item.variant}`}
                                className="flex justify-between"
                              >
                                <span>
                                  {item.title} ({item.variant}) × {item.quantity}
                                </span>
                                <span className="tabular-nums font-semibold">
                                  {formatINR(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                            {order.giftWrap && (
                              <p className="text-amber-800 font-medium pt-1">
                                Gift Wrap Included (+{formatINR(order.giftWrapFee)})
                                {order.giftMessage ? ` · Note: "${order.giftMessage}"` : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* 4. INQUIRIES TAB */}
          {activeTab === 'inquiries' && (
            <div className="glass-surface rounded-3xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/75">
                <h2 className="font-display text-base font-bold text-zinc-900">
                  Customer Inquiries ({inquiries.length})
                </h2>
              </div>

              {inquiries.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-semibold text-zinc-900">No inquiries yet</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Messages submitted through the Contact page will appear here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-900/6">
                  {inquiries.map((inq) => (
                    <li
                      key={inq.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-zinc-900">{inq.name}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-xs text-zinc-600">{inq.contact}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-xs font-medium text-amber-700">{inq.topic}</span>
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed">{inq.message}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleInquiryStatus(inq.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md ${
                            inq.status === 'New'
                              ? 'bg-amber-50/85 border-amber-200 text-amber-800'
                              : 'bg-emerald-50/85 border-emerald-200 text-emerald-700'
                          }`}
                        >
                          {inq.status === 'New' ? 'Mark Resolved' : 'Resolved ✓'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* 5. STORE SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <form
                onSubmit={handleSaveSettings}
                className="glass-surface rounded-3xl p-6 space-y-5"
              >
                <div>
                  <h2 className="font-display text-lg font-bold text-zinc-900">
                    Storefront &amp; WhatsApp Settings
                  </h2>
                  <p className="mt-1 text-xs text-zinc-600">
                    Changes here update the live announcement banner, shipping threshold, promo code,
                    and WhatsApp routing across BEE4 immediately.
                  </p>
                </div>

                {settingsError && (
                  <p className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700">
                    {settingsError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="set-wa" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Store WhatsApp Number (10 digits)
                    </label>
                    <input
                      id="set-wa"
                      type="tel"
                      value={waDraft}
                      onChange={(e) => setWaDraft(e.target.value)}
                      placeholder="9876543210"
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                    />
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Active: {formatWhatsAppDisplay(settings.whatsappNumber)}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="set-email" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Support Email
                    </label>
                    <input
                      id="set-email"
                      type="email"
                      value={emailDraft}
                      onChange={(e) => setEmailDraft(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="set-banner" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Top Announcement Banner Text
                    </label>
                    <input
                      id="set-banner"
                      type="text"
                      value={bannerDraft}
                      onChange={(e) => setBannerDraft(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="set-ship" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Free Shipping Threshold (₹)
                    </label>
                    <input
                      id="set-ship"
                      type="number"
                      min={0}
                      value={shippingDraft}
                      onChange={(e) => setShippingDraft(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="set-promo" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Promo Code
                      </label>
                      <input
                        id="set-promo"
                        type="text"
                        value={promoCodeDraft}
                        onChange={(e) => setPromoCodeDraft(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm glass-input rounded-xl uppercase focus:outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="set-discount" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                        Discount (%)
                      </label>
                      <input
                        id="set-discount"
                        type="number"
                        min={0}
                        max={80}
                        value={promoPercentDraft}
                        onChange={(e) => setPromoPercentDraft(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm glass-input rounded-xl tabular-nums focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-900/8 flex flex-wrap items-center justify-between gap-3">
                  <a
                    href={buildWhatsAppUrl('Hi! Testing my BEE4 store WhatsApp link.', settings.whatsappNumber)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-4"
                  >
                    Test Store WhatsApp Link →
                  </a>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
                  >
                    Save Store Settings
                  </button>
                </div>
              </form>

              <form
                onSubmit={handlePasswordChange}
                noValidate
                className="glass-surface rounded-3xl p-6 space-y-4"
              >
                <div>
                  <h2 className="font-display text-lg font-bold text-zinc-900">
                    Admin Password &amp; Security
                  </h2>
                  <p className="mt-1 text-xs text-zinc-600">
                    Change the password required to access /#admin. Passwords must be at least 8 characters.
                  </p>
                </div>

                {passError && (
                  <p role="alert" className="p-3 rounded-xl bg-red-50/90 backdrop-blur-md border border-red-200 text-xs text-red-700">
                    {passError}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="adm-curr-pass" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Current Password *
                    </label>
                    <input
                      id="adm-curr-pass"
                      type="password"
                      value={currPassDraft}
                      onChange={(e) => {
                        setCurrPassDraft(e.target.value);
                        if (passError) setPassError('');
                      }}
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-new-pass" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      New Password *
                    </label>
                    <input
                      id="adm-new-pass"
                      type="password"
                      value={newPassDraft}
                      onChange={(e) => {
                        setNewPassDraft(e.target.value);
                        if (passError) setPassError('');
                      }}
                      placeholder="Min 8 characters"
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-confirm-pass" className="block text-xs font-semibold text-zinc-700 mb-1.5">
                      Confirm New Password *
                    </label>
                    <input
                      id="adm-confirm-pass"
                      type="password"
                      value={confirmPassDraft}
                      onChange={(e) => {
                        setConfirmPassDraft(e.target.value);
                        if (passError) setPassError('');
                      }}
                      className="w-full px-3.5 py-2 text-sm glass-input rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl glass-btn-ink text-sm font-semibold transition-all"
                  >
                    Update Admin Password
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
