'use client';

import { useCallback, useState } from 'react';
import { addressWithSearch } from '@/lib/searchQuery';

/**
 * A list's search, starting from the one the address came with and written back into it as it is
 * typed, without a navigation: a shared link, a reload or the language switch opens the same search.
 */
export function useSearchQuery(initial: string) {
  const [query, setQueryState] = useState(initial);

  const setQuery = useCallback((next: string) => {
    setQueryState(next);
    // Next keeps its own router state through a native replaceState, as its docs describe.
    window.history.replaceState(null, '', addressWithSearch(window.location, next));
  }, []);

  return { query, setQuery };
}
