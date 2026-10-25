import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { select, zoom, zoomIdentity } from 'd3';
import type { ZoomBehavior } from 'd3';
import type { District, DistrictGeometry, DistrictPrices, ListingLocation, PriceMetric } from '../../interfaces/explorer';
import { CHART_COLORS, metricScale } from '../../utils/explorer';
import { districtPath, fittedTransform, project, screenDistrictPath, visibleTiles } from '../../utils/map';
import { MAP_CLICK_DISTANCE, markerRadii, canSelectListings, movedBeyondClick, nearestListing } from '../../utils/listing';
interface Props {
  geometry: DistrictGeometry;
  prices: DistrictPrices[];
  listings: ListingLocation[];
  metric: PriceMetric;
  selectedDistrict: District | null;
  hoveredDistrict: District | null;
  selectedListingId: string | null;
  showListings: boolean;
  showBasemap: boolean;
  comparisonOpen: boolean;
  onHover: (district: District | null) => void;
  onSelect: (district: District) => void;
  onSelectListing: (listing: ListingLocation) => void;
}
export default function DistrictMap({ geometry, prices, listings, metric, selectedDistrict,
  hoveredDistrict, selectedListingId, showListings, showBasemap, comparisonOpen, onHover, onSelect, onSelectListing }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gesture = useRef({ start: [0, 0] as [number, number], moved: false, active: false });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [transform, setTransform] = useState(zoomIdentity);
  const listingsSelectable = canSelectListings(transform.k);
  const [tileError, setTileError] = useState(false);
  const [tileRevision, setTileRevision] = useState(0);
  const scale = useMemo(() => metricScale(prices, metric), [prices, metric]);
  const values = useMemo(() => new Map(prices.map(row => [row.district, row[metric]])), [prices, metric]);
  const paths = useMemo(() => {
    const path = screenDistrictPath(transform);
    return geometry.features.map(feature => ({ district: feature.properties.district,
      path: path(feature) ?? '', center: transform.apply(districtPath.centroid(feature)),
    }));
  }, [geometry, transform]);
  const tiles = useMemo(() => showBasemap ? visibleTiles(transform, size.width, size.height) : [], [transform, size, showBasemap]);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!svg.current) return;
    const element = select(svg.current);
    const behavior = zoom<SVGSVGElement, unknown>()
      .extent([[0, 0], [size.width, size.height]])
      .scaleExtent([128, 2 ** 19])
      .translateExtent([[0, 0], [256, 256]])
      .clickDistance(MAP_CLICK_DISTANCE)
      .on('zoom', event => setTransform(event.transform));
    element.call(behavior).on('dblclick.zoom', null);
    zoomBehavior.current = behavior;
    element.call(behavior.transform, fittedTransform(geometry, size.width, size.height, comparisonOpen));
    return () => { element.on('.zoom', null); zoomBehavior.current = null; };
  }, [geometry, size, comparisonOpen]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = size.width * ratio;
    element.height = size.height * ratio;
    const context = element.getContext('2d');
    if (!context) return;
    context.scale(ratio, ratio);
    context.clearRect(0, 0, size.width, size.height);
    if (!showListings) return;
    context.fillStyle = CHART_COLORS.high;
    context.globalAlpha = .65;
    const radii = markerRadii(transform.k);
    context.beginPath();
    for (const listing of listings) {
      const [x, y] = transform.apply(project(listing.longitude, listing.latitude));
      if (x < -radii.normal || y < -radii.normal || x > size.width + radii.normal || y > size.height + radii.normal) continue;
      context.moveTo(x + radii.normal, y);
      context.arc(x, y, radii.normal, 0, Math.PI * 2);
    }
    context.fill();
    const selected = listings.find(listing => listing.id === selectedListingId);
    if (selected) {
      const [x, y] = transform.apply(project(selected.longitude, selected.latitude));
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(x, y, radii.selected + 2, 0, Math.PI * 2);
      context.fillStyle = '#FFFFFF';
      context.fill();
      context.beginPath();
      context.arc(x, y, radii.selected, 0, Math.PI * 2);
      context.fillStyle = CHART_COLORS.selected;
      context.strokeStyle = '#172B36';
      context.lineWidth = 2;
      context.fill(); context.stroke();
    }
  }, [listings, transform, size, showListings, selectedListingId]);
  function updateGesture(event: PointerEvent<SVGSVGElement>) {
    if (gesture.current.active && movedBeyondClick(gesture.current.start, [event.clientX, event.clientY])) gesture.current.moved = true;
  }
  function handleClick(event: MouseEvent<SVGSVGElement>) {
    if (event.detail === 0) return;
    if (gesture.current.moved) { event.preventDefault(); event.stopPropagation(); return; }
    if (!showListings || !listingsSelectable) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const listing = nearestListing(listings, transform, [event.clientX - bounds.left, event.clientY - bounds.top]);
    if (listing) {
      event.stopPropagation(); onHover(null); onSelectListing(listing);
    }
  }
  function changeZoom(factor: number) {
    if (svg.current && zoomBehavior.current) select(svg.current).call(zoomBehavior.current.scaleBy, factor);
  }
  function resetView() {
    if (svg.current && zoomBehavior.current) select(svg.current).call(zoomBehavior.current.transform,
      fittedTransform(geometry, size.width, size.height, comparisonOpen));
  }
  return <div className="district-map" ref={container}>
    <svg ref={svg} width={size.width} height={size.height} aria-label="Interactive Stockholm district map" focusable="false"
      onDragStart={event => event.preventDefault()} onClickCapture={handleClick}
      onPointerDownCapture={event => {
        if (event.isPrimary) gesture.current = { start: [event.clientX, event.clientY], moved: false, active: true };
      }} onPointerMoveCapture={updateGesture} onPointerUpCapture={event => { updateGesture(event); gesture.current.active = false; }}
      onPointerCancelCapture={() => { gesture.current.moved = true; gesture.current.active = false; }}>
      <g className="map-tiles" aria-hidden="true" pointerEvents="none">
        {tiles.map(tile => <image key={`${tile.z}/${tile.x}/${tile.y}/${tileRevision}`}
          href={`https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`}
          x={transform.x + tile.x * tile.size * transform.k} y={transform.y + tile.y * tile.size * transform.k}
          width={tile.size * transform.k + .5} height={tile.size * transform.k + .5}
          onError={() => setTileError(true)} />)}
      </g>
      <g className="map-districts">
        {paths.map(({ district, path }) => <path key={district} d={path} fillRule="evenodd"
          fill={selectedDistrict === district ? CHART_COLORS.selected : scale.color(values.get(district))}
          fillOpacity={showBasemap ? .7 : 1}
          stroke={selectedDistrict === district || hoveredDistrict === district ? CHART_COLORS.selected : '#FFFFFF'}
          strokeWidth={selectedDistrict === district || hoveredDistrict === district ? 3 : 1.5}
          focusable="false" aria-label={district} data-selected={selectedDistrict === district}
          onMouseEnter={() => { if (!(gesture.current.active && gesture.current.moved)) onHover(district); }} onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(district)}><title>{district}</title></path>)}
      </g>
    </svg>
    <canvas ref={canvas} className="listing-canvas" aria-hidden="true" />
    <svg className="map-label-overlay" width={size.width} height={size.height} aria-hidden="true" focusable="false">
      <g className="map-labels" pointerEvents="none">
        {paths.map(({ district, center }) => <text key={district} x={center[0]} y={center[1]} textAnchor="middle"
          className={selectedDistrict === district ? 'is-selected' : ''}>{district}</text>)}
      </g>
    </svg>
    <div className="map-navigation panel" aria-label="Map navigation">
      <div className="map-navigation__zoom">
        <button type="button" onClick={() => changeZoom(2)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => changeZoom(.5)} aria-label="Zoom out">−</button>
      </div>
      <button className="recenter-button" type="button" onClick={resetView} title="Fit all Stockholm districts" aria-label="Recenter map">Recenter</button>
      {showListings && <p className="map-navigation__hint" role="status">{listingsSelectable ? 'Click a listing to explore' : 'Zoom in to select listings'}</p>}
    </div>
    {showBasemap && tileError && <div className="tile-error panel" role="status">
      Some map tiles are unavailable. District layers remain usable.
      <button className="text-button" onClick={() => { setTileRevision(value => value + 1); setTileError(false); }}>Retry tiles</button>
    </div>}
    <div className="map-attribution">District boundaries: City of Stockholm ·
      {showBasemap && <> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></>}
    </div>
  </div>;
}
