import { Search, X } from 'lucide-react';
import { GiftOccasion, Product, ProductCategory, SortOption } from '../types';
import { filterAndSortProducts } from '../utils/storeLogic';
import { ProductCard } from './ProductCard';

interface ShopViewProps {
  products: Product[];
  wishlistIds: string[];
  category: ProductCategory;
  occasion: GiftOccasion;
  search: string;
  maxPrice: number | null;
  sortBy: SortOption;
  onChangeCategory: (category: ProductCategory) => void;
  onChangeOccasion: (occasion: GiftOccasion) => void;
  onChangeSearch: (search: string) => void;
  onChangeMaxPrice: (maxPrice: number | null) => void;
  onChangeSortBy: (sortBy: SortOption) => void;
  onResetFilters: () => void;
  onSelectProduct: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const CATEGORIES = Object.values(ProductCategory);
const OCCASIONS = Object.values(GiftOccasion);

export function ShopView({
  products,
  wishlistIds,
  category,
  occasion,
  search,
  maxPrice,
  sortBy,
  onChangeCategory,
  onChangeOccasion,
  onChangeSearch,
  onChangeMaxPrice,
  onChangeSortBy,
  onResetFilters,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: ShopViewProps) {
  const filtered = filterAndSortProducts(products, {
    category,
    occasion,
    search,
    maxPrice,
    sortBy,
  });

  const hasActiveFilters =
    category !== ProductCategory.ALL ||
    occasion !== GiftOccasion.ALL ||
    search.trim().length > 0 ||
    maxPrice !== null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-white/75">
        <div>
          <p className="text-xs font-semibold tracking-wide text-amber-700">
            Catalog
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-zinc-900">
            Shop All BEE4 Finds
          </h1>
          <p className="mt-1 text-sm text-zinc-600 tabular-nums">
            Showing {filtered.length} of {products.length} curated items
          </p>
        </div>

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="shop-search"
              type="text"
              value={search}
              onChange={(e) => onChangeSearch(e.target.value)}
              placeholder="Search bottles, totes, 3D toys..."
              className="w-full sm:w-64 pl-10 pr-8 py-2.5 text-sm glass-input rounded-xl focus:outline-none"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeSearch('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <label htmlFor="shop-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="shop-sort"
              value={sortBy}
              onChange={(e) => onChangeSortBy(e.target.value as SortOption)}
              className="w-full sm:w-auto px-3.5 py-2.5 text-sm glass-input rounded-xl text-zinc-800 font-medium focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="py-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          {CATEGORIES.map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onChangeCategory(cat)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'glass-btn-ink text-white'
                    : 'glass-btn-secondary text-zinc-700 hover:text-zinc-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Occasion + Budget Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="shop-occasion" className="text-xs font-medium text-zinc-600">
                Occasion:
              </label>
              <select
                id="shop-occasion"
                value={occasion}
                onChange={(e) => onChangeOccasion(e.target.value as GiftOccasion)}
                className="px-3 py-1.5 text-xs glass-input rounded-xl font-medium text-zinc-800 focus:outline-none"
              >
                {OCCASIONS.map((occ) => (
                  <option key={occ} value={occ}>
                    {occ}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="shop-budget" className="text-xs font-medium text-zinc-600">
                Budget:
              </label>
              <select
                id="shop-budget"
                value={maxPrice === null ? 'all' : String(maxPrice)}
                onChange={(e) =>
                  onChangeMaxPrice(e.target.value === 'all' ? null : Number(e.target.value))
                }
                className="px-3 py-1.5 text-xs glass-input rounded-xl font-medium text-zinc-800 focus:outline-none"
              >
                <option value="all">All Prices (₹199–₹999)</option>
                <option value="399">Under ₹399</option>
                <option value="599">Under ₹599</option>
                <option value="799">Under ₹799</option>
              </select>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-4"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filtered.length === 0 ? (
        <div className="mt-6 py-16 px-6 text-center glass-surface rounded-3xl">
          <h2 className="font-display text-lg font-bold text-zinc-900">No matching products found</h2>
          <p className="mt-1.5 text-sm text-zinc-600 max-w-md mx-auto">
            Try clearing your search or choosing a wider price range to explore all 15 BEE4 items.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filtered.map((product) => (
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
