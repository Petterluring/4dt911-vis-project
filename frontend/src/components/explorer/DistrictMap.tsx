import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { select, zoom, zoomIdentity, zoomTransform } from 'd3';
import type { ZoomBehavior } from 'd3';
import type { ListingFocusRequest } from '../../utils/map';
import type { District, DistrictGeometry, DistrictPrices, ListingLocation, PriceMetric } from '../../interfaces/explorer';
import type { LocationSearchArea } from '../../interfaces/location';
import { formatDistance, radiusGeometry } from '../../utils/location';
import { CHART_COLORS, listingMetricScale, metricScale } from '../../utils/explorer';
import { districtPath, fittedTransform, focusedAreaTransform, focusedListingTransform, project, screenDistrictPath, visibleTiles } from '../../utils/map';
import { MAP_CLICK_DISTANCE, markerRadii, canSelectListings, movedBeyondClick, nearestListing } from '../../utils/listing';
import { listingsInLasso, listingsInRectangle, selectionBounds } from '../../utils/selection';
import type { Point } from '../../utils/selection';
type SelectionTool = 'rectangle' | 'lasso';
interface Props {
  searchArea?: LocationSearchArea | null;
  listingColor?: (listing: ListingLocation) => string;
  highlightedListingIds?: ReadonlySet<string> | null;
  listingScale?: ReturnType<typeof listingMetricScale>;
  onDetailZoom?: (active: boolean) => void;
  groupIds?: ReadonlySet<string> | null;
  onSelectGroup?: (ids: string[], add: boolean) => void;
  geometry: DistrictGeometry;
  prices: DistrictPrices[];
  listings: ListingLocation[];
  metric: PriceMetric;
  selectedDistrict: District | null;
  hoveredDistrict: District | null;
  selectedListingId: string | null;
  showListings: boolean;
  showBasemap: boolean;
  showDistricts: boolean;
  focusRequest?: ListingFocusRequest | null;
  onHover: (district: District | null) => void;
  onSelect: (district: District) => void;
  onSelectListing: (listing: ListingLocation) => void;
}
export default function DistrictMap({ geometry, prices, listings, metric, selectedDistrict,
  hoveredDistrict, selectedListingId, showListings, showBasemap, showDistricts, focusRequest, onHover, onSelect, onSelectListing, groupIds, onSelectGroup, listingScale, onDetailZoom, listingColor, highlightedListingIds, searchArea }: Props) {
  const emphasizedIds = highlightedListingIds ?? groupIds;
  const container = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gesture = useRef({ start: [0, 0] as [number, number], moved: false, active: false });
  const [size, setSize] = useState({ width: 1200, height: 800 });
  const [transform, setTransform] = useState(zoomIdentity);
  const [selectionTool, setSelectionTool] = useState<SelectionTool | null>(null);
  const [box, setBox] = useState<{ start: Point; end: Point } | null>(null);
  const [lasso, setLasso] = useState<Point[]>([]);
  const drag = useRef<{ id: number; start: Point; add: boolean; points: Point[] } | null>(null);
  const drawingEnabled = selectionTool !== null && showListings && Boolean(onSelectGroup);
  const listingsSelectable = canSelectListings(transform.k);
  const detailZoom = showListings && transform.k >= 2 ** 15;
  const districtsVisible = showDistricts && !detailZoom;
  useEffect(() => { onDetailZoom?.(detailZoom); if (detailZoom) onHover(null); }, [detailZoom, onDetailZoom, onHover]);
  const [tileError, setTileError] = useState(false);
  const [tileRevision, setTileRevision] = useState(0);
  const scale = useMemo(() => metricScale(prices, metric), [prices, metric]);
  const values = useMemo(() => new Map(prices.map(row => [row.district, row[metric]])), [prices, metric]);
  const paths = useMemo(() => {
    if (!districtsVisible) return [];
    const path = screenDistrictPath(transform);
    return geometry.features.map(feature => ({ district: feature.properties.district,
      path: path(feature) ?? '', center: transform.apply(districtPath.centroid(feature)),
    }));
  }, [geometry, transform, districtsVisible]);
  const tiles = useMemo(() => showBasemap ? visibleTiles(transform, size.width, size.height) : [], [transform, size, showBasemap]);
  const areaGeometry = useMemo(() => searchArea ? radiusGeometry(searchArea) : null, [searchArea]);
  const searchPoint = searchArea ? transform.apply(project(searchArea.location.longitude, searchArea.location.latitude)) : null;
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height });
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
    element.call(behavior.transform, fittedTransform(geometry, size.width, size.height));
    return () => { element.on('.zoom', null); zoomBehavior.current = null; };
  }, [geometry, size]);
  useEffect(() => {
    const element = svg.current, behavior = zoomBehavior.current;
    if (!element || !behavior || !focusRequest) return;
    select(element).call(behavior.transform, focusedListingTransform(
      focusRequest.listing, size.width, size.height, zoomTransform(element).k,
    ));
  }, [focusRequest, geometry, size]);
  useEffect(() => {
    const element = svg.current, behavior = zoomBehavior.current;
    // Undefined leaves the existing SD1/SD2 focus behavior untouched. Null
    // explicitly clears an SD3 location and restores the district overview.
    if (!element || !behavior || searchArea === undefined) return;
    select(element).call(behavior.transform, searchArea
      ? focusedAreaTransform(searchArea, size.width, size.height)
      : fittedTransform(geometry, size.width, size.height));
  }, [searchArea, geometry, size]);
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
    const radii = markerRadii(transform.k);
    function drawMarkers(highlight: boolean) {
      if (!context) return;
      const radius = highlight ? radii.normal + 1 : radii.normal;
      context.strokeStyle = highlight ? CHART_COLORS.selected : '#FFFFFF';
      context.lineWidth = highlight ? 1.5 : .75;
      context.globalAlpha = highlight ? .95 : emphasizedIds ? .25 : .65;
      for (const listing of listings) {
        if (Boolean(emphasizedIds?.has(listing.id)) !== highlight) continue;
        const [x, y] = transform.apply(project(listing.longitude, listing.latitude));
        if (x < -radius || y < -radius || x > size.width + radius || y > size.height + radius) continue;
        context.beginPath();
        context.fillStyle = listingColor?.(listing) ?? listingScale?.color(listing) ?? CHART_COLORS.high;
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      }
    }
    drawMarkers(false);
    if (emphasizedIds) drawMarkers(true);
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
      context.fillStyle = listingColor?.(selected) ?? listingScale?.color(selected) ?? CHART_COLORS.high;
      context.strokeStyle = CHART_COLORS.selected;
      context.lineWidth = 2;
      context.fill(); context.stroke();
    }
  }, [listings, transform, size, showListings, selectedListingId, emphasizedIds, listingScale, listingColor]);
  function updateGesture(event: PointerEvent<SVGSVGElement>) {
    if (gesture.current.active && movedBeyondClick(gesture.current.start, [event.clientX, event.clientY])) gesture.current.moved = true;
  }
  function handleClick(event: MouseEvent<SVGSVGElement>) {
    if (event.detail === 0) return;
    if (gesture.current.moved) { event.preventDefault(); event.stopPropagation(); return; }
    if (!showListings || !listingsSelectable) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const listing = nearestListing(groupIds ? listings.filter(item => groupIds.has(item.id)) : listings, transform, [event.clientX - bounds.left, event.clientY - bounds.top]);
    if (listing) {
      event.stopPropagation(); onHover(null); onSelectListing(listing);
    }
  }
  function changeZoom(factor: number) {
    if (svg.current && zoomBehavior.current) select(svg.current).call(zoomBehavior.current.scaleBy, factor);
  }
  function resetView() {
    if (svg.current && zoomBehavior.current) select(svg.current).call(zoomBehavior.current.transform,
      searchArea ? focusedAreaTransform(searchArea, size.width, size.height) : fittedTransform(geometry, size.width, size.height));
  }
  function boxPoint(event: PointerEvent<HTMLDivElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    return [Math.max(0, Math.min(size.width, event.clientX - bounds.left)),
      Math.max(0, Math.min(size.height, event.clientY - bounds.top))];
  }
  function cancelDrawing() { drag.current = null; setBox(null); setLasso([]); setSelectionTool(null); }
  useEffect(() => {
    if (!drawingEnabled) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') cancelDrawing(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [drawingEnabled]);
  const navigation = <div className="map-navigation panel" aria-label="Map navigation">
      <div className="map-navigation__zoom">
        <button type="button" onClick={() => changeZoom(2)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => changeZoom(.5)} aria-label="Zoom out">−</button>
      </div>
      <button className="recenter-button" type="button" onClick={resetView} title={searchArea ? 'Fit the selected search area' : 'Fit all Stockholm districts'} aria-label="Recenter map">Recenter</button>
      {onSelectGroup && showListings && <div className="map-selection-tools" role="group" aria-label="Listing selection tools">
        {(['rectangle', 'lasso'] as const).map(tool => <button key={tool} type="button"
          aria-pressed={drawingEnabled && selectionTool === tool}
          title={tool === 'rectangle' ? 'Draw a rectangle' : 'Draw a freehand lasso'}
          onClick={() => {
            cancelDrawing();
            if (selectionTool !== tool) { onHover(null); setSelectionTool(tool); }
          }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {tool === 'rectangle' ? <rect x="3" y="4" width="14" height="12" rx="1" strokeDasharray="3 2" />
              : <><path d="M6 13C1 12 2 5 8 4c5-2 10 1 10 5s-5 6-10 5" /><path d="M8 14c-1-3-5-2-4 1s6 0 5 3" /></>}
          </svg>
          {tool === 'rectangle' ? 'Rectangle' : 'Lasso'}
        </button>)}
      </div>}
      {drawingEnabled ? <p className="map-navigation__hint" role="status">{selectionTool === 'lasso' ? 'Draw around listings.' : 'Drag a box.'} Hold Shift to add.</p> : showListings && <p className="map-navigation__hint" role="status">{listingsSelectable ? 'Click a listing to explore' : 'Zoom in to select listings'}</p>}
    </div>;
  return <div className="district-map" ref={container}>
    <svg ref={svg} width={size.width} height={size.height} aria-label={districtsVisible ? 'Interactive Stockholm district map' : 'Interactive Stockholm listing map'} focusable="false"
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
      {districtsVisible && <g className="map-districts">
        {paths.map(({ district, path }) => <path key={district} d={path} fillRule="evenodd"
          fill={selectedDistrict === district ? CHART_COLORS.selected : scale.color(values.get(district))}
          fillOpacity={showBasemap ? .7 : 1}
          stroke={selectedDistrict === district || hoveredDistrict === district ? CHART_COLORS.selected : '#FFFFFF'}
          strokeWidth={selectedDistrict === district || hoveredDistrict === district ? 3 : 1.5}
          focusable="false" aria-label={district} data-selected={selectedDistrict === district}
          onMouseEnter={() => { if (!(gesture.current.active && gesture.current.moved)) onHover(district); }} onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(district)}><title>{district}</title></path>)}
      </g>}
      {areaGeometry && <path className="map-search-radius" d={screenDistrictPath(transform)(areaGeometry) ?? ''}
        fill="#2357B5" fillOpacity={.07} stroke="#2357B5" strokeWidth={2} strokeDasharray="6 4" pointerEvents="none">
        <title>{`${formatDistance(searchArea!.radiusMeters)} search radius`}</title>
      </path>}
    </svg>
    <canvas ref={canvas} className="listing-canvas" aria-hidden="true" />
    {searchPoint && searchArea && <svg className="map-search-overlay" width={size.width} height={size.height} role="img"
      aria-label={`Search location: ${searchArea.location.label}. Radius ${formatDistance(searchArea.radiusMeters)}.`}>
      <g transform={`translate(${searchPoint[0]} ${searchPoint[1]})`}>
        <path d="M0 0C-4-6-11-13-11-20a11 11 0 1 1 22 0C11-13 4-6 0 0Z" fill="#2357B5" stroke="white" strokeWidth={2} />
        <circle cx={0} cy={-20} r={4} fill="white" />
      </g>
    </svg>}
    {districtsVisible && <svg className="map-label-overlay" width={size.width} height={size.height} aria-hidden="true" focusable="false">
      <g className="map-labels" pointerEvents="none">
        {paths.map(({ district, center }) => <text key={district} x={center[0]} y={center[1]} textAnchor="middle"
          className={selectedDistrict === district ? 'is-selected' : ''}>{district}</text>)}
      </g>
    </svg>}
    {drawingEnabled && <div className="map-box-overlay" aria-hidden="true"
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        const start = boxPoint(event);
        drag.current = { id: event.pointerId, start, add: event.shiftKey, points: [start] };
        event.currentTarget.setPointerCapture(event.pointerId);
        if (selectionTool === 'lasso') setLasso([start]); else setBox({ start, end: start });
      }}
      onPointerMove={event => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const point = boxPoint(event);
        if (selectionTool === 'lasso') {
          const last = current.points[current.points.length - 1];
          if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= 3) {
            current.points.push(point);
            setLasso([...current.points]);
          }
        } else setBox({ start: current.start, end: point });
      }}
      onPointerUp={event => {
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const end = boxPoint(event);
        const points = [...current.points, end];
        const bounds = selectionTool === 'lasso' ? {
          width: Math.max(...points.map(point => point[0])) - Math.min(...points.map(point => point[0])),
          height: Math.max(...points.map(point => point[1])) - Math.min(...points.map(point => point[1])),
        } : selectionBounds(current.start, end);
        if (bounds.width >= 4 && bounds.height >= 4 && (selectionTool !== 'lasso' || points.length >= 3)) {
          const selected = selectionTool === 'lasso' ? listingsInLasso(listings, transform, points)
            : listingsInRectangle(listings, transform, current.start, end);
          onSelectGroup?.(selected.map(item => item.id), current.add);
          cancelDrawing();
        } else { drag.current = null; setBox(null); setLasso([]); }
      }}
      onPointerCancel={cancelDrawing} onLostPointerCapture={() => { drag.current = null; setBox(null); setLasso([]); }}>
      {lasso.length > 1 && <svg className="map-lasso-preview" width={size.width} height={size.height}>
        <polygon points={lasso.map(point => point.join(',')).join(' ')} />
      </svg>}
      {box && <div className="map-selection-box" style={selectionBounds(box.start, box.end)} />}
    </div>}
    {navigation}
    {showBasemap && tileError && <div className="tile-error panel" role="status">
      Some map tiles are unavailable. District layers remain usable.
      <button className="text-button" onClick={() => { setTileRevision(value => value + 1); setTileError(false); }}>Retry tiles</button>
    </div>}
    {(districtsVisible || showBasemap) && <div className="map-attribution">
      {districtsVisible && <>District boundaries: City of Stockholm{showBasemap && ' · '}</>}
      {showBasemap && <>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></>}
    </div>}
  </div>;
}
