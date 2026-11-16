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
    <article className="group flex flex-col glass-surface rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-900/80">
      {/* Clean Studio Product Image */}
      <div className="relative aspect-[4/3] w-full bg-white/40 dark:bg-slate-900/50 overflow-hidden border-b border-white/60 dark:border-white/10">
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
          <div className="absolute top-3 left-3 z-10 px-2 py-0.5 rounded-full bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border border-white/70 dark:border-white/15 inline-flex items-center gap-1 text-[11px] font-bold text-zinc-900 dark:text-white tabular-nums shadow-sm">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" aria-hidden="true" />
            <span>{ratingStats.averageRating.toFixed(1)}</span>
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">
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
            className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              isWishlisted
                ? 'glass-btn-ink text-amber-400 dark:text-zinc-950'
                : 'glass-orb text-zinc-700 dark:text-zinc-200 hover:text-zinc-900'
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-amber-400 dark:fill-zinc-950' : ''}`}
            />
          </button>
        )}
      </div>

      {/* Minimal Typography-First Card Body: Age Group, Name, MRP & Selling Price */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full shrink-0 ${ageMeta?.accentDotClass ?? 'bg-amber-500'}`}
            />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
              Age {product.ageGroup}
            </span>
            <span aria-hidden="true" className="text-zinc-400">
              ·
            </span>
            <span className="text-zinc-500 dark:text-zinc-400 truncate">{product.category}</span>
          </div>

          <button
            type="button"
            onClick={() => onSelectProduct(product.id)}
            className="text-left block w-full"
          >
            <h3 className="font-display text-[15px] font-semibold text-zinc-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors duration-300 leading-snug line-clamp-2 min-h-[2.6rem]">
              {product.title}
            </h3>
          </button>
        </div>

        {/* Selling Price + MRP + Add CTA */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-900/8 dark:border-white/10">
          <div className="flex flex-col tabular-nums">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-zinc-900 dark:text-white">
                {formatINR(product.price)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 line-through">
                  MRP {formatINR(product.compareAtPrice!)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.title} to bag`}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap shrink-0 ${
              !product.inStock
                ? 'bg-zinc-200/70 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : justAdded
                  ? 'glass-btn-ink'
                  : 'glass-btn-amber text-white'
            }`}
          >
            {!product.inStock ? (
              <span>Sold Out</span>
            ) : justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add to Bag</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
