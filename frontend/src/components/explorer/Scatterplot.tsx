import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { scaleLinear } from 'd3';
import { DISTRICTS } from '../../interfaces/explorer';
import type { District } from '../../interfaces/explorer';
import { CHART_COLORS, formatCompact } from '../../utils/explorer';
export interface ScatterPoint { district: District; x: number; y: number }
interface Props {
  id: string; title: string; subtitle: string; points: ScatterPoint[];
  xLabel: string; yLabel: string; xFromZero?: boolean; yFromZero?: boolean;
  selectedDistrict: District | null; hoveredDistrict: District | null;
  headerControls?: ReactNode;
  onHover: (district: District | null) => void; onSelect: (district: District) => void;
}
const tooltipNumber = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 2 });
function domain(values: number[], fromZero: boolean): [number, number] {
  if (!values.length) return [0, 1];
  const min = Math.min(...values), max = Math.max(...values);
  if (fromZero) return [Math.min(0, min), Math.max(1, max * 1.1)];
  const padding = (max - min || Math.max(1, Math.abs(max) * .2)) * .12;
  return [min - padding, max + padding];
}
export default function Scatterplot({ id, title, subtitle, points, xLabel, yLabel,
  xFromZero = false, yFromZero = false, selectedDistrict, hoveredDistrict, headerControls, onHover, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 480, height: 164 });
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: Math.max(240, entry.contentRect.width), height: Math.max(124, entry.contentRect.height) }));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const { width, height } = size;
  const margin = { top: 12, right: 16, bottom: 44, left: 58 };
  const scales = useMemo(() => ({
    x: scaleLinear().domain(domain(points.map(point => point.x), xFromZero)).nice(4).range([58, width - 16]),
    y: scaleLinear().domain(domain(points.map(point => point.y), yFromZero)).nice(4).range([height - 44, 12]),
  }), [points, width, height, xFromZero, yFromZero]);
  const hovered = points.find(point => point.district === hoveredDistrict);
  const missing = DISTRICTS.length - points.length;
  return <article className="scatterplot" aria-labelledby={`${id}-title`}>
    <header className="scatterplot__header"><h3 id={`${id}-title`}>{title}</h3>
      {missing > 0 && <span className="chart-status" title={`${missing} districts without complete data`}>{points.length}/{DISTRICTS.length}</span>}
      {headerControls}
    </header>
    <p className="sr-only" id={`${id}-description`}>{subtitle} {points.length} districts{missing > 0 ? `; ${missing} without complete data` : ''}. Linear axes.</p>
    <div className="chart-canvas" ref={container}>
      {points.length ? <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" role="group" aria-label={title} aria-describedby={`${id}-description`}>
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
          aria-describedby={point.district === hoveredDistrict ? `${id}-tooltip` : undefined}
          aria-label={`${point.district}: ${xLabel} ${tooltipNumber.format(point.x)}, ${yLabel} ${tooltipNumber.format(point.y)}`}
          onMouseEnter={() => onHover(point.district)} onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(point.district)} onBlur={() => onHover(null)}
          onClick={() => onSelect(point.district)} onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(point.district); }
          }}><title>{`${point.district}: ${tooltipNumber.format(point.x)} / ${tooltipNumber.format(point.y)}`}</title></circle>)}
      </svg> : <div className="chart-empty">No complete district data is available for this plot.</div>}
      {hovered && <div className="chart-tooltip" id={`${id}-tooltip`} role="tooltip" style={{
        left: Math.max(4, Math.min(width - 216, scales.x(hovered.x) + 12)),
        top: Math.max(4, Math.min(height - 84, scales.y(hovered.y) - 76)),
      }}><strong>{hovered.district}</strong><span>{xLabel}: {tooltipNumber.format(hovered.x)}</span><span>{yLabel}: {tooltipNumber.format(hovered.y)}</span></div>}
    </div>
  </article>;
}
