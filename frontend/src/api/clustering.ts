import { LISTING_COLUMNS, numeric, parseListing, post } from './explorer';
import type { ListingLocation } from '../interfaces/explorer';
import type { ClusterId, ClusterListing, ClusterPriceDistribution, ClusterProfile, ClusteringData, ClusteringRequest } from '../interfaces/clustering';
import { createMockClustering } from '../data/clusteringMock';
import { knownNonnegative, medianValue, priceDistribution, validDistribution } from '../utils/clustering';
import { sameClusteringConfiguration, validateClusteringConfiguration } from '../utils/clusteringConfiguration';

export const CLUSTERING_DATA_MODE = import.meta.env.VITE_CLUSTERING_DATA_MODE ?? 'api';
export const CLUSTERING_REQUEST: ClusteringRequest = {
  features: ['room_type', 'accommodates', 'bedrooms', 'beds'],
  n_clusters: Number(import.meta.env.VITE_CLUSTERING_N_CLUSTERS ?? 3),
};
type Row = Record<string, unknown>;
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The clustering API returned an invalid record.');
  return value as Row;
}
function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error('The clustering API returned an invalid list.');
  return value.map(object);
}
function identifier(value: unknown): string | null {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? String(value) : null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function clusterIdentifier(value: unknown): ClusterId | null {
  const id = identifier(value);
  return id !== null && !/^-[\d.]+$/.test(id) ? id : null;
}
function validPrice(value: unknown): number | null {
  const result = numeric(value);
  return knownNonnegative(result) ? result : null;
}
const colors = ['#167D8D', '#7656A3', '#B45C26', '#367B45', '#B44569', '#3D6FB0', '#89701D', '#765146', '#50848C', '#736482'];
function clusterColor(id: string): string {
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const index = /^\d+$/.test(id) ? Number(id) : hash;
  return index < colors.length ? colors[index] : `hsl(${hash * 137.508 % 360} 48% 40%)`;
}
function emptyListing(id: string): ListingLocation {
  return {
    id, latitude: NaN, longitude: NaN, name: null, listing_url: null, picture_url: null,
    district: null, room_type: null, property_type: null, price: null, accommodates: null,
    bedrooms: null, beds: null, bathrooms_text: null, review_scores_rating: null,
    number_of_reviews: null, minimum_nights: null,
  };
}
// Normalize characteristics with the existing parser, then restore the actual
// coordinates, including missing ones. Such listings still belong in summaries.
function listingMetadata(row: Row): ListingLocation | null {
  const normalized = parseListing({ ...row, latitude: 0, longitude: 0 });
  if (!normalized) return null;
  return { ...normalized, latitude: numeric(row.latitude) ?? NaN, longitude: numeric(row.longitude) ?? NaN };
}
async function fetchClusteringListings(signal: AbortSignal): Promise<ListingLocation[]> {
  const listings = new Map<string, ListingLocation>();
  const limit = 1000;
  for (let offset = 0; ; offset += limit) {
    const page = rows(await post('/choropleth-map/listings', { columns: LISTING_COLUMNS, limit, offset }, signal));
    for (const row of page) {
      const listing = listingMetadata(row);
      if (listing) listings.set(listing.id, listing);
    }
    if (page.length < limit) break;
  }
  return [...listings.values()];
}
function distribution(statistics: unknown, prices: (number | null)[]): ClusterPriceDistribution | null {
  const calculated = priceDistribution(prices);
  if (!calculated || statistics == null) return calculated;
  const stats = object(statistics);
  const q1 = validPrice(stats.q25), median = validPrice(stats.median), q3 = validPrice(stats.q75);
  const lowerFence = validPrice(stats.lower_whisker), upperFence = validPrice(stats.upper_whisker);
  if (q1 === null || median === null || q3 === null || lowerFence === null || upperFence === null) return calculated;
  // Backend "whiskers" are 1.5 IQR fences. Draw observed inlier extrema and
  // determine outliers from assignment prices, consistently with local plots.
  const inliers = prices.filter(knownNonnegative).filter(price => price >= lowerFence && price <= upperFence).sort((a, b) => a - b);
  if (!inliers.length) return calculated;
  const normalized = {
    count: calculated.count, q1, median, q3, lowerWhisker: inliers[0], upperWhisker: inliers[inliers.length - 1],
    outliers: prices.filter(knownNonnegative).filter(price => price < lowerFence || price > upperFence).sort((a, b) => a - b),
  };
  return validDistribution(normalized) && q1 === calculated.q1 && median === calculated.median && q3 === calculated.q3 ? normalized : calculated;
}
export function parseClustering(value: unknown, metadata: ListingLocation[], configuration: ClusteringRequest = CLUSTERING_REQUEST): ClusteringData {
  const response = object(value);
  const assignments = rows(response.cluster_assignments);
  const statistics = object(response.cluster_statistics);
  const listings = new Map<string, ClusterListing>(metadata.map(listing => [listing.id, { ...listing, clusterId: null }]));
  let missingMetadata = 0;
  for (const assignment of assignments) {
    const id = identifier(assignment.id);
    if (id === null) throw new Error('A clustering assignment has an invalid listing ID.');
    const existing = listings.get(id);
    if (!existing) missingMetadata++;
    const listing = existing ?? { ...emptyListing(id), clusterId: null };
    listings.set(id, { ...listing, clusterId: clusterIdentifier(assignment.cluster),
      price: 'price' in assignment ? validPrice(assignment.price) : validPrice(listing.price) });
  }
  const allListings = [...listings.values()];
  const buckets = new Map<ClusterId, ClusterListing[]>();
  for (const listing of allListings) {
    if (listing.clusterId === null) continue;
    const members = buckets.get(listing.clusterId) ?? [];
    members.push(listing); buckets.set(listing.clusterId, members);
  }
  const clusters: ClusterProfile[] = [...buckets].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })).map(([id, members]) => {
    const roomTypes = new Map<string, number>();
    for (const listing of members) {
      const type = listing.room_type ?? 'Unknown';
      roomTypes.set(type, (roomTypes.get(type) ?? 0) + 1);
    }
    return { id, label: `Cluster ${id}`, color: clusterColor(id), listingCount: members.length,
      description: 'Accommodation characteristics from assigned listings',
      medianAccommodates: medianValue(members.map(listing => listing.accommodates)),
      medianBedrooms: medianValue(members.map(listing => listing.bedrooms)),
      medianBeds: medianValue(members.map(listing => listing.beds)),
      roomTypes: [...roomTypes].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, percentage: count / members.length * 100 })),
      prices: distribution(Object.hasOwn(statistics, id) ? statistics[id] : undefined, members.map(listing => listing.price)),
    };
  });
  return { clusters, listings: allListings, metadata: {
    mode: 'api', source: 'api', algorithm: 'KMeans',
    configuration: { features: [...configuration.features], n_clusters: configuration.n_clusters },
    inputListingCount: new Set(assignments.map(assignment => identifier(assignment.id))).size,
    description: `Backend clustering of accommodation characteristics. ${assignments.length} listing assignments.${missingMetadata ? ` ${missingMetadata} assignments have no matching listing metadata; their coordinates and characteristics are unavailable.` : ''}`,
    details: { request: { features: [...configuration.features], n_clusters: configuration.n_clusters }, backendPriceStatistics: statistics, missingMetadata },
  } };
}
async function fetchRealClustering(signal: AbortSignal, configuration: ClusteringRequest): Promise<ClusteringData> {
  const [response, metadata] = await Promise.all([
    post('/clustering/perform', configuration, signal), fetchClusteringListings(signal),
  ]);
  signal.throwIfAborted();
  return parseClustering(response, metadata, configuration);
}
export async function fetchClustering(signal: AbortSignal, existingListings: ListingLocation[] | null, configuration: ClusteringRequest = CLUSTERING_REQUEST): Promise<ClusteringData> {
  signal.throwIfAborted();
  const validation = validateClusteringConfiguration(configuration.features, configuration.n_clusters);
  if (!validation.request) throw new Error(Object.values(validation.errors).join(' '));
  const snapshot = validation.request;
  if (CLUSTERING_DATA_MODE === 'api') return fetchRealClustering(signal, snapshot);
  if (CLUSTERING_DATA_MODE !== 'mock') throw new Error('Unknown clustering data mode. Use mock or api.');
  if (!sameClusteringConfiguration(snapshot, CLUSTERING_REQUEST)) throw new Error('Dynamic clustering requires API mode. Demonstration groups are fixed.');
  return createMockClustering(existingListings);
}
