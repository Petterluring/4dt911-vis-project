import type { ZoomTransform } from 'd3';
import type { ListingLocation } from '../interfaces/explorer';
import { listingInBounds, project } from './map';
import type { MapBounds } from './map';
export const MAP_CLICK_DISTANCE = 5;
export const MIN_LISTING_ZOOM = 14;
export const MARKER_GROWTH_ZOOM = 12;
export const MARKER_RADIUS = 2;
export const SELECTED_MARKER_RADIUS = 6.5;
export const MAX_COMPARABLE_LISTINGS = 4;
export const LISTING_CHART_AXES = {
  accommodates: 'Guests',
  beds: 'Beds',
  bedrooms: 'Bedrooms',
  review_scores_rating: 'Review rating',
  number_of_reviews: 'Review count',
  minimum_nights: 'Minimum nights',
} as const;
export type ListingChartAxis = keyof typeof LISTING_CHART_AXES;
export function markerRadii(scale: number) {
  const zoom = Number.isFinite(scale) && scale > 0 ? Math.log2(scale) : MARKER_GROWTH_ZOOM;
  const growth = Math.max(0, Math.min(4.5, (zoom - MARKER_GROWTH_ZOOM) * .9));
  return { normal: MARKER_RADIUS + growth, selected: SELECTED_MARKER_RADIUS + growth };
}
export function canSelectListings(scale: number): boolean {
  return Number.isFinite(scale) && scale >= 2 ** MIN_LISTING_ZOOM;
}


export function movedBeyondClick(start: [number, number], position: [number, number]): boolean {
  return Math.hypot(position[0] - start[0], position[1] - start[1]) >= MAP_CLICK_DISTANCE;
}
export function nearestListing(listings: ListingLocation[], transform: ZoomTransform, position: [number, number], radius = Math.max(8, markerRadii(transform.k).normal + 2)): ListingLocation | null {
  let nearest: ListingLocation | null = null;
  let distance = radius * radius;
  for (const listing of listings) {
    const [x, y] = transform.apply(project(listing.longitude, listing.latitude));
    const candidate = (x - position[0]) ** 2 + (y - position[1]) ** 2;
    if (candidate <= distance) { distance = candidate; nearest = listing; }
  }
  return nearest;
}

export function listingsForPriceChart(listings: ListingLocation[], bounds: MapBounds | null, axis: ListingChartAxis) {
  const minimum = axis === 'accommodates' || axis === 'minimum_nights' ? 1 : 0;
  return listings.flatMap(listing => {
    const x = listing[axis];
    const { price } = listing;
    if (x == null || !Number.isFinite(x) || x < minimum
      || (axis !== 'review_scores_rating' && !Number.isInteger(x))
      || price == null || !Number.isFinite(price) || price < 0
      || (bounds && !listingInBounds(listing, bounds))) return [];
    return [{ listing, x, price }];
  });
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
