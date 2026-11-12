import type { ClusterPriceDistribution, ClusterProfile } from './clustering';

export interface Coordinates { latitude: number; longitude: number }
export interface GeocodedLocation extends Coordinates { id: string; label: string }
export interface LocationSearchArea { location: GeocodedLocation; radiusMeters: number }
export interface NearbyCluster {
  cluster: ClusterProfile;
  listingCount: number;
  percentage: number;
  prices: ClusterPriceDistribution | null;
  // Nearest valid listing in the dataset, including when none is inside radius.
  nearestDistanceMeters: number | null;
}
export interface NearbyAnalysis {
  listingIds: ReadonlySet<string>;
  clusters: NearbyCluster[];
  unassignedCount: number;
}
