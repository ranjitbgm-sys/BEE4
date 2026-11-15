import { useState } from 'react';
import { ArrowRight, Gift, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { HERO_IMAGE } from '../data/catalog';
import { GiftOccasion, Product, StorePage, Testimonial } from '../types';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';
import { Testimonials } from './Testimonials';

interface HomeViewProps {
  products: Product[];
  testimonials: Testimonial[];
  wishlistIds: string[];
  onNavigate: (page: StorePage) => void;
  onSelectProduct: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
  onBrowseOccasion: (occasion: GiftOccasion) => void;
  onAddTestimonial: (testimonial: Testimonial) => void;
}

const OCCASION_TABS: { value: Exclude<GiftOccasion, GiftOccasion.ALL>; label: string }[] = [
  { value: GiftOccasion.BIRTHDAY, label: 'Birthday Picks' },
  { value: GiftOccasion.FESTIVALS, label: 'Diwali & Festivals' },
  { value: GiftOccasion.HOUSEWARMING, label: 'Housewarming' },
  { value: GiftOccasion.DESK_COLLEGE, label: 'Desk & College' },
];

export function HomeView({
  products,
  testimonials,
  wishlistIds,
  onNavigate,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
  onBrowseOccasion,
  onAddTestimonial,
}: HomeViewProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<
    Exclude<GiftOccasion, GiftOccasion.ALL>
  >(GiftOccasion.BIRTHDAY);

  const featuredProducts = products.filter((p) => p.featured).slice(0, 6);
  const displayFeatured =
    featuredProducts.length >= 3 ? featuredProducts : products.slice(0, 6);

  const occasionPicks = products
    .filter((p) => p.occasion === selectedOccasion)
    .slice(0, 3);

  return (
    <div>
      {/* 1. Storefront Hero */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          <div className="lg:col-span-5 flex flex-col justify-center py-2">
            <p className="text-xs font-semibold tracking-wide text-amber-700">
              Curated Indian Lifestyle &amp; Gifting
            </p>
            <h1 className="mt-3 font-display text-[clamp(2.2rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-tight text-zinc-900 text-balance">
              Thoughtful everyday finds &amp; trendy gifts, ₹199 to ₹999.
            </h1>
            <p className="mt-4 text-base text-zinc-600 leading-relaxed max-w-md">
              From insulated bottles and structured handbags to 3D desk toys and handmade
              showpieces — quality essentials priced honestly for daily joy and gifting.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('shop')}
                className="px-6 py-3 rounded-xl glass-btn-amber text-white text-sm font-semibold inline-flex items-center gap-2 transition-all whitespace-nowrap shrink-0"
              >
                <span>Shop Collection</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('gifts')}
                className="px-5 py-3 rounded-xl glass-btn-secondary text-zinc-900 text-sm font-semibold transition-all whitespace-nowrap shrink-0"
              >
                Explore Gift Ideas
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="h-full min-h-[280px] sm:min-h-[380px] p-2.5 rounded-3xl glass-surface">
              <div className="h-full w-full rounded-2xl overflow-hidden bg-white/40 border border-white/60">
                <ProductImage
                  src={HERO_IMAGE}
                  alt="BEE4 curated collection featuring canvas tote, amber flask, 3D desk figurine, and ceramic arch vase"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Store Promise Strip with Soft Bubble Icon Wells */}
        <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 tabular-nums">₹199 – ₹999</p>
              <p className="text-xs text-zinc-600 mt-0.5">Budget-friendly daily pricing</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Free Shipping ₹499+</p>
              <p className="text-xs text-zinc-600 mt-0.5">3–5 day delivery across India</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">UPI, Cards &amp; COD</p>
              <p className="text-xs text-zinc-600 mt-0.5">Instant or WhatsApp checkout</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl glass-subtle flex items-start gap-3">
            <div className="w-9 h-9 rounded-full glass-orb flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Ready Gift Wrapping</p>
              <p className="text-xs text-zinc-600 mt-0.5">Add handwritten notes at checkout</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Collection Grid */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 border-t border-white/70">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold tracking-wide text-zinc-500">
              Featured Picks
            </p>
            <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-zinc-900">
              Bestsellers Across Every Room
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('shop')}
            className="text-sm font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap"
          >
            <span>View All {products.length} Products</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {displayFeatured.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isWishlisted={wishlistIds.includes(product.id)}
              onSelectProduct={onSelectProduct}
              onQuickAdd={onQuickAdd}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      {/* 3. Interactive Gift Finder / Occasions */}
      <section className="glass-subtle border-x-0 py-14">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold tracking-wide text-amber-700">
                Gift Finder
              </p>
              <h2 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-zinc-900">
                Shop by Occasion
              </h2>
              <p className="mt-2 text-sm text-zinc-600 max-w-lg">
                Buying for a friend&apos;s birthday, Diwali hosting, or a college desk upgrade? Pick an
                occasion to see curated ideas.
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
                        ? 'glass-btn-ink text-white'
                        : 'text-zinc-700 hover:text-zinc-900 hover:bg-white/70'
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
                isWishlisted={wishlistIds.includes(product.id)}
                onSelectProduct={onSelectProduct}
                onQuickAdd={onQuickAdd}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => onBrowseOccasion(selectedOccasion)}
              className="px-5 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 hover:text-amber-800 text-sm font-semibold inline-flex items-center gap-2 transition-all"
            >
              <span>See All {selectedOccasion} Gifts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 4. Brand & Craft Story */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center glass-surface rounded-3xl p-6 sm:p-10">
          <div className="md:col-span-7">
            <p className="text-xs font-semibold tracking-wide text-zinc-500">
              Why BEE4
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-zinc-900 text-balance">
              Small-batch handmade pieces meet everyday smart utility.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 leading-relaxed">
              We started BEE4 with one simple goal: you shouldn&apos;t have to choose between
              boring cheap plastic and overpriced boutique decor. Every bottle, handbag, 3D-printed
              desk buddy, and clay showpiece is quality-checked before it leaves our Bengaluru studio.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('about')}
                className="px-4 py-2.5 rounded-xl glass-btn-secondary text-zinc-900 text-sm font-semibold transition-all"
              >
                Read Our Story
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="px-4 py-2.5 rounded-xl text-zinc-700 hover:text-zinc-900 hover:bg-white/50 text-sm font-semibold transition-colors"
              >
                Need Bulk Event Gifts? Contact Us →
              </button>
            </div>
          </div>

          <div className="md:col-span-5 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 tabular-nums">15+</p>
              <p className="mt-1 text-xs text-zinc-600">Curated launch essentials across 7 categories</p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 tabular-nums">4.8/5</p>
              <p className="mt-1 text-xs text-zinc-600">Quality check score across packaging &amp; build</p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 tabular-nums">₹499</p>
              <p className="mt-1 text-xs text-zinc-600">Free delivery threshold pan-India</p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="font-display text-2xl font-bold text-zinc-900 tabular-nums">48 hr</p>
              <p className="mt-1 text-xs text-zinc-600">Dispatch turnaround from order confirmation</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Customer Testimonials & Feedback Form */}
      <Testimonials
        testimonials={testimonials}
        products={products}
        onAddTestimonial={onAddTestimonial}
      />
    </div>
  );
}
