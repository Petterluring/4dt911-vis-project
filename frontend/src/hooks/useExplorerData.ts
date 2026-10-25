import { useEffect, useState } from 'react';
import type { Resource } from '../interfaces/explorer';
import { fetchGeometry, fetchDistrictPrices, fetchDistrictTooltips, fetchListings, fetchScatterplots } from '../api/explorer';
function useResource<T>(loader: (signal: AbortSignal) => Promise<T>, revision: number): Resource<T> {
  const [resource, setResource] = useState<Resource<T>>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setResource({ status: 'loading' });
      try {
        const data = await loader(controller.signal);
        if (!controller.signal.aborted) setResource({ status: 'success', data });
      } catch (error) {
        if (!controller.signal.aborted) setResource({ status: 'error', error: error instanceof Error ? error.message : 'Data could not be loaded.' });
      }
    });
    return () => controller.abort();
  }, [loader, revision]);
  return resource;
}
export function useExplorerData(revision: number) {
  return {
    geometry: useResource(fetchGeometry, revision), prices: useResource(fetchDistrictPrices, revision),
    tooltips: useResource(fetchDistrictTooltips, revision), listings: useResource(fetchListings, revision),
    scatterplots: useResource(fetchScatterplots, revision),
  };
}
