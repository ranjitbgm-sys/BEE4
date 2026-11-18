import { FormEvent, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Gift, Search, Sparkles, X } from 'lucide-react';
import { AgeGroup, ProductCategory } from '../../types';

interface MobileCategoriesSheetProps {
  isOpen: boolean;
  selectedCategory: ProductCategory;
  selectedAgeGroup: AgeGroup;
  searchQuery: string;
  onClose: () => void;
  onApplyFilter: (params: {
    category?: ProductCategory;
    ageGroup?: AgeGroup;
    search?: string;
    page?: 'shop' | 'gifts';
  }) => void;
}

const CATEGORY_ITEMS: { value: ProductCategory; label: string; subtitle: string }[] = [
  { value: ProductCategory.ALL, label: 'All 16 Brain Toys', subtitle: 'Full 3D-printed collection' },
  {
    value: ProductCategory.ENGINEERING,
    label: 'Engineering',
    subtitle: 'Karakuri, gears & locks',
  },
  {
    value: ProductCategory.MATHS_SCIENCE,
    label: 'Maths & Science',
    subtitle: 'Logic grids & spatial math',
  },
  {
    value: ProductCategory.MOTOR_SKILLS,
    label: 'Motor Skills',
    subtitle: 'Dexterity & tactile kits',
  },
  {
    value: ProductCategory.IMAGINATION,
    label: 'Imagination',
    subtitle: 'Creative open-ended play',
  },
];

const AGE_ITEMS: { value: AgeGroup; label: string }[] = [
  { value: AgeGroup.ALL, label: 'All Ages' },
  { value: AgeGroup.AGE_3_5, label: 'Ages 3–5' },
  { value: AgeGroup.AGE_6_8, label: 'Ages 6–8' },
  { value: AgeGroup.AGE_9_11, label: 'Ages 9–11' },
  { value: AgeGroup.AGE_12_15, label: 'Ages 12–15' },
];

export function MobileCategoriesSheet({
  isOpen,
  selectedCategory,
  selectedAgeGroup,
  searchQuery,
  onClose,
  onApplyFilter,
}: MobileCategoriesSheetProps) {
  const prefersReducedMotion = useReducedMotion();
  const [draftSearch, setDraftSearch] = useState(searchQuery);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApplyFilter({ search: draftSearch.trim(), page: 'shop' });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Categories and Filters"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0.05 : 0.18 }}
          className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-sm flex items-end justify-center md:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={prefersReducedMotion ? { y: 0 } : { y: '100%' }}
            animate={{ y: 0 }}
            exit={prefersReducedMotion ? { y: 0 } : { y: '100%' }}
            transition={{ duration: prefersReducedMotion ? 0.05 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[82vh] overflow-y-auto glass-drawer rounded-t-3xl border-b-0 p-5 pwa-safe-bottom space-y-5"
          >
            {/* Drag Handle */}
            <div className="flex flex-col items-center gap-2">
              <span className="w-10 h-1 rounded-full bg-zinc-400/50 dark:bg-white/25" />
              <div className="w-full flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-extrabold text-zinc-900 dark:text-white">
                  Browse Categories
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close categories sheet"
                  className="w-10 h-10 rounded-xl glass-btn-secondary flex items-center justify-center shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  placeholder="Search puzzles, DIY kits, gifts..."
                  className="w-full h-11 pl-10 pr-3 rounded-xl glass-input text-sm focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 px-4 rounded-xl glass-btn-amber text-white text-xs font-bold whitespace-nowrap shrink-0"
              >
                Search
              </button>
            </form>

            {/* Skill Categories */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Brain Skill Categories
              </p>
              <div className="grid grid-cols-1 gap-2">
                {CATEGORY_ITEMS.map((item) => {
                  const active = selectedCategory === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        onApplyFilter({ category: item.value, page: 'shop' });
                        onClose();
                      }}
                      className={`min-h-[48px] px-4 py-2.5 rounded-2xl text-left flex items-center justify-between gap-3 transition-all ${
                        active
                          ? 'glass-btn-ink'
                          : 'glass-subtle text-zinc-900 dark:text-white hover:bg-white/75 dark:hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold leading-tight">{item.label}</p>
                        <p
                          className={`text-[11px] mt-0.5 ${
                            active ? 'opacity-80' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                      <Sparkles className="w-4 h-4 shrink-0 opacity-75" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Age Group Quick Filters */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Filter by Age Group
              </p>
              <div className="flex flex-wrap gap-2">
                {AGE_ITEMS.map((age) => {
                  const active = selectedAgeGroup === age.value;
                  return (
                    <button
                      key={age.value}
                      type="button"
                      onClick={() => {
                        onApplyFilter({ ageGroup: age.value, page: 'shop' });
                        onClose();
                      }}
                      className={`min-h-[44px] px-4 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        active
                          ? 'glass-btn-amber text-white'
                          : 'glass-btn-secondary text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {age.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Gifts Quick Shortcut */}
            <button
              type="button"
              onClick={() => {
                onApplyFilter({ page: 'gifts' });
                onClose();
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-2xl glass-btn-amber text-white text-sm font-bold flex items-center justify-between gap-2"
            >
              <span className="inline-flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0" />
                <span>Birthday &amp; Return Gift Bundles</span>
              </span>
              <span className="text-xs opacity-90">Explore →</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
