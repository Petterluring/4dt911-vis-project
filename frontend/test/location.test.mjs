import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
after(async () => { await server.close(); });
const geo = await server.ssrLoadModule('/src/utils/location.ts');
const map = await server.ssrLoadModule('/src/utils/map.ts');
const api = await server.ssrLoadModule('/src/api/geocoding.ts');
const { createMockClustering } = await server.ssrLoadModule('/src/data/clusteringMock.ts');
const demo = createMockClustering(null);
const origin = { id: 'test-origin', label: 'Test location', latitude: 0, longitude: 0 };
const east = meters => ({ latitude: 0, longitude: meters / geo.EARTH_RADIUS_METERS * 180 / Math.PI });
const listing = (id, meters, clusterId, price) => ({ ...demo.listings[0], id, ...east(meters), clusterId, price });
const fixtures = [
  listing('near-room', 100, 'compact', 500), listing('boundary-room', 500, 'compact', 700),
  listing('missing-price', 200, 'apartment', null), listing('zero-price', 400, 'apartment', 0),
  listing('distant-home', 2000, 'large', 3000), listing('unknown', 300, 'orphaned-cluster', 800),
  { ...listing('invalid', 0, 'large', 4000), latitude: NaN },
];

test('great-circle distance handles known distances, zero, symmetry and invalid coordinates', () => {
  assert.equal(geo.distanceMeters(origin, origin), 0);
  const oneDegree = geo.distanceMeters(origin, { latitude: 0, longitude: 1 });
  assert.ok(Math.abs(oneDegree - 111195.0802) < .001);
  assert.ok(Math.abs(geo.distanceMeters(origin, east(500)) - 500) < .000001);
  assert.equal(geo.distanceMeters(origin, east(3000)), geo.distanceMeters(east(3000), origin));
  for (const point of [{ latitude: NaN, longitude: 18 }, { latitude: 90, longitude: 18 }, { latitude: 59, longitude: 181 }]) {
    assert.equal(geo.validCoordinates(point), false);
    assert.equal(geo.distanceMeters(origin, point), Infinity);
  }
});

test('radius analysis includes its boundary, excludes invalid coordinates, preserves assignments and reports unassigned shares', () => {
  const original = structuredClone(fixtures);
  const analysis = geo.analyzeNearbyClusters(fixtures, demo.clusters, { location: origin, radiusMeters: 500 });
  assert.deepEqual([...analysis.listingIds].sort(), ['boundary-room', 'missing-price', 'near-room', 'unknown', 'zero-price']);
  assert.equal(analysis.unassignedCount, 1);
  const compact = analysis.clusters.find(row => row.cluster.id === 'compact');
  const apartment = analysis.clusters.find(row => row.cluster.id === 'apartment');
  const large = analysis.clusters.find(row => row.cluster.id === 'large');
  assert.equal(compact.listingCount, 2);
  assert.equal(compact.percentage, 40);
  assert.equal(compact.prices.median, 600);
  assert.ok(Math.abs(compact.nearestDistanceMeters - 100) < .000001);
  assert.equal(apartment.listingCount, 2);
  assert.equal(apartment.prices.count, 1);
  assert.equal(apartment.prices.median, 0);
  assert.equal(large.listingCount, 0);
  assert.equal(large.prices, null);
  assert.ok(Math.abs(large.nearestDistanceMeters - 2000) < .000001);
  assert.deepEqual(fixtures, original);
  assert.deepEqual(analysis.clusters.map(row => row.cluster.id), ['compact', 'apartment', 'large']);
  const expanded = geo.analyzeNearbyClusters(fixtures, demo.clusters, { location: origin, radiusMeters: 3000 });
  assert.equal(expanded.clusters.find(row => row.cluster.id === 'large').listingCount, 1);
});

test('radius and cluster highlighting form an intersection, and clearing each filter preserves the other', () => {
  const nearby = new Set(['near-room', 'missing-price', 'unknown']);
  assert.equal(geo.highlightedClusterListings(fixtures, null), null);
  assert.deepEqual([...geo.highlightedClusterListings(fixtures, null, nearby)], [...nearby]);
  assert.deepEqual([...geo.highlightedClusterListings(fixtures, 'compact', nearby)], ['near-room']);
  assert.deepEqual([...geo.highlightedClusterListings(fixtures, 'compact')], ['near-room', 'boundary-room']);
  assert.deepEqual([...geo.highlightedClusterListings(fixtures, 'large', new Set())], []);
  const empty = geo.analyzeNearbyClusters([], demo.clusters, { location: origin, radiusMeters: 500 });
  assert.equal(empty.listingIds.size, 0);
  assert.ok(empty.clusters.every(row => row.percentage === 0 && row.nearestDistanceMeters === null && row.prices === null));
});

test('geodesic radius overlay and map fit agree with distance calculations at Stockholm latitude', () => {
  const location = { id: 'stockholm', label: 'Stockholm', latitude: 59.315, longitude: 18.071 };
  for (const radiusMeters of geo.SEARCH_RADII) {
    const area = { location, radiusMeters };
    const geometry = geo.radiusGeometry(area);
    for (const [longitude, latitude] of geometry.coordinates[0]) {
      assert.ok(Math.abs(geo.distanceMeters(location, { longitude, latitude }) - radiusMeters) < .00001);
    }
    for (const [width, height] of [[700, 360], [280, 360]]) {
      const transform = map.focusedAreaTransform(area, width, height);
      const viewport = map.mapViewport(width, height);
      const center = transform.apply(map.project(location.longitude, location.latitude));
      assert.ok(Math.abs(center[0] - (viewport.left + viewport.width / 2)) < .00001);
      assert.ok(Math.abs(center[1] - (viewport.top + viewport.height / 2)) < .00001);
      for (const [longitude, latitude] of geometry.coordinates[0]) {
        const [x, y] = transform.apply(map.project(longitude, latitude));
        assert.ok(x > 0 && x < width && y > 0 && y < height);
      }
    }
  }
});

function feature(overrides = {}, coordinates = [18.1677049, 59.3099477]) {
  return { type: 'Feature', properties: { osm_type: 'N', osm_id: 276047511, name: 'Nacka', county: 'Stockholm County', countrycode: 'SE', ...overrides }, geometry: { type: 'Point', coordinates } };
}
test('Photon mapping handles addresses and municipalities, deduplicates results and excludes neighbouring counties', () => {
  const data = api.parseGeocodingResults({ features: [
    feature(), feature(), feature({ osm_id: 2, name: '', street: 'Götgatan', housenumber: '10', city: 'Stockholm', county: 'Stockholms län' }),
    feature({ osm_id: 3, county: 'Uppsala County' }), feature({ osm_id: 4, countrycode: 'NO' }),
    feature({ osm_id: 5 }, [18.1, NaN]), feature({ osm_id: 6 }, [25, 59]),
    { properties: {}, geometry: { type: 'Polygon', coordinates: [] } },
  ] });
  assert.equal(data.length, 2);
  assert.equal(data[0].latitude, 59.3099477);
  assert.equal(data[0].longitude, 18.1677049);
  assert.match(data[0].label, /Nacka/);
  assert.match(data[1].label, /Götgatan 10.*Stockholm/);
  assert.throws(() => api.parseGeocodingResults({}), /invalid response/);
});

test('geocoder sends encoded bounded searches, caches repeat queries, handles HTTP failures and cancellation', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url.origin, 'https://photon.komoot.io');
    assert.equal(url.searchParams.get('q'), 'Södermalm cache test');
    assert.equal(url.searchParams.get('countrycode'), 'SE');
    assert.equal(url.searchParams.get('bbox'), '17.2,58.7,19.7,60.3');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    return new Response(JSON.stringify({ features: [feature()] }), { headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const signal = new AbortController().signal;
    assert.deepEqual(await api.searchLocations('ab', signal), []);
    const first = await api.searchLocations(' Södermalm cache test ', signal);
    assert.deepEqual(await api.searchLocations('södermalm cache test', signal), first);
    assert.equal(calls, 1);
    globalThis.fetch = async () => new Response('', { status: 429 });
    await assert.rejects(api.searchLocations('Rate limit test', signal), /busy/);
    globalThis.fetch = async () => new Response('', { status: 503 });
    await assert.rejects(api.searchLocations('Service error test', signal), /503/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(api.searchLocations('Södermalm cache test', controller.signal), { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; }
});

test('nearby summaries and local-overall boxplots show scopes, counts, shares, missing prices and accessible controls', async () => {
  const { default: NearbyClusters } = await server.ssrLoadModule('/src/components/clustering/NearbyClusters.tsx');
  const { default: ClusterPriceBoxplot } = await server.ssrLoadModule('/src/components/clustering/ClusterPriceBoxplot.tsx');
  const analysis = geo.analyzeNearbyClusters(fixtures, demo.clusters, { location: origin, radiusMeters: 500 });
  const html = renderToStaticMarkup(createElement(NearbyClusters, { analysis, radiusMeters: 500, selectedClusterId: 'compact', onSelect() {} }));
  assert.match(html, /Clusters within 500 m/);
  assert.match(html, /40%/);
  assert.match(html, /600 SEK/);
  assert.match(html, /No price data/);
  assert.match(html, /100 m/);
  assert.match(html, /2 km/);
  assert.match(html, /1 without a valid cluster assignment/);
  assert.match(html, /aria-pressed="true"/);
  const compact = renderToStaticMarkup(createElement(NearbyClusters, { analysis, radiusMeters: 500, selectedClusterId: 'compact', onSelect() {}, compact: true }));
  assert.match(compact, /<details /);
  assert.match(compact, /40%/);
  assert.match(compact, /600 SEK/);
  assert.match(compact, /2 km/);
  assert.match(compact, /Nearest in dataset/);
  assert.doesNotMatch(compact, /<table/);
  const cluster = demo.clusters[0];
  const comparison = renderToStaticMarkup(createElement(ClusterPriceBoxplot, {
    clusters: [{ ...cluster, id: 'local', label: 'Local · 500 m', prices: null }, { ...cluster, id: 'overall', label: 'Overall dataset', outline: true }],
    selectedClusterId: null, onSelect() {}, interactive: false, showClusterNumbers: false, title: 'Local vs overall',
  }));
  assert.match(comparison, /Local · 500 m/);
  assert.match(comparison, /Overall dataset/);
  assert.match(comparison, /No price data/);
  assert.match(comparison, /priced listings/);
  assert.match(comparison, /stroke-dasharray="5 3"/);
  assert.doesNotMatch(comparison, /aria-pressed|Cluster 1/);
});

test('search overlay extends the existing map without enabling it for SD1 or SD2', async () => {
  const { default: DistrictMap } = await server.ssrLoadModule('/src/components/explorer/DistrictMap.tsx');
  const { default: LocationSearch } = await server.ssrLoadModule('/src/components/clustering/LocationSearch.tsx');
  const geometry = JSON.parse(await readFile(new URL('../public/data/stockholm-districts-2025.geojson', import.meta.url), 'utf8'));
  const searchArea = { location: { id: 'nacka', label: 'Nacka', latitude: 59.31, longitude: 18.17 }, radiusMeters: 1000 };
  const props = { geometry, prices: [], listings: [], metric: 'median_airbnb_price', selectedDistrict: null, hoveredDistrict: null, selectedListingId: null,
    showListings: true, showBasemap: false, showDistricts: false, onHover() {}, onSelect() {}, onSelectListing() {} };
  const regular = renderToStaticMarkup(createElement(DistrictMap, props));
  assert.doesNotMatch(regular, /map-search-radius|map-search-overlay/);
  const local = renderToStaticMarkup(createElement(DistrictMap, { ...props, searchArea }));
  assert.match(local, /class="map-search-radius"/);
  assert.match(local, /Search location: Nacka. Radius 1 km/);
  const search = renderToStaticMarkup(createElement(LocationSearch, { location: null, radiusMeters: 1000, onLocation() {}, onRadius() {} }));
  assert.match(search, /role="combobox"/);
  assert.equal((search.match(/<option /g) ?? []).length, 4);
  assert.match(search, /Reset location/);
  assert.match(search, /Photon/);
});
