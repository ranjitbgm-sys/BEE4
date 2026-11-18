import { useState } from 'react';
import { Check, Heart, Plus, Star } from 'lucide-react';
import { AGE_GROUP_META } from '../data/catalog';
import { Product, ProductReviewRecord } from '../types';
import { computeProductRatingStats } from '../utils/messagesReviewsLogic';
import { formatINR } from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  reviews?: ProductReviewRecord[];
  isWishlisted?: boolean;
  onSelectProduct: (productId: string) => void;
  onQuickView?: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
}

export function ProductCard({
  product,
  reviews = [],
  isWishlisted = false,
  onSelectProduct,
  onQuickView,
  onQuickAdd,
  onToggleWishlist,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const ageMeta = AGE_GROUP_META.find((m) => m.ageGroup === product.ageGroup);
  const coverAngle = product.gallery[0];
  const hasDiscount = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
  const ratingStats = computeProductRatingStats(reviews, product.id, product.title);

  const handleQuickAdd = () => {
    if (!product.inStock) return;
    onQuickAdd(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article className="group flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-500/40 transition-all duration-200">
      {/* Clean Studio Product Image */}
      <div className="relative aspect-[4/3] w-full bg-slate-50 dark:bg-slate-800/60 overflow-hidden border-b border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => (onQuickView ? onQuickView(product) : onSelectProduct(product.id))}
          aria-label={`View ${product.title}`}
          className="w-full h-full text-left block"
        >
          <ProductImage
            src={coverAngle?.url ?? product.image}
            alt={product.title}
            objectPosition={coverAngle?.objectPosition}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          />
        </button>

        {ratingStats.reviewCount > 0 && (
          <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 dark:text-white tabular-nums shadow-sm">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" aria-hidden="true" />
            <span>{ratingStats.averageRating.toFixed(1)}</span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              ({ratingStats.reviewCount})
            </span>
          </div>
        )}

        {onToggleWishlist && (
          <button
            type="button"
            onClick={() => onToggleWishlist(product.id)}
            aria-label={
              isWishlisted
                ? `Remove ${product.title} from wishlist`
                : `Save ${product.title} to wishlist`
            }
            aria-pressed={isWishlisted}
            className={`absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-colors shadow-sm ${
              isWishlisted
                ? 'bg-slate-900 dark:bg-amber-500 border-slate-900 dark:border-amber-500 text-amber-400 dark:text-slate-950'
                : 'bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-amber-400 dark:fill-slate-950' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Minimal Typography-First Card Body: Age Group, Name, Price & Full-Width CTA */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between gap-2.5 sm:gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300 min-w-0">
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full shrink-0 ${ageMeta?.accentDotClass ?? 'bg-amber-500'}`}
            />
            <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap shrink-0">
              Age {product.ageGroup}
            </span>
            <span aria-hidden="true" className="text-slate-400 shrink-0">
              ·
            </span>
            <span className="text-slate-500 dark:text-slate-400 truncate">{product.category}</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectProduct(product.id)}
            className="text-left block w-full"
          >
            <h3 className="font-display text-[13.5px] sm:text-[15px] font-semibold text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors leading-snug line-clamp-2 min-h-[2.35rem] sm:min-h-[2.6rem]">
              {product.title}
            </h3>
          </button>
        </div>

        {/* Stacked Footer: Row 1 = Selling Price + MRP, Row 2 = Full-Width Add to Cart */}
        <div className="flex flex-col gap-2 pt-2.5 sm:pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-baseline gap-1.5 flex-wrap tabular-nums">
            <span className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-white">
              {formatINR(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-through">
                {formatINR(product.compareAtPrice!)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.title} to cart`}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              !product.inStock
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white'
            }`}
          >
            {!product.inStock ? (
              <span>Sold Out</span>
            ) : justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
