import { useState } from 'react';
import { Gift, Sparkles } from 'lucide-react';
import { GiftOccasion, Product, ProductCategory } from '../types';
import { filterAndSortProducts } from '../utils/storeLogic';
import { ProductCard } from './ProductCard';

interface GiftIdeasViewProps {
  products: Product[];
  wishlistIds: string[];
  initialOccasion?: GiftOccasion;
  onSelectProduct: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const OCCASION_CARDS: { occasion: GiftOccasion; subtitle: string }[] = [
  { occasion: GiftOccasion.ALL, subtitle: 'Every thoughtful gift pick' },
  { occasion: GiftOccasion.BIRTHDAY, subtitle: 'Lamps, hampers & 3D toys' },
  { occasion: GiftOccasion.FESTIVALS, subtitle: 'Diwali, Rakhi & festive hosting' },
  { occasion: GiftOccasion.HOUSEWARMING, subtitle: 'Handmade ceramic & tray sets' },
  { occasion: GiftOccasion.DESK_COLLEGE, subtitle: 'Bottles, totes & desk organizers' },
];

export function GiftIdeasView({
  products,
  wishlistIds,
  initialOccasion = GiftOccasion.ALL,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: GiftIdeasViewProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<GiftOccasion>(initialOccasion);
  const [budgetCap, setBudgetCap] = useState<number | null>(null);

  const giftItems = filterAndSortProducts(products, {
    category: ProductCategory.ALL,
    occasion: selectedOccasion,
    search: '',
    maxPrice: budgetCap,
    sortBy: 'featured',
  });

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-12">
      <div className="glass-surface rounded-3xl p-6 sm:p-10 mb-10">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wide text-amber-700">
            Gift Finder &amp; Occasions
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-zinc-900 text-balance">
            Thoughtful Indian gifts under ₹999, wrapped &amp; ready to send.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 leading-relaxed">
            Pick an occasion and your comfort budget below. Add kraft gift wrapping and a
            handwritten message card right inside checkout for ₹49.
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
                    ? 'glass-btn-ink text-white'
                    : 'glass-btn-secondary text-zinc-900 hover:border-amber-400'
                }`}
              >
                <p className="text-sm font-semibold">{card.occasion}</p>
                <p
                  className={`mt-1 text-xs ${active ? 'text-zinc-300' : 'text-zinc-500'}`}
                >
                  {card.subtitle}
                </p>
              </button>
            );
          })}
        </div>

        {/* Budget Filter */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600 mr-1">Filter by budget:</span>
          {[
            { label: 'All Budgets', value: null },
            { label: 'Under ₹399', value: 399 },
            { label: 'Under ₹699', value: 699 },
            { label: 'Under ₹999', value: 999 },
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
                    : 'glass-btn-secondary text-zinc-700 hover:text-zinc-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gift Wrap Info Strip */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/75">
        <div className="flex items-center gap-2.5 text-sm text-zinc-700">
          <Gift className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            Showing <strong className="tabular-nums text-zinc-900">{giftItems.length}</strong> gift
            ideas for <strong>{selectedOccasion}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Bulk festival or corporate gifting? Reach out on our Contact page.</span>
        </div>
      </div>

      {giftItems.length === 0 ? (
        <div className="py-14 px-6 text-center glass-surface rounded-3xl">
          <p className="font-display text-lg font-bold text-zinc-900">
            No items under that exact filter
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Try viewing all budgets to see every curated gift for {selectedOccasion}.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {giftItems.map((product) => (
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
      )}
    </section>
  );
}
