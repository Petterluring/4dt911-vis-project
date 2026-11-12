import { useEffect, useState } from 'react';
import { CLUSTERING_DATA_MODE, CLUSTERING_REQUEST, fetchClustering } from '../api/clustering';
import type { ClusteringData, ClusteringRequest } from '../interfaces/clustering';
import type { ListingLocation, Resource } from '../interfaces/explorer';

interface Result {
  configuration: ClusteringRequest;
  revision: number;
  source: Resource<ListingLocation[]> | null;
  resource: Resource<ClusteringData>;
}
export function useClusteringData(listings: Resource<ListingLocation[]>, revision = 0, enabled = true, configuration: ClusteringRequest = CLUSTERING_REQUEST): Resource<ClusteringData> {
  const [result, setResult] = useState<Result | null>(null);
  const mockListings = CLUSTERING_DATA_MODE === 'mock' ? listings : null;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      if (mockListings?.status === 'loading') return;
      try {
        const data = await fetchClustering(controller.signal, mockListings?.status === 'success' ? mockListings.data : null, configuration);
        if (!controller.signal.aborted) setResult({ configuration, revision, source: mockListings, resource: { status: 'success', data } });
      } catch (error) {
        if (!controller.signal.aborted) setResult({ configuration, revision, source: mockListings, resource: { status: 'error', error: error instanceof Error ? error.message : 'Clustering data could not be loaded.' } });
      }
    });
    return () => controller.abort();
  }, [mockListings, revision, enabled, configuration]);
  // Hide previous results on the first render of a new request, before effects
  // run. Abort checks and request identity also reject late/out-of-order replies.
  return result?.configuration === configuration && result.revision === revision && result.source === mockListings
    ? result.resource : { status: 'loading' };
}
