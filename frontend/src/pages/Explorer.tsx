import { useCallback, useMemo, useState } from 'react';
import { DISTRICTS } from '../interfaces/explorer';
import type { District, ListingLocation, PriceMetric, PriceMode } from '../interfaces/explorer';
import type { ListingFocusRequest } from '../utils/map';
import { useExplorerData } from '../hooks/useExplorerData';
import { METRICS, formatNumber, metricScale } from '../utils/explorer';
import DistrictMap from '../components/explorer/DistrictMap';
import DistrictDetails from '../components/explorer/DistrictDetails';
import ListingDetails from '../components/explorer/ListingDetails';
import ListingRanking from '../components/explorer/ListingRanking';
import ComparisonPanel from '../components/explorer/ComparisonPanel';
import { EMPTY_FILTERS, filterListings } from '../utils/ranking';
import type { ListingFilters } from '../utils/ranking';
import './Explorer.css';
const EMPTY_LISTINGS: ListingLocation[] = [];
export default function Explorer() {
  const [metric, setMetric] = useState<PriceMetric>('median_airbnb_price');
  const [mode, setMode] = useState<PriceMode>('median');
  const [showListings, setShowListings] = useState(true);
  const [showBasemap, setShowBasemap] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<District | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<ListingFocusRequest | null>(null);
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [revision, setRevision] = useState(0);
  const data = useExplorerData(revision);
  const [filters, setFilters] = useState<ListingFilters>({ ...EMPTY_FILTERS });
  const allListings = data.listings.data ?? EMPTY_LISTINGS;
  const listings = useMemo(() => filterListings(allListings, filters), [allListings, filters]);
  const roomTypes = useMemo(() => [...new Set(allListings.flatMap(listing => listing.room_type ? [listing.room_type] : []))].sort(), [allListings]);
  function changeFilters(next: ListingFilters) {
    setFilters(next); setSelectedListingId(null); setFocusRequest(null);
  }
  const selectDistrict = useCallback((district: District) => {
    setSelectedListingId(null); setFocusRequest(null);
    setSelectedDistrict(previous => previous === district ? null : district);
  }, []);
  const selectListing = useCallback((listing: ListingLocation) => {
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
  const selectedListing = useMemo(() => listings.find(listing => listing.id === selectedListingId) ?? null, [listings, selectedListingId]);
  const scale = useMemo(() => metricScale(data.prices.data ?? [], metric), [data.prices.data, metric]);
  const activeDistrict = showDistricts ? hoveredDistrict ?? selectedDistrict : null;
  const errors = [data.geometry, data.prices, data.tooltips, data.listings, data.scatterplots].some(resource => resource.status === 'error');
  function toggleDistricts(visible: boolean) {
    setShowDistricts(visible); setHoveredDistrict(null);
    if (!visible) setSelectedDistrict(null);
  }
  function clearSelection() {
    setSelectedDistrict(null); setHoveredDistrict(null); setSelectedListingId(null); setFocusRequest(null);
  }
  return <main className="explorer" aria-label="SABA - Stockholm Airbnb Analytics">
    <div className="explorer__map">
      {data.geometry.status === 'success' ? <DistrictMap geometry={data.geometry.data} prices={data.prices.data ?? []}
        listings={listings} metric={metric} selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict}
        showListings={showListings} showBasemap={showBasemap} showDistricts={showDistricts} focusRequest={focusRequest}
        onHover={setHoveredDistrict} onSelect={selectDistrict} selectedListingId={selectedListingId} onSelectListing={selectListing} />
        : <div className="map-message" role={data.geometry.status === 'error' ? 'alert' : 'status'}>
          {data.geometry.status === 'error' ? data.geometry.error : 'Loading Stockholm district boundaries…'}
        </div>}
    </div>
    <aside className="explorer-sidebar" aria-label="Explore and rank listings">
      <section className="map-controls panel" aria-label="Map settings">
        <p className="eyebrow">SABA · Explore the city</p><h1>Explore Stockholm</h1>
        <label className="control-label" htmlFor="map-metric">Colour districts by</label>
        <select id="map-metric" disabled={!showDistricts} value={metric} onChange={event => setMetric(event.target.value as PriceMetric)}>
          {Object.entries(METRICS).map(([value, definition]) => <option key={value} value={value}>{definition.label}</option>)}
        </select>
        <p className="metric-unit">{METRICS[metric].unit} · Linear colour scale</p>
        <label className="control-label" htmlFor="district-selection">Selected district</label>
        <select id="district-selection" disabled={!showDistricts} value={selectedDistrict ?? ''} onChange={event => {
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
          <button type="button" className="text-button" disabled={!selectedDistrict && !selectedListingId} onClick={clearSelection}>Clear selection</button>
        </div>
      </section>
      <ListingRanking resource={data.listings} listings={listings} totalCount={allListings.length} filters={filters} roomTypes={roomTypes} onFilters={changeFilters} selectedListingId={selectedListingId} selectionRevision={selectionRevision} onSelect={selectRankedListing} />
    </aside>
    <div className="map-information" aria-label="Selection details">
      {selectedListing ? <div className="listing-card panel"><ListingDetails key={selectedListing.id} listing={selectedListing} onClose={() => { setSelectedListingId(null); setFocusRequest(null); }} /></div>
        : activeDistrict ? <div className="district-card panel"><DistrictDetails district={activeDistrict} tooltips={data.tooltips} /></div>
          : <div className="map-hint panel"><p className="eyebrow">Discover Stockholm</p><h2>Find your perspective</h2><p>{showDistricts ? 'Hover a district for an overview. Select a listing on the map or in the ranking to see its details.' : 'Select a listing in the ranking, or zoom in and click a map marker.'}</p></div>}
      {errors && <div className="data-notice panel" role="status"><strong>Some data could not be loaded.</strong>
        <span>{[data.prices, data.tooltips, data.listings, data.scatterplots].find(resource => resource.status === 'error')?.error ?? data.geometry.error}</span>
        <button type="button" className="text-button" onClick={() => setRevision(value => value + 1)}>Retry data</button>
      </div>}
    </div>
    {showDistricts && <div className="map-legend panel" aria-label="District colour legend">
      <div><strong>{METRICS[metric].label}</strong><span>{METRICS[metric].unit}</span></div>
      {data.prices.status === 'loading' ? <p role="status">Loading price statistics…</p>
        : scale.min == null ? <p>No price data available.</p> : <><div className="legend-gradient" /><div className="legend-labels"><span>{formatNumber(scale.min)}</span><span>{formatNumber(scale.max)}</span></div></>}
      <p><span className="missing-key" /> No data <span className="selected-key" /> Selected district</p>
    </div>}
    <ComparisonPanel resource={data.scatterplots} mode={mode} onMode={setMode}
      selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} onHover={setHoveredDistrict} onSelect={selectDistrict} />
    <div className="sr-only" aria-live="polite">{selectedListing ? `Selected listing: ${selectedListing.name ?? selectedListing.id}` : selectedDistrict ? `Selected district: ${selectedDistrict}` : 'No selection'}</div>
  </main>;
}
