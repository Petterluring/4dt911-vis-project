import { geoPath, geoTransform, zoomIdentity } from 'd3';
import type { ZoomTransform } from 'd3';
import type { DistrictGeometry, ListingLocation } from '../interfaces/explorer';
export interface ListingFocusRequest { listing: ListingLocation; sequence: number }
// Web Mercator in a 256 px world aligns the vector overlays with OSM raster tiles.
export function project(longitude: number, latitude: number): [number, number] {
  const clamped = Math.max(-85.051129, Math.min(85.051129, latitude));
  const radians = clamped * Math.PI / 180;
  return [(longitude + 180) / 360 * 256,
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 * 256];
}
export const districtPath = geoPath(geoTransform({ point(longitude, latitude) {
  const [x, y] = project(longitude, latitude); this.stream.point(x, y);
} }));
export function mapViewport(width: number, height: number) {
  // Reserve the ranking panel, which ends at the right edge of the legend.
  const left = width >= 1100 ? 596 : 24;
  const right = width >= 1100 ? 352 : 24;
  const top = 128, bottom = 40;
  return { left, top, width: Math.max(120, width - left - right), height: Math.max(120, height - top - bottom) };
}
export function fittedTransform(geometry: DistrictGeometry, width: number, height: number): ZoomTransform {
  const [[x0, y0], [x1, y1]] = districtPath.bounds(geometry);
  const viewport = mapViewport(width, height);
  const scale = Math.min(viewport.width / (x1 - x0), viewport.height / (y1 - y0)) * .9;
  return zoomIdentity.translate(viewport.left + viewport.width / 2, viewport.top + viewport.height / 2)
    .scale(scale).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}
export function focusedListingTransform(listing: Pick<ListingLocation, 'latitude' | 'longitude'>, width: number, height: number, currentScale: number): ZoomTransform {
  const viewport = mapViewport(width, height);
  const scale = Math.max(2 ** 15, Math.min(2 ** 19, currentScale));
  const [x, y] = project(listing.longitude, listing.latitude);
  return zoomIdentity.translate(viewport.left + viewport.width / 2, viewport.top + viewport.height / 2)
    .scale(scale).translate(-x, -y);
}
export function visibleTiles(transform: ZoomTransform, width: number, height: number) {
  const z = Math.max(0, Math.min(19, Math.floor(Math.log2(transform.k))));
  const count = 2 ** z, size = 256 / count;
  const [x0, y0] = transform.invert([0, 0]), [x1, y1] = transform.invert([width, height]);
  const tiles: { x: number; y: number; z: number; size: number }[] = [];
  for (let y = Math.max(0, Math.floor(y0 / size)); y <= Math.min(count - 1, Math.floor(y1 / size)); y++) {
    for (let x = Math.max(0, Math.floor(x0 / size)); x <= Math.min(count - 1, Math.floor(x1 / size)); x++) tiles.push({ x, y, z, size });
  }
  return tiles;
}
// Screen-space paths avoid scaling browser focus rings and strokes with the map.
export function screenDistrictPath(transform: ZoomTransform) {
  return geoPath(geoTransform({ point(longitude, latitude) {
    const [x, y] = transform.apply(project(longitude, latitude)); this.stream.point(x, y);
  } }));
}
