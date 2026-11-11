import type { ListingLocation } from '../interfaces/explorer';
import type { ClusteringData } from '../interfaces/clustering';
import { createMockClustering } from '../data/clusteringMock';

export const CLUSTERING_DATA_MODE = import.meta.env.VITE_CLUSTERING_DATA_MODE ?? 'mock';

async function fetchRealClustering(signal: AbortSignal): Promise<ClusteringData> {
  signal.throwIfAborted();
  // Replace this implementation with the agreed request and response mapping.
  // No endpoint or wire format is assumed while the backend is in development.
  throw new Error('Live clustering is not configured yet. Use VITE_CLUSTERING_DATA_MODE=mock until the clustering API is integrated.');
}

export async function fetchClustering(signal: AbortSignal, existingListings: ListingLocation[] | null): Promise<ClusteringData> {
  signal.throwIfAborted();
  if (CLUSTERING_DATA_MODE === 'api') return fetchRealClustering(signal);
  if (CLUSTERING_DATA_MODE !== 'mock') throw new Error('Unknown clustering data mode. Use mock or api.');
  return createMockClustering(existingListings);
}
