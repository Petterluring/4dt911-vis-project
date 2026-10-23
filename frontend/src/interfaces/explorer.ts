import type { FeatureCollection, MultiPolygon, Polygon } from 'geojson';

export const DISTRICTS = [
  'Bromma', 'Enskede-Årsta-Vantör', 'Farsta', 'Hägersten-Älvsjö',
  'Hässelby-Vällingby', 'Järva', 'Kungsholmen', 'Norra innerstaden',
  'Skarpnäck', 'Skärholmen', 'Södermalm',
] as const;
export type District = typeof DISTRICTS[number];
export type PriceMetric = 'average_housing_price' | 'median_housing_price' | 'average_airbnb_price' | 'median_airbnb_price';
export type PriceMode = 'average' | 'median';
export type PriceStats = Record<PriceMetric, number | null>;
export interface DistrictPrices extends PriceStats { district: District }
export interface DistrictTooltip {
  district: District;
  average_housing_price_per_m2: number | null;
  median_airbnb_price: number | null;
  airbnb_listing_count: number | null;
  tourism_score: number | null;
  average_airbnb_rating: number | null;
  tourist_attractions: number | null;
}
export interface TourismPoint {
  district: District;
  tourism_score: number | null;
  airbnb_listing_count: number | null;
}
export interface ScatterplotStats { tourism: TourismPoint[]; prices: DistrictPrices[] }
export interface ListingLocation {
  id: string;
  latitude: number;
  longitude: number;
  name: string | null;
  listing_url: string | null;
  picture_url: string | null;
  district: District | null;
  room_type: string | null;
  property_type: string | null;
  price: number | null;
  accommodates: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms_text: string | null;
  review_scores_rating: number | null;
  number_of_reviews: number | null;
  minimum_nights: number | null;
}
export type DistrictGeometry = FeatureCollection<Polygon | MultiPolygon, { district: District }>;
export type Resource<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: string };
