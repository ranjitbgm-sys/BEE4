import { Layers, RotateCcw, Search, X } from 'lucide-react';
import { AGE_GROUP_META } from '../data/catalog';
import { AgeGroup, Product, ProductCategory } from '../types';

interface DualFilterBarProps {
  products: Product[];
  filteredCount: number;
  selectedCategory: ProductCategory;
  selectedAgeGroup: AgeGroup;
  groupByAge: boolean;
  search?: string;
  minimalSkillsOnly?: boolean;
  onChangeCategory: (category: ProductCategory) => void;
  onChangeAgeGroup: (ageGroup: AgeGroup) => void;
  onToggleGroupByAge: () => void;
  onChangeSearch?: (search: string) => void;
  onResetFilters: () => void;
}

const SKILL_CATEGORIES: Exclude<ProductCategory, ProductCategory.ALL>[] = [
  ProductCategory.ENGINEERING,
  ProductCategory.MATHS_SCIENCE,
  ProductCategory.MOTOR_SKILLS,
  ProductCategory.IMAGINATION,
];

export function DualFilterBar({
  products,
  filteredCount,
  selectedCategory,
  selectedAgeGroup,
  groupByAge,
  search = '',
  minimalSkillsOnly = false,
  onChangeCategory,
  onChangeAgeGroup,
  onToggleGroupByAge,
  onChangeSearch,
  onResetFilters,
}: DualFilterBarProps) {
  const hasActiveFilter =
    selectedCategory !== ProductCategory.ALL ||
    selectedAgeGroup !== AgeGroup.ALL ||
    search.trim().length > 0;

  if (minimalSkillsOnly) {
    return (
      <div
        id="dual-filter-bar"
        aria-label="Filter by Brain Skill"
        className="md:sticky md:top-20 z-30 glass-surface rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 w-fit max-w-full overflow-x-auto no-scrollbar"
      >
        <div
          className="flex flex-nowrap items-center gap-1.5 sm:gap-2 min-w-max"
          role="group"
          aria-label="Filter by Brain Skill"
        >
          <button
            type="button"
            onClick={() => onChangeCategory(ProductCategory.ALL)}
            aria-pressed={selectedCategory === ProductCategory.ALL}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              selectedCategory === ProductCategory.ALL
                ? 'glass-btn-ink'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Skills ({products.length})
          </button>

          {SKILL_CATEGORIES.map((skill) => {
            const active = selectedCategory === skill;
            const count = products.filter((p) => p.category === skill).length;
            return (
              <button
                key={skill}
                type="button"
                onClick={() => onChangeCategory(skill)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'glass-btn-ink'
                    : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {skill} ({count})
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      id="dual-filter-bar"
      aria-label="Dual Skill and Age Filter Bar"
      className="md:sticky md:top-16 z-30 glass-surface rounded-3xl p-4 sm:p-5 space-y-3.5"
    >
      {/* Row 1: Filter by Brain Skill + Group-by-Age Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by Brain Skill">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 mr-1 whitespace-nowrap">
            Brain Skill:
          </span>

          <button
            type="button"
            onClick={() => onChangeCategory(ProductCategory.ALL)}
            aria-pressed={selectedCategory === ProductCategory.ALL}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
              selectedCategory === ProductCategory.ALL
                ? 'glass-btn-ink'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Skills ({products.length})
          </button>

          {SKILL_CATEGORIES.map((skill) => {
            const active = selectedCategory === skill;
            const count = products.filter((p) => p.category === skill).length;
            return (
              <button
                key={skill}
                type="button"
                onClick={() => onChangeCategory(skill)}
                aria-pressed={active}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'glass-btn-ink'
                    : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {skill} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onChangeSearch && (
            <div className="relative flex-1 sm:flex-initial">
              <label htmlFor="dual-filter-search" className="sr-only">
                Search brain toys
              </label>
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="dual-filter-search"
                type="text"
                value={search}
                onChange={(e) => onChangeSearch(e.target.value)}
                placeholder="Search Karakuri, binary..."
                className="w-full sm:w-56 pl-8 pr-7 py-1.5 text-xs glass-input rounded-full focus:outline-none"
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeSearch('')}
                  aria-label="Clear search query"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleGroupByAge}
            aria-pressed={groupByAge}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              groupByAge
                ? 'glass-btn-amber text-white'
                : 'glass-btn-secondary text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Group by Age</span>
          </button>
        </div>
      </div>

      {/* Row 2: Filter by Child's Age Group */}
      <div className="pt-3 border-t border-zinc-900/8 dark:border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Filter by Child Age Group"
        >
          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mr-0.5 whitespace-nowrap">
            Age Group:
          </span>

          <button
            type="button"
            onClick={() => onChangeAgeGroup(AgeGroup.ALL)}
            aria-pressed={selectedAgeGroup === AgeGroup.ALL}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 ${
              selectedAgeGroup === AgeGroup.ALL
                ? 'glass-btn-amber text-white'
                : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Ages
          </button>

          {AGE_GROUP_META.map((meta) => {
            const active = selectedAgeGroup === meta.ageGroup;
            return (
              <button
                key={meta.ageGroup}
                type="button"
                onClick={() => onChangeAgeGroup(meta.ageGroup)}
                aria-pressed={active}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1 transition-all whitespace-nowrap shrink-0 ${
                  active
                    ? 'glass-btn-amber text-white'
                    : 'glass-btn-secondary text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : meta.accentDotClass}`}
                />
                <span>{meta.filterLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2.5 text-[11px] text-zinc-600 dark:text-zinc-300 shrink-0 tabular-nums whitespace-nowrap">
          <span>
            <strong className="text-zinc-900 dark:text-white">{filteredCount}</strong> of{' '}
            {products.length} toys
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
