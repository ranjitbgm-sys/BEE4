import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AgeGroup,
  GiftOccasion,
  HsnCode,
  PrimaryStoreCategory,
  Product,
  ProductCategory,
  ProductVisibilityStatus,
} from '../../types';
import { AGE_GROUP_META, hydrateProductAdminFields } from '../../data/catalog';
import { uploadProductMediaToSupabaseStorage } from '../../services/supabaseStoreService';
import { calculateProductMargin, sanitizeRichInput, sanitizeSingleLine } from '../../utils/adminLogic';
import { formatINR } from '../../utils/storeLogic';
import { ProductImage } from '../ProductImage';

interface AdminProductsTabProps {
  products: Product[];
  initialEditProduct?: Product | null;
  openNewTrigger?: number;
  onClearInitialEdit?: () => void;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onResetCatalog: () => void;
}

const PRIMARY_CATEGORIES: PrimaryStoreCategory[] = [
  'Brain-Training Toys',
  '3D Home Decor',
  'Stainless Steel Flasks',
  'Lifestyle Gear',
];

const SKILL_CATEGORIES = Object.values(ProductCategory).filter(
  (c) => c !== ProductCategory.ALL
) as Exclude<ProductCategory, ProductCategory.ALL>[];

const AGE_GROUPS = Object.values(AgeGroup).filter(
  (a) => a !== AgeGroup.ALL
) as Exclude<AgeGroup, AgeGroup.ALL>[];

const OCCASIONS = Object.values(GiftOccasion).filter(
  (o) => o !== GiftOccasion.ALL
) as Exclude<GiftOccasion, GiftOccasion.ALL>[];

const HSN_OPTIONS: { code: HsnCode; label: string }[] = [
  { code: '3926', label: '3926 — 3D-Printed Eco-PLA Toys & Decor (12% GST)' },
  { code: '7323', label: '7323 — Stainless Steel Flasks (12% GST)' },
  { code: '4202', label: '4202 — Lifestyle Cases & Gear (18% GST)' },
];

const DEFAULT_FRONT = '/assets/images/toy_engineering_front_1794767911598.jpg';
const DEFAULT_MECH = '/assets/images/toy_mechanism_inside_1794767912639.jpg';
const DEFAULT_SCALE = '/assets/images/toy_hands_on_scale_1794767913261.jpg';

function createEmptyProduct(): Product {
  const id = `bee4-custom-${Date.now()}`;
  return hydrateProductAdminFields({
    id,
    sku: `BEE4-${String(Math.floor(200 + Math.random() * 799))}`,
    slug: id,
    title: '',
    primaryCategory: 'Brain-Training Toys',
    category: ProductCategory.ENGINEERING,
    skills: [ProductCategory.ENGINEERING],
    ageGroup: AgeGroup.AGE_6_8,
    ageGroups: [AgeGroup.AGE_6_8],
    originConcept: '🇯🇵 Japanese Brain-Training Mechanism',
    occasion: GiftOccasion.BIRTHDAY,
    price: 499,
    compareAtPrice: 899,
    manufacturingCost: 165,
    image: DEFAULT_FRONT,
    gallery: [
      { id: 'front', label: 'View 1: Front', shortLabel: 'Front', url: DEFAULT_FRONT, objectPosition: '50% 50%' },
      { id: 'mechanism', label: 'View 2: Mechanism/Inside', shortLabel: 'Mechanism', url: DEFAULT_MECH, objectPosition: '50% 50%' },
      { id: 'scale', label: 'View 3: Hands-On Scale', shortLabel: 'Scale', url: DEFAULT_SCALE, objectPosition: '50% 50%' },
    ],
    variants: ['Standard Studio Edition'],
    shortSpec: '3D-printed Bio-PLA+ · Screen-free focus toy',
    description: '',
    useCaseHi: 'Hands-on mechanical assembly designed for screen-free deep focus.',
    brainBenefitsHi: 'Builds spatial reasoning, sequential logic, and steady focus.',
    whyParentsBuyHi: 'Replaces passive mobile screentime with durable tactile play.',
    materials: '100% Non-Toxic Eco-PLA',
    careInstruction: 'Keep away from heat >55°C (Eco-PLA)',
    dimensions: '14 cm × 12 cm × 8 cm',
    weightGrams: 185,
    hsnCode: '3926',
    stockQuantity: 12,
    lowStockThreshold: 5,
    giftable: true,
    madeToOrder: false,
    status: 'Active',
    inStock: true,
    featured: false,
    tag: 'New Release',
  });
}

export function AdminProductsTab({
  products,
  initialEditProduct,
  openNewTrigger = 0,
  onClearInitialEdit,
  onSaveProduct,
  onDeleteProduct,
  onResetCatalog,
}: AdminProductsTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductVisibilityStatus | 'All'>('All');
  const [editing, setEditing] = useState<Product | null>(null);
  const [previewAngleIdx, setPreviewAngleIdx] = useState<0 | 1 | 2>(0);
  const [variantsText, setVariantsText] = useState('');
  const [formError, setFormError] = useState('');
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string>('');
  const [confirmReset, setConfirmReset] = useState(false);

  const openEditor = (prod: Product) => {
    const hydrated = hydrateProductAdminFields(prod);
    setEditing(hydrated);
    setVariantsText(hydrated.variants.join(', '));
    setPreviewAngleIdx(0);
    setFormError('');
  };

  useEffect(() => {
    if (initialEditProduct) {
      openEditor(initialEditProduct);
      onClearInitialEdit?.();
    }
  }, [initialEditProduct, onClearInitialEdit]);

  useEffect(() => {
    if (openNewTrigger > 0) {
      openEditor(createEmptyProduct());
    }
  }, [openNewTrigger]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      const vis = p.status || 'Active';
      if (statusFilter !== 'All' && vis !== statusFilter) return false;
      if (!q) return true;
      return [p.title, p.sku || '', p.category, p.primaryCategory || '', p.id]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [products, search, statusFilter]);

  const margin = editing
    ? calculateProductMargin({
        price: editing.price,
        compareAtPrice: editing.compareAtPrice,
        manufacturingCost: editing.manufacturingCost,
      })
    : null;

  const handleDuplicate = (prod: Product) => {
    const copyId = `${prod.id}-copy-${Date.now().toString().slice(-4)}`;
    const duplicated: Product = {
      ...hydrateProductAdminFields(prod),
      id: copyId,
      sku: `${prod.sku || 'BEE4'}-COPY`,
      slug: copyId,
      title: `${prod.title} (Copy)`,
      status: 'Draft',
      featured: false,
    };
    onSaveProduct(duplicated);
  };

  const handleArchiveToggle = (prod: Product) => {
    const nextStatus: ProductVisibilityStatus =
      prod.status === 'Archived' ? 'Active' : 'Archived';
    onSaveProduct({ ...prod, status: nextStatus });
  };

  const handleUploadAngle = async (
    event: ChangeEvent<HTMLInputElement>,
    idx: 0 | 1 | 2
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editing) return;
    const slot = editing.gallery[idx].id;
    setUploadingSlot(slot);
    setUploadNote('');
    try {
      const result = await uploadProductMediaToSupabaseStorage(file, editing.id, slot);
      const nextGallery = [...editing.gallery] as Product['gallery'];
      nextGallery[idx] = { ...nextGallery[idx], url: result.url };
      setEditing({
        ...editing,
        image: idx === 0 ? result.url : editing.image,
        gallery: nextGallery,
      });
      setPreviewAngleIdx(idx);
      setFormError('');
      setUploadNote(
        result.storageMode === 'supabase'
          ? `Uploaded ${editing.gallery[idx].shortLabel} to Supabase bucket "product-images".`
          : result.note || 'Saved optimized image locally (Supabase not configured).'
      );
    } catch {
      setFormError('Could not process that image file. Try a JPG or PNG under 5MB.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleUpdateAngleUrl = (idx: 0 | 1 | 2, url: string) => {
    if (!editing) return;
    const nextGallery = [...editing.gallery] as Product['gallery'];
    nextGallery[idx] = { ...nextGallery[idx], url };
    setEditing({
      ...editing,
      image: idx === 0 ? url : editing.image,
      gallery: nextGallery,
    });
  };

  const toggleSkill = (skill: Exclude<ProductCategory, ProductCategory.ALL>) => {
    if (!editing) return;
    const cur = editing.skills ?? [editing.category];
    const next = cur.includes(skill)
      ? cur.length > 1
        ? cur.filter((s) => s !== skill)
        : cur
      : [...cur, skill];
    setEditing({ ...editing, skills: next, category: next[0] });
  };

  const toggleAgeGroup = (age: Exclude<AgeGroup, AgeGroup.ALL>) => {
    if (!editing) return;
    const cur = editing.ageGroups ?? [editing.ageGroup];
    const next = cur.includes(age)
      ? cur.length > 1
        ? cur.filter((a) => a !== age)
        : cur
      : [...cur, age];
    setEditing({ ...editing, ageGroups: next, ageGroup: next[0] });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const cleanTitle = sanitizeSingleLine(editing.title, 140);
    if (cleanTitle.length < 2) {
      setFormError('Please enter a valid product title (min 2 chars).');
      return;
    }
    if (!Number.isFinite(editing.price) || editing.price < 1) {
      setFormError('Selling price must be at least ₹1.');
      return;
    }

    const parsedVariants = variantsText
      .split(',')
      .map((v) => sanitizeSingleLine(v, 80))
      .filter(Boolean);

    const stockQty = Math.max(0, Math.round(Number(editing.stockQuantity ?? 0)));

    const saved: Product = {
      ...editing,
      sku: sanitizeSingleLine(editing.sku || `BEE4-${Date.now()}`, 64).toUpperCase(),
      slug: sanitizeSingleLine(editing.slug || editing.id, 128)
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-'),
      title: cleanTitle,
      price: Math.round(editing.price),
      compareAtPrice:
        editing.compareAtPrice && editing.compareAtPrice > editing.price
          ? Math.round(editing.compareAtPrice)
          : undefined,
      manufacturingCost: Math.max(0, Math.round(Number(editing.manufacturingCost ?? 0))),
      image: editing.gallery[0].url || editing.image,
      variants: parsedVariants.length > 0 ? parsedVariants : ['Standard Studio Edition'],
      shortSpec: sanitizeSingleLine(editing.shortSpec, 200) || '3D-printed Bio-PLA+ · Screen-free',
      description: sanitizeRichInput(editing.description, 2000) || 'Small-batch studio creation.',
      useCaseHi: sanitizeRichInput(editing.useCaseHi, 1000),
      brainBenefitsHi: sanitizeRichInput(editing.brainBenefitsHi, 1000),
      whyParentsBuyHi: sanitizeRichInput(editing.whyParentsBuyHi, 1000),
      materials: sanitizeSingleLine(editing.materials, 300) || '100% Non-Toxic Eco-PLA',
      careInstruction:
        sanitizeSingleLine(editing.careInstruction || '', 200) || 'Keep away from >55°C heat',
      dimensions: sanitizeSingleLine(editing.dimensions, 200) || 'Standard',
      weightGrams: Math.max(10, Math.round(Number(editing.weightGrams ?? 180))),
      stockQuantity: stockQty,
      lowStockThreshold: Math.max(0, Math.round(Number(editing.lowStockThreshold ?? 5))),
      inStock: editing.madeToOrder ? true : stockQty > 0 && editing.inStock,
    };

    onSaveProduct(saved);
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="glass-surface rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by title, SKU, or category..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm glass-input rounded-xl focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['All', 'Active', 'Draft', 'Archived'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                statusFilter === st ? 'glass-btn-ink' : 'glass-subtle text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {st}
            </button>
          ))}

          {confirmReset ? (
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  onResetCatalog();
                  setConfirmReset(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold"
              >
                Confirm Reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="px-3 py-1.5 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Seed</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => openEditor(createEmptyProduct())}
            className="px-3.5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Editor Modal / Panel */}
      {editing && (
        <form
          onSubmit={handleSubmit}
          className="glass-surface rounded-3xl p-5 sm:p-6 space-y-6 border border-amber-500/25"
        >
          <div className="flex items-center justify-between border-b border-zinc-900/10 dark:border-white/10 pb-4">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                BEE4 Catalog Studio Editor
              </p>
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {products.some((p) => p.id === editing.id)
                  ? `Edit ${editing.title || 'Product'}`
                  : 'Create New Product'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="p-2 rounded-xl glass-btn-secondary"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/30 text-xs font-medium text-red-700 dark:text-red-300">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: 3-Angle Interactive Media Manager */}
            <div className="lg:col-span-4 space-y-4">
              <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden glass-subtle">
                <ProductImage
                  src={editing.gallery[previewAngleIdx]?.url || editing.image}
                  alt={editing.title || 'Product angle preview'}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['Angle 1: Front', 'Angle 2: 3D Detail', 'Angle 3: Scale'] as const).map(
                  (label, i) => {
                    const idx = i as 0 | 1 | 2;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPreviewAngleIdx(idx)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-semibold truncate ${
                          previewAngleIdx === idx ? 'glass-btn-ink' : 'glass-subtle'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>

              {([0, 1, 2] as const).map((idx) => (
                <div key={idx} className="glass-subtle rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                    <span>{editing.gallery[idx].label}</span>
                    <label className="text-amber-700 dark:text-amber-300 cursor-pointer inline-flex items-center gap-1 hover:underline">
                      <Upload className="w-3 h-3" />
                      <span>
                        {uploadingSlot === editing.gallery[idx].id
                          ? 'Uploading...'
                          : 'Upload to Bucket'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleUploadAngle(e, idx)}
                        className="sr-only"
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={editing.gallery[idx].url}
                    onChange={(e) => handleUpdateAngleUrl(idx, e.target.value)}
                    placeholder="Paste public image URL or upload to product-images..."
                    className="w-full px-2.5 py-1.5 rounded-xl glass-input text-[11px] focus:outline-none"
                  />
                </div>
              ))}
              {uploadNote && (
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 px-1">
                  {uploadNote}
                </p>
              )}
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 px-1">
                Uploads target Supabase Storage bucket <code>product-images</code> (with local fallback).
              </p>
            </div>

            {/* Right Column: Specs, Attributes & Margin Calculator */}
            <div className="lg:col-span-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="prod-title" className="block text-xs font-semibold mb-1">
                    Product Title *
                  </label>
                  <input
                    id="prod-title"
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="prod-sku" className="block text-xs font-semibold mb-1">
                    SKU Code
                  </label>
                  <input
                    id="prod-sku"
                    type="text"
                    value={editing.sku ?? ''}
                    onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-sm font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="prod-slug" className="block text-xs font-semibold mb-1">
                    URL Slug
                  </label>
                  <input
                    id="prod-slug"
                    type="text"
                    value={editing.slug ?? ''}
                    onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="prod-primary-cat" className="block text-xs font-semibold mb-1">
                    Primary Line
                  </label>
                  <select
                    id="prod-primary-cat"
                    value={editing.primaryCategory ?? 'Brain-Training Toys'}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        primaryCategory: e.target.value as PrimaryStoreCategory,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    {PRIMARY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="prod-occ" className="block text-xs font-semibold mb-1">
                    Gift Occasion
                  </label>
                  <select
                    id="prod-occ"
                    value={editing.occasion}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        occasion: e.target.value as Exclude<GiftOccasion, GiftOccasion.ALL>,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    {OCCASIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-Select Skills & Age Groups */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-subtle rounded-2xl p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    Skill Attributes (Multi-select)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILL_CATEGORIES.map((skill) => {
                      const active = (editing.skills ?? [editing.category]).includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            active ? 'glass-btn-ink' : 'glass-btn-secondary'
                          }`}
                        >
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-subtle rounded-2xl p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                    Child Age Groups (Multi-select)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {AGE_GROUPS.map((age) => {
                      const active = (editing.ageGroups ?? [editing.ageGroup]).includes(age);
                      const label = AGE_GROUP_META.find((m) => m.ageGroup === age)?.filterLabel ?? age;
                      return (
                        <button
                          key={age}
                          type="button"
                          onClick={() => toggleAgeGroup(age)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            active ? 'glass-btn-ink' : 'glass-btn-secondary'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pricing & Live Margin Calculator */}
              <div className="glass-subtle rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Pricing &amp; Unit Margin Calculator
                  </p>
                  {margin && (
                    <div className="flex items-center gap-2 text-xs tabular-nums">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-bold">
                        {margin.discountPercent}% Discount vs MRP
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold">
                        Net Margin: {formatINR(margin.netProfit)} ({margin.marginPercent}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="prod-mrp" className="block text-[11px] font-semibold mb-1">
                      MRP (₹)
                    </label>
                    <input
                      id="prod-mrp"
                      type="number"
                      min={0}
                      value={editing.compareAtPrice ?? ''}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          compareAtPrice: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="prod-price" className="block text-[11px] font-semibold mb-1">
                      Selling Price (₹) *
                    </label>
                    <input
                      id="prod-price"
                      type="number"
                      min={1}
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="prod-cost" className="block text-[11px] font-semibold mb-1">
                      3D Filament / Mfg Cost (₹)
                    </label>
                    <input
                      id="prod-cost"
                      type="number"
                      min={0}
                      value={editing.manufacturingCost ?? 0}
                      onChange={(e) =>
                        setEditing({ ...editing, manufacturingCost: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Technical Specs & GST HSN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="prod-hsn" className="block text-xs font-semibold mb-1">
                    GST HSN Code
                  </label>
                  <select
                    id="prod-hsn"
                    value={editing.hsnCode ?? '3926'}
                    onChange={(e) => setEditing({ ...editing, hsnCode: e.target.value as HsnCode })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    {HSN_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="prod-weight" className="block text-xs font-semibold mb-1">
                    Weight (Grams)
                  </label>
                  <input
                    id="prod-weight"
                    type="number"
                    min={1}
                    value={editing.weightGrams ?? 180}
                    onChange={(e) =>
                      setEditing({ ...editing, weightGrams: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="prod-dim" className="block text-xs font-semibold mb-1">
                    Dimensions (cm)
                  </label>
                  <input
                    id="prod-dim"
                    type="text"
                    value={editing.dimensions}
                    onChange={(e) => setEditing({ ...editing, dimensions: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="prod-mat" className="block text-xs font-semibold mb-1">
                    Material Safety Badge
                  </label>
                  <input
                    id="prod-mat"
                    type="text"
                    value={editing.materials}
                    onChange={(e) => setEditing({ ...editing, materials: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="prod-care" className="block text-xs font-semibold mb-1">
                    Care Instruction
                  </label>
                  <input
                    id="prod-care"
                    type="text"
                    value={editing.careInstruction ?? ''}
                    onChange={(e) => setEditing({ ...editing, careInstruction: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="prod-variants" className="block text-xs font-semibold mb-1">
                    Color / Studio Variants (comma separated)
                  </label>
                  <input
                    id="prod-variants"
                    type="text"
                    value={variantsText}
                    onChange={(e) => setVariantsText(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="prod-benefits" className="block text-xs font-semibold mb-1">
                    Brain Development Benefits
                  </label>
                  <textarea
                    id="prod-benefits"
                    rows={2}
                    value={editing.brainBenefitsHi}
                    onChange={(e) => setEditing({ ...editing, brainBenefitsHi: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl glass-input text-xs focus:outline-none"
                  />
                </div>
              </div>

              {/* Inventory & Visibility Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center glass-subtle rounded-2xl p-4">
                <div>
                  <label htmlFor="prod-stock" className="block text-[11px] font-semibold mb-1">
                    Stock Quantity
                  </label>
                  <input
                    id="prod-stock"
                    type="number"
                    min={0}
                    value={editing.stockQuantity ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, stockQuantity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="prod-threshold" className="block text-[11px] font-semibold mb-1">
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    id="prod-threshold"
                    type="number"
                    min={0}
                    value={editing.lowStockThreshold ?? 5}
                    onChange={(e) =>
                      setEditing({ ...editing, lowStockThreshold: Number(e.target.value) })
                    }
                    className="w-full px-3 py-1.5 rounded-xl glass-input text-xs tabular-nums focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="prod-visibility" className="block text-[11px] font-semibold mb-1">
                    Storefront Visibility
                  </label>
                  <select
                    id="prod-visibility"
                    value={editing.status ?? 'Active'}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        status: e.target.value as ProductVisibilityStatus,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                  >
                    <option value="Active">Active (Public)</option>
                    <option value="Draft">Draft (Hidden)</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="sm:col-span-3 flex flex-wrap gap-5 pt-1 text-xs font-semibold">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.featured)}
                      onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span>Featured / Bestseller</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.giftable ?? true)}
                      onChange={(e) => setEditing({ ...editing, giftable: e.target.checked })}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span>Giftable (Show in Gift Finder)</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(editing.madeToOrder)}
                      onChange={(e) => setEditing({ ...editing, madeToOrder: e.target.checked })}
                      className="w-4 h-4 accent-amber-600"
                    />
                    <span>Made-to-Order (3D Print on Demand)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
                >
                  Save Product to Catalog
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Catalog Table */}
      <div className="glass-surface rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/45 dark:bg-white/5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 border-b border-zinc-900/10 dark:border-white/10">
                <th className="py-3 px-4">Product & SKU</th>
                <th className="py-3 px-4">Skill & Age</th>
                <th className="py-3 px-4 text-right">Price / Margin</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/6 dark:divide-white/8 text-xs">
              {filteredProducts.map((p) => {
                const hp = hydrateProductAdminFields(p);
                const pm = calculateProductMargin({
                  price: hp.price,
                  compareAtPrice: hp.compareAtPrice,
                  manufacturingCost: hp.manufacturingCost,
                });
                const qty = hp.stockQuantity ?? 0;
                const low = qty <= (hp.lowStockThreshold ?? 5);
                return (
                  <tr key={hp.id} className="hover:bg-white/40 dark:hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/60">
                          <ProductImage src={hp.image} alt={hp.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-900 dark:text-white truncate max-w-[240px]">
                            {hp.title}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
                            {hp.sku} · HSN {hp.hsnCode}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                      <div>{hp.category}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{hp.ageGroup}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap tabular-nums">
                      <div className="font-bold text-zinc-900 dark:text-white">
                        {formatINR(hp.price)}
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                        +{formatINR(pm.netProfit)} ({pm.marginPercent}%)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap tabular-nums">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          low
                            ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {qty} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          hp.status === 'Draft'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : hp.status === 'Archived'
                              ? 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        }`}
                      >
                        {hp.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditor(hp)}
                          aria-label={`Edit ${hp.title}`}
                          className="p-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(hp)}
                          aria-label={`Duplicate ${hp.title}`}
                          className="p-2 rounded-xl glass-btn-secondary text-zinc-700 dark:text-zinc-200"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchiveToggle(hp)}
                          aria-label={`Archive or restore ${hp.title}`}
                          className="p-2 rounded-xl glass-btn-secondary text-amber-700 dark:text-amber-300"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(hp.id)}
                          aria-label={`Delete ${hp.title}`}
                          className="p-2 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
