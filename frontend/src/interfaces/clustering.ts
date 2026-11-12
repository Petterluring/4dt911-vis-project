import type { ListingLocation } from './explorer';

// This is the UI contract, independent of any future backend response format.
export type ClusterId = string;
export const CLUSTERING_FEATURES = ['room_type', 'accommodates', 'bedrooms', 'bathrooms', 'beds'] as const;
export type ClusteringFeature = typeof CLUSTERING_FEATURES[number];
export interface ClusteringRequest {
  features: ClusteringFeature[];
  n_clusters: number;
}
export interface ClusterPriceDistribution {
  count: number;
  lowerWhisker: number;
  q1: number;
  median: number;
  q3: number;
  upperWhisker: number;
  outliers: number[];
}
export interface ClusterProfile {
  id: ClusterId;
  label: string;
  description?: string;
  color: string;
  listingCount: number;
  medianAccommodates: number | null;
  medianBedrooms: number | null;
  medianBeds: number | null;
  roomTypes: { label: string; count: number; percentage: number }[];
  prices: ClusterPriceDistribution | null;
}
export interface ClusterListing extends ListingLocation { clusterId: ClusterId | null }
export interface ClusteringData {
  clusters: ClusterProfile[];
  listings: ClusterListing[];
  metadata: {
    mode: 'mock' | 'api';
    source: 'existing-listings' | 'synthetic-fallback' | 'api';
    description: string;
    algorithm?: string;
    generatedAt?: string;
    // Frontend provenance, copied from the request that produced these results.
    configuration?: ClusteringRequest;
    inputListingCount?: number;
    details?: Record<string, unknown>;
  };
}
