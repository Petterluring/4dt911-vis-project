import { polygonContains } from 'd3';
import type { ListingLocation } from '../interfaces/explorer';
import { project } from './map';

export type Point = [number, number];

export function selectionBounds(start: Point, end: Point) {
  return { left: Math.min(start[0], end[0]), top: Math.min(start[1], end[1]),
    width: Math.abs(end[0] - start[0]), height: Math.abs(end[1] - start[1]) };
}

export function listingsInRectangle(listings: ListingLocation[], transform: { apply: (point: Point) => Point }, start: Point, end: Point) {
  const { left, top, width, height } = selectionBounds(start, end);
  return listings.filter(listing => {
    const [x, y] = transform.apply(project(listing.longitude, listing.latitude));
    return x >= left && x <= left + width && y >= top && y <= top + height;
  });
}

export function listingsInLasso(listings: ListingLocation[], transform: { apply: (point: Point) => Point }, points: Point[]) {
  if (points.length < 3) return [];
  return listings.filter(listing => polygonContains(points, transform.apply(project(listing.longitude, listing.latitude))));
}

export function summarizeListings(listings: ListingLocation[]) {
  function values(key: 'price' | 'bedrooms' | 'accommodates' | 'review_scores_rating') {
    return listings.map(listing => listing[key]).filter((value): value is number => value != null && Number.isFinite(value));
  }
  function median(numbers: number[]) {
    if (!numbers.length) return null;
    numbers.sort((a, b) => a - b);
    return (numbers[Math.floor((numbers.length - 1) / 2)] + numbers[Math.floor(numbers.length / 2)]) / 2;
  }
  function counts(key: 'district' | 'room_type') {
    const totals = new Map<string, number>();
    for (const listing of listings) {
      const label = listing[key] ?? 'Unknown';
      totals.set(label, (totals.get(label) ?? 0) + 1);
    }
    return [...totals].sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b));
  }
  const prices = values('price'), ratings = values('review_scores_rating');
  return {
    medianPrice: median(prices), priceCount: prices.length,
    averagePrice: prices.length ? prices.reduce((total, price) => total + price, 0) / prices.length : null,
    averageRating: ratings.length ? ratings.reduce((total, rating) => total + rating, 0) / ratings.length : null,
    ratingCount: ratings.length, medianBedrooms: median(values('bedrooms')), medianGuests: median(values('accommodates')),
    districts: counts('district'), roomTypes: counts('room_type'),
  };
}
