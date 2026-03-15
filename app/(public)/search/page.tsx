'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/search/search-input';
import { BasicResults, SemanticResults } from '@/components/search/search-results';

export default function SearchPage() {
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
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
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Search</h1>
      <SearchInput onSearch={handleSearch} isLoading={isLoading} />
      <div className="mt-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Searching...</div>
        ) : hasSearched ? (
          searchMode === 'basic' ? (
            <BasicResults results={results} />
          ) : (
            <SemanticResults results={results} />
          )
        ) : null}
      </div>
    </div>
  );
}
