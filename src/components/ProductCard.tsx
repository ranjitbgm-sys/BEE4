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
    <article className="group flex flex-col bg-white border border-[#E6E4DD] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-[#F7F6F2] overflow-hidden">
        <button
          type="button"
          onClick={() => onSelectProduct(product.id)}
          aria-label={`View details for ${product.title}`}
          className="w-full h-full text-left block"
        >
          <ProductImage
            src={product.image}
            alt={product.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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
            className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
              isWishlisted
                ? 'bg-zinc-900 border-zinc-900 text-amber-400'
                : 'bg-white/95 border-[#E6E4DD] text-zinc-700 hover:border-zinc-900 hover:text-zinc-900'
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
            <h3 className="font-display text-base font-semibold text-zinc-900 group-hover:text-amber-700 transition-colors line-clamp-1">
              {product.title}
            </h3>
          </button>

          <p className="mt-1 text-xs text-zinc-500 line-clamp-1">{product.shortSpec}</p>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#F0EFEA]">
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
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              !product.inStock
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                : justAdded
                  ? 'bg-zinc-900 text-white'
                  : 'bg-[#F7F6F2] text-zinc-900 hover:bg-amber-600 hover:text-white'
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
