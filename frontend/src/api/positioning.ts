import { LISTING_COLUMNS, numeric, parseListing, post } from './explorer';
import type { District } from '../interfaces/explorer';

export interface PropertyInput {
  district: District;
  room_type: string;
  accommodates: number;
  bedrooms: number;
  beds: number;
  amenities: string[];
}

export async function fetchAmenities(signal: AbortSignal) {
  const result = await post('/amenities', { listing_ids: [] }, signal);
  if (!Array.isArray(result)) throw new Error('Invalid amenities response.');
  const listingsByAmenity = new Map<string, Set<string>>();
  for (const item of result) {
    const { amenity, listing_id } = record(item);
    const name = typeof amenity === 'string' ? amenity.trim() : '';
    if (!name || (typeof listing_id !== 'number' && typeof listing_id !== 'string')) continue;
    const ids = listingsByAmenity.get(name) ?? new Set<string>();
    ids.add(String(listing_id));
    listingsByAmenity.set(name, ids);
  }
  return [...listingsByAmenity].sort(([a, idsA], [b, idsB]) => idsB.size - idsA.size || a.localeCompare(b)).map(([name]) => name);
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid API record.');
  return value as Record<string, unknown>;
}

export async function fetchListingAmenities(id: string, signal: AbortSignal) {
  if (!/^\d+$/.test(id)) throw new Error('Invalid listing ID.');
  // The backend coerces decimal strings to integers without losing precision.
  const result = await post('/amenities', { listing_ids: [id] }, signal);
  if (!Array.isArray(result)) throw new Error('Invalid listing amenities response.');
  const names = result.flatMap(item => {
    const { amenity } = record(item);
    return typeof amenity === 'string' && amenity.trim() ? [amenity.trim()] : [];
  });
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

export async function fetchComparables(input: PropertyInput, count: number, signal: AbortSignal) {
  const result = await post('/listing-comparisons/compare', { ...input, top_n: count, columns: LISTING_COLUMNS }, signal);
  if (!Array.isArray(result)) throw new Error('Invalid comparison response.');
  return result.map(item => {
    const row = record(item);
    return { id: String(row.id), name: typeof row.name === 'string' ? row.name : 'Listing #' + String(row.id),
      price: numeric(row.price), rating: numeric(row.review_scores_rating), guests: numeric(row.accommodates),
      similarity: numeric(row.similarity), listing: parseListing(row) };
  });
}

export async function fetchPrediction(input: PropertyInput, signal: AbortSignal) {
  const response = await post('/listing-comparisons/predict', input, signal);
  const first: unknown = Array.isArray(response) ? response[0] : response;
  const output = first && typeof first === 'object' ? record(first) : null;
  const price = numeric(output ? output.predicted_price_sek : first);
  if (price == null || price < 0) throw new Error('The model did not return a recognized price.');
  // A bare model prediction can be displayed without claiming an explanation.
  const explanation = output?.explanation;
  const details = explanation && typeof explanation === 'object' && !Array.isArray(explanation) ? record(explanation) : null;
  const raw = details?.contributions_sek;
  const contributions = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.entries(raw).flatMap(([name, value]) => {
      const contribution = numeric(value);
      return contribution == null ? [] : [{ name, contribution }];
    }).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    : [];
  return { price, baseline: numeric(details?.baseline_sek), contributions };
}
