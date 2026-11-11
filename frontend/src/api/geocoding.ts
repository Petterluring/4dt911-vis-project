import type { GeocodedLocation } from '../interfaces/location';
import { validCoordinates } from '../utils/location';

// Photon supports autocomplete. Keep provider details separate from the UI.
const endpoint = import.meta.env.VITE_GEOCODING_URL ?? 'https://photon.komoot.io/api/';
const STOCKHOLM_BOUNDS = [17.2, 58.7, 19.7, 60.3] as const;
const cache = new Map<string, GeocodedLocation[]>();
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function stockholmCounty(value: unknown): boolean {
  return /^(stockholm county|stockholms län|stockholms lan)$/i.test(text(value).normalize('NFC'));
}
export function parseGeocodingResults(value: unknown): GeocodedLocation[] {
  const features = record(value).features;
  if (!Array.isArray(features)) throw new Error('The location service returned an invalid response.');
  const results = new Map<string, GeocodedLocation>();
  for (const feature of features) {
    const row = record(feature), properties = record(row.properties), geometry = record(row.geometry);
    const coordinates = geometry.coordinates;
    if (geometry.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length < 2) continue;
    const [longitude, latitude] = coordinates;
    if (typeof longitude !== 'number' || typeof latitude !== 'number' || !validCoordinates({ latitude, longitude })) continue;
    if (longitude < STOCKHOLM_BOUNDS[0] || longitude > STOCKHOLM_BOUNDS[2] || latitude < STOCKHOLM_BOUNDS[1] || latitude > STOCKHOLM_BOUNDS[3]) continue;
    // A bounding box alone would also include neighbouring counties.
    if (text(properties.countrycode).toUpperCase() !== 'SE' || !(stockholmCounty(properties.county) || stockholmCounty(properties.state) ||
      (properties.type === 'county' && stockholmCounty(properties.name)))) continue;
    const street = [text(properties.street), text(properties.housenumber)].filter(Boolean).join(' ');
    const name = text(properties.name);
    const label = [...new Set([name, street, text(properties.district), text(properties.city), text(properties.county) || text(properties.state)].filter(Boolean))].join(', ');
    if (!label) continue;
    const id = `${text(properties.osm_type)}:${String(properties.osm_id ?? `${longitude},${latitude}:${label}`)}`;
    results.set(id, { id, label, latitude, longitude });
  }
  return [...results.values()].slice(0, 6);
}
export async function searchLocations(query: string, signal: AbortSignal): Promise<GeocodedLocation[]> {
  signal.throwIfAborted();
  const trimmed = query.normalize('NFC').trim();
  if (trimmed.length < 3) return [];
  const key = trimmed.toLocaleLowerCase('sv');
  const cached = cache.get(key);
  if (cached) return cached;
  const url = new URL(endpoint, typeof window === 'undefined' ? 'http://localhost' : window.location.origin);
  url.searchParams.set('q', trimmed);
  url.searchParams.set('bbox', STOCKHOLM_BOUNDS.join(','));
  url.searchParams.set('countrycode', 'SE');
  url.searchParams.set('lang', 'en');
  url.searchParams.set('limit', '10');
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    headers: { Accept: 'application/json' }, credentials: 'omit', referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error(response.status === 429 ? 'Location search is busy. Please try again shortly.' : `Location search failed (${response.status}). Please try again.`);
  const results = parseGeocodingResults(await response.json());
  signal.throwIfAborted();
  if (cache.size >= 50) cache.delete(cache.keys().next().value!);
  cache.set(key, results);
  return results;
}
