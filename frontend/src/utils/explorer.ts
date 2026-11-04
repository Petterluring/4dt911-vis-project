import { scaleSequential, interpolateRgb } from 'd3';
import { DISTRICTS } from '../interfaces/explorer';
import type { District, PriceMetric, DistrictPrices, PriceMode, ListingLocation } from '../interfaces/explorer';

export const METRICS: Record<PriceMetric, { label: string; unit: string }> = {
  average_housing_price: { label: 'Average housing price', unit: 'SEK / sale' },
  median_housing_price: { label: 'Median housing price', unit: 'SEK / sale' },
  average_airbnb_price: { label: 'Average Airbnb price', unit: 'SEK / night' },
  median_airbnb_price: { label: 'Median Airbnb price', unit: 'SEK / night' },
};
export const CHART_COLORS = { low: '#DFEFF0', high: '#167D8D', selected: '#E89A45', missing: '#DCE4E8' };
export function isDistrict(value: unknown): value is District {
  return typeof value === 'string' && (DISTRICTS as readonly string[]).includes(value);
}
// Stockholm's boundary export uses possessive forms for some district names.
export function boundaryDistrict(name: unknown): District | null {
  if (typeof name !== 'string') return null;
  const normalized = name.normalize('NFC').trim();
  if (isDistrict(normalized)) return normalized;
  const withoutPossessive = normalized.replace(/s$/, '');
  return isDistrict(withoutPossessive) ? withoutPossessive : null;
}
const numberFormat = new Intl.NumberFormat('en-SE', { maximumFractionDigits: 0 });
const compactFormat = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
export function formatNumber(value: number | null | undefined): string {
  return value == null ? 'Not available' : numberFormat.format(value);
}
export function formatCompact(value: number): string { return compactFormat.format(value); }
export function formatRating(value: number | null | undefined): string {
  return value == null ? 'Not available' : `${value.toFixed(2)} / 5`;
}
export function priceKeys(mode: PriceMode): [PriceMetric, PriceMetric] {
  return [`${mode}_housing_price`, `${mode}_airbnb_price`];
}
export function metricScale(prices: DistrictPrices[], metric: PriceMetric) {
  const values = prices.flatMap(row => row[metric] == null ? [] : [row[metric]]);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;
  const scale = scaleSequential(interpolateRgb(CHART_COLORS.low, CHART_COLORS.high)).domain([min ?? 0, max ?? 1]).clamp(true);
  return { min, max, color: (value: number | null | undefined) => value == null ? CHART_COLORS.missing : scale(value) };
}

export const LISTING_COLORS = { low: '#A178DB', high: '#3A176C', missing: '#87969C' };

export function listingMetricScale(listings: ListingLocation[], prices: DistrictPrices[], metric: PriceMetric) {
  const housing = metric.endsWith('housing_price');
  const districts = new Map(prices.map(row => [row.district, row[metric]]));
  const valueFor = (listing: ListingLocation) =>
    housing ? (listing.district ? districts.get(listing.district) : null) : listing.price;
  let min: number | null = null, max: number | null = null;
  for (const listing of listings) {
    const value = valueFor(listing);
    if (value == null || !Number.isFinite(value) || value < 0) continue;
    min = Math.min(min ?? value, value);
    max = Math.max(max ?? value, value);
  }
  const scale = scaleSequential(interpolateRgb(LISTING_COLORS.low, LISTING_COLORS.high)).domain([Math.log1p(min ?? 0), Math.log1p(max ?? 1)]).clamp(true);
  return { housing, min, max, color: (listing: ListingLocation) => {
    const value = valueFor(listing);
    return value == null || !Number.isFinite(value) || value < 0 ? LISTING_COLORS.missing : scale(Math.log1p(value));
  } };
}