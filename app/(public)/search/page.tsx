/**
 * Search page — server-side component that performs keyword search or semantic
 * (vector) search based on the searchType query parameter.
 *
 * Key responsibilities:
 * - Renders the search input and delegates to the appropriate API endpoint
 * - Handles both basic keyword search (GET /api/search) and semantic/vector
 *   search (POST /api/search) based on the selected mode
 * - Displays results via BasicResults or SemanticResults depending on mode
 */
'use client';

import { useState } from 'react';
import { createLogger } from '@/lib/logger';
import { SearchInput } from '@/components/search/search-input';
import type { BasicResult, SemanticResult } from '@/components/search/search-results';
import { BasicResults, SemanticResults } from '@/components/search/search-results';

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
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        const res = await fetch('/api/search', {
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

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Search</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Find bulletins by keyword or semantic query.
      </p>
      <SearchInput onSearch={handleSearch} isLoading={isLoading} />
      <div className="mt-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Searching...</div>
        ) : hasSearched ? (
          searchMode === 'basic' ? (
            <BasicResults results={results as BasicResult[]} />
          ) : (
            <SemanticResults results={results as SemanticResult[]} />
          )
        ) : null}
      </div>
    </div>
  );
}
