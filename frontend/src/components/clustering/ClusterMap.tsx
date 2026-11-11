import { useCallback, useMemo } from 'react';
import type { ClusterListing, ClusterProfile } from '../../interfaces/clustering';
import type { DistrictGeometry, ListingLocation, Resource } from '../../interfaces/explorer';
import type { LocationSearchArea } from '../../interfaces/location';
import DistrictMap from '../explorer/DistrictMap';
import { formatClusterNumber } from '../../utils/clustering';
import { formatDistance, highlightedClusterListings, validCoordinates } from '../../utils/location';

interface Props {
  searchArea?: LocationSearchArea | null;
  nearbyListingIds?: ReadonlySet<string> | null;
  geometry: Resource<DistrictGeometry>;
  clusters: ClusterProfile[];
  listings: ClusterListing[];
  selectedClusterId: string | null;
  selectedListingId: string | null;
  onSelectCluster: (id: string) => void;
  onSelectListing: (listing: ListingLocation) => void;
  onClear: () => void;
  onRetry: () => void;
}
const noDistrictInteraction = () => {};
export default function ClusterMap({ geometry, clusters, listings, selectedClusterId, selectedListingId, onSelectCluster, onSelectListing, onClear, onRetry, searchArea, nearbyListingIds }: Props) {
  const colors = useMemo(() => new Map(clusters.map(cluster => [cluster.id, cluster.color])), [clusters]);
  const assignments = useMemo(() => new Map(listings.map(listing => [listing.id, listing.clusterId])), [listings]);
  const mappedListings = useMemo(() => listings.filter(validCoordinates), [listings]);
  const highlightedIds = useMemo(() => highlightedClusterListings(listings, selectedClusterId, nearbyListingIds), [listings, selectedClusterId, nearbyListingIds]);
  const listingColor = useCallback((listing: ListingLocation) => colors.get(assignments.get(listing.id) ?? '') ?? '#87969C', [colors, assignments]);
  const unassigned = listings.filter(listing => !colors.has(listing.clusterId ?? '')).length;
  return <article className="cluster-geography panel" aria-labelledby="cluster-map-title">
    <header className="cluster-panel-heading"><div><p className="eyebrow">Explore locations</p><h2 id="cluster-map-title">Listings by cluster</h2></div>
      <button type="button" className="text-button" disabled={selectedClusterId === null && selectedListingId === null} onClick={onClear}>{searchArea ? 'Clear cluster selection' : 'Clear selection'}</button></header>
    <p className="cluster-panel-description">{formatClusterNumber(mappedListings.length)} mapped listings.{searchArea && nearbyListingIds && ` ${formatClusterNumber(nearbyListingIds.size)} inside ${formatDistance(searchArea.radiusMeters)}; markers outside the area are dimmed.`} Zoom in and select a marker to inspect a listing.</p>
    <div className="cluster-map-canvas">
      {geometry.status === 'success' ? <DistrictMap geometry={geometry.data} prices={[]} listings={mappedListings}
        metric="median_airbnb_price" selectedDistrict={null} hoveredDistrict={null} selectedListingId={selectedListingId}
        showListings showBasemap showDistricts={false} onHover={noDistrictInteraction} onSelect={noDistrictInteraction}
        onSelectListing={onSelectListing} listingColor={listingColor} highlightedListingIds={highlightedIds} searchArea={searchArea} />
        : <div className="map-message" role={geometry.status === 'error' ? 'alert' : 'status'}>
          {geometry.status === 'loading' ? 'Loading Stockholm district boundaries…' : <><p>{geometry.error}</p><button type="button" className="text-button" onClick={onRetry}>Retry map data</button></>}
        </div>}
    </div>
    <div className="cluster-legend" role="group" aria-label="Cluster map legend">
      {searchArea && <span><span className="search-location-key" />Search point · {formatDistance(searchArea.radiusMeters)} radius</span>}
      <button type="button" aria-pressed={selectedClusterId === null} onClick={onClear}>All clusters</button>
      {clusters.map(cluster => <button key={cluster.id} type="button" aria-pressed={cluster.id === selectedClusterId} onClick={() => onSelectCluster(cluster.id)}>
        <span className="cluster-swatch" style={{ background: cluster.color }} />{cluster.label}</button>)}
      {unassigned > 0 && <span><span className="cluster-swatch" style={{ background: '#87969C' }} />{formatClusterNumber(unassigned)} unassigned</span>}
    </div>
    {mappedListings.length < listings.length && <p className="cluster-chart-note">{formatClusterNumber(listings.length - mappedListings.length)} listings have no valid map coordinates. They remain included in the profiles and price summaries.</p>}
  </article>;
}
