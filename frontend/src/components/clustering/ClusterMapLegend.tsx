import type { ListingClustersState } from '../../hooks/useListingClusters';
import { formatClusterNumber } from '../../utils/clustering';
import { formatDistance } from '../../utils/location';

export default function ClusterMapLegend({ state }: { state: ListingClustersState }) {
  const { resource, data, selectedClusterId, searchArea, nearby, mappedListings, unassigned, clearSelection, selectCluster } = state;
  return <details className="map-legend panel cluster-map-legend" open>
    <summary>Listings by cluster</summary>
    {resource.status === 'loading' ? <p role="status">Loading cluster assignments…</p>
      : resource.status === 'error' ? <p>Cluster assignments unavailable. Retry in the Clustering tab.</p>
        : <>
          <p>{formatClusterNumber(mappedListings.length)} mapped listings{nearby ? ` · ${formatClusterNumber(nearby.listingIds.size)} inside ${formatDistance(searchArea!.radiusMeters)}` : ''}</p>
          <div className="cluster-legend" role="group" aria-label="Cluster map legend">
            {searchArea && <span><span className="search-location-key" />Search point · {formatDistance(searchArea.radiusMeters)} radius</span>}
            <button type="button" aria-pressed={selectedClusterId === null} onClick={clearSelection}>All clusters</button>
            {data?.clusters.map(cluster => <button key={cluster.id} type="button" aria-pressed={selectedClusterId === cluster.id} onClick={() => selectCluster(cluster.id)}>
              <span className="cluster-swatch" style={{ background: cluster.color }} />{cluster.label}</button>)}
            {unassigned > 0 && <span><span className="cluster-swatch" style={{ background: '#87969C' }} />{formatClusterNumber(unassigned)} unassigned</span>}
          </div>
        </>}
  </details>;
}
