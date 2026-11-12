import { useCallback, useMemo, useState } from 'react';
import type { ListingLocation, Resource } from '../interfaces/explorer';
import type { GeocodedLocation } from '../interfaces/location';
import { analyzeNearbyClusters, highlightedClusterListings, validCoordinates } from '../utils/location';
import { useClusteringData } from './useClusteringData';

// One controller coordinates the sidebar, fixed chart panel and persistent map.
// The existing calculations and API loader are unchanged by their placement.
export function useListingClusters(listings: Resource<ListingLocation[]>, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const resource = useClusteringData(listings, revision, enabled);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [location, setLocation] = useState<GeocodedLocation | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const data = resource.data;
  const searchArea = useMemo(() => location ? { location, radiusMeters } : null, [location, radiusMeters]);
  const nearby = useMemo(() => data && searchArea ? analyzeNearbyClusters(data.listings, data.clusters, searchArea) : null, [data, searchArea]);
  const knownIds = useMemo(() => new Set(data?.clusters.map(cluster => cluster.id)), [data]);
  const selectedClusterId = selectedId !== null && knownIds.has(selectedId) ? selectedId : null;
  const selectedCluster = data?.clusters.find(cluster => cluster.id === selectedClusterId);
  const localCluster = nearby?.clusters.find(row => row.cluster.id === selectedClusterId);
  const selectedListing = data?.listings.find(listing => listing.id === selectedListingId) ?? null;
  const mappedListings = useMemo(() => data?.listings.filter(validCoordinates) ?? [], [data]);
  const highlightedIds = useMemo(() => highlightedClusterListings(data?.listings ?? [], selectedClusterId, nearby?.listingIds), [data, selectedClusterId, nearby]);
  const colors = useMemo(() => new Map(data?.clusters.map(cluster => [cluster.id, cluster.color])), [data]);
  const assignments = useMemo(() => new Map(data?.listings.map(listing => [listing.id, listing.clusterId])), [data]);
  const listingColor = useCallback((listing: ListingLocation) => colors.get(assignments.get(listing.id) ?? '') ?? '#87969C', [colors, assignments]);
  const unassigned = data?.listings.filter(listing => !colors.has(listing.clusterId ?? '')).length ?? 0;
  function selectCluster(id: string) {
    setSelectedId(previous => previous === id ? null : id);
    setSelectedListingId(null);
  }
  function clearSelection() { setSelectedId(null); setSelectedListingId(null); }
  function selectListing(listing: ListingLocation) {
    const assigned = data?.listings.find(item => item.id === listing.id)?.clusterId;
    setSelectedId(assigned && knownIds.has(assigned) ? assigned : null);
    setSelectedListingId(listing.id);
  }
  function selectLocation(next: GeocodedLocation | null) { setLocation(next); setSelectedListingId(null); }
  return {
    resource, data, selectedClusterId, selectedCluster, localCluster, selectedListing, location, radiusMeters, searchArea, nearby,
    mappedListings, highlightedIds, listingColor, unassigned,
    mapSelectedListingId: selectedListing && (!nearby || nearby.listingIds.has(selectedListing.id)) ? selectedListing.id : null,
    selectCluster, clearSelection, selectListing, selectLocation, setRadiusMeters,
    closeListing: () => setSelectedListingId(null), retry: () => setRevision(value => value + 1),
  };
}
export type ListingClustersState = ReturnType<typeof useListingClusters>;
