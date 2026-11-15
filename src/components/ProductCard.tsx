import { useState } from 'react';
import { Check, Heart, Plus } from 'lucide-react';
import { Product } from '../types';
import { formatINR } from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  isWishlisted?: boolean;
  onSelectProduct: (productId: string) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist?: (productId: string) => void;
}

export function ProductCard({
  product,
  isWishlisted = false,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);

  const handleQuickAdd = () => {
    if (!product.inStock) return;
    onQuickAdd(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <article className="group flex flex-col glass-surface rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/68 hover:shadow-[0_18px_40px_-16px_rgba(24,24,27,0.14)]">
      <div className="relative aspect-[4/3] w-full bg-white/40 overflow-hidden border-b border-white/60">
        <button
          type="button"
          onClick={() => onSelectProduct(product.id)}
          aria-label={`View details for ${product.title}`}
          className="w-full h-full text-left block"
        >
          <ProductImage
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.015]"
          />
        </button>

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
            className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
              isWishlisted
                ? 'glass-btn-ink text-amber-400'
                : 'glass-orb text-zinc-700 hover:text-zinc-900 hover:bg-white/80'
            }`}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-amber-400' : ''}`} />
          </button>
        )}
      </div>

      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <span>{product.category}</span>
            {product.tag && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-semibold">{product.tag}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectProduct(product.id)}
            className="mt-1.5 text-left block w-full"
          >
            <h3 className="font-display text-base font-semibold text-zinc-900 group-hover:text-amber-800 transition-colors duration-300 line-clamp-1">
              {product.title}
            </h3>
          </button>

          <p className="mt-1 text-xs text-zinc-600 line-clamp-1">{product.shortSpec}</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-zinc-900/8">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-[15px] font-bold text-zinc-900">{formatINR(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-zinc-400 line-through">
                {formatINR(product.compareAtPrice)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={handleQuickAdd}
            aria-label={`Add ${product.title} to bag`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 whitespace-nowrap shrink-0 ${
              !product.inStock
                ? 'bg-zinc-200/70 text-zinc-400 cursor-not-allowed'
                : justAdded
                  ? 'glass-btn-ink text-white'
                  : 'glass-btn-secondary text-zinc-900 hover:bg-amber-50/85 hover:text-amber-800 hover:border-amber-200/90'
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
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
