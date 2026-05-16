/**
 * Search page — server-side component that performs keyword search or semantic
 * (vector) search based on the searchType query parameter.
 *
 * Key responsibilities:
 * - Renders the editorial masthead and search input + delegates to the API
 * - Handles both basic keyword search (GET /api/search) and semantic/vector
 *   search (POST /api/search) based on the selected mode
 * - Displays results via BasicResults or SemanticResults depending on mode
 */
'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { SearchInput } from '@/components/search/search-input';
import type { BasicResult, SemanticResult } from '@/components/search/search-results';
import { BasicResults, SemanticResults } from '@/components/search/search-results';
import { withBasePath } from '@/lib/config/base-path';

const log = createLogger('search-page');

/**
 * Client component that renders the search interface and displays results.
 *
 * Supports two search modes:
 * - `basic`: keyword search via GET /api/search?q=<query>
 * - `semantic`: vector/embedding search via POST /api/search with a JSON body
 *
 * Falls back to an empty result set and logs a warning when a search request fails.
 *
 * @returns The search page UI including the input, loading state, and result list.
 */
export default function SearchPage() {
  const [results, setResults] = useState<BasicResult[] | SemanticResult[]>([]);
  const [searchMode, setSearchMode] = useState<'basic' | 'semantic'>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string, mode: 'basic' | 'semantic') => {
    setIsLoading(true);
    setSearchMode(mode);
    setHasSearched(true);

    try {
      if (mode === 'basic') {
        const res = await fetch(withBasePath(`/api/search?q=${encodeURIComponent(query)}`));
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        const res = await fetch(withBasePath('/api/search'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch (err) {
      log.warn(
        { error: err instanceof Error ? err.message : String(err), query },
        'Search request failed'
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasResults = results.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      {/* ─── Masthead ───────────────────────────────────────────────── */}
      <header className="flex items-end justify-between gap-4 border-b border-border-subtle pb-6 pt-10 sm:pt-14">
        <div>
          <p className="label-eyebrow">
            Find <span className="text-brand-500">·</span>
          </p>
          <h1 className="text-mast mt-1 text-foreground">Search</h1>
        </div>
      </header>

      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Basic search matches titles, descriptions, and tags. Smart (AI) search uses transcript
        embeddings to find briefs that <em>mean</em> what you&rsquo;re asking — even if they
        don&rsquo;t use the same words.
      </p>

      <div className="mt-6">
        <SearchInput onSearch={handleSearch} isLoading={isLoading} />
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Search className="size-4 animate-pulse" />
            Searching transcripts…
          </div>
        ) : hasSearched ? (
          hasResults ? (
            searchMode === 'basic' ? (
              <BasicResults results={results as BasicResult[]} />
            ) : (
              <SemanticResults results={results as SemanticResult[]} />
            )
          ) : (
            <div className="flex flex-col items-start gap-2 py-8 text-muted-foreground">
              <p className="text-lg font-medium text-foreground">No matches</p>
              <p className="text-sm">
                Try a shorter query, or switch modes — {searchMode === 'basic' ? 'Smart' : 'Basic'}{' '}
                search often surfaces results that the other misses.
              </p>
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Try a topic, a regulation, or a question — for example,{' '}
            <span className="font-medium text-foreground">IFRS 2024</span>,{' '}
            <span className="font-medium text-foreground">risk assessment</span>, or{' '}
            <span className="font-medium text-foreground">how do auditors handle AI</span>.
          </p>
        )}
      </div>
    </div>
  );
}
