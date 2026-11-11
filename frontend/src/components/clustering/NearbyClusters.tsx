import type { NearbyAnalysis } from '../../interfaces/location';
import { formatClusterNumber } from '../../utils/clustering';
import { formatDistance } from '../../utils/location';

interface Props { analysis: NearbyAnalysis; radiusMeters: number; selectedClusterId: string | null; onSelect: (id: string) => void }
export default function NearbyClusters({ analysis, radiusMeters, selectedClusterId, onSelect }: Props) {
  const total = analysis.listingIds.size;
  return <section className="nearby-clusters panel" aria-labelledby="nearby-clusters-title">
    <header className="cluster-panel-heading"><div><p className="eyebrow">Nearby accommodation</p><h2 id="nearby-clusters-title">Clusters within {formatDistance(radiusMeters)}</h2></div><span>{formatClusterNumber(total)} listings</span></header>
    <p className="cluster-panel-description">Select a cluster to highlight nearby listings and compare local prices with the overall dataset. Rows are ordered by nearest listing.</p>
    {!total && <p className="nearby-clusters__empty" role="status">No loaded listings are within this radius. Increase the radius or try another location.</p>}
    <div className="nearby-clusters__scroll"><table>
      <caption className="sr-only">Nearby cluster shares, median nightly asking prices in SEK, and straight-line distance to the nearest listing in the dataset.</caption>
      <thead><tr><th scope="col">Cluster</th><th scope="col">Local listings</th><th scope="col">Area share</th><th scope="col">Local median / night</th><th scope="col">Nearest in dataset</th></tr></thead>
      <tbody>{analysis.clusters.map(row => <tr key={row.cluster.id} data-selected={selectedClusterId === row.cluster.id}>
        <th scope="row"><button type="button" aria-pressed={selectedClusterId === row.cluster.id} onClick={() => onSelect(row.cluster.id)}>
          <span className="cluster-swatch" style={{ background: row.cluster.color }} />{row.cluster.label}</button></th>
        <td>{formatClusterNumber(row.listingCount)}</td><td>{formatClusterNumber(row.percentage)}%</td>
        <td>{row.prices ? `${formatClusterNumber(row.prices.median)} SEK` : 'No price data'}{row.prices && <small>{formatClusterNumber(row.prices.count)} priced listings</small>}</td>
        <td>{formatDistance(row.nearestDistanceMeters)}</td>
      </tr>)}</tbody>
    </table></div>
    <p className="cluster-chart-note">Shares use all {formatClusterNumber(total)} listings inside the radius{analysis.unassignedCount > 0 ? `, including ${formatClusterNumber(analysis.unassignedCount)} without a valid cluster assignment` : ''}. Distances are straight-line proximity; cluster membership describes accommodation characteristics.</p>
  </section>;
}
