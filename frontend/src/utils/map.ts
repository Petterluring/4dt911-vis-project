import { geoPath, geoTransform, zoomIdentity } from 'd3';
import type { ZoomTransform } from 'd3';
import type { DistrictGeometry } from '../interfaces/explorer';

// Web Mercator in a 256 px world aligns the vector overlays with OSM raster tiles.
export function project(longitude: number, latitude: number): [number, number] {
  const clamped = Math.max(-85.051129, Math.min(85.051129, latitude));
  const radians = clamped * Math.PI / 180;
  return [(longitude + 180) / 360 * 256,
    (1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2 * 256];
}
// A planar stream preserves the boundary file's RFC 7946 winding and polygon holes.
export const districtPath = geoPath(geoTransform({ point(longitude, latitude) {
  const [x, y] = project(longitude, latitude);
  this.stream.point(x, y);
} }));
export function fittedTransform(geometry: DistrictGeometry, width: number, height: number, comparisonOpen: boolean): ZoomTransform {
  const [[x0, y0], [x1, y1]] = districtPath.bounds(geometry);
  const left = width > 900 ? 340 : 24;
  const top = width > 650 ? 150 : 315;
  const bottom = comparisonOpen && width > 900 ? Math.min(height * .46, 410) + 80 : 100;
  const availableWidth = Math.max(180, width - left - 70);
  const availableHeight = Math.max(140, height - top - bottom);
  const scale = Math.min(availableWidth / (x1 - x0), availableHeight / (y1 - y0)) * .9;
  return zoomIdentity.translate(left + availableWidth / 2, top + availableHeight / 2)
    .scale(scale).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
}
export function visibleTiles(transform: ZoomTransform, width: number, height: number) {
  const z = Math.max(0, Math.min(19, Math.floor(Math.log2(transform.k))));
  const count = 2 ** z;
  const size = 256 / count;
  const [x0, y0] = transform.invert([0, 0]);
  const [x1, y1] = transform.invert([width, height]);
  const tiles: { x: number; y: number; z: number; size: number }[] = [];
  for (let y = Math.max(0, Math.floor(y0 / size)); y <= Math.min(count - 1, Math.floor(y1 / size)); y++) {
    for (let x = Math.max(0, Math.floor(x0 / size)); x <= Math.min(count - 1, Math.floor(x1 / size)); x++) {
      tiles.push({ x, y, z, size });
    }
  }
  return tiles;
}

// Screen-space paths avoid scaling browser focus rings and strokes with the map.
export function screenDistrictPath(transform: ZoomTransform) {
  return geoPath(geoTransform({ point(longitude, latitude) {
    const [x, y] = transform.apply(project(longitude, latitude));
    this.stream.point(x, y);
  } }));
}
