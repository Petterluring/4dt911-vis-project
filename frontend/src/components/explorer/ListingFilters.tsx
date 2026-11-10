import { useMemo } from 'react';
import type { ListingLocation } from '../../interfaces/explorer';
import { formatNumber } from '../../utils/explorer';
import { EMPTY_FILTERS, LISTING_RANGES, listingRangeMaximum } from '../../utils/ranking';
import type { ListingFilters as Filters } from '../../utils/ranking';

interface Props {
  listings: ListingLocation[];
  filters: Filters;
  roomTypes: string[];
  onFilters: (filters: Filters) => void;
}

export default function ListingFilters({ listings, filters, roomTypes, onFilters }: Props) {
  function update(key: keyof Filters, value: string) { onFilters({ ...filters, [key]: value }); }
  const maxima = useMemo(() => LISTING_RANGES.map(range => listingRangeMaximum(listings, filters, range)), [listings, filters]);
  const activeFilters = Object.values(filters).some(Boolean);
  return <section className="listing-filters panel" aria-labelledby="listing-filters-title">
    <header className="ranking-header">
      <h2 id="listing-filters-title">Listing filters</h2>
      {activeFilters && <button type="button" className="text-button" onClick={() => onFilters({ ...EMPTY_FILTERS })}>Reset filters</button>}
    </header>
    <div className="ranking-filters">
      {LISTING_RANGES.map((range, index) => {
        const maximum = maxima[index];
        const limit = maximum ?? 0;
        const from = filters[range.from] === '' ? 0 : Number(filters[range.from]);
        const lower = Math.min(from, limit);
        const upper = 'to' in range && filters[range.to] !== '' ? Math.min(Number(filters[range.to]), limit) : limit;
        return <fieldset key={range.field} className="ranking-range">
          <legend>{range.label}</legend>
          {'to' in range ? <>
            <span className="ranking-range-value">{maximum == null ? 'N/A' : formatNumber(lower) + ' to ' + formatNumber(upper)}</span>
            <div className="ranking-slider ranking-dual-range">
              <div className="ranking-range-track" aria-hidden="true"><span style={{
                left: (limit ? lower / limit * 100 : 0) + '%',
                right: (limit ? (1 - upper / limit) * 100 : 0) + '%',
              }} /></div>
              <input className={lower === limit ? 'ranking-thumb-front' : undefined} aria-label="Minimum nightly price" type="range"
                min={0} max={limit} value={lower} disabled={!limit} onChange={event => {
                  const value = Math.min(Number(event.target.value), upper);
                  update(range.from, value === 0 ? '' : String(value));
                }} />
              <input aria-label="Maximum nightly price" type="range" min={0} max={limit} value={upper} disabled={!limit}
                onChange={event => {
                  const value = Math.max(Number(event.target.value), lower);
                  update(range.to, value === limit ? '' : String(value));
                }} />
            </div>
          </> : <>
            <span className="ranking-range-value">{maximum == null ? 'N/A' : from === 0 ? 'Any' : 'At least ' + formatNumber(from)}</span>
            <div className="ranking-slider">
              <div className="ranking-range-track" aria-hidden="true"><span style={{
                left: 0, width: (limit ? lower / limit * 100 : 0) + '%',
              }} /></div>
              <input aria-label={'Minimum ' + range.label.toLowerCase()} type="range" min={0} max={limit} value={lower}
                disabled={!limit} onChange={event => update(range.from, event.target.value === '0' ? '' : event.target.value)} />
            </div>
          </>}
        </fieldset>;
      })}
      <label>Room type<select value={filters.roomType} onChange={event => update('roomType', event.target.value)}><option value="">All types</option>{roomTypes.map(type => <option key={type}>{type}</option>)}</select></label>
    </div>
  </section>;
}
