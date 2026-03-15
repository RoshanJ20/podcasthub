'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Sparkles } from 'lucide-react';

interface SearchInputProps {
  onSearch: (query: string, mode: 'basic' | 'semantic') => void;
  isLoading?: boolean;
}

export function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'basic' | 'semantic'>('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim(), mode);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search podcasts..."
          className="flex-1"
          aria-label="Search query"
        />
        <Button type="submit" disabled={isLoading || !query.trim()}>
          <Search className="h-4 w-4 mr-1" /> Search
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === 'basic' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('basic')}
          aria-label="Basic search"
        >
          <Search className="h-4 w-4 mr-1" /> Basic
        </Button>
        <Button
          type="button"
          variant={mode === 'semantic' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setMode('semantic')}
          aria-label="Smart search"
        >
          <Sparkles className="h-4 w-4 mr-1" /> Smart (AI)
        </Button>
      </div>
    </form>
  );
}
