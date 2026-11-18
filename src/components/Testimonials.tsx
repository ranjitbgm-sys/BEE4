import { ChangeEvent, FormEvent, useState } from 'react';
import {
  BadgeCheck,
  ImagePlus,
  MessageSquarePlus,
  Reply,
  Star,
  Upload,
  X,
} from 'lucide-react';
import { Lock } from 'lucide-react';
import { uploadReviewPhotoToSupabaseStorage } from '../services/supabaseStoreService';
import { CustomerProfile, OrderRecord, Product, ProductReviewRecord, StorePage, Testimonial } from '../types';
import {
  ProductReviewFormErrors,
  getPublishedHomepageReviews,
  validateProductReviewForm,
} from '../utils/messagesReviewsLogic';
import {
  VERIFIED_DELIVERY_REVIEW_MESSAGE,
  canCustomerReviewProduct,
} from '../utils/reviewsPolicyLogic';

interface TestimonialsProps {
  testimonials: Testimonial[];
  reviews?: ProductReviewRecord[];
  products: Product[];
  orders?: OrderRecord[];
  currentCustomer?: CustomerProfile | null;
  onNavigate?: (page: StorePage) => void;
  onAddTestimonial: (testimonial: Testimonial) => void;
  onSubmitReview?: (review: ProductReviewRecord) => void;
}

const RATING_LEVELS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

export function Testimonials({
  testimonials,
  reviews,
  products,
  orders = [],
  currentCustomer = null,
  onNavigate,
  onAddTestimonial,
  onSubmitReview,
}: TestimonialsProps) {
  const defaultProduct = products[0];

  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [cityOrRole, setCityOrRole] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(defaultProduct?.id ?? '');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState('');
  const [errors, setErrors] = useState<ProductReviewFormErrors>({});
  const [submittedNotice, setSubmittedNotice] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string } | null>(null);

  const publishedReviews: ProductReviewRecord[] = reviews
    ? getPublishedHomepageReviews(reviews)
    : testimonials.map((t) => ({
        id: t.id,
        productId: products.find((p) => p.title === t.productName)?.id ?? 'bee4-general',
        productName: t.productName,
        customerName: t.customerName,
        cityOrRole: t.cityOrRole,
        rating: t.rating,
        comment: t.feedback,
        verifiedBuyer: true,
        featuredOnHomepage: true,
        status: 'Published',
        createdAt: t.createdAt,
        updatedAt: t.createdAt,
      }));

  const count = publishedReviews.length;
  const averageRating =
    count > 0
      ? Math.round((publishedReviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;

  const activeProduct =
    products.find((p) => p.id === selectedProductId) ?? products[0];

  const reviewEligibility = canCustomerReviewProduct(
    orders,
    currentCustomer,
    activeProduct?.id ?? ''
  );

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setUploadStatusMsg('');
    try {
      const uploaded = await uploadReviewPhotoToSupabaseStorage(
        file,
        activeProduct?.id || 'review'
      );
      setPhotoUrl(uploaded.url);
      setUploadStatusMsg(uploaded.note || 'Photo attached');
      if (errors.photoUrl) setErrors((prev) => ({ ...prev, photoUrl: undefined }));
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        photoUrl: err instanceof Error ? err.message : 'Photo upload failed.',
      }));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!reviewEligibility.eligible) return;
    const productObj = activeProduct;
    const targetProductId = productObj?.id ?? selectedProductId ?? 'bee4-general';
    const targetProductName = productObj?.title ?? 'BEE4 Brain-Training Toy';

    const validation = validateProductReviewForm({
      customerName,
      customerContact,
      productId: targetProductId,
      productName: targetProductName,
      rating,
      comment,
      photoUrl,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      setSubmittedNotice(false);
      return;
    }

    const now = new Date().toISOString();
    const cleanName = customerName.trim();
    const cleanComment = comment.trim();
    const cleanCity = cityOrRole.trim();
    const cleanPhoto = photoUrl.trim();

    if (onSubmitReview) {
      const newReview: ProductReviewRecord = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: targetProductId,
        productName: targetProductName,
        customerName: cleanName,
        customerContact: customerContact.trim(),
        cityOrRole: cleanCity || undefined,
        rating,
        comment: cleanComment,
        photoUrl: cleanPhoto || undefined,
        verifiedBuyer: false,
        featuredOnHomepage: false,
        status: 'Pending',
        adminReply: '',
        createdAt: now,
        updatedAt: now,
      };
      onSubmitReview(newReview);
    } else {
      onAddTestimonial({
        id: `test-${Date.now()}`,
        customerName: cleanName,
        cityOrRole: cleanCity || 'Verified Parent',
        productName: targetProductName,
        rating,
        feedback: cleanComment,
        createdAt: now,
      });
    }

    setCustomerName('');
    setCustomerContact('');
    setCityOrRole('');
    setSelectedProductId(defaultProduct?.id ?? '');
    setRating(5);
    setComment('');
    setPhotoUrl('');
    setUploadStatusMsg('');
    setErrors({});
    setSubmittedNotice(true);
  };

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-14 pb-16"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
            Parent &amp; Educator Feedback
          </p>
          <h2
            id="testimonials-heading"
            className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white"
          >
            Trusted by Parents &amp; Educators Worldwide
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl glass-subtle text-sm text-zinc-700 dark:text-zinc-200 tabular-nums">
          <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="font-semibold text-zinc-900 dark:text-white">
            {averageRating.toFixed(1)} / 5
          </span>
          <span className="text-zinc-400" aria-hidden="true">
            ·
          </span>
          <span>
            {count} published {count === 1 ? 'review' : 'reviews'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Published Customer Reviews List */}
        <div className="lg:col-span-7 space-y-4">
          {publishedReviews.length === 0 ? (
            <div className="p-8 rounded-3xl glass-surface text-sm text-zinc-600 dark:text-zinc-300">
              No published reviews yet. Be the first parent to share how your child responded to a
              screen-free BEE4 toy.
            </div>
          ) : (
            publishedReviews.slice(0, 8).map((item) => (
              <article
                key={item.id}
                className="p-5 sm:p-6 rounded-2xl glass-surface transition-all duration-300 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="inline-flex items-center gap-1"
                      aria-label={`${item.rating} out of 5 stars`}
                    >
                      {RATING_LEVELS.map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= item.rating
                              ? 'fill-amber-500 text-amber-500'
                              : 'text-zinc-300 dark:text-zinc-600'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 tabular-nums">
                      {item.rating}.0 / 5
                    </span>
                  </div>

                  {item.verifiedBuyer && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                      <BadgeCheck className="w-3.5 h-3.5" />
                      <span>Verified Buyer</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <p className="flex-1 text-sm sm:text-base text-zinc-800 dark:text-zinc-200 leading-relaxed">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                  {item.photoUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxPhoto({
                          url: item.photoUrl!,
                          caption: `${item.customerName} — ${item.productName}`,
                        })
                      }
                      aria-label={`Zoom review photo by ${item.customerName}`}
                      className="w-20 h-20 rounded-xl overflow-hidden border border-white/60 dark:border-white/15 shrink-0 hover:scale-[1.03] transition-transform"
                    >
                      <img
                        src={item.photoUrl}
                        alt={`Customer photo by ${item.customerName}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  )}
                </div>

                {item.adminReply && item.adminReply.trim().length > 0 && (
                  <div className="p-3.5 rounded-2xl glass-subtle border-l-2 border-amber-500 space-y-1">
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1.5">
                      <Reply className="w-3.5 h-3.5" />
                      <span>Official Reply from Team BEE4</span>
                    </p>
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {item.adminReply}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {item.customerName}
                  </span>
                  {item.cityOrRole && (
                    <>
                      <span className="text-zinc-400" aria-hidden="true">
                        ·
                      </span>
                      <span>{item.cityOrRole}</span>
                    </>
                  )}
                  <span className="text-zinc-400" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium">
                    {item.productName}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>

        {/* Share Product Review Form (Strict Verified Delivery Only) */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="lg:col-span-5 p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
              <MessageSquarePlus
                className="w-4 h-4 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                Share a Product Review
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Verified buyers can rate and review delivered BEE4 kits
              </p>
            </div>
          </div>

          {!reviewEligibility.eligible ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-start gap-2.5 text-slate-700 dark:text-slate-200">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed font-medium">
                  {VERIFIED_DELIVERY_REVIEW_MESSAGE}
                </p>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate(currentCustomer ? 'orders' : 'account')}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-50"
                >
                  {currentCustomer ? 'View My Delivered Orders' : 'Sign In to Check Delivered Orders'}
                </button>
              )}
            </div>
          ) : (
            <>
          {submittedNotice && (
            <div
              role="status"
              className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 font-medium"
            >
              Thank you! Your verified review has been saved.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <div>
              <label
                htmlFor="testimonial-name"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
              >
                Your Name *
              </label>
              <input
                id="testimonial-name"
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) setErrors({ ...errors, customerName: undefined });
                }}
                placeholder="e.g. Kavya Menon"
                className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
              />
              {errors.customerName && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.customerName}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="testimonial-contact"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
              >
                Phone or Email (Private verification) *
              </label>
              <input
                id="testimonial-contact"
                type="text"
                value={customerContact}
                onChange={(e) => {
                  setCustomerContact(e.target.value);
                  if (errors.customerContact) setErrors({ ...errors, customerContact: undefined });
                }}
                placeholder="10-digit WhatsApp or email"
                className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
              />
              {errors.customerContact && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {errors.customerContact}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="testimonial-city"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
              >
                City / Parent Note (Optional)
              </label>
              <input
                id="testimonial-city"
                type="text"
                value={cityOrRole}
                onChange={(e) => setCityOrRole(e.target.value)}
                placeholder="e.g. Mother of 8-yr-old · Pune"
                className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="testimonial-product"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
            >
              Select Product *
            </label>
            <select
              id="testimonial-product"
              value={activeProduct?.id ?? selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl glass-input text-sm focus:outline-none"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1.5">
              Star Rating *
            </span>
            <div className="flex items-center gap-1.5" role="group" aria-label="Select star rating">
              {RATING_LEVELS.map((star) => {
                const selected = star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} out of 5 stars`}
                    aria-pressed={rating === star}
                    className="w-10 h-10 rounded-xl glass-btn-secondary inline-flex items-center justify-center transition-all"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        selected
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-zinc-300 dark:text-zinc-600'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                {rating}.0 / 5
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="testimonial-feedback"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-200 mb-1"
            >
              Your Review *
            </label>
            <textarea
              id="testimonial-feedback"
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (errors.comment) setErrors({ ...errors, comment: undefined });
              }}
              placeholder="Share how your child liked the mechanism, Bio-PLA finish, or screen-free focus..."
              className="w-full p-3 rounded-xl glass-input text-sm focus:outline-none"
            />
            {errors.comment && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.comment}</p>
            )}
          </div>

          {/* Optional Customer Photo Upload or URL */}
          <div className="space-y-2">
            <label
              htmlFor="testimonial-photo-url"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-200"
            >
              Customer Photo (Optional)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="testimonial-photo-url"
                type="url"
                value={photoUrl}
                onChange={(e) => {
                  setPhotoUrl(e.target.value);
                  if (errors.photoUrl) setErrors({ ...errors, photoUrl: undefined });
                }}
                placeholder="Paste image URL or upload →"
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
            {errors.photoUrl && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.photoUrl}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={uploadingPhoto}
            className="w-full h-11 rounded-xl glass-btn-ink text-sm font-semibold transition-all disabled:opacity-60"
          >
            Submit Review
          </button>
          </>
          )}
        </form>
      </div>

      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Customer review photo preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75"
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
