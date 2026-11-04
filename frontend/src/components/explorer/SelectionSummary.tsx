import { useMemo } from 'react';
import type { ListingLocation } from '../../interfaces/explorer';
import { summarizeListings } from '../../utils/selection';

const number = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 2 });
const format = (value: number | null) => value == null ? 'N/A' : number.format(value);

export default function SelectionSummary({ listings, onClear }: { listings: ListingLocation[]; onClear: () => void }) {
  const stats = useMemo(() => summarizeListings(listings), [listings]);
  return <section className="selection-summary panel" aria-labelledby="selection-title">
    <header><h2 id="selection-title">Listing selection</h2>
      <button type="button" className="text-button" onClick={onClear}>Clear group</button></header>
    <p role="status">{format(listings.length)} selected listings</p>
    {listings.length ? <>
      <dl>
        <div><dt>Median nightly price</dt><dd>{format(stats.medianPrice)}{stats.medianPrice != null && ' SEK'}</dd></div>
        <div><dt>Average rating</dt><dd>{format(stats.averageRating)}</dd></div>
        <div><dt>Median bedrooms</dt><dd>{format(stats.medianBedrooms)}</dd></div>
        <div><dt>Median guest capacity</dt><dd>{format(stats.medianGuests)}</dd></div>
      </dl>
      <p className="selection-coverage">Price available for {format(stats.priceCount)}; rating available for {format(stats.ratingCount)}.</p>
      <h3>Districts</h3><ul>{stats.districts.map(([label, count]) => <li key={label}>{label}<span>{format(count)}</span></li>)}</ul>
      <h3>Room types</h3><ul>{stats.roomTypes.map(([label, count]) => <li key={label}>{label}<span>{format(count)}</span></li>)}</ul>
    </> : <p>No listings match this selection and the current filters. Draw a new box, adjust the filters or clear the group.</p>}
  </section>;
}
