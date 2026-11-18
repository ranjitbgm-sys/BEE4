import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Brain,
  Clock,
  Flame,
  Hammer,
  Layers,
  Puzzle,
  Search,
  ShieldCheck,
  Sparkles,
  Stamp,
  Truck,
  X,
} from 'lucide-react';
import { AGE_GROUP_META, HERO_IMAGE } from '../data/catalog';
import {
  AgeGroup,
  CustomerProfile,
  GiftOccasion,
  OrderRecord,
  Product,
  ProductCategory,
  ProductReviewRecord,
  StorePage,
  Testimonial,
  ViralReelRecord,
} from '../types';
import { filterAndSortProducts, groupProductsByAge } from '../utils/storeLogic';
import { DualFilterBar } from './DualFilterBar';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';
import { Testimonials } from './Testimonials';
import { ViralReelsSection } from './ViralReelsSection';

interface HomeViewProps {
  products: Product[];
  testimonials: Testimonial[];
  reviews?: ProductReviewRecord[];
  viralReels?: ViralReelRecord[];
  orders?: OrderRecord[];
  currentCustomer?: CustomerProfile | null;
  wishlistIds: string[];
  heroHeadline?: string;
  heroSubheadline?: string;
  heroCtaText?: string;
  featuredBannerEnabled?: boolean;
  onNavigate: (page: StorePage) => void;
  onSelectProduct: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onBrowseOccasion: (occasion: GiftOccasion) => void;
  onAddTestimonial: (testimonial: Testimonial) => void;
  onSubmitReview?: (review: ProductReviewRecord) => void;
}

type CategoryShortcutId =
  | 'all'
  | 'embossers'
  | 'wall-clocks'
  | 'diy-kits'
  | 'lithophane'
  | 'fidgets'
  | 'brain-toys';

const CATEGORY_SHORTCUTS: {
  id: CategoryShortcutId;
  label: string;
  keywords: string[];
}[] = [
  { id: 'all', label: 'All', keywords: [] },
  { id: 'embossers', label: 'Embossers', keywords: ['embosser', 'card', 'stamp', 'seal'] },
  { id: 'wall-clocks', label: 'Wall Clocks', keywords: ['clock', 'wall', 'decor'] },
  { id: 'diy-kits', label: 'DIY Kits', keywords: ['diy', 'kit', 'strandbeest', 'automaton', 'assembly'] },
  { id: 'lithophane', label: 'Lithophane', keywords: ['lithophane', 'frame', 'photo', 'lamp'] },
  { id: 'fidgets', label: 'Fidgets', keywords: ['fidget', 'spinner', 'tactile', 'gyro'] },
  { id: 'brain-toys', label: 'Brain Toys', keywords: ['puzzle', 'brain', 'tangram', 'karakuri', 'logic'] },
];

const OCCASION_TABS: { value: Exclude<GiftOccasion, GiftOccasion.ALL>; label: string }[] = [
  { value: GiftOccasion.BIRTHDAY, label: 'Birthday Gifts' },
  { value: GiftOccasion.FESTIVALS, label: 'Festivals & Return Gifts' },
  { value: GiftOccasion.DESK_COLLEGE, label: 'Study Desk & Focus' },
  { value: GiftOccasion.EVERYDAY, label: 'Screen-Free Everyday' },
];

function renderCategoryIcon(id: CategoryShortcutId) {
  switch (id) {
    case 'embossers':
      return <Stamp className="w-5 h-5" />;
    case 'wall-clocks':
      return <Clock className="w-5 h-5" />;
    case 'diy-kits':
      return <Hammer className="w-5 h-5" />;
    case 'lithophane':
      return <Sparkles className="w-5 h-5" />;
    case 'fidgets':
      return <Layers className="w-5 h-5" />;
    case 'brain-toys':
      return <Puzzle className="w-5 h-5" />;
    default:
      return <Brain className="w-5 h-5" />;
  }
}

export function HomeView({
  products,
  testimonials,
  reviews = [],
  viralReels = [],
  orders = [],
  currentCustomer = null,
  wishlistIds,
  heroHeadline,
  heroSubheadline,
  heroCtaText,
  featuredBannerEnabled = true,
  onNavigate,
  onSelectProduct,
  onQuickView,
  onQuickAdd,
  onToggleWishlist,
  onBrowseOccasion,
  onAddTestimonial,
  onSubmitReview,
}: HomeViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>(ProductCategory.ALL);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup>(AgeGroup.ALL);
  const [groupByAge, setGroupByAge] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeShortcut, setActiveShortcut] = useState<CategoryShortcutId>('all');
  const [selectedOccasion, setSelectedOccasion] = useState<
    Exclude<GiftOccasion, GiftOccasion.ALL>
  >(GiftOccasion.BIRTHDAY);

  const shortcutFiltered = useMemo(() => {
    const active = CATEGORY_SHORTCUTS.find((c) => c.id === activeShortcut);
    if (!active || active.id === 'all') return products;
    const matched = products.filter((p) => {
      const hay = `${p.title} ${p.shortSpec} ${p.primaryCategory ?? ''} ${p.category} ${p.tag ?? ''}`.toLowerCase();
      return active.keywords.some((kw) => hay.includes(kw));
    });
    if (matched.length > 0) return matched;
    if (active.id === 'brain-toys') {
      return products.filter((p) => p.primaryCategory === 'Brain-Training Toys');
    }
    return products;
  }, [products, activeShortcut]);

  const filteredProducts = filterAndSortProducts(shortcutFiltered, {
    category: selectedCategory,
    ageGroup: selectedAgeGroup,
    occasion: GiftOccasion.ALL,
    search: searchQuery,
    maxPrice: null,
    sortBy: 'featured',
  });

  const groupedSections = groupProductsByAge(filteredProducts);

  const bestSellingProducts = useMemo(() => {
    const tagged = products.filter((p) => p.curatedTags?.includes('Best Selling'));
    if (tagged.length >= 4) return tagged.slice(0, 8);
    const featured = products.filter((p) => p.featured || p.tag?.toLowerCase().includes('best'));
    return (featured.length > 0 ? featured : products).slice(0, 4);
  }, [products]);

  const newlyLaunchedProducts = useMemo(() => {
    const tagged = products.filter((p) => p.curatedTags?.includes('Newly Launched'));
    if (tagged.length >= 4) return tagged.slice(0, 8);
    return products.slice(-4).reverse();
  }, [products]);

  const trendyProducts = useMemo(() => {
    const tagged = products.filter((p) => p.curatedTags?.includes('Trendy'));
    if (tagged.length >= 4) return tagged.slice(0, 8);
    return products.filter((_, idx) => idx % 2 === 1).slice(0, 4);
  }, [products]);

  const occasionPicks = products
    .filter((p) => p.occasion === selectedOccasion)
    .slice(0, 3);

  const handleResetFilters = () => {
    setSelectedCategory(ProductCategory.ALL);
    setSelectedAgeGroup(AgeGroup.ALL);
    setActiveShortcut('all');
    setSearchQuery('');
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('brain-toys-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-[#F4F6F8] dark:bg-slate-950">
      {/* 1. Amazon-Style Prominent Search Bar & Horizontal Category Strip */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-3 space-y-3">
          {/* Full-Width Search Input */}
          <div className="relative">
            <Search
              className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search BEE4 toys, wall clocks, lithophanes, embossers..."
              aria-label="Search BEE4 products"
              className="w-full h-11 pl-10 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-600 focus:bg-white dark:focus:bg-slate-900"
            />
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search query"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Horizontal Scrollable Category Icons Strip */}
          <div
            role="tablist"
            aria-label="Browse BEE4 categories"
            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-1"
          >
            {CATEGORY_SHORTCUTS.map((cat) => {
              const active = activeShortcut === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveShortcut(cat.id);
                    if (cat.id !== 'all') scrollToCatalog();
                  }}
                  className={`shrink-0 flex flex-col items-center gap-1.5 min-w-[74px] px-2.5 py-2 rounded-xl border text-center transition-colors ${
                    active
                      ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-500 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      active
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {renderCategoryIcon(cat.id)}
                  </span>
                  <span className="text-[11px] font-semibold whitespace-nowrap">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Search Instant Results when user types in top search */}
      {searchQuery.trim().length > 0 && (
        <section className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-5 pb-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Search results for &ldquo;{searchQuery.trim()}&rdquo; ({filteredProducts.length})
              </h2>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                Clear search
              </button>
            </div>
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                No matching BEE4 items found. Try keywords like Karakuri, Clock, Tangram, or Gyro.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    reviews={reviews}
                    isWishlisted={wishlistIds.includes(product.id)}
                    onSelectProduct={onSelectProduct}
                    onQuickView={onQuickView}
                    onQuickAdd={onQuickAdd}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. Clean Professional Storefront Hero */}
      <section className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-5 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 flex flex-col justify-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Award className="w-3.5 h-3.5" />
              <span>BEE4 Studio · Precision 3D Crafts &amp; Brain Toys</span>
            </span>
            <h1 className="mt-3 font-display text-[clamp(1.75rem,3.3vw,2.65rem)] font-bold leading-[1.12] tracking-tight text-slate-900 dark:text-white text-balance">
              {heroHeadline?.trim() || 'Screen-Free Brain Toys & Custom 3D Crafts.'}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md">
              {heroSubheadline?.trim() ||
                'Small-batch 3D-printed puzzles, silent wall clocks, custom lithophanes & logic games crafted in India starting at ₹349.'}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>{heroCtaText?.trim() || `Explore ${products.length} Products`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupByAge(true);
                  scrollToCatalog();
                }}
                className="px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                Shop by Age
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 overflow-hidden">
            <div className="h-full min-h-[220px] sm:min-h-[300px] rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
              <ProductImage
                src={HERO_IMAGE}
                alt="BEE4 custom 3D-printed brain-training puzzles, wall clocks, and DIY engineering kits"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* 4-Column High-Trust Storefront Highlights */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums truncate">
                ₹349 – ₹899
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Eco Bio-PLA+ 3D Studio
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                100% Screen-Free IQ
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Ages 3–15 Logic &amp; STEM
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                48 Hr Dispatch
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Pan-India · Express Tracking
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                Safe Checkout
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                UPI, Wallet, COD &amp; GST
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Product Viral Reels Section */}
      <ViralReelsSection
        reels={viralReels}
        products={products}
        onSelectProduct={onSelectProduct}
      />

      {/* 4. Curated Storefront Rows: Best Selling, Newly Launched, Trendy */}
      <CuratedShelfSection
        title="Best Selling Products"
        subtitle="Most-loved screen-free kits chosen by parents & schools"
        icon={<Flame className="w-4 h-4 text-amber-600" />}
        products={bestSellingProducts}
        reviews={reviews}
        wishlistIds={wishlistIds}
        onSelectProduct={onSelectProduct}
        onQuickView={onQuickView}
        onQuickAdd={onQuickAdd}
        onToggleWishlist={onToggleWishlist}
      />

      <CuratedShelfSection
        title="Newly Launched Products"
        subtitle="Fresh precision 3D studio editions ready to ship"
        icon={<Sparkles className="w-4 h-4 text-amber-600" />}
        products={newlyLaunchedProducts}
        reviews={reviews}
        wishlistIds={wishlistIds}
        onSelectProduct={onSelectProduct}
        onQuickView={onQuickView}
        onQuickAdd={onQuickAdd}
        onToggleWishlist={onToggleWishlist}
      />

      <CuratedShelfSection
        title="Trendy Products"
        subtitle="Viral desk mechanisms & thoughtful gift favorites"
        icon={<Award className="w-4 h-4 text-amber-600" />}
        products={trendyProducts}
        reviews={reviews}
        wishlistIds={wishlistIds}
        onSelectProduct={onSelectProduct}
        onQuickView={onQuickView}
        onQuickAdd={onQuickAdd}
        onToggleWishlist={onToggleWishlist}
      />

      {/* 5. Dual-Filter Navigation Bar + Full Catalog */}
      <section
        id="brain-toys-catalog"
        className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-6 pb-12 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              All BEE4 3D Crafts &amp; Brain Toys
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Filter by brain skill, age group, or product category
            </p>
          </div>
          {activeShortcut !== 'all' && (
            <button
              type="button"
              onClick={() => setActiveShortcut('all')}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 underline"
            >
              Show All Categories
            </button>
          )}
        </div>

        <DualFilterBar
          products={shortcutFiltered}
          filteredCount={filteredProducts.length}
          selectedCategory={selectedCategory}
          selectedAgeGroup={selectedAgeGroup}
          groupByAge={groupByAge}
          search={searchQuery}
          minimalSkillsOnly
          onChangeCategory={setSelectedCategory}
          onChangeAgeGroup={setSelectedAgeGroup}
          onToggleGroupByAge={() => setGroupByAge((prev) => !prev)}
          onChangeSearch={setSearchQuery}
          onResetFilters={handleResetFilters}
        />

        {filteredProducts.length === 0 ? (
          <div className="py-14 px-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              No toys match that filter combination
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
              Switch back to All to browse all {products.length} BEE4 products.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        ) : groupByAge ? (
          <div className="space-y-10">
            {groupedSections.map(({ ageGroup, items }) => {
              const meta = AGE_GROUP_META.find((m) => m.ageGroup === ageGroup);
              return (
                <div key={ageGroup} className="space-y-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded border text-xs font-bold ${
                            meta?.badgeClasses ?? ''
                          }`}
                        >
                          {ageGroup} · {meta?.shortSubtitle}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                          {items.length} curated toys
                        </span>
                      </div>
                      <h3 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                        {meta?.sectionHeadline}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
                        {meta?.sectionSubtextHi}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
                    {items.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        reviews={reviews}
                        isWishlisted={wishlistIds.includes(product.id)}
                        onSelectProduct={onSelectProduct}
                        onQuickView={onQuickView}
                        onQuickAdd={onQuickAdd}
                        onToggleWishlist={onToggleWishlist}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                reviews={reviews}
                isWishlisted={wishlistIds.includes(product.id)}
                onSelectProduct={onSelectProduct}
                onQuickView={onQuickView}
                onQuickAdd={onQuickAdd}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        )}
      </section>

      {/* 6. Shop by Occasion */}
      {featuredBannerEnabled && (
        <section className="bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 py-10">
          <div className="max-w-[1200px] mx-auto px-3 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                  Gift Finder
                </p>
                <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  Shop by Occasion
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="Gift occasions"
                className="flex flex-wrap items-center gap-1.5"
              >
                {OCCASION_TABS.map((tab) => {
                  const active = selectedOccasion === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedOccasion(tab.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {occasionPicks.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  reviews={reviews}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelectProduct={onSelectProduct}
                  onQuickView={onQuickView}
                  onQuickAdd={onQuickAdd}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => onBrowseOccasion(selectedOccasion)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:bg-slate-50"
              >
                <span>See All {selectedOccasion} Gifts</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 7. Verified Customer Reviews */}
      <Testimonials
        testimonials={testimonials}
        reviews={reviews}
        products={products}
        orders={orders}
        currentCustomer={currentCustomer}
        onNavigate={onNavigate}
        onAddTestimonial={onAddTestimonial}
        onSubmitReview={onSubmitReview}
      />
    </div>
  );
}

interface CuratedShelfProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  products: Product[];
  reviews: ProductReviewRecord[];
  wishlistIds: string[];
  onSelectProduct: (id: string) => void;
  onQuickView: (p: Product) => void;
  onQuickAdd: (p: Product) => void;
  onToggleWishlist: (id: string) => void;
}

function CuratedShelfSection({
  title,
  subtitle,
  icon,
  products,
  reviews,
  wishlistIds,
  onSelectProduct,
  onQuickView,
  onQuickAdd,
  onToggleWishlist,
}: CuratedShelfProps) {
  if (products.length === 0) return null;
  return (
    <section className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-4 pb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            reviews={reviews}
            isWishlisted={wishlistIds.includes(product.id)}
            onSelectProduct={onSelectProduct}
            onQuickView={onQuickView}
            onQuickAdd={onQuickAdd}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  );
}
