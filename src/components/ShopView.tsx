import { useState } from 'react';
import { ArrowDownUp, ArrowUpDown, Check, RotateCcw, Tag } from 'lucide-react';
import { AGE_GROUP_META } from '../data/catalog';
import { AgeGroup, GiftOccasion, Product, ProductCategory, SortOption } from '../types';
import { filterAndSortProducts, groupProductsByAge } from '../utils/storeLogic';
import { DualFilterBar } from './DualFilterBar';
import { ProductCard } from './ProductCard';

interface ShopViewProps {
  products: Product[];
  wishlistIds: string[];
  category: ProductCategory;
  ageGroup: AgeGroup;
  occasion: GiftOccasion;
  search: string;
  maxPrice: number | null;
  inStockOnly: boolean;
  sortBy: SortOption;
  onChangeCategory: (category: ProductCategory) => void;
  onChangeAgeGroup: (ageGroup: AgeGroup) => void;
  onChangeOccasion: (occasion: GiftOccasion) => void;
  onChangeSearch: (search: string) => void;
  onChangeMaxPrice: (maxPrice: number | null) => void;
  onToggleInStockOnly: () => void;
  onChangeSortBy: (sortBy: SortOption) => void;
  onResetFilters: () => void;
  onSelectProduct: (productId: string) => void;
  onQuickView: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const OCCASIONS = Object.values(GiftOccasion);

export function ShopView({
  products,
  wishlistIds,
  category,
  ageGroup,
  occasion,
  search,
  maxPrice,
  inStockOnly,
  sortBy,
  onChangeCategory,
  onChangeAgeGroup,
  onChangeOccasion,
  onChangeSearch,
  onChangeMaxPrice,
  onToggleInStockOnly,
  onChangeSortBy,
  onResetFilters,
  onSelectProduct,
  onQuickView,
  onQuickAdd,
  onToggleWishlist,
}: ShopViewProps) {
  const [groupByAge, setGroupByAge] = useState(false);

  const filtered = filterAndSortProducts(products, {
    category,
    ageGroup,
    occasion,
    search,
    maxPrice,
    inStockOnly,
    sortBy,
  });

  const groupedSections = groupProductsByAge(filtered);
  const inStockCount = products.filter((p) => p.inStock).length;
  const hasQuickFilter = inStockOnly || sortBy !== 'featured' || maxPrice !== null;

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-12 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-white/75 dark:border-white/10">
        <div>
          <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
            East-Asian Screen-Free Catalog
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-zinc-900 dark:text-white">
            All 3D-Printed Brain Toys (₹349–₹899)
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 tabular-nums">
            Showing {filtered.length} of {products.length} brain-training finds
          </p>
        </div>

        {/* Occasion + Budget + Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="shop-occasion" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Occasion:
            </label>
            <select
              id="shop-occasion"
              value={occasion}
              onChange={(e) => onChangeOccasion(e.target.value as GiftOccasion)}
              className="px-3 py-2 text-xs glass-input rounded-xl font-medium focus:outline-none"
            >
              {OCCASIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="shop-budget" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Budget:
            </label>
            <select
              id="shop-budget"
              value={maxPrice === null ? 'all' : String(maxPrice)}
              onChange={(e) =>
                onChangeMaxPrice(e.target.value === 'all' ? null : Number(e.target.value))
              }
              className="px-3 py-2 text-xs glass-input rounded-xl font-medium focus:outline-none"
            >
              <option value="all">All Prices (₹349–₹899)</option>
              <option value="449">Under ₹449</option>
              <option value="599">Under ₹599</option>
              <option value="799">Under ₹799</option>
            </select>
          </div>

          <div>
            <label htmlFor="shop-sort" className="sr-only">
              Sort products
            </label>
            <select
              id="shop-sort"
              value={sortBy}
              onChange={(e) => onChangeSortBy(e.target.value as SortOption)}
              className="px-3 py-2 text-xs glass-input rounded-xl font-medium focus:outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      <DualFilterBar
        products={products}
        filteredCount={filtered.length}
        selectedCategory={category}
        selectedAgeGroup={ageGroup}
        groupByAge={groupByAge}
        search={search}
        onChangeCategory={onChangeCategory}
        onChangeAgeGroup={onChangeAgeGroup}
        onToggleGroupByAge={() => setGroupByAge((prev) => !prev)}
        onChangeSearch={onChangeSearch}
        onResetFilters={onResetFilters}
      />

      {/* Horizontal Scrollable Quick-Filter Chips */}
      <div
        role="region"
        aria-label="Quick shop filters"
        className="w-full overflow-x-auto no-scrollbar pb-1"
      >
        <div className="flex flex-nowrap items-center gap-2 min-w-max">
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mr-1 whitespace-nowrap shrink-0">
            Quick Filters:
          </span>

          <button
            type="button"
            onClick={onToggleInStockOnly}
            aria-pressed={inStockOnly}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              inStockOnly
                ? 'glass-btn-ink'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Check
              className={`w-3.5 h-3.5 shrink-0 ${
                inStockOnly ? 'opacity-100' : 'opacity-60 text-emerald-600 dark:text-emerald-400'
              }`}
              aria-hidden="true"
            />
            <span>In Stock ({inStockCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeSortBy(sortBy === 'price-asc' ? 'featured' : 'price-asc')}
            aria-pressed={sortBy === 'price-asc'}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              sortBy === 'price-asc'
                ? 'glass-btn-amber text-white'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Price: Low to High</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeSortBy(sortBy === 'price-desc' ? 'featured' : 'price-desc')}
            aria-pressed={sortBy === 'price-desc'}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              sortBy === 'price-desc'
                ? 'glass-btn-amber text-white'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <ArrowDownUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Price: High to Low</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMaxPrice(maxPrice === 449 ? null : 449)}
            aria-pressed={maxPrice === 449}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              maxPrice === 449
                ? 'glass-btn-ink'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Under ₹449</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeMaxPrice(maxPrice === 599 ? null : 599)}
            aria-pressed={maxPrice === 599}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              maxPrice === 599
                ? 'glass-btn-ink'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Under ₹599</span>
          </button>

          {hasQuickFilter && (
            <button
              type="button"
              onClick={() => {
                if (inStockOnly) onToggleInStockOnly();
                onChangeMaxPrice(null);
                onChangeSortBy('featured');
              }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Clear Quick Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Grid or Grouped by Age View */}
      {filtered.length === 0 ? (
        <div className="mt-6 py-16 px-6 text-center glass-surface rounded-3xl">
          <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
            No matching brain toys found
          </h2>
          <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300 max-w-md mx-auto">
            Try clearing your search or picking another skill or age filter to see all {products.length}{' '}
            BEE4 toys.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-5 px-5 py-2.5 rounded-xl glass-btn-amber text-white text-sm font-semibold transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : groupByAge ? (
        <div className="space-y-12 pt-2">
          {groupedSections.map(({ ageGroup: grp, items }) => {
            const meta = AGE_GROUP_META.find((m) => m.ageGroup === grp);
            return (
              <div key={grp} className="space-y-5">
                <div className="glass-surface rounded-2xl p-5 sm:p-6">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg border text-xs font-bold ${
                      meta?.badgeClasses ?? ''
                    }`}
                  >
                    {grp} · {meta?.shortSubtitle}
                  </span>
                  <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white">
                    {meta?.sectionHeadline}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 max-w-3xl leading-relaxed">
                    {meta?.sectionSubtextHi}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {items.map((product) => (
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((product) => (
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
