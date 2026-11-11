import { useEffect, useState } from 'react';
import { searchLocations } from '../api/geocoding';
import type { GeocodedLocation } from '../interfaces/location';

interface SearchState { key: string; status: 'loading' | 'success' | 'error'; suggestions: GeocodedLocation[]; error?: string }
export function useLocationSearch(query: string | null, revision: number) {
  const normalized = query?.trim() ?? '';
  const key = `${revision}:${normalized}`;
  const [result, setResult] = useState<SearchState | null>(null);
  useEffect(() => {
    if (normalized.length < 3) return;
    const controller = new AbortController();
    // Short queries and every keystroke should not produce network requests.
    const timer = window.setTimeout(async () => {
      try {
        const suggestions = await searchLocations(normalized, controller.signal);
        if (!controller.signal.aborted) setResult({ key, status: 'success', suggestions });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ key, status: 'error', suggestions: [],
          error: error instanceof Error && error.name === 'TimeoutError' ? 'Location search timed out. Please try again.'
            : error instanceof Error && error.name !== 'TypeError' ? error.message : 'Location search is unavailable. Check your connection and try again.' });
      }
    }, 600);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, key]);
  if (normalized.length < 3) return { status: 'idle' as const, suggestions: [] };
  return result?.key === key ? result : { status: 'loading' as const, suggestions: [] };
}
