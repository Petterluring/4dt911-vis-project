import { geoCircle, geoDistance } from 'd3';
import type { ClusterListing, ClusterProfile } from '../interfaces/clustering';
import type { Coordinates, LocationSearchArea, NearbyAnalysis } from '../interfaces/location';
import { priceDistribution } from './clustering';

export const EARTH_RADIUS_METERS = 6371008.8;
export const SEARCH_RADII = [500, 1000, 3000, 5000] as const;
export function validCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.latitude) && Math.abs(point.latitude) <= 85.051129 &&
    Number.isFinite(point.longitude) && Math.abs(point.longitude) <= 180;
}
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  if (!validCoordinates(from) || !validCoordinates(to)) return Infinity;
  return geoDistance([from.longitude, from.latitude], [to.longitude, to.latitude]) * EARTH_RADIUS_METERS;
}
export function radiusGeometry(area: LocationSearchArea) {
  return geoCircle().center([area.location.longitude, area.location.latitude])
    .radius(area.radiusMeters / EARTH_RADIUS_METERS * 180 / Math.PI).precision(3)();
}
export function formatDistance(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return 'Not available';
  return meters < 1000 ? `${Math.round(meters)} m` : `${new Intl.NumberFormat('en-SE', { maximumFractionDigits: 1 }).format(meters / 1000)} km`;
}
export function analyzeNearbyClusters(listings: ClusterListing[], clusters: ClusterProfile[], area: LocationSearchArea): NearbyAnalysis {
  const listingIds = new Set<string>();
  const buckets = new Map(clusters.map(cluster => [cluster.id, { cluster, prices: [] as (number | null)[], count: 0, nearest: Infinity }]));
  let unassignedCount = 0;
  for (const listing of listings) {
    const distance = distanceMeters(area.location, listing);
    if (!Number.isFinite(distance)) continue;
    const bucket = listing.clusterId === null ? undefined : buckets.get(listing.clusterId);
    if (bucket) bucket.nearest = Math.min(bucket.nearest, distance);
    // A tiny tolerance includes points on the boundary despite floating-point error.
    if (distance > area.radiusMeters + 1e-6) continue;
    listingIds.add(listing.id);
    if (bucket) { bucket.count++; bucket.prices.push(listing.price); } else unassignedCount++;
  }
  return { listingIds, unassignedCount, clusters: [...buckets.values()].map(bucket => ({
    cluster: bucket.cluster, listingCount: bucket.count,
    percentage: listingIds.size ? bucket.count / listingIds.size * 100 : 0,
    prices: priceDistribution(bucket.prices),
    nearestDistanceMeters: Number.isFinite(bucket.nearest) ? bucket.nearest : null,
  })).sort((a, b) => (a.nearestDistanceMeters ?? Infinity) - (b.nearestDistanceMeters ?? Infinity) || a.cluster.label.localeCompare(b.cluster.label)) };
}

export function highlightedClusterListings(listings: ClusterListing[], selectedClusterId: string | null, nearbyIds?: ReadonlySet<string> | null): ReadonlySet<string> | null {
  if (selectedClusterId === null && nearbyIds == null) return null;
  return new Set(listings.filter(listing => (selectedClusterId === null || listing.clusterId === selectedClusterId) &&
    (nearbyIds == null || nearbyIds.has(listing.id))).map(listing => listing.id));
}
