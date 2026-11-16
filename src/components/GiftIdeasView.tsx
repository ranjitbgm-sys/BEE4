import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { AgeGroup, GiftOccasion, Product, ProductCategory } from '../types';
import { filterAndSortProducts } from '../utils/storeLogic';
import { ProductCard } from './ProductCard';

interface GiftIdeasViewProps {
  products: Product[];
  wishlistIds: string[];
  initialOccasion?: GiftOccasion;
  giftWrapFee?: number;
  giftWrapEnabled?: boolean;
  giftFinderWeights?: Partial<Record<Exclude<GiftOccasion, GiftOccasion.ALL>, number>>;
  onSelectProduct: (productId: string) => void;
  onQuickView?: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const OCCASION_CARDS: { occasion: GiftOccasion; label: string; subtitle: string }[] = [
  { occasion: GiftOccasion.ALL, label: 'All Occasions', subtitle: 'Every screen-free brain gift' },
  { occasion: GiftOccasion.BIRTHDAY, label: 'Birthday', subtitle: 'Motor, Karakuri & robotics kits' },
  { occasion: GiftOccasion.FESTIVALS, label: 'Festive & Return Gifts', subtitle: 'Lanterns & secret trick boxes' },
  { occasion: GiftOccasion.DESK_COLLEGE, label: 'Study Desk & Focus', subtitle: 'Soma cubes, binary boards & pagodas' },
  { occasion: GiftOccasion.EVERYDAY, label: 'Everyday Screen-Free', subtitle: 'Tangrams, mazes & Kendama play' },
];

export function GiftIdeasView({
  products,
  wishlistIds,
  initialOccasion = GiftOccasion.ALL,
  giftWrapFee = 49,
  giftWrapEnabled = true,
  giftFinderWeights,
  onSelectProduct,
  onQuickView,
  onQuickAdd,
  onToggleWishlist,
}: GiftIdeasViewProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion>(initialOccasion);
  const [budgetCap, setBudgetCap] = useState<number | null>(null);

  const giftableProducts = products.filter((p) => p.giftable !== false);

  const baseGiftItems = filterAndSortProducts(giftableProducts, {
    category: ProductCategory.ALL,
    ageGroup: AgeGroup.ALL,
    occasion: selectedOccasion,
    search: '',
    maxPrice: budgetCap,
    sortBy: 'featured',
  });

  const giftItems =
    selectedOccasion === GiftOccasion.ALL && giftFinderWeights
      ? [...baseGiftItems].sort(
          (a, b) => (giftFinderWeights[b.occasion] ?? 5) - (giftFinderWeights[a.occasion] ?? 5)
        )
      : baseGiftItems;

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-12">
      <div className="glass-surface rounded-3xl p-6 sm:p-10 mb-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
            Screen-Free Gift Finder
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white text-balance">
            Thoughtful East-Asian brain gifts ₹349–₹899, wrapped &amp; ready to delight.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Pick an occasion and comfort budget below.
            {giftWrapEnabled
              ? ` Add Kraft gift wrapping and a handwritten message card right inside checkout for ₹${giftWrapFee}.`
              : ' Ready-to-ship screen-free gift boxes from our Banka studio.'}
          </p>
        </div>

        {/* Occasion Selector */}
        <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {OCCASION_CARDS.map((card) => {
            const active = selectedOccasion === card.occasion;
            return (
              <button
                key={card.occasion}
                type="button"
                onClick={() => setSelectedOccasion(card.occasion)}
                className={`p-3.5 rounded-2xl text-left transition-all ${
                  active
                    ? 'glass-btn-ink'
                    : 'glass-btn-secondary text-zinc-900 dark:text-zinc-100 hover:border-amber-400'
                }`}
              >
                <p className="text-sm font-semibold">{card.label}</p>
                <p
                  className={`mt-1 text-xs ${
                    active ? 'text-zinc-200 dark:text-zinc-900' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {card.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Budget Filter */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mr-1">
            Filter by budget:
          </span>
          {[
            { label: 'All Prices (₹349–₹899)', value: null },
            { label: 'Under ₹449', value: 449 },
            { label: 'Under ₹599', value: 599 },
            { label: 'Under ₹899', value: 899 },
          ].map((opt) => {
            const active = budgetCap === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => setBudgetCap(opt.value)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'glass-btn-amber text-white'
                    : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gift Wrap Info Strip */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/75 dark:border-white/10">
        <div className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
          <Gift className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <span>
            Showing{' '}
            <strong className="tabular-nums text-zinc-900 dark:text-white">
              {giftItems.length}
            </strong>{' '}
            screen-free brain gifts for <strong>{selectedOccasion}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>
            Bulk school STEM fest or return gift sets? Contact our Banka, Bihar studio.
          </span>
        </div>
      </div>

      {giftItems.length === 0 ? (
        <div className="py-14 px-6 text-center glass-surface rounded-3xl">
          <p className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            No items under that exact filter
          </p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Try viewing all budgets to see every curated brain gift for {selectedOccasion}.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedOccasion(GiftOccasion.ALL);
              setBudgetCap(null);
            }}
            className="mt-4 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold"
          >
            Show All Gift Picks
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {giftItems.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
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
  );
}
