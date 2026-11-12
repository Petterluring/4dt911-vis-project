import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS } from '../interfaces/explorer';
import type { District, ListingLocation, PriceMetric, PriceMode, Resource } from '../interfaces/explorer';
import type { ListingFocusRequest } from '../utils/map';
import { useExplorerData } from '../hooks/useExplorerData';
import { useListingClusters } from '../hooks/useListingClusters';
import { METRICS, formatNumber, listingMetricScale, metricScale } from '../utils/explorer';
import { fetchAmenities } from '../api/positioning';
import DistrictMap from '../components/explorer/DistrictMap';
import DistrictDetails from '../components/explorer/DistrictDetails';
import ListingDetails from '../components/explorer/ListingDetails';
import PropertyPositioning from '../components/explorer/PropertyPositioning';
import SelectionSummary from '../components/explorer/SelectionSummary';
import ListingFiltersPanel from '../components/explorer/ListingFilters';
import ListingRanking from '../components/explorer/ListingRanking';
import ComparisonPanel from '../components/explorer/ComparisonPanel';
import './Explorer.css';
import ListingClusters from '../components/clustering/ListingClusters';
import ClusterPricePanel from '../components/clustering/ClusterPricePanel';
import ClusterMapLegend from '../components/clustering/ClusterMapLegend';
import { EMPTY_FILTERS, filterListings } from '../utils/ranking';
import type { ListingFilters } from '../utils/ranking';
const EMPTY_LISTINGS: ListingLocation[] = [];
const ignoreDistrictHover = () => {};
export default function Explorer() {
  const [view, setView] = useState<'map' | 'listings'>('map');
  const [sidebar, setSidebar] = useState<'listings' | 'positioning' | 'clustering'>('listings');
  const sidebarElement = useRef<HTMLElement>(null);
  const positioningScrollTop = useRef(0);
  useLayoutEffect(() => {
    if (sidebar === 'positioning' && sidebarElement.current) {
      sidebarElement.current.scrollTop = positioningScrollTop.current;
    }
  }, [sidebar]);
  const [positioningOpened, setPositioningOpened] = useState(false);
  const [clusteringOpened, setClusteringOpened] = useState(false);
  const [comparable, setComparable] = useState<ListingLocation | null>(null);
  const [metric, setMetric] = useState<PriceMetric>('median_airbnb_price');
  const [mode, setMode] = useState<PriceMode>('median');
  const [showListings, setShowListings] = useState(true);
  const [detailZoom, setDetailZoom] = useState(false);
  const [showBasemap, setShowBasemap] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<District | null>(null);
  const [groupIds, setGroupIds] = useState<Set<string> | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<ListingFocusRequest | null>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const data = useExplorerData(revision);
  const clustering = useListingClusters(data.listings, clusteringOpened);
  const clusteringActive = sidebar === 'clustering';
  const [positioningDistrict, setPositioningDistrict] = useState<District>('Södermalm');
  const [amenities, setAmenities] = useState<Resource<string[]>>({ status: 'loading' });
  const [amenityRevision, setAmenityRevision] = useState(0);
  useEffect(() => {
    const request = new AbortController();
    void fetchAmenities(request.signal).then(data => {
      if (!request.signal.aborted) setAmenities({ status: 'success', data });
    }).catch(() => {
      if (!request.signal.aborted) setAmenities({ status: 'error', error: 'Amenities could not be loaded.' });
    });
    return () => request.abort();
  }, [amenityRevision]);
  const [filters, setFilters] = useState<ListingFilters>({ ...EMPTY_FILTERS });
  const allListings = data.listings.data ?? EMPTY_LISTINGS;
  const listings = useMemo(() => filterListings(allListings, filters), [allListings, filters]);
  const groupSource = useMemo(() => groupIds ? allListings.filter(listing => groupIds.has(listing.id)) : allListings, [allListings, groupIds]);
  const rankedListings = useMemo(() => groupIds ? listings.filter(listing => groupIds.has(listing.id)) : listings, [listings, groupIds]);
  function selectGroup(ids: string[], add: boolean) {
    setSidebar('listings');
    setGroupIds(previous => new Set(add && previous ? [...previous, ...ids] : ids));
    setSelectedListingId(null); setFocusRequest(null);
    setSelectedDistrict(null); setHoveredDistrict(null);
  }
  function clearGroup() {
    setGroupIds(null); setSelectedListingId(null); setFocusRequest(null);
  }
  const roomTypes = useMemo(() => [...new Set(allListings.flatMap(listing => listing.room_type ? [listing.room_type] : []))].sort(), [allListings]);
  function changeFilters(next: ListingFilters) {
    setFilters(next); setSelectedListingId(null); setFocusRequest(null);
  }
  const selectDistrict = useCallback((district: District) => {
    setSelectedListingId(null); setFocusRequest(null);
    setPositioningDistrict(district);
    setSelectedDistrict(previous => previous === district ? null : district);
  }, []);
  const selectListing = useCallback((listing: ListingLocation) => {
    setComparable(null); setSidebar('listings');
    setSelectedListingId(listing.id); setFocusRequest(null);
    setSelectionRevision(previous => previous + 1);
    setSelectedDistrict(showDistricts ? listing.district : null);
    setHoveredDistrict(null);
  }, [showDistricts]);
  const selectRankedListing = useCallback((listing: ListingLocation) => {
    selectListing(listing);
    setShowListings(true);
    // A new request also recentres when the same row is clicked twice.
    setFocusRequest(previous => ({ listing, sequence: (previous?.sequence ?? 0) + 1 }));
  }, [selectListing]);
  function selectComparable(listing: ListingLocation) {
    selectRankedListing(listing);
    setComparable(listing);
    setSidebar('positioning');
  }
  const focusedComparable = comparable?.id === selectedListingId ? comparable : null;
  const selectedListing = focusedComparable ?? listings.find(listing => listing.id === selectedListingId) ?? null;
  const mapListings = useMemo(() => focusedComparable && !listings.some(item => item.id === focusedComparable.id)
    ? [...listings, focusedComparable] : listings, [listings, focusedComparable]);
  const visibleRanking = useMemo(() => focusedComparable && !rankedListings.some(item => item.id === focusedComparable.id)
    ? [...rankedListings, focusedComparable] : rankedListings, [rankedListings, focusedComparable]);
  const rankingSource = useMemo(() => focusedComparable && !groupSource.some(item => item.id === focusedComparable.id)
    ? [...groupSource, focusedComparable] : groupSource, [groupSource, focusedComparable]);
  const scale = useMemo(() => metricScale(data.prices.data ?? [], metric), [data.prices.data, metric]);
  const listingScale = useMemo(() => listingMetricScale(allListings, data.prices.data ?? [], metric), [allListings, data.prices.data, metric]);
  const districtLegend = showDistricts && !(showListings && detailZoom);
  const activeDistrict = showDistricts ? (view === 'map' ? hoveredDistrict : null) ?? selectedDistrict : null;
  const errors = [data.geometry, data.prices, data.tooltips, data.listings, data.scatterplots].some(resource => resource.status === 'error');
  function toggleDistricts(visible: boolean) {
    setShowDistricts(visible); setHoveredDistrict(null);
    if (!visible) setSelectedDistrict(null);
  }
  function clearSelection() {
    setSelectedDistrict(null); setHoveredDistrict(null); clearGroup();
  }
  return <main className="explorer" aria-label="SABA - Stockholm Airbnb Analytics">
    <header className="explorer-header">
      <div><p className="eyebrow">SABA · Explore the city</p><h1>Explore Stockholm</h1></div>
      <div className="segmented explorer-view-switch" role="group" aria-label="Explorer view">
        <button type="button" aria-pressed={view === 'map'} onClick={() => { setView('map'); if (clusteringActive) setSidebar('listings'); }}>Map</button>
        <button type="button" aria-pressed={view === 'listings' && sidebar !== 'clustering'} onClick={() => { setHoveredDistrict(null); setView('listings'); if (sidebar === 'clustering') setSidebar('listings'); }}>Listings</button>
      </div>
    </header>
    <div className="explorer-content">
      <section className="explorer-map-view" hidden={view !== 'map'} aria-label="Map view">
        <div className="explorer__map panel">
          {data.geometry.status === 'success' ? <DistrictMap geometry={data.geometry.data} prices={data.prices.data ?? []}
            listings={clusteringActive ? clustering.mappedListings : mapListings} listingScale={listingScale} onDetailZoom={setDetailZoom}
            groupIds={clusteringActive ? undefined : groupIds} onSelectGroup={!clusteringActive && data.listings.status === 'success' ? selectGroup : undefined}
            metric={metric} selectedDistrict={clusteringActive ? null : selectedDistrict} hoveredDistrict={clusteringActive ? null : hoveredDistrict}
            showListings={clusteringActive || showListings} showBasemap={showBasemap} showDistricts={!clusteringActive && showDistricts} focusRequest={focusRequest}
            listingColor={clusteringActive ? clustering.listingColor : undefined} highlightedListingIds={clusteringActive ? clustering.highlightedIds : undefined}
            searchArea={clusteringActive ? clustering.searchArea : undefined}
            onHover={clusteringActive ? ignoreDistrictHover : setHoveredDistrict} onSelect={district => { selectDistrict(district); setSidebar(current => current === 'positioning' ? current : 'listings'); }}
            selectedListingId={clusteringActive ? clustering.mapSelectedListingId : selectedListingId} onSelectListing={clusteringActive ? clustering.selectListing : selectListing} />
            : <div className="map-message" role={data.geometry.status === 'error' ? 'alert' : 'status'}>
              {data.geometry.status === 'error' ? <>{data.geometry.error}{clusteringActive && <button type="button" className="text-button" onClick={() => setRevision(value => value + 1)}>Retry map data</button>}</> : 'Loading Stockholm district boundaries…'}
            </div>}
          <details className="map-controls panel" hidden={clusteringActive}>
            <summary>Map settings</summary>
            <div className="map-controls__body">
              <label className="control-label" htmlFor="map-metric">Colour map by</label>
              <select id="map-metric" disabled={!showDistricts && !showListings} value={metric} onChange={event => setMetric(event.target.value as PriceMetric)}>
                {Object.entries(METRICS).map(([value, definition]) => <option key={value} value={value}>{definition.label}</option>)}
              </select>
              <p className="metric-unit">{METRICS[metric].unit} · Linear colour scale</p>
              <label className="control-label" htmlFor="district-selection">Selected district</label>
              <select id="district-selection" disabled={!showDistricts} value={selectedDistrict ?? ''} onChange={event => {
                setSidebar(current => current === 'positioning' ? current : 'listings');
                if (event.target.value) setPositioningDistrict(event.target.value as District);
                setSelectedDistrict(event.target.value ? event.target.value as District : null);
                setHoveredDistrict(null); setSelectedListingId(null); setFocusRequest(null);
              }}><option value="">All districts</option>{DISTRICTS.map(district => <option key={district} value={district}>{district}</option>)}</select>
              <div className="layer-controls">
                <label><input type="checkbox" checked={showListings} onChange={event => {
                  setShowListings(event.target.checked);
                  if (!event.target.checked) { setSelectedListingId(null); setFocusRequest(null); }
                }} /><span>Airbnb locations</span><span className="listing-key" /></label>
                <label><input type="checkbox" checked={showBasemap} onChange={event => setShowBasemap(event.target.checked)} /><span>Street map</span></label>
                <label><input type="checkbox" checked={showDistricts} onChange={event => toggleDistricts(event.target.checked)} /><span>Districts</span></label>
              </div>
              <div className="map-controls__footer"><span>{data.listings.status === 'success' ? `${formatNumber(listings.length)} mapped listings` : data.listings.status === 'loading' ? 'Loading listings…' : 'Listing locations unavailable'}</span>
                <button type="button" className="text-button" disabled={!selectedDistrict && !selectedListingId && !groupIds} onClick={clearSelection}>Clear selection</button>
              </div>
            </div>
          </details>
          {!clusteringActive && (districtLegend || showListings) && <div className="map-legend panel" aria-label="Map colour legend">
            {districtLegend && <>
            <div><strong>{METRICS[metric].label}</strong><span>{METRICS[metric].unit}</span></div>
            {data.prices.status === 'loading' ? <p role="status">Loading price statistics…</p>
              : scale.min == null ? <p>No price data available.</p> : <><div className="legend-gradient" /><div className="legend-labels"><span>{formatNumber(scale.min)}</span><span>{formatNumber(scale.max)}</span></div></>}
            <p><span className="missing-key" /> No data <span className="selected-key" /> Selected district</p></>}
            {showListings && <section className={districtLegend ? 'listing-legend listing-legend--separated' : 'listing-legend'} aria-label="Listing colours">
              <div><strong>{listingScale.housing ? 'Listings: ' + METRICS[metric].label.toLowerCase() + ' by district' : 'Listing nightly price'}</strong>
                <span>{METRICS[metric].unit}</span></div>
              {listingScale.stops.length > 1 ? <>
                <div className="legend-gradient" style={{
                  background: 'linear-gradient(to right, ' + listingScale.stops.map(stop => stop.color).join(', ') + ')',
                }} />
                <div className="legend-labels">{listingScale.stops.map(({ value }, index) => <span key={value}>
                  {index === 0 ? '≤ ' : index === listingScale.stops.length - 1 ? '≥ ' : ''}{formatNumber(value)}
                </span>)}</div>
              </> : listingScale.stops.length === 1 ? <p>
                <span className="listing-legend-swatch" style={{ backgroundColor: listingScale.stops[0].color }} />
                {formatNumber(listingScale.stops[0].value)} (display range)
              </p> : <p>No listing price data available.</p>}
              <p><span className="missing-key listing-missing-key" /> No data <span className="selected-key listing-selected-key" /> Selected listing</p>
            </section>}
          </div>}
          {clusteringActive && <ClusterMapLegend state={clustering} />}
        </div>
        {view === 'map' && (clusteringActive ? <ClusterPricePanel state={clustering} /> : <ComparisonPanel resource={data.scatterplots} mode={mode} onMode={setMode}
          selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} onHover={setHoveredDistrict} onSelect={selectDistrict} />)}
      </section>
      {view === 'listings' && <ListingRanking resource={data.listings} listings={visibleRanking} allListings={rankingSource}
        groupActive={groupIds !== null} selectedListingId={selectedListingId} selectionRevision={selectionRevision} onSelect={selectRankedListing} />}
    </div>
    <aside ref={sidebarElement} className="explorer-sidebar" aria-label="Controls and information"
      onScroll={event => {
        if (sidebar === 'positioning') positioningScrollTop.current = event.currentTarget.scrollTop;
      }}>
      <div className="segmented explorer-sidebar-tabs" role="group" aria-label="Sidebar view">
        <button type="button" aria-pressed={sidebar === 'listings'} onClick={() => setSidebar('listings')}>Filters &amp; Details</button>
        <button type="button" aria-pressed={sidebar === 'positioning'} onClick={() => { setPositioningOpened(true); setSidebar('positioning'); }}>Positioning</button>
        <button type="button" aria-pressed={sidebar === 'clustering'} onClick={() => { setClusteringOpened(true); setHoveredDistrict(null); setView('map'); setSidebar('clustering'); }}>Clustering</button>
      </div>
      {positioningOpened && <div hidden={sidebar !== 'positioning'}>
        <PropertyPositioning roomTypes={roomTypes} onSelect={selectComparable} selectedListingId={selectedListingId}
          district={positioningDistrict} onDistrict={setPositioningDistrict} amenities={amenities}
          onRetryAmenities={() => { setAmenities({ status: 'loading' }); setAmenityRevision(value => value + 1); }} />
      </div>}
      {clusteringOpened && <div className="explorer-clustering-tab" hidden={sidebar !== 'clustering'}>
        <ListingClusters state={clustering} onRetry={() => setRevision(value => value + 1)} />
      </div>}
      <div className="map-information" aria-label="Filters and selection details" hidden={sidebar !== 'listings'}>
        <ListingFiltersPanel listings={groupSource} filters={filters} roomTypes={roomTypes} onFilters={changeFilters} />
        {groupIds && <SelectionSummary listings={rankedListings} onClear={clearGroup} />}
        {selectedListing ? <div className="listing-card panel"><ListingDetails key={selectedListing.id} listing={selectedListing} onClose={() => { setSelectedListingId(null); setFocusRequest(null); }} /></div>
          : groupIds ? null : activeDistrict ? <div className="district-card panel"><DistrictDetails district={activeDistrict} tooltips={data.tooltips} /></div>
            : <div className="map-hint panel"><p className="eyebrow">Discover Stockholm</p><h2>Find your perspective</h2><p>{view === 'map' ? 'Hover a district or select a map marker to see its details.' : 'Select a row to see the listing details.'}</p></div>}
      </div>
      {errors && sidebar !== 'clustering' && <div className="data-notice panel" role="status"><strong>Some data could not be loaded.</strong>
          <span>{[data.prices, data.tooltips, data.listings, data.scatterplots].find(resource => resource.status === 'error')?.error ?? data.geometry.error}</span>
          <button type="button" className="text-button" onClick={() => setRevision(value => value + 1)}>Retry data</button>
      </div>}
    </aside>
    <div className="sr-only" aria-live="polite">{selectedListing ? `Selected listing: ${selectedListing.name ?? selectedListing.id}` : selectedDistrict ? `Selected district: ${selectedDistrict}` : 'No selection'}</div>
  </main>;
}
