import type { CSSProperties } from 'react';
import type { ClusterProfile } from '../../interfaces/clustering';
import { formatClusterNumber } from '../../utils/clustering';

interface Props { cluster: ClusterProfile; index: number; selected: boolean; dimmed: boolean; onSelect: (id: string) => void }
export default function ClusterProfileCard({ cluster, index, selected, dimmed, onSelect }: Props) {
  return <button type="button" className={`cluster-profile panel${dimmed ? ' is-dimmed' : ''}`}
    style={{ '--cluster-color': cluster.color } as CSSProperties} aria-pressed={selected} onClick={() => onSelect(cluster.id)}>
    <span className="cluster-profile__heading"><span className="eyebrow">Cluster {index + 1}</span><span>{formatClusterNumber(cluster.listingCount)} listings</span></span>
    <strong className="cluster-profile__name"><span className="cluster-swatch" style={{ background: cluster.color }} />{cluster.label}</strong>
    {cluster.description && <span className="cluster-profile__description">{cluster.description}</span>}
    <span className="cluster-profile__facts">
      <span><strong>{formatClusterNumber(cluster.medianAccommodates)}</strong><span>Median guests</span></span>
      <span><strong>{formatClusterNumber(cluster.medianBedrooms)}</strong><span>Median bedrooms</span></span>
      <span><strong>{formatClusterNumber(cluster.medianBeds)}</strong><span>Median beds</span></span>
    </span>
    <span className="cluster-profile__composition" aria-label="Room-type composition">
      {cluster.roomTypes.length ? cluster.roomTypes.map(type => <span key={type.label}><span>{type.label}</span><strong>{formatClusterNumber(type.percentage)}%</strong></span>) : <span>Room types unavailable</span>}
    </span>
    <span className="cluster-profile__action">{selected ? 'Selected · Click to show all' : 'Select cluster'}</span>
  </button>;
}
