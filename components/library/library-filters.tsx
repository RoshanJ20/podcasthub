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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="flex flex-wrap items-center gap-3">
      {/* Favorites filter toggle */}
      <Button
        type="button"
        onClick={toggleFavorites}
        aria-label={showFavorites ? 'Show all' : 'Show favorites only'}
        size="sm"
        className={cn(
          'h-9 gap-1.5 rounded-lg border px-3 text-sm font-medium transition-[color,background-color,border-color] duration-150',
          showFavorites
            ? 'border-primary/25 bg-primary/12 text-primary'
            : 'border-border bg-background text-muted-foreground hover:border-primary/25 hover:text-primary'
        )}
      >
        <Heart
          className={cn(
            'size-3.5',
            showFavorites ? 'fill-primary text-primary' : 'fill-transparent'
          )}
        />
        Favorites
      </Button>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search..."
          className="h-9 w-56 pl-9"
        />
      </div>
      <Select value={currentDomain} onValueChange={(val) => updateParams('domain', val ?? 'all')}>
        <SelectTrigger className="w-44" aria-label="Filter by domain">
          <SelectValue>{currentDomain === 'all' ? 'All Domains' : currentDomain}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Domains</SelectItem>
          {DOMAINS.map((domain) => (
            <SelectItem key={domain} value={domain}>
              {domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentSort} onValueChange={(val) => updateParams('sort', val ?? 'newest')}>
        <SelectTrigger className="w-36" aria-label="Sort audit briefs">
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
  );
}
