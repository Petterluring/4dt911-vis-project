import type { ListingClustersState } from '../../hooks/useListingClusters';
import { formatClusterNumber } from '../../utils/clustering';
import { distanceMeters, formatDistance } from '../../utils/location';
import ClusterProfileCard from './ClusterProfileCard';
import LocationSearch from './LocationSearch';
import ClusteringConfiguration from './ClusteringConfiguration';
import NearbyClusters from './NearbyClusters';
import ListingDetails from '../explorer/ListingDetails';
import './ListingClusters.css';

interface Props { state: ListingClustersState; onRetry: () => void }
export default function ListingClusters({ state, onRetry }: Props) {
  const { resource, selectedClusterId, selectedCluster, localCluster, selectedListing, location, radiusMeters, nearby,
    selectCluster, clearSelection, selectLocation, setRadiusMeters, closeListing, retry } = state;
  return <section className="listing-clusters" aria-labelledby="listing-clusters-title">
    <header className="listing-clusters__heading"><div><p className="eyebrow">Accommodation profiles · SD3</p><h2 id="listing-clusters-title">Listing Clusters</h2>
      <p>Explore accommodation, asking prices and nearby competition.</p></div>
      <button type="button" className="text-button" disabled={selectedClusterId === null && selectedListing === null} onClick={clearSelection}>Show all clusters</button>
    </header>
    <ClusteringConfiguration state={state} />
    <LocationSearch location={location} radiusMeters={radiusMeters} onRadius={setRadiusMeters} onLocation={selectLocation} />
    {resource.status === 'loading' ? <div className="cluster-state panel" role="status">Loading listing clusters…</div>
      : resource.status === 'error' ? <div className="cluster-state panel" role="alert"><h3>Clustering data is unavailable</h3><p>{resource.error}</p><button type="button" className="text-button" onClick={retry}>Retry clustering data</button></div>
      : <>
        <div className="cluster-data-notice panel" role="note"><strong>{resource.data.metadata.mode === 'mock' ? 'Demonstration clustering · Not machine-learning results' : 'Clustering results'}</strong>
          <p>{resource.data.metadata.description}</p>
          {resource.data.metadata.mode === 'mock' && <p>Groups use room type, guest capacity, bedrooms, and beds. Nightly price is analyzed only after assignment.</p>}
          {resource.data.metadata.source === 'synthetic-fallback' && <button type="button" className="text-button" onClick={onRetry}>Retry existing listing data</button>}
        </div>
        {!resource.data.listings.length ? <div className="cluster-state panel" role="status"><h3>No listings available</h3><p>There are no listings to summarize. Try loading the data again.</p><button type="button" className="text-button" onClick={retry}>Retry data</button></div>
          : <>
            {resource.data.clusters.length ? <details className="cluster-sidebar-section panel" open><summary>Overall cluster profiles</summary>
              <div className="cluster-profiles" role="group" aria-label="Cluster profiles">
              {resource.data.clusters.map(cluster => <ClusterProfileCard key={cluster.id} cluster={cluster}
                selected={cluster.id === selectedClusterId} dimmed={selectedClusterId !== null && cluster.id !== selectedClusterId} onSelect={selectCluster} />)}
              </div></details> : <div className="cluster-state panel" role="status">No cluster assignments are available. Unassigned listings can still be explored on the map.</div>}
            {nearby && <NearbyClusters compact analysis={nearby} radiusMeters={radiusMeters} selectedClusterId={selectedClusterId} onSelect={selectCluster} />}
            <div className="cluster-selection-status" role="status" aria-live="polite">{selectedCluster
              ? `${selectedCluster.label} selected · ${formatClusterNumber(selectedCluster.listingCount)} overall listings${localCluster ? ` · ${formatClusterNumber(localCluster.listingCount)} inside ${formatDistance(radiusMeters)}` : ''}. Other clusters are dimmed.`
              : `Showing all ${formatClusterNumber(resource.data.clusters.length)} clusters · ${formatClusterNumber(resource.data.listings.length)} listings`}</div>
            {nearby && !selectedCluster && <p className="cluster-comparison-hint panel">Select a cluster to compare local and overall prices in the chart below the map.</p>}
            {state.mappedListings.length < resource.data.listings.length && <p className="cluster-chart-note">{formatClusterNumber(resource.data.listings.length - state.mappedListings.length)} listings have no valid map coordinates. They remain included in profiles and price summaries.</p>}
            {selectedListing && <div className="cluster-listing-details panel">
              {location && <p className="cluster-listing-distance">{formatDistance(distanceMeters(location, selectedListing))} from the search point · {nearby?.listingIds.has(selectedListing.id) ? 'Inside' : 'Outside'} the selected radius</p>}
              <ListingDetails key={selectedListing.id} listing={selectedListing} onClose={closeListing} /></div>}
          </>}
      </>}
  </section>;
}
