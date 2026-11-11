import type { ListingLocation } from './explorer';

// This is the UI contract, independent of any future backend response format.
export type ClusterId = string;
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
    details?: Record<string, unknown>;
  };
}
