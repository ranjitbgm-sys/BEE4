import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { Product } from '../types';
import {
  buildWhatsAppUrl,
  formatINR,
  formatWhatsAppSingleProductMessage,
} from '../utils/storeLogic';
import { ProductCard } from './ProductCard';
import { ProductImage } from './ProductImage';

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
  wishlistIds: string[];
  whatsappNumber: string;
  onBackToShop: () => void;
  onSelectProduct: (productId: string) => void;
  onAddToCart: (product: Product, variant: string, quantity: number, openDrawer: boolean) => void;
  onBuyNow: (product: Product, variant: string, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductDetailView({
  product,
  relatedProducts,
  wishlistIds,
  whatsappNumber,
  onBackToShop,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: ProductDetailViewProps) {
  const isWishlisted = wishlistIds.includes(product.id);
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? 'Standard Edition'
  );
  const [quantity, setQuantity] = useState(1);

  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0;

  const whatsAppUrl = buildWhatsAppUrl(
    formatWhatsAppSingleProductMessage(product, selectedVariant, quantity),
    whatsappNumber
  );

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-6 pb-16">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-xs text-zinc-500">
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 hover:text-zinc-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Shop</span>
        </button>
        <span aria-hidden="true">/</span>
        <span>{product.category}</span>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-900 font-medium truncate">{product.title}</span>
      </div>

      {/* Main 2-column PDP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Sticky Gallery Left */}
        <div className="lg:col-span-7 lg:sticky lg:top-28 space-y-4">
          <div className="p-2.5 rounded-3xl glass-surface">
            <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/40 border border-white/60">
              <ProductImage
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="text-xs font-semibold text-zinc-500">
                Materials
              </p>
              <p className="mt-1 text-sm text-zinc-800">{product.materials}</p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="text-xs font-semibold text-zinc-500">
                Dimensions &amp; Size
              </p>
              <p className="mt-1 text-sm text-zinc-800">{product.dimensions}</p>
            </div>
          </div>
        </div>

        {/* Sticky Purchase Module Right */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 glass-surface rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 font-medium">
              <span>{product.category}</span>
              <span aria-hidden="true">·</span>
              <span>{product.occasion}</span>
              <span aria-hidden="true">·</span>
              <span className={product.inStock ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </span>
            </div>

            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-zinc-900 text-balance">
              {product.title}
            </h1>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="font-display text-2xl font-bold text-zinc-900">
                {formatINR(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <>
                  <span className="text-base text-zinc-400 line-through">
                    {formatINR(product.compareAtPrice)}
                  </span>
                  <span className="text-xs font-semibold text-amber-700">
                    Save {formatINR(savings)}
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500">Inclusive of all taxes · Free shipping on ₹499+</p>
          </div>

          <p className="text-sm text-zinc-700 leading-relaxed">{product.description}</p>

          {/* Variant Selector */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 mb-2.5">
              Option: <span className="text-zinc-900">{selectedVariant}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => {
                const active = selectedVariant === variant;
                return (
                  <button
                    key={variant}
                    type="button"
                    onClick={() => setSelectedVariant(variant)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'glass-btn-ink text-white'
                        : 'glass-btn-secondary text-zinc-800'
                    }`}
                  >
                    {variant}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity + CTAs */}
          <div className="space-y-3 pt-2 border-t border-zinc-900/8">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-zinc-600">
                Quantity
              </span>
              <div className="inline-flex items-center rounded-xl glass-subtle">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-2.5 text-zinc-700 hover:text-zinc-900"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold tabular-nums text-zinc-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  aria-label="Increase quantity"
                  className="p-2.5 text-zinc-700 hover:text-zinc-900"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => onAddToCart(product, selectedVariant, quantity, true)}
                className="w-full py-3 px-5 rounded-xl glass-btn-amber disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {product.inStock ? 'Add to Bag' : 'Out of Stock'}
              </button>

              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => onBuyNow(product, selectedVariant, quantity)}
                className="w-full py-3 px-5 rounded-xl glass-btn-ink disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                Buy Now
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-pressed={isWishlisted}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                  isWishlisted
                    ? 'glass-btn-ink text-amber-300'
                    : 'glass-btn-secondary text-zinc-800'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-amber-300' : ''}`} />
                <span>{isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl glass-btn-secondary text-zinc-800 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700" />
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-900/8 space-y-2 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Dispatched within 48 hours · 3–5 day delivery across India</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Cash on Delivery &amp; UPI supported · 7-day damage replacement</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Optional Kraft gift wrap &amp; note card at checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-12 border-t border-white/75">
          <h2 className="font-display text-2xl font-bold text-zinc-900 mb-6">
            You May Also Like
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                isWishlisted={wishlistIds.includes(rel.id)}
                onSelectProduct={onSelectProduct}
                onQuickAdd={(p) => onAddToCart(p, p.variants[0] ?? 'Standard', 1, false)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
