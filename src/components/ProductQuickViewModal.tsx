import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  ShieldCheck,
  Star,
  Truck,
  X,
} from 'lucide-react';
import { AGE_GROUP_META } from '../data/catalog';
import { Product, ProductReviewRecord } from '../types';
import { computeProductRatingStats } from '../utils/messagesReviewsLogic';
import {
  buildWhatsAppUrl,
  formatINR,
  formatWhatsAppSingleProductMessage,
} from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface ProductQuickViewModalProps {
  product: Product | null;
  reviews?: ProductReviewRecord[];
  isWishlisted: boolean;
  whatsappNumber: string;
  onClose: () => void;
  onAddToCart: (product: Product, variant: string, quantity: number, openDrawer: boolean) => void;
  onBuyNow: (product: Product, variant: string, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
  onOpenFullPage: (productId: string) => void;
}

export function ProductQuickViewModal({
  product,
  reviews = [],
  isWishlisted,
  whatsappNumber,
  onClose,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onOpenFullPage,
}: ProductQuickViewModalProps) {
  const [activeAngleIdx, setActiveAngleIdx] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    setActiveAngleIdx(0);
    setSelectedVariant(product.variants[0] ?? 'Standard Edition');
    setQuantity(1);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const ageMeta = AGE_GROUP_META.find((m) => m.ageGroup === product.ageGroup);
  const angles = product.gallery;
  const activeAngle = angles[activeAngleIdx] ?? angles[0];
  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0;
  const activeVariant = selectedVariant || product.variants[0] || 'Standard Edition';
  const whatsAppUrl = buildWhatsAppUrl(
    formatWhatsAppSingleProductMessage(product, activeVariant, quantity),
    whatsappNumber
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view for ${product.title}`}
    >
      <div
        className="fixed inset-0 bg-zinc-950/55 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto glass-drawer rounded-3xl p-5 sm:p-8 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close quick view modal"
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full glass-btn-secondary text-zinc-700 dark:text-zinc-200 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left: 3-Angle Interactive Image Switcher */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/60 dark:bg-slate-900/60 border border-white/70 dark:border-white/15">
              <ProductImage
                src={activeAngle.url}
                alt={`${product.title} — ${activeAngle.label}`}
                objectPosition={activeAngle.objectPosition}
                className="w-full h-full object-cover transition-transform duration-300"
              />
              <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-zinc-950/75 backdrop-blur-md text-[11px] font-semibold text-white">
                {activeAngle.label}
              </span>
            </div>

            {/* 3 Angle Tabs */}
            <div
              className="grid grid-cols-3 gap-2"
              role="tablist"
              aria-label="Select product image angle"
            >
              {angles.map((angle, idx) => {
                const isSelected = idx === activeAngleIdx;
                return (
                  <button
                    key={angle.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    title={angle.label}
                    onClick={() => setActiveAngleIdx(idx)}
                    className={`flex items-center justify-center px-2 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap leading-none transition-all ${
                      isSelected
                        ? 'glass-btn-ink'
                        : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200'
                    }`}
                  >
                    {idx + 1}. {angle.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 rounded-xl glass-subtle">
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Materials
                </p>
                <p className="mt-0.5 text-zinc-800 dark:text-zinc-200 leading-snug">
                  {product.materials}
                </p>
              </div>
              <div className="p-3 rounded-xl glass-subtle">
                <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  Dimensions
                </p>
                <p className="mt-0.5 text-zinc-800 dark:text-zinc-200 leading-snug">
                  {product.dimensions}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Top Badges, Title, Pricing, 3-Part Hindi Persuasion & CTAs */}
          <div className="lg:col-span-6 space-y-4">
            {/* Top Badges: Age Group + Origin Concept */}
            <div className="flex flex-wrap items-center gap-2 pr-8">
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                  ageMeta?.badgeClasses ?? ''
                }`}
              >
                Age {product.ageGroup}
              </span>
              <span className="px-2.5 py-1 rounded-lg glass-subtle text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">
                {product.originConcept}
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                {product.category}
              </span>
            </div>

            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white leading-tight">
                {product.title}
              </h2>

              {(() => {
                const stats = computeProductRatingStats(reviews, product.id, product.title);
                if (stats.reviewCount === 0) return null;
                return (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    <span>{stats.averageRating.toFixed(1)} / 5</span>
                    <span className="text-zinc-400">·</span>
                    <span>
                      {stats.reviewCount} {stats.reviewCount === 1 ? 'review' : 'reviews'}
                    </span>
                  </div>
                );
              })()}

              <div className="mt-2.5 flex items-baseline gap-2.5 tabular-nums">
                <span className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
                  {formatINR(product.price)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <>
                    <span className="text-sm text-zinc-400 line-through">
                      MRP {formatINR(product.compareAtPrice)}
                    </span>
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Save {formatINR(savings)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 3-Part Parent Guide (English) */}
            <div className="space-y-2.5 p-3.5 rounded-2xl glass-subtle text-xs leading-relaxed">
              <div>
                <p className="font-bold text-zinc-900 dark:text-white">
                  How It Works (Play &amp; Mechanism):
                </p>
                <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">{product.useCaseHi}</p>
              </div>
              <div className="pt-2 border-t border-zinc-900/8 dark:border-white/10">
                <p className="font-bold text-zinc-900 dark:text-white">
                  Cognitive Benefits · Ages {product.ageGroup}:
                </p>
                <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                  {product.brainBenefitsHi}
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-900/8 dark:border-white/10">
                <p className="font-bold text-amber-800 dark:text-amber-300">
                  Why Families Choose It:
                </p>
                <p className="mt-0.5 text-zinc-700 dark:text-zinc-300">
                  {product.whyParentsBuyHi}
                </p>
              </div>
            </div>

            {/* Variant & Quantity */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {product.variants.map((variant) => {
                  const active = activeVariant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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

              <div className="inline-flex items-center rounded-xl glass-subtle">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-2 text-zinc-700 dark:text-zinc-200"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-xs font-bold tabular-nums text-zinc-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  aria-label="Increase quantity"
                  className="p-2 text-zinc-700 dark:text-zinc-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => {
                  onAddToCart(product, activeVariant, quantity, true);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl glass-btn-amber disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {product.inStock ? 'Add to Bag' : 'Out of Stock'}
              </button>
              <button
                type="button"
                disabled={!product.inStock}
                onClick={() => {
                  onClose();
                  onBuyNow(product, activeVariant, quantity);
                }}
                className="w-full py-2.5 px-4 rounded-xl glass-btn-ink disabled:opacity-50 text-sm font-semibold transition-all"
              >
                Buy Now · {formatINR(product.price * quantity)}
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleWishlist(product.id)}
                  className="px-3 py-1.5 rounded-xl glass-btn-secondary inline-flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-amber-400 text-amber-400' : ''}`}
                  />
                  <span>{isWishlisted ? 'Saved' : 'Wishlist'}</span>
                </button>
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl glass-btn-secondary inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFullPage(product.id);
                }}
                className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                <span>Open Full Page</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-zinc-900/8 dark:border-white/10 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                Free Shipping ₹499+
              </span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                Razorpay / UPI / COD
              </span>
              <span className="inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-amber-600" />
                Ships to India, US &amp; UK
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
