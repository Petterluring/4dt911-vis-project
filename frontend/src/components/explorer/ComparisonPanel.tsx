import { useCallback, useMemo } from 'react';
import { DISTRICTS } from '../../interfaces/explorer';
import type { District, ListingLocation, PriceMode, Resource, ScatterplotStats } from '../../interfaces/explorer';
import { formatNumber, priceKeys } from '../../utils/explorer';
import type { listingsForPriceChart } from '../../utils/listing';
import Scatterplot from './Scatterplot';

export type PriceChartView = 'districts' | 'listings';
export type ListingChartScope = 'map' | 'all';
interface ListingChart {
  view: PriceChartView; onView: (view: PriceChartView) => void;
  scope: ListingChartScope; onScope: (scope: ListingChartScope) => void;
  values: ReturnType<typeof listingsForPriceChart>; emptyMessage: string;
  selectedId: string | null; hoveredId: string | null;
  onHover: (id: string | null) => void; onSelect: (listing: ListingLocation) => void;
}
interface Props {
  resource: Resource<ScatterplotStats>; mode: PriceMode; onMode: (mode: PriceMode) => void;
  selectedDistrict: District | null; hoveredDistrict: District | null;
  onHover: (district: District | null) => void; onSelect: (district: District) => void;
  listingChart?: ListingChart;
}
export default function ComparisonPanel({ resource, mode, onMode, selectedDistrict, hoveredDistrict, onHover, onSelect, listingChart }: Props) {
  const points = useMemo(() => {
    const [housing, airbnb] = priceKeys(mode);
    return {
      tourism: resource.data?.tourism.flatMap(row => row.tourism_score == null || row.airbnb_listing_count == null ? [] : [{ id: row.district, label: row.district, x: row.tourism_score, y: row.airbnb_listing_count }]) ?? [],
      prices: resource.data?.prices.flatMap(row => row[housing] == null || row[airbnb] == null ? [] : [{ id: row.district, label: row.district, x: row[housing], y: row[airbnb] }]) ?? [],
    };
  }, [resource.data, mode]);
  const listingPoints = useMemo(() => (listingChart?.values ?? []).map(({ listing, guests, price }) => ({
    id: listing.id, label: listing.name ?? `Listing #${listing.id}`, x: guests, y: price, listing,
  })).sort((a, b) => a.x - b.x || a.y - b.y), [listingChart?.values]);
  const listingsById = useMemo(() => new Map(listingPoints.map(point => [point.id, point.listing])), [listingPoints]);
  const selectListing = listingChart?.onSelect;
  const selectPoint = useCallback((id: string) => {
    const listing = listingsById.get(id);
    if (listing) selectListing?.(listing);
  }, [listingsById, selectListing]);

  const districtMessage = resource.status === 'loading' ? 'Loading district comparisons.' : resource.error;
  const shared = { kind: 'district' as const, total: DISTRICTS.length, selectedId: selectedDistrict, hoveredId: hoveredDistrict, onHover, onSelect, emptyMessage: districtMessage };
  const priceModeControl = <fieldset className="segmented"><legend className="sr-only">Housing and Airbnb price aggregation</legend>
    {(['average', 'median'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onMode(value)}>{value === 'average' ? 'Average' : 'Median'}</button>)}
  </fieldset>;
  const priceViewControl = listingChart && <div className="segmented" role="group" aria-label="Price chart data">
    <button type="button" aria-pressed={listingChart.view === 'districts'} onClick={() => listingChart.onView('districts')}>Districts</button>
    <button type="button" aria-pressed={listingChart.view === 'listings'} onClick={() => listingChart.onView('listings')}>Listings</button>
  </div>;
  return <section className="comparison-panel panel" id="district-comparison" aria-labelledby="comparison-title">
    <h2 className="sr-only" id="comparison-title">Market comparison</h2>
    <div className="comparison-grid">
      <Scatterplot id="tourism" title="Tourism & Airbnb supply" subtitle="Each point represents one district." points={points.tourism}
        xLabel="Tourism score" yLabel="Airbnb listings" xFromZero yFromZero {...shared} />
      {listingChart?.view === 'listings' ? <Scatterplot key="listings" id="listing-prices" kind="listing" title="Listing prices"
        subtitle="Each point represents one Airbnb listing." points={listingPoints} emptyMessage={listingChart.emptyMessage}
        xLabel="Guests" xFromZero yLabel="Nightly price (SEK)" hoveredId={listingChart.hoveredId} selectedId={listingChart.selectedId}
        onHover={listingChart.onHover} onSelect={selectPoint} headerControls={<div className="price-chart-controls">
          <span className="chart-status">{formatNumber(listingPoints.length)} listings</span>
          <select aria-label="Listing chart scope" value={listingChart.scope} onChange={event => listingChart.onScope(event.target.value as ListingChartScope)}>
            <option value="map">Map view</option><option value="all">All filtered</option>
          </select>
          {priceViewControl}
        </div>} />
      : <Scatterplot key="districts" id="prices" title="Housing & Airbnb prices" subtitle={`${mode === 'average' ? 'Average' : 'Median'} sale and nightly prices by district.`} points={points.prices}
        xLabel="Housing price (SEK / sale)" yLabel="Airbnb price (SEK / night)" {...shared}
        headerControls={<div className="price-chart-controls">{priceModeControl}{priceViewControl}</div>} />}
    </div>
  </section>;
}
