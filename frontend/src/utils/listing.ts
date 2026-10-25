import type { ZoomTransform } from 'd3';
import type { ListingLocation } from '../interfaces/explorer';
import { project } from './map';
export const MAP_CLICK_DISTANCE = 5;
export const MIN_LISTING_ZOOM = 14;
export const MARKER_GROWTH_ZOOM = 12;
export const MARKER_RADIUS = 2;
export const SELECTED_MARKER_RADIUS = 6.5;
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
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
