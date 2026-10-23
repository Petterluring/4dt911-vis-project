import { useCallback, useMemo, useState } from 'react';
import { DISTRICTS } from '../interfaces/explorer';
import type { District, ListingLocation, PriceMetric, PriceMode } from '../interfaces/explorer';
import { useExplorerData } from '../hooks/useExplorerData';
import { METRICS, formatNumber, metricScale } from '../utils/explorer';
import DistrictMap from '../components/explorer/DistrictMap';
import DistrictDetails from '../components/explorer/DistrictDetails';
import ListingDetails from '../components/explorer/ListingDetails';
import ComparisonPanel from '../components/explorer/ComparisonPanel';
import './Explorer.css';
export default function Explorer() {
  const [metric, setMetric] = useState<PriceMetric>('median_airbnb_price');
  const [mode, setMode] = useState<PriceMode>('median');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [showListings, setShowListings] = useState(true);
  const [showBasemap, setShowBasemap] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<District | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const data = useExplorerData(revision);
  const selectDistrict = useCallback((district: District) => {
    setSelectedListingId(null);
    setSelectedDistrict(previous => previous === district ? null : district);
  }, []);
  const selectListing = useCallback((listing: ListingLocation) => {
    setSelectedListingId(listing.id);
    setSelectedDistrict(listing.district);
    setHoveredDistrict(null);
  }, []);
  const selectedListing = useMemo(() => data.listings.data?.find(listing => listing.id === selectedListingId) ?? null, [data.listings.data, selectedListingId]);
  const scale = useMemo(() => metricScale(data.prices.data ?? [], metric), [data.prices.data, metric]);
  const activeDistrict = hoveredDistrict ?? selectedDistrict;
  const errors = [data.geometry, data.prices, data.tooltips, data.listings, data.scatterplots].some(resource => resource.status === 'error');
  function reset() { setSelectedDistrict(null); setHoveredDistrict(null); setSelectedListingId(null); }
  return <main className={`explorer ${comparisonOpen ? 'explorer--comparing' : ''}`}>
    <div className="explorer__map">
      {data.geometry.status === 'success' ? <DistrictMap geometry={data.geometry.data} prices={data.prices.data ?? []}
        listings={data.listings.data ?? []} metric={metric} selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict}
        showListings={showListings} showBasemap={showBasemap} comparisonOpen={comparisonOpen}
        onHover={setHoveredDistrict} onSelect={selectDistrict} selectedListingId={selectedListingId} onSelectListing={selectListing} />
        : <div className="map-message" role={data.geometry.status === 'error' ? 'alert' : 'status'}>
          {data.geometry.status === 'error' ? data.geometry.error : 'Loading Stockholm district boundaries…'}
        </div>}
    </div>
    <header className="explorer-header panel">
      <a className="brand" href="/" aria-label="SABA - Stockholm Airbnb Analytics home"><span className="brand__mark" aria-hidden="true">S</span><span>SABA<span className="brand__subtitle">Stockholm Airbnb Analytics</span></span></a>
      <button type="button" className={`button ${comparisonOpen ? 'button--active' : ''}`}
        aria-expanded={comparisonOpen} aria-controls="district-comparison" onClick={() => setComparisonOpen(value => !value)}>
        {comparisonOpen ? 'Hide comparisons' : 'Compare districts'} <span aria-hidden="true">↗</span>
      </button>
    </header>
    <aside className="map-controls panel" aria-label="Map settings">
      <p className="eyebrow">Explore the city</p><h1>A closer look<br />at Stockholm.</h1>
      <p className="muted">Housing, Airbnb and tourism.</p>
      <label className="control-label" htmlFor="map-metric">Colour districts by</label>
      <select id="map-metric" value={metric} onChange={event => setMetric(event.target.value as PriceMetric)}>
        {Object.entries(METRICS).map(([value, definition]) => <option key={value} value={value}>{definition.label}</option>)}
      </select>
      <p className="metric-unit">{METRICS[metric].unit} · Linear colour scale</p>
      <label className="control-label" htmlFor="district-selection">Selected district</label>
      <select id="district-selection" value={selectedDistrict ?? ''} onChange={event => {
        setSelectedDistrict(event.target.value ? event.target.value as District : null); setHoveredDistrict(null); setSelectedListingId(null);
      }}><option value="">All districts</option>{DISTRICTS.map(district => <option key={district} value={district}>{district}</option>)}</select>
      <div className="layer-controls">
        <label><input type="checkbox" checked={showListings} onChange={event => { setShowListings(event.target.checked); if (!event.target.checked) setSelectedListingId(null); }} /><span>Airbnb locations</span><span className="listing-key" /></label>
        <label><input type="checkbox" checked={showBasemap} onChange={event => setShowBasemap(event.target.checked)} /><span>Street map</span></label>
      </div>
      <div className="map-controls__footer"><div className="listing-counts"><span>{data.listings.status === 'success' ? `${formatNumber(data.listings.data.length)} mapped listings` : data.listings.status === 'loading' ? 'Loading listing locations…' : 'Listing locations unavailable'}</span></div>
        <button type="button" className="text-button" disabled={!selectedDistrict && !selectedListingId} onClick={reset}>Clear selection</button>
      </div>
    </aside>
    <div className="map-information">
      {selectedListing ? <div className="listing-card panel"><ListingDetails key={selectedListing.id} listing={selectedListing} onClose={() => setSelectedListingId(null)} /></div> : activeDistrict ? <div className="district-card panel"><DistrictDetails district={activeDistrict} tooltips={data.tooltips} /></div>
        : <div className="map-hint panel"><span className="status-dot" /> Hover a district. Click a district or an Airbnb dot.</div>}
      {errors && <div className="data-notice panel" role="status"><strong>Some data could not be loaded.</strong>
        <span>{[data.prices, data.tooltips, data.listings, data.scatterplots].find(resource => resource.status === 'error')?.error ?? data.geometry.error}</span>
        <button type="button" className="text-button" onClick={() => setRevision(value => value + 1)}>Retry data</button>
      </div>}
    </div>
    <div className="map-legend panel" aria-label="District colour legend">
      <div><strong>{METRICS[metric].label}</strong><span>{METRICS[metric].unit}</span></div>
      {data.prices.status === 'loading' ? <p role="status">Loading price statistics…</p>
        : scale.min == null ? <p>No price data available.</p> : <>
          <div className="legend-gradient" /><div className="legend-labels"><span>{formatNumber(scale.min)}</span><span>{formatNumber(scale.max)}</span></div>
        </>}
      <p><span className="missing-key" /> No data <span className="selected-key" /> Selected district</p>
    </div>
    {comparisonOpen && <ComparisonPanel resource={data.scatterplots} mode={mode} onMode={setMode}
      selectedDistrict={selectedDistrict} hoveredDistrict={hoveredDistrict} onHover={setHoveredDistrict} onSelect={selectDistrict}
      onClose={() => { setComparisonOpen(false); setHoveredDistrict(null); }} />}
    <div className="sr-only" aria-live="polite">{selectedDistrict ? `Selected district: ${selectedDistrict}` : 'No district selected'}</div>
  </main>;
}
