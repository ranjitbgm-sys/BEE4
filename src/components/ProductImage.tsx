import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { normalizeAssetUrl } from '../utils/storeLogic';

interface ProductImageProps {
  src: string;
  alt: string;
  objectPosition?: string;
  className?: string;
}

export function ProductImage({
  src,
  alt,
  objectPosition = '50% 50%',
  className = '',
}: ProductImageProps) {
  const normalizedSrc = normalizeAssetUrl(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [normalizedSrc]);

  if (!normalizedSrc || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center glass-subtle text-zinc-500 dark:text-zinc-400 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Package className="w-8 h-8 text-amber-600/70 mb-2" strokeWidth={1.5} />
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300 line-clamp-2 max-w-[180px]">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      style={{ objectPosition }}
      className={className}
    />
  );
}
