import { scaleSequential, scaleLinear, interpolateRgb, quantileSorted } from 'd3';
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

export const LISTING_COLORS = { low: '#267EB0', mid: '#8655B7', high: '#AC214D', missing: '#D8D8D8' };

export function listingMetricScale(listings: ListingLocation[], prices: DistrictPrices[], metric: PriceMetric) {
  const housing = metric.endsWith('housing_price');
  const districts = new Map(prices.map(row => [row.district, row[metric]]));
  const valueFor = (listing: ListingLocation) =>
    housing ? (listing.district ? districts.get(listing.district) : null) : listing.price;
  const isPrice = (value: number | null | undefined): value is number =>
    value != null && Number.isFinite(value) && value >= 0;
  const values = listings.map(valueFor).filter(isPrice).sort((a, b) => a - b);
  const low = quantileSorted(values, .1), middle = quantileSorted(values, .5), high = quantileSorted(values, .9);
  // Clip the tails so a few extreme prices do not compress the visible range.
  const stops = low == null || middle == null || high == null ? []
    : low === high ? [{ value: middle, color: LISTING_COLORS.mid }]
      : [
        { value: low, color: LISTING_COLORS.low },
        ...(low < middle && middle < high ? [{ value: middle, color: LISTING_COLORS.mid }] : []),
        { value: high, color: LISTING_COLORS.high },
      ];
  const scale = scaleLinear<string>().domain(stops.map(stop => stop.value)).range(stops.map(stop => stop.color)).clamp(true);
  return { housing, stops, color: (listing: ListingLocation) => {
    const value = valueFor(listing);
    if (!isPrice(value) || !stops.length) return LISTING_COLORS.missing;
    return stops.length === 1 ? stops[0].color : scale(value);
  } };
}
