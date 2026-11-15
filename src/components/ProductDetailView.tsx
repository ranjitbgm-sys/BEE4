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
import { AGE_GROUP_META } from '../data/catalog';
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
  onQuickView?: (product: Product) => void;
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
  onQuickView,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
}: ProductDetailViewProps) {
  const isWishlisted = wishlistIds.includes(product.id);
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? 'Standard Edition'
  );
  const [quantity, setQuantity] = useState(1);
  const [activeAngleIdx, setActiveAngleIdx] = useState(0);

  const ageMeta = AGE_GROUP_META.find((m) => m.ageGroup === product.ageGroup);
  const angles = product.gallery;
  const activeAngle = angles[activeAngleIdx] ?? angles[0];

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
      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </button>
        <span aria-hidden="true">/</span>
        <span>{product.ageGroup}</span>
        <span aria-hidden="true">/</span>
        <span>{product.category}</span>
        <span aria-hidden="true">/</span>
        <span className="text-zinc-900 dark:text-white font-medium truncate">{product.title}</span>
      </div>

      {/* Main 2-column PDP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Sticky 3-Angle Gallery Left */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-4">
          <div className="p-2.5 rounded-3xl glass-surface">
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/40 dark:bg-slate-900/60 border border-white/60 dark:border-white/15">
              <ProductImage
                src={activeAngle.url}
                alt={`${product.title} — ${activeAngle.label}`}
                objectPosition={activeAngle.objectPosition}
                className="w-full h-full object-cover transition-transform duration-300"
              />
              <span className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-zinc-950/75 backdrop-blur-md text-xs font-semibold text-white">
                {activeAngle.label}
              </span>
            </div>

            <div
              className="mt-2.5 grid grid-cols-3 gap-2"
              role="tablist"
              aria-label="Product angle selector"
            >
              {angles.map((angle, idx) => {
                const selected = idx === activeAngleIdx;
                return (
                  <button
                    key={angle.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveAngleIdx(idx)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      selected
                        ? 'glass-btn-ink'
                        : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    {idx + 1}. {angle.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                3D-Print Material
              </p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{product.materials}</p>
            </div>
            <div className="p-4 rounded-2xl glass-subtle">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                Dimensions &amp; Scale
              </p>
              <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">{product.dimensions}</p>
            </div>
          </div>
        </div>

        {/* Sticky Purchase + 3-Part Hindi Persuasion Right */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 glass-surface rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${
                  ageMeta?.badgeClasses ?? ''
                }`}
              >
                Age {product.ageGroup}
              </span>
              <span className="px-2.5 py-1 rounded-lg glass-subtle text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                {product.originConcept}
              </span>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {product.category}
              </span>
              <span
                className={`text-xs font-semibold ${
                  product.inStock
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                · {product.inStock ? 'In Stock (3D-Printed Bio-PLA)' : 'Out of Stock'}
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white text-balance">
              {product.title}
            </h1>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                {formatINR(product.price)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <>
                  <span className="text-base text-zinc-400 line-through">
                    MRP {formatINR(product.compareAtPrice)}
                  </span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Save {formatINR(savings)}
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Inclusive of taxes · Worldwide dispatch (India, US &amp; UK) · Zero batteries required
            </p>
          </div>

          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {product.description}
          </p>

          {/* 3-Part Parent Guide (English) */}
          <div className="p-4 rounded-2xl glass-subtle space-y-3 text-xs sm:text-sm leading-relaxed">
            <div>
              <p className="font-bold text-zinc-900 dark:text-white">
                How It Works (Play &amp; Mechanism):
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{product.useCaseHi}</p>
            </div>
            <div className="pt-2.5 border-t border-zinc-900/8 dark:border-white/10">
              <p className="font-bold text-zinc-900 dark:text-white">
                Cognitive Benefits · Ages {product.ageGroup}:
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{product.brainBenefitsHi}</p>
            </div>
            <div className="pt-2.5 border-t border-zinc-900/8 dark:border-white/10">
              <p className="font-bold text-amber-800 dark:text-amber-300">
                Why Families Choose It:
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">{product.whyParentsBuyHi}</p>
            </div>
          </div>

          {/* Variant Selector */}
          <div>
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mb-2">
              Finish Option: <span className="text-zinc-900 dark:text-white">{selectedVariant}</span>
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
                        ? 'glass-btn-ink'
                        : 'glass-btn-secondary text-zinc-800 dark:text-zinc-200'
                    }`}
                  >
                    {variant}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity + CTAs */}
          <div className="space-y-3 pt-2 border-t border-zinc-900/8 dark:border-white/10">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Quantity
              </span>
              <div className="inline-flex items-center rounded-xl glass-subtle">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-2.5 text-zinc-700 dark:text-zinc-200"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  aria-label="Increase quantity"
                  className="p-2.5 text-zinc-700 dark:text-zinc-200"
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
                className="w-full py-3 px-5 rounded-xl glass-btn-ink disabled:opacity-50 text-sm font-semibold transition-all"
              >
                Buy Now · {formatINR(product.price * quantity)}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-pressed={isWishlisted}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                  isWishlisted
                    ? 'glass-btn-ink text-amber-300 dark:text-zinc-950'
                    : 'glass-btn-secondary text-zinc-800 dark:text-zinc-200'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isWishlisted ? 'fill-amber-300 dark:fill-zinc-950' : ''}`}
                />
                <span>{isWishlisted ? 'Saved in Wishlist' : 'Save to Wishlist'}</span>
              </button>

              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl glass-btn-secondary text-zinc-800 dark:text-zinc-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Order on WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-900/8 dark:border-white/10 space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Dispatched within 48 hours · Worldwide shipping (India, US &amp; UK)</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Razorpay, UPI &amp; Cash on Delivery · 7-day damage replacement</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Optional Kraft gift wrap &amp; note card at checkout</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-12 border-t border-white/75 dark:border-white/10">
          <h2 className="font-display text-2xl font-bold text-zinc-900 dark:text-white mb-6">
            More Brain Toys for {product.ageGroup} &amp; {product.category}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                isWishlisted={wishlistIds.includes(rel.id)}
                onSelectProduct={onSelectProduct}
                onQuickView={onQuickView}
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
