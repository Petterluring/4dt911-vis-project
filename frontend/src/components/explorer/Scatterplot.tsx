import { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3';
import type { District } from '../../interfaces/explorer';
import { CHART_COLORS, formatCompact, formatNumber } from '../../utils/explorer';
export interface ScatterPoint { district: District; x: number; y: number }
interface Props {
  id: string; title: string; subtitle: string; points: ScatterPoint[];
  xLabel: string; yLabel: string; xFromZero?: boolean; yFromZero?: boolean;
  selectedDistrict: District | null; hoveredDistrict: District | null;
  onHover: (district: District | null) => void; onSelect: (district: District) => void;
}
function domain(values: number[], fromZero: boolean): [number, number] {
  if (!values.length) return [0, 1];
  const min = Math.min(...values), max = Math.max(...values);
  if (fromZero) return [Math.min(0, min), Math.max(1, max * 1.1)];
  const padding = (max - min || Math.max(1, Math.abs(max) * .2)) * .12;
  return [min - padding, max + padding];
}
export default function Scatterplot({ id, title, subtitle, points, xLabel, yLabel,
  xFromZero = false, yFromZero = false, selectedDistrict, hoveredDistrict, onHover, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(480);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const height = 240, margin = { top: 12, right: 20, bottom: 52, left: 62 };
  const scales = useMemo(() => ({
    x: scaleLinear().domain(domain(points.map(point => point.x), xFromZero)).nice(4).range([62, width - 20]),
    y: scaleLinear().domain(domain(points.map(point => point.y), yFromZero)).nice(4).range([188, 12]),
  }), [points, width, xFromZero, yFromZero]);
  const active = points.find(point => point.district === (hoveredDistrict ?? selectedDistrict));
  return <article className="scatterplot" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{title}</h3><p className="muted chart-subtitle">{subtitle}</p>
    <div ref={container}>
      {points.length ? <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="group" aria-label={title}>
        {scales.y.ticks(4).map(tick => <g key={tick}>
          <line className="chart-grid" x1={margin.left} x2={width - margin.right} y1={scales.y(tick)} y2={scales.y(tick)} />
          <text className="chart-tick" x={margin.left - 10} y={scales.y(tick)} dy=".35em" textAnchor="end">{formatCompact(tick)}</text>
        </g>)}
        <line className="chart-axis" x1={margin.left} x2={width - margin.right} y1={height - margin.bottom} y2={height - margin.bottom} />
        {scales.x.ticks(4).map(tick => <text key={tick} className="chart-tick" x={scales.x(tick)} y={height - margin.bottom + 22} textAnchor="middle">{formatCompact(tick)}</text>)}
        <text className="chart-axis-label" x={(margin.left + width - margin.right) / 2} y={height - 6} textAnchor="middle">{xLabel}</text>
        <text className="chart-axis-label" transform={`translate(14 ${(margin.top + height - margin.bottom) / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
        {points.map(point => <circle key={point.district} cx={scales.x(point.x)} cy={scales.y(point.y)}
          r={point.district === (hoveredDistrict ?? selectedDistrict) ? 7 : 5}
          fill={point.district === selectedDistrict ? CHART_COLORS.selected : CHART_COLORS.high}
          stroke={point.district === hoveredDistrict || point.district === selectedDistrict ? 'var(--text)' : 'var(--surface)'} strokeWidth={1.5}
          opacity={selectedDistrict && point.district !== selectedDistrict && point.district !== hoveredDistrict ? .4 : .9}
          role="button" tabIndex={0} aria-pressed={point.district === selectedDistrict}
          aria-label={`${point.district}: ${xLabel} ${formatNumber(point.x)}, ${yLabel} ${formatNumber(point.y)}`}
          onMouseEnter={() => onHover(point.district)} onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(point.district)} onBlur={() => onHover(null)}
          onClick={() => onSelect(point.district)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(point.district); }
          }}><title>{point.district}</title></circle>)}
      </svg> : <div className="chart-empty">No complete district data is available for this plot.</div>}
    </div>
    <div className="chart-readout" aria-live="polite">
      {active ? <><strong>{active.district}</strong><span>{xLabel}: {formatNumber(active.x)} · {yLabel}: {formatNumber(active.y)}</span></>
        : <span>Hover or select a district to compare its values.</span>}
    </div>
    <p className="muted chart-count">{points.length} districts{points.length < 11 ? ` · ${11 - points.length} without complete data` : ''} · Linear axes</p>
  </article>;
}
