import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { scaleBand, scaleLinear } from 'd3';
import type { ClusterProfile } from '../../interfaces/clustering';
import { formatCompact } from '../../utils/explorer';
import { formatClusterNumber, knownNonnegative, validDistribution } from '../../utils/clustering';

type PriceSeries = Pick<ClusterProfile, 'id' | 'label' | 'color' | 'prices'> & { outline?: boolean };
interface Props {
  clusters: PriceSeries[]; selectedClusterId: string | null; onSelect: (id: string) => void;
  title?: string; description?: string; interactive?: boolean; showClusterNumbers?: boolean;
}
export default function ClusterPriceBoxplot({ clusters, selectedClusterId, onSelect,
  title = 'Nightly price distributions', description = 'Boxes show the middle 50% of prices; the line marks the median. Select a box to explore its cluster.',
  interactive = true, showClusterNumbers = true }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const headingId = useId();
  const [availableWidth, setAvailableWidth] = useState(480);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const width = Math.max(availableWidth, clusters.length * 154 + 84);
  const height = 360, left = 66, right = 18, top = 24, bottom = 62;
  const { x, y } = useMemo(() => {
    let maximum = 1;
    for (const cluster of clusters) {
      if (!validDistribution(cluster.prices)) continue;
      maximum = Math.max(maximum, cluster.prices.upperWhisker);
      for (const value of cluster.prices.outliers) if (knownNonnegative(value)) maximum = Math.max(maximum, value);
    }
    return {
      x: scaleBand<string>().domain(clusters.map(cluster => cluster.id)).range([left, width - right]).padding(.42),
      y: scaleLinear().domain([0, maximum * 1.08]).nice(5).range([height - bottom, top]),
    };
  }, [clusters, width]);
  const hovered = clusters.find(cluster => cluster.id === hoveredId);
  const stats = hovered?.prices;
  return <article className="cluster-price panel" aria-labelledby={headingId}>
    <header className="cluster-panel-heading"><div><p className="eyebrow">Compare asking prices</p><h2 id={headingId}>{title}</h2></div><span>SEK / night</span></header>
    <p className="cluster-panel-description">{description}</p>
    <div className="cluster-chart-scroll" ref={container}>
      <div className="cluster-chart-canvas" style={{ width }}>
        <svg width={width} height={height} role="group" aria-label={`${title} in SEK per night`}>
          {y.ticks(5).map(tick => <g key={tick}>
            <line className="chart-grid" x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} />
            <text className="chart-tick" x={left - 10} y={y(tick)} dy=".35em" textAnchor="end">{formatCompact(tick)}</text>
          </g>)}
          <text className="chart-axis-label" transform={`translate(15 ${(top + height - bottom) / 2}) rotate(-90)`} textAnchor="middle">SEK / night</text>
          <line className="chart-axis" x1={left} x2={width - right} y1={height - bottom} y2={height - bottom} />
          {clusters.map((cluster, index) => {
            const distribution = validDistribution(cluster.prices) ? cluster.prices : null;
            const center = x(cluster.id)! + x.bandwidth() / 2;
            const boxWidth = Math.min(70, x.bandwidth());
            const selected = cluster.id === selectedClusterId;
            const summary = distribution
              ? `${distribution.count} prices; lower whisker ${formatClusterNumber(distribution.lowerWhisker)}, Q1 ${formatClusterNumber(distribution.q1)}, median ${formatClusterNumber(distribution.median)}, Q3 ${formatClusterNumber(distribution.q3)}, upper whisker ${formatClusterNumber(distribution.upperWhisker)} SEK per night; ${distribution.outliers.length} outliers`
              : 'No nightly prices available';
            return <g key={cluster.id} className={`cluster-boxplot${interactive ? '' : ' cluster-boxplot--static'}`} role={interactive ? 'button' : 'img'} tabIndex={0} aria-pressed={interactive ? selected : undefined}
              aria-label={`${cluster.label}: ${summary}`} aria-describedby={hoveredId === cluster.id ? tooltipId : undefined}
              opacity={selectedClusterId && !selected ? .3 : 1}
              onMouseEnter={() => setHoveredId(cluster.id)} onMouseLeave={() => setHoveredId(null)}
              onFocus={() => setHoveredId(cluster.id)} onBlur={() => setHoveredId(null)} onClick={interactive ? () => onSelect(cluster.id) : undefined}
              onKeyDown={event => {
                if (interactive && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onSelect(cluster.id); }
                if (event.key === 'Escape') setHoveredId(null);
              }}>
              <title>{`${cluster.label}: ${summary}`}</title>
              <rect x={x(cluster.id)! - 12} y={top} width={x.bandwidth() + 24} height={height - top} fill="transparent" />
              {distribution ? <g pointerEvents="none" stroke={cluster.color} strokeWidth={selected ? 3 : 2}>
                <line x1={center} x2={center} y1={y(distribution.lowerWhisker)} y2={y(distribution.upperWhisker)} />
                {[distribution.lowerWhisker, distribution.upperWhisker].map((value, i) => <line key={i} x1={center - boxWidth / 3} x2={center + boxWidth / 3} y1={y(value)} y2={y(value)} />)}
                <rect x={center - boxWidth / 2} y={y(distribution.q3)} width={boxWidth} height={Math.max(2, y(distribution.q1) - y(distribution.q3))} fill={cluster.color} fillOpacity={cluster.outline ? .04 : .22} strokeDasharray={cluster.outline ? '5 3' : undefined} />
                <line x1={center - boxWidth / 2} x2={center + boxWidth / 2} y1={y(distribution.median)} y2={y(distribution.median)} strokeWidth={3} />
                {distribution.outliers.filter(knownNonnegative).map((value, i) => <circle key={i} cx={center + (i % 5 - 2) * 3} cy={y(value)} r={3} fill="var(--surface)" strokeWidth={1.5} />)}
              </g> : <text className="chart-tick" x={center} y={(top + height - bottom) / 2} textAnchor="middle">No price data</text>}
              <text className="chart-tick" x={center} y={height - bottom + 22} textAnchor="middle" fontWeight={selected ? 700 : 400}>{cluster.label.length > 21 ? `${cluster.label.slice(0, 20)}…` : cluster.label}</text>
              <text className="chart-tick" x={center} y={height - bottom + 40} textAnchor="middle">{showClusterNumbers ? `Cluster ${index + 1}` : `${formatClusterNumber(distribution?.count ?? 0)} priced listings`}</text>
            </g>;
          })}
        </svg>
        {hovered && stats && validDistribution(stats) && <div className="chart-tooltip cluster-price-tooltip" id={tooltipId} role="tooltip" style={{
          left: Math.max(4, Math.min(width - 220, x(hovered.id)! + x.bandwidth() / 2 - 100)), top: 28,
        }}><strong>{hovered.label}</strong><span>{formatClusterNumber(stats.count)} listings with a price · SEK / night</span>
          <span>Lower whisker: {formatClusterNumber(stats.lowerWhisker)}</span><span>Q1: {formatClusterNumber(stats.q1)}</span>
          <strong>Median: {formatClusterNumber(stats.median)}</strong><span>Q3: {formatClusterNumber(stats.q3)}</span>
          <span>Upper whisker: {formatClusterNumber(stats.upperWhisker)}</span><span>Outliers: {formatClusterNumber(stats.outliers.length)}</span>
        </div>}
      </div>
    </div>
    <p className="cluster-chart-note">Whiskers: observed prices within 1.5 × IQR. Circles: outliers. Missing prices are excluded; cluster membership never uses price.</p>
  </article>;
}
