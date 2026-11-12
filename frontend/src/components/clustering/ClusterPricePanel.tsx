import type { ListingClustersState } from '../../hooks/useListingClusters';
import { formatDistance } from '../../utils/location';
import ClusterPriceBoxplot from './ClusterPriceBoxplot';

export default function ClusterPricePanel({ state }: { state: ListingClustersState }) {
  const { resource, data, nearby, selectedClusterId, selectedCluster, localCluster, radiusMeters, selectCluster } = state;
  const comparing = Boolean(nearby && selectedCluster && localCluster);
  return <section className="comparison-panel panel cluster-comparison-panel" aria-label="Cluster price analysis">
    {resource.status === 'loading' ? <p className="panel-message" role="status">Loading cluster prices…</p>
      : resource.status === 'error' ? <p className="panel-message">Cluster prices unavailable. Retry in the Clustering tab.</p>
        : !data?.clusters.length ? <p className="panel-message">No assigned cluster prices are available.</p>
          : <div className={`comparison-grid${comparing ? '' : ' cluster-comparison-grid--single'}`}>
            <ClusterPriceBoxplot compact clusters={data.clusters} selectedClusterId={selectedClusterId} onSelect={selectCluster}
              title="Overall nightly price distributions"
              description="All loaded listings in each cluster. Select a box to highlight its profile and map listings." />
            {comparing && selectedCluster && localCluster && <ClusterPriceBoxplot compact
              title={`${selectedCluster.label}: local vs overall`}
              description={`Local prices are within ${formatDistance(radiusMeters)} of the search point (solid box). Overall includes all loaded listings in this cluster, including local listings (dashed box). Both use the same SEK/night scale.`}
              clusters={[
                { ...selectedCluster, id: `local:${selectedCluster.id}`, label: `Local · ${formatDistance(radiusMeters)}`, prices: localCluster.prices },
                { ...selectedCluster, id: `overall:${selectedCluster.id}`, label: 'Overall dataset', outline: true },
              ]} selectedClusterId={null} onSelect={selectCluster} interactive={false} showClusterNumbers={false} />}
          </div>}
  </section>;
}
