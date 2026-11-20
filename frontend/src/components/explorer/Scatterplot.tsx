import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { scaleLinear } from 'd3';
import { layoutBeeswarm } from '../../utils/beeswarm';
import { CHART_COLORS, formatCompact } from '../../utils/explorer';
export interface ScatterPoint<Key extends string> { id: Key; label: string; x: number; y: number }
interface Props<Key extends string> {
  id: string; title: string; subtitle: string; points: ScatterPoint<Key>[];
  kind: 'district' | 'listing'; total?: number; emptyMessage?: string;
  xLabel: string; yLabel: string; xFromZero?: boolean; yFromZero?: boolean; integerX?: boolean;
  beeswarm?: boolean;
  selectedId: Key | null; hoveredId: Key | null;
  headerControls?: ReactNode;
  onHover: (id: Key | null) => void; onSelect: (id: Key) => void;
}
const tooltipNumber = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 2 });
const LISTING_DOT_RADIUS = 3;
function domain(values: number[], fromZero: boolean): [number, number] {
  if (!values.length) return [0, 1];
  const min = Math.min(...values), max = Math.max(...values);
  if (fromZero) return [Math.min(0, min), Math.max(1, max * 1.1)];
  const padding = (max - min || Math.max(1, Math.abs(max) * .2)) * .12;
  return [min - padding, max + padding];
}
export default function Scatterplot<Key extends string>({ id, title, subtitle, points, kind, total, emptyMessage, xLabel, yLabel,
  xFromZero = false, yFromZero = false, integerX = false, beeswarm = false, selectedId, hoveredId, headerControls, onHover, onSelect }: Props<Key>) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 480, height: 164 });
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(240, entry.contentRect.width), height: Math.max(112, entry.contentRect.height) }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const { width, height } = size;
  const margin = { top: 12, right: 16, bottom: 44, left: 58 };
  const scales = useMemo(() => {
    const x = scaleLinear().domain(domain(points.map(point => point.x), xFromZero)).nice(4);
    const y = scaleLinear().domain(domain(points.map(point => point.y), yFromZero)).nice(4).range([height - 44, 12]);
    const [min, max] = x.domain();
    const laneWidth = (width - 74) / (max - min + 1);
    const radius = beeswarm ? Math.min(LISTING_DOT_RADIUS, Math.max(1.5, laneWidth / 7.5 - .5)) : LISTING_DOT_RADIUS;
    const spacing = radius * 2 + 1;
    // Reserve symmetric room at the ends and keep each swarm inside its count's lane.
    const halfWidth = beeswarm ? Math.min(28, (laneWidth - spacing) / 2) : 0;
    const swarmWidth = Math.max(0, halfWidth);
    const inset = beeswarm ? swarmWidth + radius : 0;
    x.range([58 + inset, width - 16 - inset]);
    return { x, y, swarmWidth, radius, spacing };
  }, [points, width, height, xFromZero, yFromZero, beeswarm]);
  const listingMode = kind === 'listing';
  const screenPoints = useMemo(() => {
    const projected = points.map(point => ({ id: point.id, x: scales.x(point.x), y: scales.y(point.y) }));
    return beeswarm ? layoutBeeswarm(projected, scales.swarmWidth, scales.spacing) : projected;
  }, [points, scales, beeswarm]);
  const pointsById = useMemo(() => new Map(points.map(point => [point.id, point])), [points]);
  const positionsById = useMemo(() => new Map(screenPoints.map(point => [point.id, point])), [screenPoints]);
  const hovered = hoveredId == null ? undefined : pointsById.get(hoveredId);
  const hoveredPosition = hoveredId == null ? undefined : positionsById.get(hoveredId);
  const selectedPosition = selectedId == null ? undefined : positionsById.get(selectedId);
  const missing = (total ?? points.length) - points.length;
  const xTickCount = beeswarm ? Math.max(4, Math.floor((width - 74) / 25)) : 4;
  const listingMarks = useMemo(() => listingMode && <g aria-hidden="true">
    {screenPoints.map(point => <circle key={point.id} cx={point.x} cy={point.y} r={scales.radius}
      fill={CHART_COLORS.high} fillOpacity={.42} stroke="transparent" strokeWidth={4}
      onMouseEnter={() => onHover(point.id)} onMouseLeave={() => onHover(null)} onClick={() => onSelect(point.id)} />)}
  </g>, [listingMode, screenPoints, scales.radius, onHover, onSelect]);
  function handleListingKey(event: KeyboardEvent<SVGSVGElement>) {
    const current = points.findIndex(point => point.id === hoveredId);
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(points[Math.max(0, current)].id);
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      onHover(points[Math.max(0, Math.min(points.length - 1, current + step))].id);
    }
  }
  return <article className="scatterplot" aria-labelledby={`${id}-title`}>
    <header className="scatterplot__header"><h3 id={`${id}-title`}>{title}</h3>
      {!listingMode && missing > 0 && <span className="chart-status" title={`${missing} districts without complete data`}>{points.length}/{total}</span>}
      {headerControls}
    </header>
    <p className="sr-only" id={`${id}-description`}>{subtitle} {points.length} {kind}s{missing > 0 ? `; ${missing} without complete data` : ''}. Linear axes.
      {beeswarm && ' Points spread sideways around the same count to reveal overlapping prices.'}
      {listingMode && ' Use the arrow keys to browse listings and Enter to open the selected listing.'}</p>
    <div className="chart-canvas" ref={container}>
      {points.length ? <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" role="group" aria-label={title} aria-describedby={`${id}-description`}
        tabIndex={listingMode ? 0 : undefined} onFocus={listingMode ? () => onHover(selectedId && pointsById.has(selectedId) ? selectedId : points[0].id) : undefined}
        onBlur={listingMode ? () => onHover(null) : undefined} onKeyDown={listingMode ? handleListingKey : undefined}>
        {scales.y.ticks(4).map(tick => <g key={tick}>
          <line className="chart-grid" x1={margin.left} x2={width - margin.right} y1={scales.y(tick)} y2={scales.y(tick)} />
          <text className="chart-tick" x={margin.left - 10} y={scales.y(tick)} dy=".35em" textAnchor="end">{formatCompact(tick)}</text>
        </g>)}
        <line className="chart-axis" x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} />
        {scales.x.ticks(xTickCount).filter(tick => !integerX || Number.isInteger(tick)).map(tick => <text key={tick} className="chart-tick" x={scales.x(tick)} y={height - margin.bottom + 22} textAnchor="middle">{formatCompact(tick)}</text>)}
        <text className="chart-axis-label" x={(margin.left + width - margin.right) / 2} y={height - 6} textAnchor="middle">{xLabel}</text>
        <text className="chart-axis-label" transform={`translate(14 ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
        {listingMode ? <>
          {listingMarks}
          {selectedPosition && <circle cx={selectedPosition.x} cy={selectedPosition.y} r={5} pointerEvents="none" fill={CHART_COLORS.selected} stroke="var(--text)" />}
          {hoveredPosition && <circle cx={hoveredPosition.x} cy={hoveredPosition.y} r={7} pointerEvents="none" fill="none" stroke={CHART_COLORS.priceRange} strokeWidth={2} />}
        </> : points.map(point => <circle key={point.id} cx={scales.x(point.x)} cy={scales.y(point.y)}
          r={point.id === (hoveredId ?? selectedId) ? 7 : 5}
          fill={point.id === selectedId ? CHART_COLORS.selected : CHART_COLORS.high}
          stroke={point.id === hoveredId || point.id === selectedId ? 'var(--text)' : 'var(--surface)'} strokeWidth={1.5}
          opacity={selectedId && point.id !== selectedId && point.id !== hoveredId ? .4 : .9}
          role="button" tabIndex={0} aria-pressed={point.id === selectedId}
          aria-describedby={point.id === hoveredId ? `${id}-tooltip` : undefined}
          aria-label={`${point.label}: ${xLabel} ${tooltipNumber.format(point.x)}, ${yLabel} ${tooltipNumber.format(point.y)}`}
          onMouseEnter={() => onHover(point.id)} onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(point.id)} onBlur={() => onHover(null)}
          onClick={() => onSelect(point.id)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(point.id); }
          }}><title>{`${point.label}: ${tooltipNumber.format(point.x)} / ${tooltipNumber.format(point.y)}`}</title></circle>)}
      </svg> : <div className="chart-empty">{emptyMessage ?? 'No complete district data is available for this plot.'}</div>}
      {hovered && hoveredPosition && <div className="chart-tooltip" id={`${id}-tooltip`} role="tooltip" style={{
        left: Math.max(4, Math.min(width - 216, hoveredPosition.x + 12)),
        top: Math.max(4, Math.min(height - 84, hoveredPosition.y - 76)),
      }}><strong>{hovered.label}</strong><span>{xLabel}: {tooltipNumber.format(hovered.x)}</span><span>{yLabel}: {tooltipNumber.format(hovered.y)}</span></div>}
      {listingMode && <span className="sr-only" aria-live="polite">{hovered && `${hovered.label}, ${xLabel}: ${tooltipNumber.format(hovered.x)}, ${tooltipNumber.format(hovered.y)} SEK per night`}</span>}
    </div>
  </article>;
}
