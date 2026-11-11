import { useMemo, useState } from 'react';
import type { DistrictGeometry, ListingLocation, Resource } from '../../interfaces/explorer';
import type { GeocodedLocation } from '../../interfaces/location';
import { useClusteringData } from '../../hooks/useClusteringData';
import { formatClusterNumber } from '../../utils/clustering';
import { analyzeNearbyClusters, distanceMeters, formatDistance } from '../../utils/location';
import ClusterProfileCard from './ClusterProfileCard';
import ClusterPriceBoxplot from './ClusterPriceBoxplot';
import ClusterMap from './ClusterMap';
import LocationSearch from './LocationSearch';
import NearbyClusters from './NearbyClusters';
import ListingDetails from '../explorer/ListingDetails';
import './ListingClusters.css';

interface Props { listings: Resource<ListingLocation[]>; geometry: Resource<DistrictGeometry>; onRetry: () => void }
export default function ListingClusters({ listings, geometry, onRetry }: Props) {
  const resource = useClusteringData(listings);
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
  return <section className="listing-clusters" aria-labelledby="listing-clusters-title">
    <header className="listing-clusters__heading"><div><p className="eyebrow">Accommodation profiles · SD3</p><h2 id="listing-clusters-title">Listing Clusters</h2>
      <p>Explore how accommodation characteristics relate to asking prices and location.</p></div>
      <button type="button" className="text-button" disabled={selectedClusterId === null && selectedListingId === null} onClick={clearSelection}>Show all clusters</button>
    </header>
    {resource.status === 'loading' ? <div className="cluster-state panel" role="status">Loading listing clusters…</div>
      : resource.status === 'error' ? <div className="cluster-state panel" role="alert"><h3>Clustering data is unavailable</h3><p>{resource.error}</p><button type="button" className="text-button" onClick={onRetry}>Retry data</button></div>
      : <>
        <div className="cluster-data-notice panel" role="note"><strong>{resource.data.metadata.mode === 'mock' ? 'Demonstration clustering · Not machine-learning results' : 'Clustering results'}</strong>
          <p>{resource.data.metadata.description}</p>
          {resource.data.metadata.mode === 'mock' && <p>Groups use room type, guest capacity, bedrooms, and beds. Nightly price is analyzed only after assignment.</p>}
          {resource.data.metadata.source === 'synthetic-fallback' && <button type="button" className="text-button" onClick={onRetry}>Retry existing listing data</button>}
        </div>
        <LocationSearch location={location} radiusMeters={radiusMeters} onRadius={setRadiusMeters} onLocation={next => {
          setLocation(next); setSelectedListingId(null);
        }} />
        {!resource.data.listings.length ? <><div className="cluster-state panel" role="status"><h3>No listings available</h3><p>There are no listings to summarize. Try loading the data again.</p><button type="button" className="text-button" onClick={onRetry}>Retry data</button></div>
          {searchArea && <ClusterMap geometry={geometry} clusters={resource.data.clusters} listings={resource.data.listings}
            selectedClusterId={selectedClusterId} selectedListingId={null} onSelectCluster={selectCluster} onSelectListing={selectListing}
            onClear={clearSelection} onRetry={onRetry} searchArea={searchArea} nearbyListingIds={nearby?.listingIds} />}</>
          : <>
            {resource.data.clusters.length > 0 && nearby && <p className="cluster-profiles-label">Overall cluster profiles · all loaded listings</p>}
            {resource.data.clusters.length ? <div className="cluster-profiles" role="group" aria-label="Cluster profiles">
              {resource.data.clusters.map((cluster, index) => <ClusterProfileCard key={cluster.id} cluster={cluster} index={index}
                selected={cluster.id === selectedClusterId} dimmed={selectedClusterId !== null && cluster.id !== selectedClusterId} onSelect={selectCluster} />)}
            </div> : <div className="cluster-state panel" role="status">No cluster assignments are available. Unassigned listings can still be explored on the map.</div>}
            {nearby && <NearbyClusters analysis={nearby} radiusMeters={radiusMeters} selectedClusterId={selectedClusterId} onSelect={selectCluster} />}
            <div className="cluster-selection-status" role="status" aria-live="polite">{selectedCluster
              ? `${selectedCluster.label} selected · ${formatClusterNumber(selectedCluster.listingCount)} overall listings${localCluster ? ` · ${formatClusterNumber(localCluster.listingCount)} inside ${formatDistance(radiusMeters)}` : ''}. Other clusters are dimmed.`
              : `Showing all ${formatClusterNumber(resource.data.clusters.length)} clusters · ${formatClusterNumber(resource.data.listings.length)} listings`}</div>
            <div className="cluster-visualizations">
              {resource.data.clusters.length > 0 && <ClusterPriceBoxplot clusters={resource.data.clusters} selectedClusterId={selectedClusterId} onSelect={selectCluster}
                title={nearby ? 'Overall nightly price distributions' : undefined}
                description={nearby ? 'These distributions use all loaded listings in each cluster. Select a box to compare its local and overall prices below.' : undefined} />}
              <ClusterMap geometry={geometry} clusters={resource.data.clusters} listings={resource.data.listings}
                selectedClusterId={selectedClusterId} selectedListingId={selectedListing && (!nearby || nearby.listingIds.has(selectedListing.id)) ? selectedListing.id : null} onSelectCluster={selectCluster}
                onSelectListing={selectListing} onClear={clearSelection} onRetry={onRetry} searchArea={searchArea} nearbyListingIds={nearby?.listingIds} />
            </div>
            {nearby && <div className="cluster-local-comparison">
              {selectedCluster && localCluster ? <ClusterPriceBoxplot
                title={`${selectedCluster.label}: local vs overall`}
                description={`Local prices are within ${formatDistance(radiusMeters)} of the search point (solid box). Overall includes this cluster across the full loaded dataset, including local listings (dashed box). Both use the same SEK/night scale.`}
                clusters={[
                  { ...selectedCluster, id: `local:${selectedCluster.id}`, label: `Local · ${formatDistance(radiusMeters)}`, prices: localCluster.prices },
                  { ...selectedCluster, id: `overall:${selectedCluster.id}`, label: 'Overall dataset', outline: true },
                ]} selectedClusterId={null} onSelect={selectCluster} interactive={false} showClusterNumbers={false} />
                : <p className="cluster-comparison-hint panel">Select a profile card, boxplot, or nearby cluster to compare its local and overall nightly-price distributions.</p>}
            </div>}
            {selectedListing && <div className="cluster-listing-details panel">
              {location && <p className="cluster-listing-distance">{formatDistance(distanceMeters(location, selectedListing))} from the search point · {nearby?.listingIds.has(selectedListing.id) ? 'Inside' : 'Outside'} the selected radius</p>}
              <ListingDetails key={selectedListing.id} listing={selectedListing} onClose={() => setSelectedListingId(null)} /></div>}
          </>}
      </>}
  </section>;
}
