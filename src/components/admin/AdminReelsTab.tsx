import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Film,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Product, ViralReelRecord } from '../../types';
import { uploadReelVideoToSupabaseStorage } from '../../services/supabaseStoreService';
import { formatINR } from '../../utils/storeLogic';

interface AdminReelsTabProps {
  reels: ViralReelRecord[];
  products: Product[];
  onSaveReel: (reel: ViralReelRecord) => void;
  onDeleteReel: (id: string) => void;
}

export function AdminReelsTab({
  reels,
  products,
  onSaveReel,
  onDeleteReel,
}: AdminReelsTabProps) {
  const [editing, setEditing] = useState<ViralReelRecord | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [videoUrlDraft, setVideoUrlDraft] = useState('');
  const [posterUrlDraft, setPosterUrlDraft] = useState('');
  const [productIdDraft, setProductIdDraft] = useState(products[0]?.id ?? '');
  const [displayOrderDraft, setDisplayOrderDraft] = useState('1');
  const [isActiveDraft, setIsActiveDraft] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [formError, setFormError] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');

  const sortedReels = useMemo(
    () => [...reels].sort((a, b) => a.displayOrder - b.displayOrder),
    [reels]
  );

  const openNewReelModal = () => {
    const nextOrder = sortedReels.length + 1;
    setEditing({
      id: `reel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '',
      videoUrl: '',
      posterUrl: '',
      productId: products[0]?.id ?? '',
      displayOrder: nextOrder,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setTitleDraft('');
    setVideoUrlDraft('');
    setPosterUrlDraft('');
    setProductIdDraft(products[0]?.id ?? '');
    setDisplayOrderDraft(String(nextOrder));
    setIsActiveDraft(true);
    setFormError('');
    setUploadStatus('');
  };

  const openEditReelModal = (reel: ViralReelRecord) => {
    setEditing(reel);
    setTitleDraft(reel.title);
    setVideoUrlDraft(reel.videoUrl);
    setPosterUrlDraft(reel.posterUrl ?? '');
    setProductIdDraft(reel.productId);
    setDisplayOrderDraft(String(reel.displayOrder));
    setIsActiveDraft(reel.active);
    setFormError('');
    setUploadStatus('');
  };

  const handleVideoFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setFormError('');
    setUploadStatus('');
    setUploadingVideo(true);
    try {
      const res = await uploadReelVideoToSupabaseStorage(file, editing.id);
      setVideoUrlDraft(res.url);
      setUploadStatus(
        res.storageMode === 'supabase'
          ? 'Video uploaded to BEE4 cloud storage.'
          : res.note || 'Video prepared.'
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not upload video.');
    } finally {
      setUploadingVideo(false);
      e.target.value = '';
    }
  };

  const handleSaveSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError('');

    const cleanTitle = titleDraft.trim();
    const cleanVideo = videoUrlDraft.trim();
    if (cleanTitle.length < 2) {
      setFormError('Enter a crisp reel title (at least 2 characters).');
      return;
    }
    if (!cleanVideo) {
      setFormError('Upload an MP4/WebM video or paste a direct video URL.');
      return;
    }
    if (!productIdDraft) {
      setFormError('Select a linked BEE4 product for the "Shop This Product" CTA.');
      return;
    }

    onSaveReel({
      ...editing,
      title: cleanTitle,
      videoUrl: cleanVideo,
      posterUrl: posterUrlDraft.trim() || undefined,
      productId: productIdDraft,
      displayOrder: Math.max(1, Math.round(Number(displayOrderDraft) || 1)),
      active: isActiveDraft,
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
  };

  const handleMoveOrder = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= sortedReels.length) return;
    const current = sortedReels[idx];
    const swap = sortedReels[targetIdx];
    onSaveReel({ ...current, displayOrder: swap.displayOrder });
    onSaveReel({ ...swap, displayOrder: current.displayOrder });
  };

  return (
    <div className="space-y-6">
      <div className="glass-surface rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center">
            <Film className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Product Viral Reels Manager ({sortedReels.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Publish 9:16 short product showcase videos with direct &ldquo;Shop This Product&rdquo; CTAs
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewReelModal}
          className="px-4 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Viral Reel</span>
        </button>
      </div>

      {sortedReels.length === 0 ? (
        <div className="glass-surface rounded-2xl p-10 text-center space-y-3">
          <Film className="w-9 h-9 mx-auto text-amber-600" />
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
            No Viral Reels added yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
            Upload your first vertical 3D-printing / unboxing video clip or paste an MP4 link and tag
            a BEE4 product.
          </p>
          <button
            type="button"
            onClick={openNewReelModal}
            className="px-5 py-2.5 rounded-xl glass-btn-amber text-white text-xs font-semibold"
          >
            + Upload First Reel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedReels.map((reel, idx) => {
            const linkedProduct = products.find((p) => p.id === reel.productId);
            return (
              <div
                key={reel.id}
                className="glass-surface rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[9/14] bg-slate-950 overflow-hidden">
                  <video
                    src={reel.videoUrl}
                    poster={reel.posterUrl || linkedProduct?.image}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-950/75 text-white text-[11px] font-bold tabular-nums">
                      #{reel.displayOrder}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                        reel.active
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {reel.active ? 'Live' : 'Hidden'}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                      {reel.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                      {linkedProduct
                        ? `${linkedProduct.title} · ${formatINR(linkedProduct.price)}`
                        : `Product ID: ${reel.productId}`}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-white/10">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveOrder(idx, -1)}
                        aria-label="Move reel up"
                        className="p-1.5 rounded-lg glass-btn-secondary disabled:opacity-40"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sortedReels.length - 1}
                        onClick={() => handleMoveOrder(idx, 1)}
                        aria-label="Move reel down"
                        className="p-1.5 rounded-lg glass-btn-secondary disabled:opacity-40"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onSaveReel({
                            ...reel,
                            active: !reel.active,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        aria-label={reel.active ? 'Hide reel' : 'Show reel'}
                        className="p-1.5 rounded-lg glass-btn-secondary"
                      >
                        {reel.active ? (
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </button>
                    </div>

                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditReelModal(reel)}
                        aria-label={`Edit ${reel.title}`}
                        className="p-1.5 rounded-lg glass-btn-secondary"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteReel(reel.id)}
                        aria-label={`Delete ${reel.title}`}
                        className="p-1.5 rounded-lg glass-btn-secondary text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Reel Modal */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Manage Viral Reel"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={handleSaveSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg glass-drawer rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  {reels.some((r) => r.id === editing.id) ? 'Edit Viral Reel' : 'New Viral Reel'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Appears on the BEE4 Homepage Viral Reels strip
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/35 text-xs font-semibold text-rose-700 dark:text-rose-200">
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1">
                Reel Headline *
              </label>
              <input
                type="text"
                required
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                placeholder="e.g. Custom Lithophane Glow Unboxing"
                className="w-full h-10 px-3.5 rounded-xl glass-input text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1">
                Linked BEE4 Product *
              </label>
              <select
                value={productIdDraft}
                onChange={(e) => setProductIdDraft(e.target.value)}
                className="w-full h-10 px-3 rounded-xl glass-input text-sm font-medium focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({formatINR(p.price)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                  Video File (MP4 / WebM) or Direct URL *
                </label>
                <label className="px-3 py-1 rounded-lg glass-btn-secondary text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer">
                  {uploadingVideo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{uploadingVideo ? 'Uploading...' : 'Upload Video'}</span>
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    disabled={uploadingVideo}
                    onChange={handleVideoFileChange}
                    className="sr-only"
                  />
                </label>
              </div>
              <input
                type="url"
                value={videoUrlDraft}
                onChange={(e) => setVideoUrlDraft(e.target.value)}
                placeholder="https://.../reel.mp4"
                className="w-full h-10 px-3.5 rounded-xl glass-input text-xs focus:outline-none"
              />
              {uploadStatus && (
                <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {uploadStatus}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1">
                  Poster / Thumbnail URL (Optional)
                </label>
                <input
                  type="url"
                  value={posterUrlDraft}
                  onChange={(e) => setPosterUrlDraft(e.target.value)}
                  placeholder="Defaults to product thumbnail"
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-200 mb-1">
                  Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={displayOrderDraft}
                  onChange={(e) => setDisplayOrderDraft(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl glass-input text-sm tabular-nums focus:outline-none"
                />
              </div>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl glass-subtle text-xs font-semibold text-slate-900 dark:text-white">
              <span>Visible on Homepage</span>
              <input
                type="checkbox"
                checked={isActiveDraft}
                onChange={(e) => setIsActiveDraft(e.target.checked)}
                className="w-4 h-4 accent-amber-600"
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl glass-btn-secondary text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingVideo}
                className="px-5 py-2 rounded-xl glass-btn-amber text-white text-xs font-bold disabled:opacity-60"
              >
                Save Reel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
