import { ChangeEvent, FormEvent, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Heart,
  ImagePlus,
  MessageCircle,
  MessageSquarePlus,
  Minus,
  Plus,
  Reply,
  ShieldCheck,
  Star,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { AGE_GROUP_META } from '../data/catalog';
import { uploadReviewPhotoToSupabaseStorage } from '../services/supabaseStoreService';
import { Product, ProductReviewRecord } from '../types';
import {
  ProductReviewFormErrors,
  computeProductRatingStats,
  getPublishedReviewsForProduct,
  validateProductReviewForm,
} from '../utils/messagesReviewsLogic';
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
  reviews?: ProductReviewRecord[];
  wishlistIds: string[];
  whatsappNumber: string;
  onBackToShop: () => void;
  onSelectProduct: (productId: string) => void;
  onQuickView?: (product: Product) => void;
  onAddToCart: (product: Product, variant: string, quantity: number, openDrawer: boolean) => void;
  onBuyNow: (product: Product, variant: string, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
  onSubmitReview?: (review: ProductReviewRecord) => void;
}

const RATING_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

export function ProductDetailView({
  product,
  relatedProducts,
  reviews = [],
  wishlistIds,
  whatsappNumber,
  onBackToShop,
  onSelectProduct,
  onQuickView,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onSubmitReview,
}: ProductDetailViewProps) {
  const isWishlisted = wishlistIds.includes(product.id);
  const [selectedVariant, setSelectedVariant] = useState(
    product.variants[0] ?? 'Standard Edition'
  );
  const [quantity, setQuantity] = useState(1);
  const [activeAngleIdx, setActiveAngleIdx] = useState(0);

  // Embedded Review Form state
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerContact, setReviewerContact] = useState('');
  const [reviewerCity, setReviewerCity] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [reviewErrors, setReviewErrors] = useState<ProductReviewFormErrors>({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string } | null>(null);

  const ageMeta = AGE_GROUP_META.find((m) => m.ageGroup === product.ageGroup);
  const angles = product.gallery;
  const activeAngle = angles[activeAngleIdx] ?? angles[0];

  const productReviews = getPublishedReviewsForProduct(reviews, product.id, product.title);
  const ratingStats = computeProductRatingStats(reviews, product.id, product.title);

  const savings =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? product.compareAtPrice - product.price
      : 0;

  const whatsAppUrl = buildWhatsAppUrl(
    formatWhatsAppSingleProductMessage(product, selectedVariant, quantity),
    whatsappNumber
  );

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadStatusMsg('');
    try {
      const uploaded = await uploadReviewPhotoToSupabaseStorage(file, product.id);
      setPhotoUrl(uploaded.url);
      setUploadStatusMsg(
        uploaded.note || 'Photo uploaded to reviews gallery'
      );
      if (reviewErrors.photoUrl) setReviewErrors((prev) => ({ ...prev, photoUrl: undefined }));
    } catch (err) {
      setReviewErrors((prev) => ({
        ...prev,
        photoUrl: err instanceof Error ? err.message : 'Photo upload failed.',
      }));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleReviewSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateProductReviewForm({
      customerName: reviewerName,
      customerContact: reviewerContact,
      productId: product.id,
      productName: product.title,
      rating,
      comment,
      photoUrl,
    });

    if (!validation.valid) {
      setReviewErrors(validation.errors);
      setReviewSubmitted(false);
      return;
    }

    const now = new Date().toISOString();
    const newReview: ProductReviewRecord = {
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: product.id,
      productName: product.title,
      customerName: reviewerName.trim(),
      customerContact: reviewerContact.trim(),
      cityOrRole: reviewerCity.trim() || undefined,
      rating,
      comment: comment.trim(),
      photoUrl: photoUrl.trim() || undefined,
      verifiedBuyer: false,
      featuredOnHomepage: false,
      status: 'Pending',
      adminReply: '',
      createdAt: now,
      updatedAt: now,
    };

    onSubmitReview?.(newReview);
    setReviewerName('');
    setReviewerContact('');
    setReviewerCity('');
    setRating(5);
    setComment('');
    setPhotoUrl('');
    setUploadStatusMsg('');
    setReviewErrors({});
    setReviewSubmitted(true);
  };

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

        {/* Sticky Purchase + Parent Guide Right */}
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

            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <a
                href="#product-reviews-section"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-subtle text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:border-amber-400 transition-colors tabular-nums"
              >
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {ratingStats.reviewCount > 0 ? (
                  <span>
                    {ratingStats.averageRating.toFixed(1)} / 5 ({ratingStats.reviewCount}{' '}
                    {ratingStats.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                ) : (
                  <span>Be the first to review</span>
                )}
              </a>
            </div>

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

      {/* Product Reviews & Ratings Section */}
      <div
        id="product-reviews-section"
        className="mt-16 pt-12 border-t border-white/75 dark:border-white/10 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-amber-700 dark:text-amber-400">
              Verified Reviews &amp; Ratings
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-zinc-900 dark:text-white">
              Customer Reviews for {product.title}
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl glass-subtle text-sm tabular-nums">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span className="font-bold text-zinc-900 dark:text-white">
              {ratingStats.reviewCount > 0 ? ratingStats.averageRating.toFixed(1) : 'New'} / 5
            </span>
            <span className="text-zinc-400">·</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-300">
              {ratingStats.reviewCount}{' '}
              {ratingStats.reviewCount === 1 ? 'published review' : 'published reviews'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Published Reviews for This Product */}
          <div className="lg:col-span-7 space-y-4">
            {productReviews.length === 0 ? (
              <div className="p-8 rounded-3xl glass-surface text-sm text-zinc-600 dark:text-zinc-300">
                No published reviews for this kit yet. Share your child&apos;s reaction using the
                form!
              </div>
            ) : (
              productReviews.map((rev) => (
                <article
                  key={rev.id}
                  className="p-5 rounded-2xl glass-surface space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1">
                      {RATING_LEVELS.map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= rev.rating
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                        />
                      ))}
                      <span className="ml-1.5 text-xs font-bold tabular-nums text-zinc-700 dark:text-zinc-200">
                        {rev.rating}.0
                      </span>
                    </div>

                    {rev.verifiedBuyer && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    <p className="flex-1 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                    {rev.photoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setLightboxPhoto({
                            url: rev.photoUrl!,
                            caption: `${rev.customerName} — ${rev.productName}`,
                          })
                        }
                        className="w-20 h-20 rounded-xl overflow-hidden border border-white/60 dark:border-white/15 shrink-0"
                      >
                        <img
                          src={rev.photoUrl}
                          alt={`Review photo by ${rev.customerName}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </div>

                  {rev.adminReply && rev.adminReply.trim().length > 0 && (
                    <div className="p-3 rounded-2xl glass-subtle border-l-2 border-amber-500 space-y-1">
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
                        <Reply className="w-3.5 h-3.5" />
                        <span>Official Reply from Team BEE4</span>
                      </p>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300">{rev.adminReply}</p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {rev.customerName}
                    </span>
                    {rev.cityOrRole && (
                      <>
                        <span>·</span>
                        <span>{rev.cityOrRole}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="tabular-nums">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>

          {/* Write a Review Form Pre-bound to Product */}
          <form
            onSubmit={handleReviewSubmit}
            noValidate
            className="lg:col-span-5 glass-surface rounded-3xl p-6 space-y-3.5"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full glass-orb flex items-center justify-center shrink-0">
                <MessageSquarePlus className="w-4 h-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-zinc-900 dark:text-white">
                  Write a Review
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[260px]">
                  {product.title}
                </p>
              </div>
            </div>

            {reviewSubmitted && (
              <div
                role="status"
                className="p-3 rounded-xl bg-emerald-50/85 dark:bg-emerald-950/70 border border-emerald-200/80 dark:border-emerald-500/30 text-xs font-medium text-emerald-800 dark:text-emerald-200"
              >
                Dhanyavaad! Your review is pending Team BEE4 approval and will be published shortly.
              </div>
            )}

            <div>
              <label
                htmlFor="pdp-review-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
              >
                Customer Name *
              </label>
              <input
                id="pdp-review-name"
                type="text"
                value={reviewerName}
                onChange={(e) => {
                  setReviewerName(e.target.value);
                  if (reviewErrors.customerName)
                    setReviewErrors({ ...reviewErrors, customerName: undefined });
                }}
                placeholder="e.g. Rohan Deshmukh"
                className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
              />
              {reviewErrors.customerName && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {reviewErrors.customerName}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pdp-review-contact"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
                >
                  Phone or Email *
                </label>
                <input
                  id="pdp-review-contact"
                  type="text"
                  value={reviewerContact}
                  onChange={(e) => {
                    setReviewerContact(e.target.value);
                    if (reviewErrors.customerContact)
                      setReviewErrors({ ...reviewErrors, customerContact: undefined });
                  }}
                  placeholder="98... or email"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
                />
                {reviewErrors.customerContact && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {reviewErrors.customerContact}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pdp-review-city"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
                >
                  City / Child&apos;s Age
                </label>
                <input
                  id="pdp-review-city"
                  type="text"
                  value={reviewerCity}
                  onChange={(e) => setReviewerCity(e.target.value)}
                  placeholder="e.g. Pune · Age 9"
                  className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1.5">
                Star Rating *
              </span>
              <div className="flex items-center gap-1.5">
                {RATING_LEVELS.map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5 stars`}
                    className="w-9 h-9 rounded-xl glass-btn-secondary inline-flex items-center justify-center"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= rating
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                  {rating}.0 / 5
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="pdp-review-comment"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
              >
                Review Comment *
              </label>
              <textarea
                id="pdp-review-comment"
                rows={3}
                value={comment}
                onChange={(e) => {
                  setComment(e.target.value);
                  if (reviewErrors.comment)
                    setReviewErrors({ ...reviewErrors, comment: undefined });
                }}
                placeholder="Tell fellow parents about build quality, play hours, or learning benefits..."
                className="w-full p-3 rounded-xl glass-input text-sm focus:outline-none"
              />
              {reviewErrors.comment && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {reviewErrors.comment}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="pdp-review-photo"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-200"
              >
                Upload Photo (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="pdp-review-photo"
                  type="url"
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    if (reviewErrors.photoUrl)
                      setReviewErrors({ ...reviewErrors, photoUrl: undefined });
                  }}
                  placeholder="Paste URL or upload"
                  className="flex-1 h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
                <label className="h-10 px-3 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                </label>
              </div>
              {uploadStatusMsg && (
                <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                  <ImagePlus className="w-3 h-3" />
                  <span>{uploadStatusMsg}</span>
                </p>
              )}
              {reviewErrors.photoUrl && (
                <p className="text-xs text-red-600 dark:text-red-400">{reviewErrors.photoUrl}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={uploadingPhoto}
              className="w-full h-11 rounded-xl glass-btn-ink text-sm font-semibold transition-all disabled:opacity-60"
            >
              Submit Product Review
            </button>
          </form>
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
                reviews={reviews}
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

      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customer review photo preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-md"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full glass-drawer rounded-3xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                {lightboxPhoto.caption}
              </p>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                aria-label="Close photo preview"
                className="p-1.5 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption}
              className="w-full max-h-[70vh] object-contain rounded-2xl bg-black/10"
            />
          </div>
        </div>
      )}
    </section>
  );
}
