import { useEffect, useState } from 'react';
import { CLUSTERING_DATA_MODE, fetchClustering } from '../api/clustering';
import type { ClusteringData } from '../interfaces/clustering';
import type { ListingLocation, Resource } from '../interfaces/explorer';

export function useClusteringData(listings: Resource<ListingLocation[]>, revision = 0, enabled = true): Resource<ClusteringData> {
  const [resource, setResource] = useState<Resource<ClusteringData>>({ status: 'loading' });
  const mockListings = CLUSTERING_DATA_MODE === 'mock' ? listings : null;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setResource({ status: 'loading' });
      if (mockListings?.status === 'loading') return;
      try {
        const data = await fetchClustering(controller.signal, mockListings?.status === 'success' ? mockListings.data : null);
        if (!controller.signal.aborted) setResource({ status: 'success', data });
      } catch (error) {
        if (!controller.signal.aborted) setResource({ status: 'error', error: error instanceof Error ? error.message : 'Clustering data could not be loaded.' });
      }
    });
    return () => controller.abort();
  }, [mockListings, revision, enabled]);
  return resource;
}
