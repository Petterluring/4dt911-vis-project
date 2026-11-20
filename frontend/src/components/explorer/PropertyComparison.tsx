import { useEffect, useState } from 'react';
import { fetchListingAmenities, fetchPrediction } from '../../api/positioning';
import type { PropertyInput } from '../../api/positioning';
import type { ListingLocation, Resource } from '../../interfaces/explorer';
import { formatNumber } from '../../utils/explorer';
import { MAX_COMPARABLE_LISTINGS } from '../../utils/listing';

const attributes = [
  ['district', 'District'], ['room_type', 'Room type'], ['accommodates', 'Guests'],
  ['bedrooms', 'Bedrooms'], ['beds', 'Beds'],
] as const;
const signedPrice = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 0, signDisplay: 'exceptZero' });

function nightly(price: number | null) {
  return price == null ? 'Unavailable' : formatNumber(price) + ' SEK';
}

function ComparablePrediction({ listing, baseline }: { listing: ListingLocation; baseline: number | null }) {
  const { id, district, room_type, accommodates, bedrooms, beds } = listing;
  const canPredict = district != null && !!room_type && accommodates != null && accommodates > 0
    && bedrooms != null && bedrooms >= 0 && beds != null && beds >= 0;
  const [price, setPrice] = useState<Resource<number>>({ status: 'loading' });
  useEffect(() => {
    if (!canPredict) return;
    const request = new AbortController();
    void fetchListingAmenities(id, request.signal)
      .then(amenities => fetchPrediction({ district, room_type, accommodates, bedrooms, beds, amenities }, request.signal))
      .then(result => {
        if (!request.signal.aborted) setPrice({ status: 'success', data: result.price });
      }).catch(() => {
        if (!request.signal.aborted) setPrice({ status: 'error', error: 'Prediction unavailable' });
      });
    return () => request.abort();
  }, [id, district, room_type, accommodates, bedrooms, beds, canPredict]);
  if (!canPredict) return <>Missing property data</>;
  if (price.status === 'loading') return <span role="status">Calculating…</span>;
  if (price.status === 'error') return <>{price.error}</>;
  return <>{nightly(price.data)}{baseline != null && <small>{signedPrice.format(Math.round(price.data) - Math.round(baseline))} SEK vs. hypothetical</small>}</>;
}

export default function PropertyComparison({ input, prediction, listings, onRemove, hidden }: {
  input: PropertyInput | null;
  prediction: Resource<{ price: number }> | null;
  listings: ListingLocation[];
  onRemove: (listing: ListingLocation) => void;
  hidden: boolean;
}) {
  const baseline = prediction?.data?.price ?? null;
  return <section className="property-comparison panel" aria-labelledby="property-comparison-title" hidden={hidden}>
    <header>
      <h2 id="property-comparison-title">Property comparison</h2>
      <p>{!input ? 'Calculate a hypothetical property to find comparable Airbnbs.'
          : listings.length === MAX_COMPARABLE_LISTINGS ? `${listings.length} of ${MAX_COMPARABLE_LISTINGS} selected. Remove a listing to compare another.`
          : `Select up to ${MAX_COMPARABLE_LISTINGS} comparables from the map or the results list.`}</p>
    </header>
    {input && <table aria-label="Property comparison table">
        <thead><tr>
          <th scope="col">Property</th><th scope="col">Hypothetical listing</th>
          {listings.map(listing => <th key={listing.id} scope="col">
            <span className="property-comparison__name" title={listing.name ?? 'Listing #' + listing.id}>{listing.name ?? 'Listing #' + listing.id}</span>
            <button className="text-button" type="button" onClick={() => onRemove(listing)}
              aria-label={'Remove ' + (listing.name ?? 'listing #' + listing.id)}>Remove</button>
          </th>)}
        </tr></thead>
        <tbody>
          <tr className="property-comparison__price">
            <th scope="row">Predicted nightly price</th>
            <td>{prediction?.status === 'loading' ? 'Calculating…' : nightly(baseline)}</td>
            {listings.map(listing => <td key={listing.id}><ComparablePrediction listing={listing} baseline={baseline} /></td>)}
          </tr>
          {listings.length > 0 && <tr>
            <th scope="row">Listed nightly price</th><td>—</td>
            {listings.map(listing => <td key={listing.id}>{nightly(listing.price)}</td>)}
          </tr>}
          {attributes.map(([key, label]) => <tr key={key}>
            <th scope="row">{label}</th><td>{input[key]}</td>
            {listings.map(listing => <td key={listing.id} className={listing[key] != null && listing[key] !== input[key] ? 'property-comparison__difference' : undefined}>
              {listing[key] ?? 'Unavailable'}
            </td>)}
          </tr>)}
        </tbody>
    </table>}
  </section>;
}
