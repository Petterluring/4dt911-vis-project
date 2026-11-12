import { useCallback, useMemo, useState } from 'react';
import type { ListingLocation, Resource } from '../interfaces/explorer';
import type { GeocodedLocation } from '../interfaces/location';
import type { ClusteringData, ClusteringFeature, ClusteringRequest } from '../interfaces/clustering';
import { CLUSTERING_DATA_MODE, CLUSTERING_REQUEST } from '../api/clustering';
import { analyzeNearbyClusters, highlightedClusterListings, validCoordinates } from '../utils/location';
import { sameClusteringConfiguration, validateClusteringConfiguration } from '../utils/clusteringConfiguration';
import { useClusteringData } from './useClusteringData';

// One controller coordinates the sidebar, fixed chart panel and persistent map.
// The existing calculations and API loader are unchanged by their placement.
export function useListingClusters(listings: Resource<ListingLocation[]>, enabled: boolean) {
  const [revision, setRevision] = useState(0);
  const [request, setRequest] = useState<ClusteringRequest>(CLUSTERING_REQUEST);
  const [draftFeatures, setDraftFeatures] = useState<ClusteringFeature[]>([...CLUSTERING_REQUEST.features]);
  const [draftK, setDraftK] = useState(Number.isFinite(CLUSTERING_REQUEST.n_clusters) ? String(CLUSTERING_REQUEST.n_clusters) : '');
  const resource = useClusteringData(listings, revision, enabled, request);
  const [selection, setSelection] = useState<{ data: ClusteringData | null; clusterId: string | null; listingId: string | null }>({ data: null, clusterId: null, listingId: null });
  const [inputListingCount, setInputListingCount] = useState<number | undefined>();
  const [location, setLocation] = useState<GeocodedLocation | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(1000);
  const data = resource.data;
  const searchArea = useMemo(() => location ? { location, radiusMeters } : null, [location, radiusMeters]);
  const nearby = useMemo(() => data && searchArea ? analyzeNearbyClusters(data.listings, data.clusters, searchArea) : null, [data, searchArea]);
  const knownIds = useMemo(() => new Set(data?.clusters.map(cluster => cluster.id)), [data]);
  // Numeric IDs may be reused for different groups after a new run. Bind the
  // selection to its result object rather than carrying it into new results.
  const selectedClusterId = selection.data === data && selection.clusterId !== null && knownIds.has(selection.clusterId) ? selection.clusterId : null;
  const selectedCluster = data?.clusters.find(cluster => cluster.id === selectedClusterId);
  const localCluster = nearby?.clusters.find(row => row.cluster.id === selectedClusterId);
  const selectedListing = selection.data === data ? data?.listings.find(listing => listing.id === selection.listingId) ?? null : null;
  const mappedListings = useMemo(() => data?.listings.filter(validCoordinates) ?? [], [data]);
  const highlightedIds = useMemo(() => highlightedClusterListings(data?.listings ?? [], selectedClusterId, nearby?.listingIds), [data, selectedClusterId, nearby]);
  const colors = useMemo(() => new Map(data?.clusters.map(cluster => [cluster.id, cluster.color])), [data]);
  const assignments = useMemo(() => new Map(data?.listings.map(listing => [listing.id, listing.clusterId])), [data]);
  const listingColor = useCallback((listing: ListingLocation) => colors.get(assignments.get(listing.id) ?? '') ?? '#87969C', [colors, assignments]);
  const unassigned = data?.listings.filter(listing => !colors.has(listing.clusterId ?? '')).length ?? 0;
  // Store the backend's sample count at the same time as a successful render;
  // no upper bound is guessed from the overview's coordinate-filtered listings.
  if (data?.metadata.inputListingCount !== undefined && data.metadata.inputListingCount !== inputListingCount) setInputListingCount(data.metadata.inputListingCount);
  const validation = validateClusteringConfiguration(draftFeatures, draftK, inputListingCount);
  const pending = !validation.request || !sameClusteringConfiguration(validation.request, request);
  const running = resource.status === 'loading';
  const mock = CLUSTERING_DATA_MODE === 'mock';
  function selectCluster(id: string) {
    setSelection(previous => ({ data: data ?? null, clusterId: previous.data === data && previous.clusterId === id ? null : id, listingId: null }));
  }
  function clearSelection() { setSelection({ data: data ?? null, clusterId: null, listingId: null }); }
  function selectListing(listing: ListingLocation) {
    const assigned = data?.listings.find(item => item.id === listing.id)?.clusterId;
    setSelection({ data: data ?? null, clusterId: assigned && knownIds.has(assigned) ? assigned : null, listingId: listing.id });
  }
  function selectLocation(next: GeocodedLocation | null) { setLocation(next); setSelection(previous => ({ ...previous, listingId: null })); }
  function run() {
    if (mock || !validation.request || (running && !pending)) return;
    setRequest(validation.request);
  }
  return {
    resource, data, selectedClusterId, selectedCluster, localCluster, selectedListing, location, radiusMeters, searchArea, nearby,
    mappedListings, highlightedIds, listingColor, unassigned,
    mapSelectedListingId: selectedListing && (!nearby || nearby.listingIds.has(selectedListing.id)) ? selectedListing.id : null,
    selectCluster, clearSelection, selectListing, selectLocation, setRadiusMeters,
    closeListing: () => setSelection(previous => ({ ...previous, listingId: null })), retry: () => setRevision(value => value + 1),
    configuration: {
      draftFeatures, draftK, request, active: data?.metadata.configuration, validation, pending, running, mock, inputListingCount,
      canRun: !mock && validation.request !== null && (!running || pending),
      toggleFeature: (feature: ClusteringFeature) => setDraftFeatures(previous => previous.includes(feature) ? previous.filter(value => value !== feature) : [...previous, feature]),
      setK: setDraftK, run,
    },
  };
}
export type ListingClustersState = ReturnType<typeof useListingClusters>;
