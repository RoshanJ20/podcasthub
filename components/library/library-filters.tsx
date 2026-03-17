/**
 * Client-side filter controls for the public podcast library.
 *
 * Provides domain and sort filters that sync with URL search params.
 * When a filter changes, the URL is updated which triggers a Server
 * Component re-render of the library page.
 */
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';
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

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === 'all' || value === 'newest') {
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

  return (
    <div className="flex flex-wrap items-center gap-3">
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
        <SelectTrigger className="w-36" aria-label="Sort podcasts">
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
