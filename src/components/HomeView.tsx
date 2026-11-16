import { useState } from 'react';
import { ArrowRight, Brain, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { AGE_GROUP_META, HERO_IMAGE } from '../data/catalog';
import {
  AgeGroup,
  GiftOccasion,
  Product,
  ProductCategory,
  ProductReviewRecord,
  StorePage,
  Testimonial,
} from '../types';
import { filterAndSortProducts, groupProductsByAge } from '../utils/storeLogic';
import { DualFilterBar } from './DualFilterBar';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';
import { Testimonials } from './Testimonials';

interface HomeViewProps {
  products: Product[];
  testimonials: Testimonial[];
  reviews?: ProductReviewRecord[];
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

const OCCASION_TABS: { value: Exclude<GiftOccasion, GiftOccasion.ALL>; label: string }[] = [
  { value: GiftOccasion.BIRTHDAY, label: 'Birthday Brain Gifts' },
  { value: GiftOccasion.FESTIVALS, label: 'Festive & Return Gifts' },
  { value: GiftOccasion.DESK_COLLEGE, label: 'Study Desk & Focus' },
  { value: GiftOccasion.EVERYDAY, label: 'Screen-Free Everyday' },
];

export function HomeView({
  products,
  testimonials,
  reviews = [],
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
  const [selectedOccasion, setSelectedOccasion] = useState<
    Exclude<GiftOccasion, GiftOccasion.ALL>
  >(GiftOccasion.BIRTHDAY);

  const filteredProducts = filterAndSortProducts(products, {
    category: selectedCategory,
    ageGroup: selectedAgeGroup,
    occasion: GiftOccasion.ALL,
    search: searchQuery,
    maxPrice: null,
    sortBy: 'featured',
  });

  const groupedSections = groupProductsByAge(filteredProducts);

  const occasionPicks = products
    .filter((p) => p.occasion === selectedOccasion)
    .slice(0, 3);

  const handleResetFilters = () => {
    setSelectedCategory(ProductCategory.ALL);
    setSelectedAgeGroup(AgeGroup.ALL);
    setSearchQuery('');
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('brain-toys-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div>
      {/* 1. Storefront Hero */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-6 glass-surface rounded-3xl p-7 sm:p-10 flex flex-col justify-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">
              BEE4 Studio · Ages 3–15
            </p>
            <h1 className="mt-4 font-display text-[clamp(2rem,3.6vw,3rem)] font-bold leading-[1.08] tracking-tight text-zinc-900 dark:text-white text-balance">
              {heroHeadline?.trim() || 'Screen-Free Brain Toys for Deep Focus.'}
            </h1>
            <p className="mt-4 text-base sm:text-[17px] text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-md">
              {heroSubheadline?.trim() ? (
                heroSubheadline
              ) : (
                <>
                  Small-batch 3D-printed Japanese, Korean &amp; Chinese puzzles starting at{' '}
                  <span className="font-semibold text-zinc-900 dark:text-white">₹349</span>.
                </>
              )}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={scrollToCatalog}
                className="px-6 py-3.5 rounded-xl glass-btn-amber text-white text-sm font-semibold inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
              >
                <span>{heroCtaText?.trim() || `Explore ${products.length} Brain Toys`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setGroupByAge(true);
                  scrollToCatalog();
                }}
                className="px-5 py-3.5 rounded-xl glass-btn-secondary text-zinc-800 dark:text-zinc-100 text-sm font-semibold transition-all whitespace-nowrap shrink-0"
              >
                Browse by Age
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[260px] sm:min-h-[360px] p-2.5 rounded-3xl glass-surface">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-white/40 dark:bg-slate-900/50 border border-white/60 dark:border-white/10">
                <ProductImage
                  src={HERO_IMAGE}
                  alt="BEE4 custom 3D-printed East-Asian brain toys including Karakuri trick box, Korean tangram, open-gear automaton, and Strandbeest walking kit"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Trust Strip */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white tabular-nums">
                ₹349 – ₹899
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Custom 3D-printed Bio-PLA
              </p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                100% Screen-Free IQ
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Japanese, Korean &amp; Chinese craft
              </p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Worldwide Dispatch
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                India, US &amp; UK delivery
              </p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                Secure Checkout
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Cards, UPI, COD &amp; invoice
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Dual-Filter Navigation Bar + Complete 16-Product Catalog */}
      <section
        id="brain-toys-catalog"
        className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-14 space-y-8"
      >
        <DualFilterBar
          products={products}
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
          <div className="py-16 px-6 text-center glass-surface rounded-3xl">
            <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
              No toys match that Skill + Age combination
            </h2>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
              Switch back to All Skills or All Ages to browse all {products.length} East-Asian
              screen-free brain toys.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
            >
              Reset All Filters
            </button>
          </div>
        ) : groupByAge ? (
          <div className="space-y-12">
            {groupedSections.map(({ ageGroup, items }) => {
              const meta = AGE_GROUP_META.find((m) => m.ageGroup === ageGroup);
              return (
                <div key={ageGroup} className="space-y-5">
                  <div className="glass-surface rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`px-3 py-1 rounded-lg border text-xs font-bold ${
                            meta?.badgeClasses ?? ''
                          }`}
                        >
                          {ageGroup} · {meta?.shortSubtitle}
                        </span>
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
                          {items.length} curated toys
                        </span>
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                        {meta?.sectionHeadline}
                      </h2>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 max-w-3xl leading-relaxed">
                        {meta?.sectionSubtextHi}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

      {/* 3. Occasion & Return Gift Finder */}
      {featuredBannerEnabled && (
      <section className="glass-subtle border-x-0 py-14">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
                Smart Gifting Finder
              </p>
              <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white">
                Shop by Occasion
              </h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 max-w-lg">
                Picking a meaningful birthday surprise, return gift hamper, or study-desk brain
                booster? Select an occasion to preview curated picks.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Gift occasions"
              className="flex flex-wrap items-center gap-1.5 p-1.5 glass-surface rounded-2xl"
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
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                      active
                        ? 'glass-btn-ink'
                        : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => onBrowseOccasion(selectedOccasion)}
              className="px-5 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 dark:text-white hover:text-amber-800 text-sm font-semibold inline-flex items-center gap-2 transition-all"
            >
              <span>See All {selectedOccasion} Gifts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
      )}

      {/* 4. Engineering Philosophy & Craft Story */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center glass-surface rounded-3xl p-6 sm:p-10">
          <div className="md:col-span-7">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
              Why BEE4 Brain Toys
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white text-balance">
              Precision East-Asian cognitive mechanics, small-batch 3D-printed for families worldwide.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Imported Japanese Karakuri puzzle boxes or Korean Gabe kits typically cost 3×–5× more.
              Our Banka, Bihar 3D-print studio (PIN 813103) fabricates these proven spatial, motor,
              and binary-STEM mechanisms using non-toxic Bio-PLA — hand-inspected and shipped
              globally to India, the US, and the UK.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="px-4 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 dark:text-white text-sm font-semibold transition-all"
              >
                Read Our Story
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10 text-sm font-semibold transition-colors"
              >
                School / Return Gift Bulk Inquiry →
              </button>
            </div>
          </div>

          <div className="md:col-span-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                16
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Custom 3D-printed toys across 4 skills &amp; 4 age groups
              </p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                0%
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Screens, batteries, or passive cartoon distractions
              </p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                US · UK · IN
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                International studio dispatch ready
              </p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                48 hr
              </p>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                Small-batch inspection &amp; dispatch turnaround
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Parent Reviews & Feedback Form */}
      <Testimonials
        testimonials={testimonials}
        reviews={reviews}
        products={products}
        onAddTestimonial={onAddTestimonial}
        onSubmitReview={onSubmitReview}
      />
    </div>
  );
}
