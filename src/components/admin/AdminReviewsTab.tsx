import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Edit3,
  Eye,
  EyeOff,
  Home,
  Plus,
  Reply,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { uploadReviewPhotoToSupabaseStorage } from '../../services/supabaseStoreService';
import type { Product, ProductReviewRecord, ProductReviewStatus } from '../../types';
import {
  PRODUCT_REVIEW_STATUSES,
  computeReviewManagerKpis,
} from '../../utils/messagesReviewsLogic';

interface AdminReviewsTabProps {
  reviews: ProductReviewRecord[];
  products: Product[];
  onSaveReview: (review: ProductReviewRecord, isNew?: boolean) => void;
  onDeleteReview: (id: string) => void;
}

const STARS: (1 | 2 | 3 | 4 | 5)[] = [1, 2, 3, 4, 5];

function reviewStatusBadgeClass(status: ProductReviewStatus): string {
  switch (status) {
    case 'Published':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
    case 'Pending':
      return 'bg-amber-500/18 text-amber-800 dark:text-amber-300 border-amber-500/35';
    case 'Hidden':
      return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/25';
  }
}

export function AdminReviewsTab({
  reviews,
  products,
  onSaveReview,
  onDeleteReview,
}: AdminReviewsTabProps) {
  const [revSearch, setRevSearch] = useState('');
  const [revStarFilter, setRevStarFilter] = useState<'All' | '5' | '4' | '3' | 'low'>('All');
  const [revProductFilter, setRevProductFilter] = useState<string>('All');
  const [revStatusFilter, setRevStatusFilter] = useState<'All' | ProductReviewStatus>('All');
  const [confirmDeleteRevId, setConfirmDeleteRevId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string } | null>(null);

  // Add / Edit Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [revDraftCustomerName, setRevDraftCustomerName] = useState('');
  const [revDraftContact, setRevDraftContact] = useState('');
  const [revDraftCity, setRevDraftCity] = useState('');
  const [revDraftProductId, setRevDraftProductId] = useState(products[0]?.id ?? '');
  const [revDraftRating, setRevDraftRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [revDraftComment, setRevDraftComment] = useState('');
  const [revDraftPhotoUrl, setRevDraftPhotoUrl] = useState('');
  const [revDraftVerified, setRevDraftVerified] = useState(true);
  const [revDraftFeatured, setRevDraftFeatured] = useState(false);
  const [revDraftStatus, setRevDraftStatus] = useState<ProductReviewStatus>('Published');
  const [revDraftAdminReply, setRevDraftAdminReply] = useState('');
  const [revDraftError, setRevDraftError] = useState('');
  const [revUploadingPhoto, setRevUploadingPhoto] = useState(false);

  const revKpis = useMemo(() => computeReviewManagerKpis(reviews), [reviews]);

  const filteredReviews = useMemo(() => {
    const q = revSearch.trim().toLowerCase();
    return reviews
      .filter((r) => {
        if (revStatusFilter !== 'All' && r.status !== revStatusFilter) return false;
        if (revProductFilter !== 'All' && r.productId !== revProductFilter) return false;
        if (revStarFilter === '5' && r.rating !== 5) return false;
        if (revStarFilter === '4' && r.rating !== 4) return false;
        if (revStarFilter === '3' && r.rating !== 3) return false;
        if (revStarFilter === 'low' && r.rating > 2) return false;
        if (q) {
          const hay = [r.customerName, r.productName, r.comment, r.cityOrRole || '', r.adminReply || '']
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [reviews, revSearch, revStarFilter, revProductFilter, revStatusFilter]);

  const openAddManualReviewModal = () => {
    setEditingReviewId(null);
    setRevDraftCustomerName('');
    setRevDraftContact('');
    setRevDraftCity('');
    setRevDraftProductId(products[0]?.id ?? '');
    setRevDraftRating(5);
    setRevDraftComment('');
    setRevDraftPhotoUrl('');
    setRevDraftVerified(true);
    setRevDraftFeatured(false);
    setRevDraftStatus('Published');
    setRevDraftAdminReply('');
    setRevDraftError('');
    setReviewModalOpen(true);
  };

  const openEditReviewModal = (rev: ProductReviewRecord) => {
    setEditingReviewId(rev.id);
    setRevDraftCustomerName(rev.customerName);
    setRevDraftContact(rev.customerContact ?? '');
    setRevDraftCity(rev.cityOrRole ?? '');
    setRevDraftProductId(rev.productId || products[0]?.id || '');
    setRevDraftRating(rev.rating);
    setRevDraftComment(rev.comment);
    setRevDraftPhotoUrl(rev.photoUrl ?? '');
    setRevDraftVerified(rev.verifiedBuyer);
    setRevDraftFeatured(rev.featuredOnHomepage);
    setRevDraftStatus(rev.status);
    setRevDraftAdminReply(rev.adminReply ?? '');
    setRevDraftError('');
    setReviewModalOpen(true);
  };

  const handleModalPhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRevUploadingPhoto(true);
    setRevDraftError('');
    try {
      const uploaded = await uploadReviewPhotoToSupabaseStorage(
        file,
        revDraftProductId || 'admin-review'
      );
      setRevDraftPhotoUrl(uploaded.url);
    } catch (err) {
      setRevDraftError(err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setRevUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSaveReviewModal = (e: FormEvent) => {
    e.preventDefault();
    if (revDraftCustomerName.trim().length < 2) {
      setRevDraftError('Customer Name must be at least 2 characters.');
      return;
    }
    if (revDraftComment.trim().length < 5) {
      setRevDraftError('Review comment must be at least 5 characters.');
      return;
    }

    const matchedProd = products.find((p) => p.id === revDraftProductId);
    const existing = editingReviewId ? reviews.find((r) => r.id === editingReviewId) : undefined;
    const now = new Date().toISOString();

    const record: ProductReviewRecord = {
      id: existing?.id ?? `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: matchedProd?.id ?? revDraftProductId ?? 'bee4-general',
      productName: matchedProd?.title ?? existing?.productName ?? 'BEE4 Brain-Training Toy',
      customerName: revDraftCustomerName.trim(),
      customerContact: revDraftContact.trim() || undefined,
      cityOrRole: revDraftCity.trim() || undefined,
      rating: revDraftRating,
      comment: revDraftComment.trim(),
      photoUrl: revDraftPhotoUrl.trim() || undefined,
      verifiedBuyer: revDraftVerified,
      featuredOnHomepage: revDraftFeatured,
      status: revDraftStatus,
      adminReply: revDraftAdminReply.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    onSaveReview(record, !existing);
    setReviewModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header Row with Add Manual Review CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Moderate verified-delivery ratings, publish reviews, pin homepage testimonials &amp; add
            official BEE4 replies.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddManualReviewModal}
          className="px-4 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Manual Review</span>
        </button>
      </div>

      {/* 4 Review KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Overall Store Avg Rating
          </p>
          <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums inline-flex items-center gap-1.5">
            <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            <span>{revKpis.averageRating.toFixed(1)}</span>
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Across {revKpis.publishedCount} published
          </p>
        </div>

        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Total Product Reviews
          </p>
          <p className="font-display text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
            {revKpis.totalReviews}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">All statuses</p>
        </div>

        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Pending Approval
          </p>
          <p className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
            {revKpis.pendingCount}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Awaiting moderation</p>
        </div>

        <div className="glass-surface rounded-2xl p-4 space-y-1">
          <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Featured Homepage Reviews
          </p>
          <p className="font-display text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {revKpis.featuredCount}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Pinned on storefront</p>
        </div>
      </div>

      {/* Review Filters */}
      <div className="glass-surface rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={revSearch}
            onChange={(e) => setRevSearch(e.target.value)}
            placeholder="Search reviewer, product, or feedback text..."
            className="w-full h-10 pl-10 pr-3 rounded-xl glass-input text-xs focus:outline-none"
          />
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter reviews by star rating"
            value={revStarFilter}
            onChange={(e) =>
              setRevStarFilter(e.target.value as 'All' | '5' | '4' | '3' | 'low')
            }
            className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
          >
            <option value="All">Stars: All</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="low">1–2 Stars</option>
          </select>
        </div>

        <div className="lg:col-span-4">
          <select
            aria-label="Filter reviews by product"
            value={revProductFilter}
            onChange={(e) => setRevProductFilter(e.target.value)}
            className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
          >
            <option value="All">Product: All BEE4 Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <select
            aria-label="Filter reviews by status"
            value={revStatusFilter}
            onChange={(e) =>
              setRevStatusFilter(e.target.value as 'All' | ProductReviewStatus)
            }
            className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
          >
            <option value="All">Status: All</option>
            {PRODUCT_REVIEW_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reviews Grid */}
      {filteredReviews.length === 0 ? (
        <div className="glass-surface rounded-2xl p-10 text-center text-sm text-zinc-600 dark:text-zinc-300">
          {reviews.length === 0
            ? '0 product reviews submitted yet. Verified-delivery customer reviews on bee4.in appear here for moderation.'
            : 'No reviews match your current filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredReviews.map((rev) => (
            <article key={rev.id} className="glass-surface rounded-2xl p-5 space-y-3.5 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold text-zinc-900 dark:text-white">
                      {rev.customerName}
                    </span>
                    {rev.verifiedBuyer && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        <BadgeCheck className="w-3 h-3" />
                        <span>Verified Buyer</span>
                      </span>
                    )}
                    {rev.featuredOnHomepage && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/12 border border-indigo-500/25 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                        <Home className="w-3 h-3" />
                        <span>Homepage Featured</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                    {rev.productName}
                  </p>
                  {(rev.cityOrRole || rev.customerContact) && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {[rev.cityOrRole, rev.customerContact].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${reviewStatusBadgeClass(
                      rev.status
                    )}`}
                  >
                    {rev.status}
                  </span>
                  <div className="inline-flex items-center gap-0.5">
                    {STARS.map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${
                          s <= rev.rating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <p className="flex-1 text-zinc-800 dark:text-zinc-200 leading-relaxed text-xs sm:text-sm">
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
                    className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 shrink-0"
                  >
                    <img
                      src={rev.photoUrl}
                      alt={`Review attachment by ${rev.customerName}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
              </div>

              {rev.adminReply && (
                <div className="p-3 rounded-xl glass-subtle border-l-2 border-amber-500 space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                    <Reply className="w-3 h-3" />
                    <span>Official Reply from Team BEE4</span>
                  </p>
                  <p className="text-zinc-700 dark:text-zinc-300">{rev.adminReply}</p>
                </div>
              )}

              <div className="pt-2.5 border-t border-zinc-900/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {rev.status !== 'Published' ? (
                    <button
                      type="button"
                      onClick={() =>
                        onSaveReview({
                          ...rev,
                          status: 'Published',
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl glass-btn-amber text-white text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Approve &amp; Publish</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        onSaveReview({
                          ...rev,
                          status: 'Hidden',
                          updatedAt: new Date().toISOString(),
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Hide</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onSaveReview({
                        ...rev,
                        featuredOnHomepage: !rev.featuredOnHomepage,
                        updatedAt: new Date().toISOString(),
                      })
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1 ${
                      rev.featuredOnHomepage ? 'glass-btn-ink' : 'glass-btn-secondary'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{rev.featuredOnHomepage ? 'Featured' : 'Feature'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditReviewModal(rev)}
                    className="px-2.5 py-1.5 rounded-xl glass-btn-secondary text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit / Reply</span>
                  </button>
                </div>

                {confirmDeleteRevId === rev.id ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteReview(rev.id);
                        setConfirmDeleteRevId(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white text-[11px] font-semibold"
                    >
                      Confirm Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRevId(null)}
                      className="px-2 py-1.5 rounded-xl glass-btn-secondary text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRevId(rev.id)}
                    aria-label={`Delete review by ${rev.customerName}`}
                    className="p-1.5 rounded-xl glass-btn-secondary text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ADD / EDIT PRODUCT REVIEW MODAL */}
      {reviewModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingReviewId ? 'Edit product review' : 'Add manual product review'}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 overflow-y-auto"
          onClick={() => setReviewModalOpen(false)}
        >
          <form
            onSubmit={handleSaveReviewModal}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass-drawer rounded-2xl p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b border-zinc-900/10 dark:border-white/10 pb-3">
              <h2 className="font-display text-lg font-bold text-zinc-900 dark:text-white">
                {editingReviewId ? 'Edit Product Review & Reply' : 'Add Manual Product Review'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                aria-label="Close review modal"
                className="p-2 rounded-xl glass-btn-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {revDraftError && (
              <div className="p-3 rounded-xl bg-red-500/12 border border-red-500/30 text-xs text-red-700 dark:text-red-300 font-medium">
                {revDraftError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="admin-rev-name" className="block text-xs font-semibold mb-1">
                  Customer Name *
                </label>
                <input
                  id="admin-rev-name"
                  type="text"
                  value={revDraftCustomerName}
                  onChange={(e) => setRevDraftCustomerName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-rev-contact" className="block text-xs font-semibold mb-1">
                  Phone / Email
                </label>
                <input
                  id="admin-rev-contact"
                  type="text"
                  value={revDraftContact}
                  onChange={(e) => setRevDraftContact(e.target.value)}
                  placeholder="98... or email"
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-rev-city" className="block text-xs font-semibold mb-1">
                  City / Parent Note
                </label>
                <input
                  id="admin-rev-city"
                  type="text"
                  value={revDraftCity}
                  onChange={(e) => setRevDraftCity(e.target.value)}
                  placeholder="e.g. Verified Buyer · Patna"
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="admin-rev-product" className="block text-xs font-semibold mb-1">
                  Product *
                </label>
                <select
                  id="admin-rev-product"
                  value={revDraftProductId}
                  onChange={(e) => setRevDraftProductId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-center">
              <div>
                <span className="block text-xs font-semibold mb-1">Star Rating *</span>
                <div className="flex items-center gap-1.5">
                  {STARS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRevDraftRating(s)}
                      className="w-9 h-9 rounded-xl glass-btn-secondary inline-flex items-center justify-center"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          s <= revDraftRating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-zinc-300 dark:text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-1.5 text-xs font-bold tabular-nums">{revDraftRating}.0</span>
                </div>
              </div>

              <div>
                <label htmlFor="admin-rev-status" className="block text-xs font-semibold mb-1">
                  Moderation Status
                </label>
                <select
                  id="admin-rev-status"
                  value={revDraftStatus}
                  onChange={(e) => setRevDraftStatus(e.target.value as ProductReviewStatus)}
                  className="w-full h-10 px-3 rounded-xl glass-input text-xs font-semibold focus:outline-none"
                >
                  {PRODUCT_REVIEW_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="admin-rev-comment" className="block text-xs font-semibold mb-1">
                Review Text *
              </label>
              <textarea
                id="admin-rev-comment"
                rows={3}
                value={revDraftComment}
                onChange={(e) => setRevDraftComment(e.target.value)}
                className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-rev-photo" className="block text-xs font-semibold mb-1">
                Review Photo URL (or upload image)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="admin-rev-photo"
                  type="url"
                  value={revDraftPhotoUrl}
                  onChange={(e) => setRevDraftPhotoUrl(e.target.value)}
                  placeholder="https://... or upload image"
                  className="flex-1 h-10 px-3 rounded-xl glass-input text-xs focus:outline-none"
                />
                <label className="h-10 px-3 rounded-xl glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{revUploadingPhoto ? 'Uploading...' : 'Upload'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={revUploadingPhoto}
                    onChange={handleModalPhotoUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="admin-rev-reply" className="block text-xs font-semibold mb-1">
                Official Reply from Team BEE4 (Shown publicly below review)
              </label>
              <textarea
                id="admin-rev-reply"
                rows={2}
                value={revDraftAdminReply}
                onChange={(e) => setRevDraftAdminReply(e.target.value)}
                placeholder="Thank you for choosing BEE4..."
                className="w-full p-3 rounded-xl glass-input text-xs leading-relaxed focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-6 text-xs font-semibold pt-1">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={revDraftVerified}
                  onChange={(e) => setRevDraftVerified(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Verified Buyer Badge</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={revDraftFeatured}
                  onChange={(e) => setRevDraftFeatured(e.target.checked)}
                  className="w-4 h-4 accent-amber-600"
                />
                <span>Featured on Homepage</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={revUploadingPhoto}
                className="px-5 py-2 rounded-xl glass-btn-amber text-white text-xs font-semibold"
              >
                {editingReviewId ? 'Save Review Updates' : 'Publish Manual Review'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Review photo preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-xl w-full glass-drawer rounded-2xl p-4 space-y-3"
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
              className="w-full max-h-[70vh] object-contain rounded-xl bg-black/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
