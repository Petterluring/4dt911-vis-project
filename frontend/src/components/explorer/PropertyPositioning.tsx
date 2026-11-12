import { useEffect, useMemo, useState } from 'react';
import { bin, median } from 'd3';
import { fetchAmenities, fetchComparables, fetchPrediction } from '../../api/positioning';
import type { PropertyInput } from '../../api/positioning';
import { DISTRICTS } from '../../interfaces/explorer';
import type { District, ListingLocation, Resource } from '../../interfaces/explorer';
import { formatNumber } from '../../utils/explorer';

type Comparables = Awaited<ReturnType<typeof fetchComparables>>;
type Prediction = Awaited<ReturnType<typeof fetchPrediction>>;
const initial: PropertyInput = {
  district: 'Södermalm', room_type: 'Private room', accommodates: 2, bedrooms: 1, beds: 1, amenities: [],
};

function PriceHistogram({ prices }: { prices: number[] }) {
  const bins = bin().thresholds(8)(prices);
  const max = Math.max(...bins.map(bucket => bucket.length), 1);
  const minimum = bins[0].x0 ?? 0, maximum = bins[bins.length - 1].x1 ?? minimum;
  const span = maximum - minimum;
  return <figure className="positioning-histogram">
    <figcaption>Comparable nightly prices (SEK)</figcaption>
    <svg viewBox="0 0 280 76" role="img" aria-label="Histogram of comparable nightly prices">
      {bins.map((bucket, index) => {
        const height = 74 * bucket.length / max;
        const x = span ? 280 * ((bucket.x0 ?? minimum) - minimum) / span : 0;
        const width = span ? 280 * ((bucket.x1 ?? maximum) - (bucket.x0 ?? minimum)) / span : 280;
        return <rect key={index} x={x} y={76 - height} width={Math.max(1, width - 2)} height={height} fill="var(--primary)">
          <title>{formatNumber(bucket.x0)} to {formatNumber(bucket.x1)} SEK: {bucket.length} listings</title>
        </rect>;
      })}
    </svg>
    <div className="legend-labels"><span>{formatNumber(bins[0].x0)}</span><span>{formatNumber(bins[bins.length - 1].x1)}</span></div>
  </figure>;
}

export default function PropertyPositioning({ roomTypes, onSelect }: {
  roomTypes: string[];
  onSelect: (listing: ListingLocation) => void;
}) {
  const [input, setInput] = useState(initial);
  const [count, setCount] = useState(10);
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState<{ input: PropertyInput; count: number } | null>(null);
  const [amenityRevision, setAmenityRevision] = useState(0);
  const [amenities, setAmenities] = useState<Resource<string[]>>({ status: 'loading' });
  const [comparables, setComparables] = useState<Resource<Comparables> | null>(null);
  const [prediction, setPrediction] = useState<Resource<Prediction> | null>(null);
  useEffect(() => {
    const request = new AbortController();
    void fetchAmenities(request.signal).then(data => {
      if (!request.signal.aborted) setAmenities({ status: 'success', data });
    }).catch(() => {
      if (!request.signal.aborted) setAmenities({ status: 'error', error: 'Amenities could not be loaded.' });
    });
    return () => request.abort();
  }, [amenityRevision]);
  useEffect(() => {
    if (!submitted) return;
    const request = new AbortController();
    void fetchComparables(submitted.input, submitted.count, request.signal).then(data => {
      if (!request.signal.aborted) setComparables({ status: 'success', data });
    }).catch(() => {
      if (!request.signal.aborted) setComparables({ status: 'error', error: 'Comparable listings could not be loaded.' });
    });
    void fetchPrediction(submitted.input, request.signal).then(data => {
      if (!request.signal.aborted) setPrediction({ status: 'success', data });
    }).catch((error: unknown) => {
      if (!request.signal.aborted) setPrediction({ status: 'error', error: error instanceof Error ? error.message : 'Prediction unavailable.' });
    });
    return () => request.abort();
  }, [submitted]);
  function calculate() {
    setComparables({ status: 'loading' });
    setPrediction({ status: 'loading' });
    setSubmitted({ input, count });
  }
  function change<K extends keyof PropertyInput>(key: K, value: PropertyInput[K]) {
    setInput(current => current[key] === value ? current : { ...current, [key]: value });
  }
  function toggleAmenity(amenity: string) {
    change('amenities', input.amenities.includes(amenity) ? input.amenities.filter(item => item !== amenity) : [...input.amenities, amenity]);
  }
  const available = useMemo(() => (amenities.data ?? []).filter(item => item.toLowerCase().includes(search.trim().toLowerCase())), [amenities.data, search]);
  const prices = (comparables?.data ?? []).flatMap(item => item.price == null ? [] : [item.price]);
  const typical = median(prices) ?? null;
  const contributions = prediction?.data?.contributions ?? [];
  const magnitude = Math.max(1, ...contributions.map(item => Math.abs(item.contribution)));
  const hasEdits = submitted !== null && (submitted.input !== input || submitted.count !== count);
  const loading = comparables?.status === 'loading' || prediction?.status === 'loading';
  return <section className="positioning panel" aria-labelledby="positioning-title">
    <h2 id="positioning-title">Property positioning</h2>
    <div className="positioning-inputs">
      <label>District<select value={input.district} onChange={event => change('district', event.target.value as District)}>
        {DISTRICTS.map(item => <option key={item}>{item}</option>)}
      </select></label>
      <label>Room type<select value={input.room_type} onChange={event => change('room_type', event.target.value)}>
        {[...new Set([initial.room_type, 'Entire home/apt', ...roomTypes])].map(item => <option key={item}>{item}</option>)}
      </select></label>
      {(['accommodates', 'bedrooms', 'beds'] as const).map(key => <label key={key}>
        {{ accommodates: 'Guests', bedrooms: 'Bedrooms', beds: 'Beds' }[key]}
        <input type="number" min={key === 'accommodates' ? 1 : 0} step={1} value={input[key]} onChange={event => {
          const value = event.target.valueAsNumber;
          if (Number.isInteger(value) && value >= (key === 'accommodates' ? 1 : 0)) change(key, value);
        }} />
      </label>)}
      <label>Comparables<select value={count} onChange={event => setCount(Number(event.target.value))}>
        {[5, 10, 20, 50].map(value => <option key={value}>{value}</option>)}
      </select></label>
    </div>
    <details className="positioning-amenities">
      <summary>Amenities ({input.amenities.length})</summary>
      {amenities.status === 'loading' ? <p role="status">Loading amenities…</p>
        : amenities.status === 'error' ? <p role="alert">{amenities.error} <button type="button" className="text-button" onClick={() => { setAmenities({ status: 'loading' }); setAmenityRevision(value => value + 1); }}>Retry</button></p>
          : <>
            <input type="search" aria-label="Search amenities" placeholder="Search amenities" value={search} onChange={event => setSearch(event.target.value)} />
            {!!input.amenities.length && <div className="positioning-chips">{input.amenities.map(item => <button key={item} type="button" onClick={() => toggleAmenity(item)} aria-label={'Remove ' + item}>{item} ×</button>)}</div>}
            <div className="positioning-options">{available.slice(0, 30).map(item => <label key={item}>
              <input type="checkbox" checked={input.amenities.includes(item)} onChange={() => toggleAmenity(item)} />{item}
            </label>)}</div>
            {!available.length && <p>No matching amenities.</p>}
            {available.length > 30 && <p>Showing 30 of {available.length}. Search to narrow the list.</p>}
          </>}
    </details>
    <button className="positioning-calculate" type="button" disabled={loading && !hasEdits} onClick={calculate}>
      {loading && !hasEdits ? 'Calculating…' : 'Calculate'}
    </button>
    {hasEdits && <p role="status">Inputs changed. Calculate to update the results.</p>}
    {submitted && <>
    <dl className="positioning-prices">
      <div><dt>Predicted nightly price</dt><dd>{prediction?.status === 'loading' ? 'Calculating…' : prediction?.data ? formatNumber(prediction.data.price) + ' SEK' : 'Unavailable'}</dd></div>
      <div><dt>Comparable median</dt><dd>{comparables?.status === 'loading' ? 'Loading…' : typical == null ? 'Unavailable' : formatNumber(typical) + ' SEK'}</dd></div>
    </dl>
    {(prediction?.status === 'error' || comparables?.status === 'error') && <div role="alert">
      {prediction?.status === 'error' && <p>{prediction.error}</p>}
      {comparables?.status === 'error' && <p>{comparables.error}</p>}
    </div>}
    {prediction?.status === 'success' && <section>
      <h3>Model contributions (SEK)</h3>
      {prediction.data.baseline != null && <p>Model baseline: {formatNumber(prediction.data.baseline)} SEK</p>}
      {contributions.length ? <ul className="positioning-contributions">{contributions.map(({ name, contribution }) => <li key={name}>
        <span>{name === 'amenity_count' ? 'Number of amenities' : name.replaceAll('_', ' ')}</span><strong>{contribution > 0 ? '+' : ''}{new Intl.NumberFormat('en-SE', { maximumFractionDigits: 2 }).format(contribution)}</strong>
        <div className="positioning-contribution-track" aria-hidden="true"><i style={{
          width: Math.abs(contribution) / magnitude * 50 + '%', ...(contribution < 0 ? { right: '50%' } : { left: '50%' }),
        }} className={contribution < 0 ? 'is-negative' : undefined} /></div>
      </li>)}</ul> : <p>No feature contributions were returned by the model.</p>}
    </section>}
    {prices.length > 0 && <PriceHistogram prices={prices} />}
    <h3>Comparable listings</h3>
    {comparables?.status === 'loading' && <p role="status">Finding comparable listings…</p>}
    {comparables?.status === 'success' && (!comparables.data.length ? <p>No comparable listings found.</p> :
      <div className="positioning-table"><table>
        <thead><tr><th>Listing</th><th>SEK</th><th>Match</th><th>Rating</th><th>Guests</th></tr></thead>
        <tbody>{comparables.data.map(row => <tr key={row.id}>
          <th scope="row">{row.listing ? <button type="button" className="text-button" onClick={() => onSelect(row.listing!)}>{row.name}</button> : row.name}</th>
          <td>{formatNumber(row.price)}</td><td>{row.similarity == null ? 'N/A' : Math.round(row.similarity * 100) + '%'}</td>
          <td>{row.rating?.toFixed(2) ?? 'N/A'}</td><td>{formatNumber(row.guests)}</td>
        </tr>)}</tbody>
      </table></div>)}
    </>}
  </section>;
}
