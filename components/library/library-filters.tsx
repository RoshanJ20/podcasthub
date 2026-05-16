/**
 * Client-side filter controls for the public audit brief library.
 *
 * Provides domain and sort filters that sync with URL search params.
 * When a filter changes, the URL is updated which triggers a Server
 * Component re-render of the library page.
 */
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useState, useEffect, useRef } from 'react';
import { Search, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DOMAINS } from '@/lib/schemas/common';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'title-az', label: 'Title A-Z' },
] as const;

export function LibraryFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentDomain = searchParams.get('domain') ?? 'all';
  const currentSort = searchParams.get('sort') ?? 'newest';
  const currentSearch = searchParams.get('q') ?? '';
  const showFavorites = searchParams.get('favorites') === 'true';
  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all' || value === 'newest' || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete('page');
      const qs = params.toString();
      router.push(qs ? `?${qs}` : '?');
    },
    [searchParams, router]
  );

  /** Debounce search input — update URL after 300ms of no typing. */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateParams('q', searchValue);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, currentSearch, updateParams]);

  const toggleFavorites = useCallback(() => {
    updateParams('favorites', showFavorites ? '' : 'true');
  }, [showFavorites, updateParams]);

  return (
    <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-3">
      {/* Search input — editorial border-bottom treatment */}
      <div className="relative flex-1 sm:min-w-[260px] sm:max-w-md">
        <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search briefs"
          aria-label="Search briefs"
          className="h-9 w-full border-0 border-b border-border-subtle bg-transparent pl-7 pr-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-b-2 focus:border-brand-500"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Favorites toggle — chip */}
        <button
          type="button"
          onClick={toggleFavorites}
          aria-label={showFavorites ? 'Show all' : 'Show favorites only'}
          aria-pressed={showFavorites}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-[color,background-color,border-color] duration-150',
            showFavorites
              ? 'border-danger/40 bg-danger-soft text-danger'
              : 'border-border-subtle bg-card text-muted-foreground hover:border-border-default hover:text-foreground'
          )}
        >
          <Heart className={cn('size-3.5', showFavorites ? 'fill-current' : 'fill-transparent')} />
          Favorites
        </button>

        <Select value={currentDomain} onValueChange={(val) => updateParams('domain', val ?? 'all')}>
          <SelectTrigger
            className="h-8 min-w-[8.5rem] rounded-full border-border-subtle bg-card text-xs"
            aria-label="Filter by domain"
          >
            <SelectValue>{currentDomain === 'all' ? 'All domains' : currentDomain}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All domains</SelectItem>
            {DOMAINS.map((domain) => (
              <SelectItem key={domain} value={domain}>
                {domain}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentSort} onValueChange={(val) => updateParams('sort', val ?? 'newest')}>
          <SelectTrigger
            className="h-8 min-w-[6.5rem] rounded-full border-border-subtle bg-card text-xs"
            aria-label="Sort audit briefs"
          >
            <SelectValue>
              {SORT_OPTIONS.find((o) => o.value === currentSort)?.label ?? 'Newest'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
