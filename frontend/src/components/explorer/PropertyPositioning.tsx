import { useEffect, useMemo, useState } from 'react';
import { bin, median } from 'd3';
import { fetchComparables, fetchPrediction } from '../../api/positioning';
import type { PropertyInput } from '../../api/positioning';
import { DISTRICTS } from '../../interfaces/explorer';
import type { District, ListingLocation, Resource } from '../../interfaces/explorer';
import { formatNumber } from '../../utils/explorer';
import { compareOptionalNumbers } from '../../utils/ranking';
import type { SortDirection } from '../../utils/ranking';

type Comparables = Awaited<ReturnType<typeof fetchComparables>>;
const sortableColumns = [
  { key: 'price', label: 'SEK' }, { key: 'similarity', label: 'Match' },
  { key: 'rating', label: 'Rating' }, { key: 'guests', label: 'Guests' },
] as const;
type ComparableSortKey = typeof sortableColumns[number]['key'];
type Prediction = Awaited<ReturnType<typeof fetchPrediction>>;
const initial: Omit<PropertyInput, 'district'> = {
  room_type: 'Private room', accommodates: 2, bedrooms: 1, beds: 1, amenities: [],
};

type PriceBins = ReturnType<typeof priceBins>;
function priceBins(rows: Comparables) {
  return bin<Comparables[number], number>().value(row => row.price ?? NaN).thresholds(8)(rows);
}

function PriceHistogram({ bins, active, onSelect }: { bins: PriceBins; active: number | null; onSelect: (index: number) => void }) {
  const max = Math.max(...bins.map(bucket => bucket.length), 1);
  const minimum = bins[0].x0 ?? 0, maximum = bins[bins.length - 1].x1 ?? minimum;
  const span = maximum - minimum;
  return <figure className="positioning-histogram">
    <figcaption>Comparable nightly prices (SEK)</figcaption>
    <p>{active == null ? 'Select a bar to highlight its listings.' : bins[active].length + ' listings highlighted. Select the bar again to clear.'}</p>
    <svg viewBox="0 0 280 76" role="group" aria-label="Histogram of comparable nightly prices">
      {bins.map((bucket, index) => {
        if (!bucket.length) return null;
        const height = 74 * bucket.length / max;
        const x = span ? 280 * ((bucket.x0 ?? minimum) - minimum) / span : 0;
        const width = span ? 280 * ((bucket.x1 ?? maximum) - (bucket.x0 ?? minimum)) / span : 280;
        const label = formatNumber(bucket.x0) + ' to ' + formatNumber(bucket.x1) + ' SEK: ' + bucket.length + ' listings';
        return <rect key={index} x={x} y={76 - height} width={Math.max(1, width - 2)} height={height}
          role="button" tabIndex={0} aria-label={label} aria-pressed={active === index} onClick={() => onSelect(index)}
          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(index); } }}>
          <title>{label}</title>
        </rect>;
      })}
    </svg>
    <div className="legend-labels"><span>{formatNumber(minimum)}</span><span>{formatNumber(maximum)}</span></div>
  </figure>;
}

const featureLabels: Record<string, string> = {
  room_type: 'Room type', accommodates: 'Guests', district: 'District',
  bedrooms: 'Bedrooms', amenity_count: 'Amenities', beds: 'Beds',
};
const contributionNumber = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 2, signDisplay: 'exceptZero' });

function ContributionStar({ contributions }: { contributions: Prediction['contributions'] }) {
  const magnitude = Math.max(1, ...contributions.map(item => Math.abs(item.contribution)));
  const axes = [...contributions].sort((a, b) => a.name.localeCompare(b.name)).map(({ name, contribution }, index) => {
    const angle = index * 2 * Math.PI / contributions.length - Math.PI / 2;
    const offset = (radius: number) => [160 + radius * Math.cos(angle), 85 + radius * Math.sin(angle)] as const;
    return { name, contribution, offset, label: featureLabels[name] ?? name.replaceAll('_', ' ') };
  });
  return <figure className="positioning-star">
    <svg viewBox="0 0 320 170" role="img" aria-label="Model contribution star plot. Longer spokes show stronger contributions.">
      {[18, 36, 54].map(radius => <circle key={radius} cx={160} cy={85} r={radius} className="positioning-star-grid" />)}
      {axes.length >= 3 && <polygon className="positioning-star-profile" points={axes.map(({ contribution, offset }) => offset(Math.abs(contribution) / magnitude * 54).join(',')).join(' ')} />}
      {axes.map(({ name, contribution, offset, label }) => {
        const [x, y] = offset(54), [endX, endY] = offset(Math.abs(contribution) / magnitude * 54);
        const [labelX, labelY] = offset(65);
        const colour = contribution < 0 ? '#AD632F' : 'var(--primary)';
        return <g key={name}>
          <title>{label + ': ' + contributionNumber.format(contribution) + ' SEK'}</title>
          <line x1={160} y1={85} x2={x} y2={y} className="positioning-star-grid" />
          <line x1={160} y1={85} x2={endX} y2={endY} stroke={colour} strokeWidth={3} />
          <circle cx={endX} cy={endY} r={3} fill={colour} />
          <text x={labelX} y={labelY - 1} textAnchor={labelX < 153 ? 'end' : labelX > 167 ? 'start' : 'middle'}>
            <tspan x={labelX}>{label}</tspan>
            <tspan x={labelX} dy={11} fill={colour}>{contributionNumber.format(contribution)}</tspan>
          </text>
        </g>;
      })}
    </svg>
    <figcaption><span>● Raises price</span><span>● Lowers price</span><span>Outer ring: {formatNumber(magnitude)} SEK</span></figcaption>
  </figure>;
}

export default function PropertyPositioning({ roomTypes, onSelect, selectedListingId, district, onDistrict, amenities, onRetryAmenities }: {
  roomTypes: string[];
  onSelect: (listing: ListingLocation) => void;
  selectedListingId: string | null;
  district: District;
  onDistrict: (district: District) => void;
  amenities: Resource<string[]>;
  onRetryAmenities: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const input = useMemo(() => ({ ...draft, district }), [draft, district]);
  const [sort, setSort] = useState<{ key: ComparableSortKey; direction: SortDirection }>({ key: 'similarity', direction: 'desc' });
  const [activeBin, setActiveBin] = useState<number | null>(null);
  const [count, setCount] = useState(20);
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState<{ input: PropertyInput; count: number } | null>(null);
  const [comparables, setComparables] = useState<Resource<Comparables> | null>(null);
  const [prediction, setPrediction] = useState<Resource<Prediction> | null>(null);
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
    setActiveBin(null);
    setComparables({ status: 'loading' });
    setPrediction({ status: 'loading' });
    setSubmitted({ input, count });
  }
  function change<K extends keyof typeof initial>(key: K, value: typeof initial[K]) {
    setDraft(current => current[key] === value ? current : { ...current, [key]: value });
  }
  function toggleAmenity(amenity: string) {
    change('amenities', input.amenities.includes(amenity) ? input.amenities.filter(item => item !== amenity) : [...input.amenities, amenity]);
  }
  const available = useMemo(() => (amenities.data ?? []).filter(item => item.toLowerCase().includes(search.trim().toLowerCase())), [amenities.data, search]);
  const sortedComparables = useMemo(() => [...(comparables?.data ?? [])].sort(
    (a, b) => compareOptionalNumbers(a[sort.key], b[sort.key], sort.direction),
  ), [comparables?.data, sort]);
  const prices = (comparables?.data ?? []).flatMap(item => item.price == null ? [] : [item.price]);
  const typical = median(prices) ?? null;
  const contributions = prediction?.data?.contributions ?? [];
  const bins = useMemo(() => priceBins(comparables?.data ?? []), [comparables?.data]);
  const highlighted = new Set(activeBin == null ? [] : bins[activeBin]?.map(item => item.id));
  const hasEdits = submitted !== null && (submitted.input !== input || submitted.count !== count);
  const loading = comparables?.status === 'loading' || prediction?.status === 'loading';
  return <section className="positioning panel" aria-labelledby="positioning-title">
    <h2 id="positioning-title">Property positioning</h2>
    <div className="positioning-inputs">
      <label>District<select value={input.district} onChange={event => onDistrict(event.target.value as District)}>
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
        : amenities.status === 'error' ? <p role="alert">{amenities.error} <button type="button" className="text-button" onClick={onRetryAmenities}>Retry</button></p>
          : <>
            <input type="search" aria-label="Search amenities" placeholder="Search amenities" value={search} onChange={event => setSearch(event.target.value)} />
            {!!input.amenities.length && <div className="positioning-chips">{input.amenities.map(item => <button key={item} type="button" onClick={() => toggleAmenity(item)} aria-label={'Remove ' + item}>{item} ×</button>)}</div>}
            <div className="positioning-options">{available.map(item => <label key={item}>
              <input type="checkbox" checked={input.amenities.includes(item)} onChange={() => toggleAmenity(item)} />{item}
            </label>)}</div>
            {!available.length && <p>No matching amenities.</p>}
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
      {contributions.length ? <ContributionStar contributions={contributions} /> : <p>No feature contributions were returned by the model.</p>}
    </section>}
    {prices.length > 0 && <PriceHistogram bins={bins} active={activeBin} onSelect={index => setActiveBin(current => current === index ? null : index)} />}
    <h3>Comparable listings</h3>
    {comparables?.status === 'loading' && <p role="status">Finding comparable listings…</p>}
    {comparables?.status === 'success' && (!comparables.data.length ? <p>No comparable listings found.</p> :
      <div className="positioning-table"><table>
        <thead><tr><th scope="col">Listing</th>{sortableColumns.map(({ key, label }) => <th key={key} scope="col"
          aria-sort={sort.key === key ? sort.direction === 'asc' ? 'ascending' : 'descending' : undefined}>
          <button className="positioning-sort" type="button" onClick={() => setSort(current => ({
            key, direction: current.key === key ? current.direction === 'asc' ? 'desc' : 'asc' : key === 'price' ? 'asc' : 'desc',
          }))}>
            {label}<span aria-hidden="true">{sort.key === key ? sort.direction === 'asc' ? ' ↑' : ' ↓' : ' ↕'}</span>
          </button>
        </th>)}</tr></thead>
        <tbody>{sortedComparables.map(row => <tr key={row.id} className={highlighted.has(row.id) ? 'positioning-row--highlighted' : undefined} aria-current={row.id === selectedListingId ? 'true' : undefined}>
          <th scope="row">{row.listing ? <button type="button" className="text-button" onClick={() => onSelect(row.listing!)}>{row.name}</button> : row.name}</th>
          <td>{formatNumber(row.price)}</td><td>{row.similarity == null ? 'N/A' : Math.round(row.similarity * 100) + '%'}</td>
          <td>{row.rating?.toFixed(2) ?? 'N/A'}</td><td>{formatNumber(row.guests)}</td>
        </tr>)}</tbody>
      </table></div>)}
    </>}
  </section>;
}
