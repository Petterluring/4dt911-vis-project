import { CLUSTERING_FEATURES } from '../interfaces/clustering';
import type { ClusteringFeature, ClusteringRequest } from '../interfaces/clustering';

export const CLUSTERING_FEATURE_LABELS: Record<ClusteringFeature, string> = {
  room_type: 'Room type', accommodates: 'Guest capacity', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', beds: 'Beds',
};
export interface ConfigurationValidation {
  request: ClusteringRequest | null;
  errors: { features?: string; k?: string };
}
export function validateClusteringConfiguration(features: readonly unknown[], k: string | number, listingCount?: number): ConfigurationValidation {
  const errors: ConfigurationValidation['errors'] = {};
  const cleaned = features.map(feature => typeof feature === 'string' ? feature.trim() : feature);
  if (!cleaned.length) errors.features = 'Select at least one accommodation characteristic.';
  else if (cleaned.some(feature => !(CLUSTERING_FEATURES as readonly unknown[]).includes(feature))) {
    errors.features = 'Use only room type, guest capacity, bedrooms, bathrooms, or beds.';
  }
  const count = typeof k === 'string' && !k.trim() ? NaN : Number(k);
  if (!Number.isSafeInteger(count) || count < 2) errors.k = 'Enter a whole number of clusters (K) of at least 2.';
  else if (listingCount !== undefined && count > listingCount) {
    errors.k = `K cannot exceed the ${listingCount} listings in the last successful backend dataset.`;
  }
  return { errors, request: Object.keys(errors).length ? null : {
    features: CLUSTERING_FEATURES.filter(feature => cleaned.includes(feature)), n_clusters: count,
  } };
}
export function sameClusteringConfiguration(first: ClusteringRequest, second: ClusteringRequest): boolean {
  return first.n_clusters === second.n_clusters && CLUSTERING_FEATURES.every(feature => first.features.includes(feature) === second.features.includes(feature));
}
export function formatClusteringConfiguration(request: ClusteringRequest): string {
  return `K = ${request.n_clusters} · ${request.features.map(feature => CLUSTERING_FEATURE_LABELS[feature]).join(', ')}`;
}
