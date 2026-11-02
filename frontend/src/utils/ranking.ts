import type { ListingLocation } from '../interfaces/explorer';
export type ListingSortKey = 'price' | 'review_scores_rating' | 'number_of_reviews' | 'bedrooms' | 'accommodates';
export type SortDirection = 'asc' | 'desc';
export const LISTING_SORTS: Record<ListingSortKey, string> = {
  price: 'Price / night (SEK)', review_scores_rating: 'Rating', number_of_reviews: 'Reviews', bedrooms: 'Bedrooms', accommodates: 'Guests',
};
export interface ListingFilters { minPrice: string; maxPrice: string; bedrooms: string; guests: string; roomType: string }
export const EMPTY_FILTERS: ListingFilters = { minPrice: '', maxPrice: '', bedrooms: '', guests: '', roomType: '' };
export function filterListings(listings: ListingLocation[], filters: ListingFilters): ListingLocation[] {
  const matches = (value: number | null, bound: string, maximum = false) => bound === '' ||
    (value != null && Number.isFinite(value) && (maximum ? value <= Number(bound) : value >= Number(bound)));
  return listings.filter(listing => matches(listing.price, filters.minPrice) && matches(listing.price, filters.maxPrice, true) &&
    matches(listing.bedrooms, filters.bedrooms) && matches(listing.accommodates, filters.guests) &&
    (!filters.roomType || listing.room_type === filters.roomType));
}
export const LISTING_ROW_HEIGHT = 40;
const idOrder = new Intl.Collator('en', { numeric: true });
export function rankListings(listings: ListingLocation[], key: ListingSortKey, direction: SortDirection): ListingLocation[] {
  return [...listings].sort((a, b) => {
    const first = a[key], second = b[key];
    const firstMissing = first == null || !Number.isFinite(first);
    const secondMissing = second == null || !Number.isFinite(second);
    if (firstMissing !== secondMissing) return firstMissing ? 1 : -1;
    if (!firstMissing && !secondMissing && first !== second) return (first - second) * (direction === 'asc' ? 1 : -1);
    return idOrder.compare(a.id, b.id);
  });
}
export function listingWindow(total: number, scrollTop: number, height: number) {
  const visible = Math.max(1, Math.ceil(height / LISTING_ROW_HEIGHT));
  const start = Math.max(0, Math.min(total, Math.floor(scrollTop / LISTING_ROW_HEIGHT) - 4));
  const end = Math.min(total, start + visible + 8);
  return { start, end, top: start * LISTING_ROW_HEIGHT, bottom: (total - end) * LISTING_ROW_HEIGHT };
}
