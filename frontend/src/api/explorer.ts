import type { Geometry } from 'geojson';
import { DISTRICTS } from '../interfaces/explorer';
import type { DistrictGeometry, DistrictPrices, DistrictTooltip, ListingLocation, ScatterplotStats } from '../interfaces/explorer';
import { boundaryDistrict, isDistrict } from '../utils/explorer';

export const LISTING_COLUMNS = [
  'id', 'latitude', 'longitude', 'name', 'listing_url', 'picture_url', 'district',
  'room_type', 'property_type', 'price', 'accommodates', 'bedrooms', 'beds',
  'bathrooms_text', 'review_scores_rating', 'number_of_reviews', 'minimum_nights',
];
type Row = Record<string, unknown>;
function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The API returned an invalid record.');
  return value as Row;
}
function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error('The API returned an invalid response.');
  return value.map(object);
}
// SQL numeric aggregates may be decimal strings. Missing and zero stay distinct.
export function numeric(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
async function post(path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
  });
  if (!response.ok) throw new Error(`Request failed (${response.status}). Check the backend connection.`);
  return response.json();
}
function prices(value: unknown): DistrictPrices[] {
  return rows(value).flatMap(row => !isDistrict(row.district) ? [] : [{
    district: row.district, average_housing_price: numeric(row.average_housing_price),
    median_housing_price: numeric(row.median_housing_price), average_airbnb_price: numeric(row.average_airbnb_price),
    median_airbnb_price: numeric(row.median_airbnb_price),
  }]);
}
export async function fetchDistrictPrices(signal: AbortSignal): Promise<DistrictPrices[]> {
  return prices(await post('/choropleth-map/district-stats', { districts: DISTRICTS }, signal));
}
export async function fetchDistrictTooltips(signal: AbortSignal): Promise<DistrictTooltip[]> {
  return rows(await post('/choropleth-map/tooltip-statistics', { districts: DISTRICTS }, signal))
    .flatMap(row => !isDistrict(row.district) ? [] : [{
      district: row.district, average_housing_price_per_m2: numeric(row.average_housing_price_per_m2),
      median_airbnb_price: numeric(row.median_airbnb_price), airbnb_listing_count: numeric(row.airbnb_listing_count),
      tourism_score: numeric(row.tourism_score), average_airbnb_rating: numeric(row.average_airbnb_rating),
      tourist_attractions: numeric(row.tourist_attractions),
    }]);
}
export function parseScatterplots(value: unknown): ScatterplotStats {
  const groups = rows(value);
  const tourismGroup = groups.find(group => Array.isArray(group.scatterplot_1));
  const priceGroup = groups.find(group => Array.isArray(group.scatterplot_2));
  if (!tourismGroup || !priceGroup) throw new Error('Scatterplot data is incomplete.');
  return {
    tourism: rows(tourismGroup.scatterplot_1).flatMap(row => !isDistrict(row.district) ? [] : [{
      district: row.district, tourism_score: numeric(row.tourism_score), airbnb_listing_count: numeric(row.airbnb_listing_count),
    }]), prices: prices(priceGroup.scatterplot_2),
  };
}
export async function fetchScatterplots(signal: AbortSignal): Promise<ScatterplotStats> {
  return parseScatterplots(await post('/scatterplots/district-stats', { districts: DISTRICTS }, signal));
}
export async function fetchListings(signal: AbortSignal): Promise<ListingLocation[]> {
  const locations = new Map<string, ListingLocation>();
  const pageSize = 1000;
  // The backend orders by ID. Stop on raw page size, not valid coordinate count.
  for (let offset = 0; ; offset += pageSize) {
    const page = rows(await post('/choropleth-map/listings', { columns: LISTING_COLUMNS, limit: pageSize, offset }, signal));
    for (const row of page) {
      const latitude = numeric(row.latitude), longitude = numeric(row.longitude);
      if ((typeof row.id === 'number' || typeof row.id === 'string') && latitude != null && longitude != null && Math.abs(latitude) <= 85.051129 && Math.abs(longitude) <= 180) {
        const id = String(row.id);
        locations.set(id, {
          id, latitude, longitude, name: optionalText(row.name),
          listing_url: optionalText(row.listing_url), picture_url: optionalText(row.picture_url),
          district: isDistrict(row.district) ? row.district : null,
          room_type: optionalText(row.room_type), property_type: optionalText(row.property_type),
          price: numeric(row.price), accommodates: numeric(row.accommodates),
          bedrooms: numeric(row.bedrooms), beds: numeric(row.beds),
          bathrooms_text: optionalText(row.bathrooms_text),
          review_scores_rating: numeric(row.review_scores_rating),
          number_of_reviews: numeric(row.number_of_reviews), minimum_nights: numeric(row.minimum_nights),
        });
      }
    }
    if (page.length < pageSize) break;
  }
  return [...locations.values()];
}
export async function fetchGeometry(signal: AbortSignal): Promise<DistrictGeometry> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/stockholm-districts-2025.geojson`, { signal });
  if (!response.ok) throw new Error('District boundaries could not be loaded.');
  const data = object(await response.json());
  if (data.type !== 'FeatureCollection') throw new Error('Invalid district boundary file.');
  const features: DistrictGeometry['features'] = rows(data.features).map(feature => {
    const district = boundaryDistrict(object(feature.properties).Namn);
    const geometry = object(feature.geometry);
    if (!district || !['Polygon', 'MultiPolygon'].includes(String(geometry.type)) || !Array.isArray(geometry.coordinates)) throw new Error('Unrecognized district boundary.');
    return { type: 'Feature', properties: { district }, geometry: geometry as unknown as Extract<Geometry, { type: 'Polygon' | 'MultiPolygon' }> };
  });
  if (new Set(features.map(feature => feature.properties.district)).size !== DISTRICTS.length) throw new Error('Some district boundaries are missing.');
  return { type: 'FeatureCollection', features };
}
