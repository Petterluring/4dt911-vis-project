import { useState } from 'react';
import type { ListingLocation } from '../../interfaces/explorer';
import { formatNumber } from '../../utils/explorer';
import { safeExternalUrl } from '../../utils/listing';
interface Props { listing: ListingLocation; onClose: () => void }
export default function ListingDetails({ listing, onClose }: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = safeExternalUrl(listing.picture_url);
  const listingUrl = safeExternalUrl(listing.listing_url);
  const name = listing.name ?? `Listing #${listing.id}`;
  return <section className="listing-details" aria-label="Selected Airbnb listing">
    <div className="listing-details__hero">
      {imageUrl && !imageFailed
        ? <img src={imageUrl} alt={name} loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} />
        : <div className="listing-details__no-photo"><svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M8 34V10l12-4 12 4v24M4 34h32M16 34V23h8v11M14 13v4m12-4v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Photo unavailable</span></div>}
      <span className="listing-details__badge">{listing.room_type ?? 'Airbnb listing'}</span>
      <button type="button" className="listing-details__close" onClick={onClose} aria-label="Close listing details">×</button>
    </div>
    <div className="listing-details__body">
      <p className="listing-details__location"><span className="status-dot" />{listing.district ?? 'Stockholm'}</p>
      <h2>{name}</h2>
      <div className="listing-details__price-band">
        <div><strong className="listing-details__price">{formatNumber(listing.price)}</strong><span className="listing-details__price-unit">{listing.price != null ? 'SEK / night' : 'Price unavailable'}</span></div>
        <div className="listing-details__rating"><strong><span aria-hidden="true">★ </span>{listing.review_scores_rating == null ? 'Unrated' : listing.review_scores_rating.toFixed(2)}</strong><span>{listing.number_of_reviews == null ? 'Reviews unavailable' : `${formatNumber(listing.number_of_reviews)} reviews`}</span></div>
      </div>
      <dl className="listing-details__facts">
        <div><dt>Guests</dt><dd>{formatNumber(listing.accommodates)}</dd></div>
        <div><dt>Bedrooms</dt><dd>{listing.bedrooms === 0 ? 'Studio (0)' : formatNumber(listing.bedrooms)}</dd></div>
        <div><dt>Beds</dt><dd>{formatNumber(listing.beds)}</dd></div>
        <div><dt>Bathrooms</dt><dd>{listing.bathrooms_text ?? 'Not available'}</dd></div>
      </dl>
      <dl className="listing-details__metadata">
        <div><dt>Property type</dt><dd>{listing.property_type ?? 'Not available'}</dd></div>
        <div><dt>Minimum stay</dt><dd>{listing.minimum_nights == null ? 'Not available' : `${formatNumber(listing.minimum_nights)} ${listing.minimum_nights === 1 ? 'night' : 'nights'}`}</dd></div>
      </dl>
      {listingUrl && <a className="listing-details__link" href={listingUrl} target="_blank" rel="noopener noreferrer">View listing<span aria-hidden="true">↗</span></a>}
      <p className="listing-details__id">Listing #{listing.id}</p>
    </div>
  </section>;
}
