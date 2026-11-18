import { useRef, useState } from 'react';
import { ChevronRight, Film, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Product, ViralReelRecord } from '../types';
import { formatINR } from '../utils/storeLogic';
import { ProductImage } from './ProductImage';

interface ViralReelsSectionProps {
  reels: ViralReelRecord[];
  products: Product[];
  onSelectProduct: (productId: string) => void;
}

export function ViralReelsSection({
  reels,
  products,
  onSelectProduct,
}: ViralReelsSectionProps) {
  const activeReels = reels
    .filter((r) => r.active)
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder);

  // When admin hasn't added custom MP4 reels yet, present real featured BEE4 showcase reels
  const displayReels: {
    id: string;
    title: string;
    videoUrl?: string;
    posterUrl?: string;
    product: Product;
  }[] = [];

  for (const reel of activeReels) {
    const product = products.find((p) => p.id === reel.productId);
    if (product) {
      displayReels.push({
        id: reel.id,
        title: reel.title,
        videoUrl: reel.videoUrl,
        posterUrl: reel.posterUrl || product.image,
        product,
      });
    }
  }

  if (displayReels.length === 0) {
    const showcaseProducts = products.filter((p) => p.inStock).slice(0, 6);
    for (const product of showcaseProducts) {
      displayReels.push({
        id: `showcase-${product.id}`,
        title: product.title,
        posterUrl: product.image,
        product,
      });
    }
  }

  if (displayReels.length === 0) return null;

  return (
    <section
      aria-labelledby="viral-reels-heading"
      className="max-w-[1200px] mx-auto px-3 sm:px-6 pt-4 pb-6"
    >
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center shrink-0">
            <Film className="w-4 h-4 text-amber-700 dark:text-amber-400" />
          </span>
          <div className="min-w-0">
            <h2
              id="viral-reels-heading"
              className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate"
            >
              Product Viral Reels
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              See BEE4 3D crafts &amp; brain toys in action
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-stretch gap-3.5 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2">
        {displayReels.map((item) => (
          <ReelCard
            key={item.id}
            title={item.title}
            videoUrl={item.videoUrl}
            posterUrl={item.posterUrl}
            product={item.product}
            onShopProduct={() => onSelectProduct(item.product.id)}
          />
        ))}
      </div>
    </section>
  );
}

interface ReelCardProps {
  title: string;
  videoUrl?: string;
  posterUrl?: string;
  product: Product;
  onShopProduct: () => void;
}

function ReelCard({ title, videoUrl, posterUrl, product, onShopProduct }: ReelCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(Boolean(videoUrl));
  const [isMuted, setIsMuted] = useState(true);

  const hasPlayableVideo = Boolean(videoUrl && videoUrl.trim().length > 0);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      void vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  return (
    <article className="snap-start shrink-0 w-[188px] sm:w-[210px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
      {/* 9:16 Vertical Frame */}
      <div className="relative aspect-[9/16] bg-slate-950 overflow-hidden group">
        {hasPlayableVideo ? (
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || product.image}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            preload="metadata"
            onClick={togglePlay}
            className="w-full h-full object-cover cursor-pointer"
          />
        ) : (
          <button
            type="button"
            onClick={onShopProduct}
            className="w-full h-full block text-left"
          >
            <ProductImage
              src={posterUrl || product.image}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

        {hasPlayableVideo && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className="w-7 h-7 rounded-full bg-slate-900/75 text-white inline-flex items-center justify-center hover:bg-slate-900"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className="w-7 h-7 rounded-full bg-slate-900/75 text-white inline-flex items-center justify-center hover:bg-slate-900"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        <div className="absolute inset-x-2.5 bottom-2.5 space-y-1.5">
          <p className="text-xs font-semibold text-white line-clamp-2 leading-snug drop-shadow-sm">
            {title}
          </p>
          <p className="text-xs font-bold text-amber-300 tabular-nums">
            {formatINR(product.price)}
          </p>
        </div>
      </div>

      {/* Product Shop CTA */}
      <button
        type="button"
        onClick={onShopProduct}
        className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 transition-colors"
      >
        <span className="truncate">Shop This Product</span>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
      </button>
    </article>
  );
}
