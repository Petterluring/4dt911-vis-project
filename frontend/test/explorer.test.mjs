import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { zoomIdentity } from 'd3';

// Vite's existing TS loader keeps tests dependency-free and uses production imports.
const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, appType: 'custom' });
const api = await server.ssrLoadModule('/src/api/explorer.ts');
const utils = await server.ssrLoadModule('/src/utils/explorer.ts');
const map = await server.ssrLoadModule('/src/utils/map.ts');
const { DISTRICTS } = await server.ssrLoadModule('/src/interfaces/explorer.ts');
const originalFetch = globalThis.fetch;
after(async () => { globalThis.fetch = originalFetch; await server.close(); });
const signal = () => new AbortController().signal;
const reply = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('numeric aggregates preserve zero and reject missing or invalid values', () => {
  for (const value of [null, undefined, '', ' ', false, {}, NaN, Infinity, 'NaN']) assert.equal(api.numeric(value), null);
  assert.equal(api.numeric('0'), 0);
  assert.equal(api.numeric(0), 0);
  assert.equal(api.numeric('3876836.293066476054'), 3876836.293066476);
});
test('both scatterplot groups are read from the actual split backend envelope', () => {
  const result = api.parseScatterplots([
    { scatterplot_2: [{ district: 'Bromma', average_housing_price: '2000000', median_housing_price: null, average_airbnb_price: 0, median_airbnb_price: '1500' }] },
    { scatterplot_1: [{ district: 'Bromma', tourism_score: 0, airbnb_listing_count: 295 }] },
  ]);
  assert.equal(result.tourism[0].tourism_score, 0);
  assert.equal(result.prices[0].average_housing_price, 2000000);
  assert.equal(result.prices[0].median_housing_price, null);
  assert.equal(result.prices[0].average_airbnb_price, 0);
  assert.throws(() => api.parseScatterplots([{ scatterplot_1: [] }]), /incomplete/);
});
test('listing pagination continues past invalid coordinates and deduplicates IDs', async () => {
  const offsets = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/choropleth-map/listings');
    const body = JSON.parse(options.body);
    offsets.push(body.offset);
    assert.deepEqual(body.columns, api.LISTING_COLUMNS);
    if (!body.offset) return reply(Array.from({ length: 1000 }, (_, id) => ({ id, latitude: id === 0 ? null : 59.3, longitude: 18.1 })));
    return reply([{ id: 1, latitude: 59.4, longitude: 18.2 }, { id: 1000, latitude: '59.3', longitude: '18.1' }, { id: 1001, latitude: 91, longitude: 18 }]);
  };
  const listings = await api.fetchListings(signal());
  assert.deepEqual(offsets, [0, 1000]);
  assert.equal(listings.length, 1000);
  assert.equal(listings.find(row => row.id === '1').latitude, 59.4);
  assert.ok(!listings.some(row => row.id === '0' || row.id === '1001'));
});
test('failed requests surface errors instead of fabricated statistics', async () => {
  globalThis.fetch = async () => new Response('', { status: 503 });
  await assert.rejects(api.fetchDistrictPrices(signal()), /503/);
  const controller = new AbortController();
  controller.abort();
  globalThis.fetch = async (_, options) => { options.signal.throwIfAborted(); };
  await assert.rejects(api.fetchListings(controller.signal), { name: 'AbortError' });
});
test('all eleven real geometries join to backend names, including Swedish diacritics', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data/stockholm-districts-2025.geojson', import.meta.url), 'utf8'));
  globalThis.fetch = async () => reply(raw);
  const geometry = await api.fetchGeometry(signal());
  assert.deepEqual(geometry.features.map(feature => feature.properties.district).sort(), [...DISTRICTS].sort());
  const [[x0, y0], [x1, y1]] = map.districtPath.bounds(geometry);
  assert.ok(x0 < x1 && y0 < y1 && x1 - x0 < 1 && y1 - y0 < 1);
  for (const feature of geometry.features) assert.ok(map.districtPath(feature).startsWith('M'));
  assert.equal(utils.boundaryDistrict('Kungsholmens'), 'Kungsholmen');
  assert.equal(utils.boundaryDistrict('Norra innerstadens'), 'Norra innerstaden');
});
test('missing price colours differ from zero and price modes select matching metrics', () => {
  const scale = utils.metricScale([{ district: 'Bromma', median_airbnb_price: 0 }], 'median_airbnb_price');
  assert.equal(scale.min, 0);
  assert.notEqual(scale.color(null), scale.color(0));
  assert.equal(utils.metricScale([], 'median_airbnb_price').min, null);
  assert.deepEqual(utils.priceKeys('median'), ['median_housing_price', 'median_airbnb_price']);
  assert.deepEqual(utils.priceKeys('average'), ['average_housing_price', 'average_airbnb_price']);
});
test('Web Mercator aligns district coordinates and tiles', () => {
  assert.deepEqual(map.project(0, 0), [128, 128]);
  const transform = zoomIdentity.translate(-100000, -50000).scale(1024);
  const tiles = map.visibleTiles(transform, 1200, 800);
  assert.ok(tiles.length > 0 && tiles.length < 100);
  assert.ok(tiles.every(tile => tile.z === 10 && tile.x >= 0 && tile.y >= 0));
});


test('comparison markup retains real zero scores, selection, missing counts and price units', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: ComparisonPanel } = await server.ssrLoadModule('/src/components/explorer/ComparisonPanel.tsx');
  const html = renderToStaticMarkup(createElement(ComparisonPanel, {
    resource: { status: 'success', data: {
      tourism: [{ district: 'Bromma', tourism_score: 0, airbnb_listing_count: 295 }, { district: 'Farsta', tourism_score: null, airbnb_listing_count: 10 }],
      prices: [{ district: 'Bromma', average_housing_price: 4000000, median_housing_price: 3340000, average_airbnb_price: 2500, median_airbnb_price: 2081 }],
    } },
    mode: 'median', selectedDistrict: 'Bromma', hoveredDistrict: null,
    onMode() {}, onHover() {}, onSelect() {}, onClose() {},
  }));
  assert.equal((html.match(/<circle /g) ?? []).length, 2);
  assert.match(html, /Housing price \(SEK \/ sale\)/);
  assert.match(html, /Airbnb price \(SEK \/ night\)/);
  assert.match(html, /10 without complete data/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /Tourism score/);
});


test('listing details normalize API values and retain studio bedrooms and zero reviews', async () => {
  globalThis.fetch = async () => reply([{
    id: 145320, latitude: 59.3, longitude: 18.1, name: '  Studio in Bromma  ',
    district: 'Bromma', price: '1500.5', accommodates: 2, bedrooms: 0, beds: 1,
    bathrooms_text: '1 shared bath', number_of_reviews: 0, review_scores_rating: null,
    listing_url: 'https://www.airbnb.com/rooms/145320', picture_url: 'https://images.example.com/studio.jpg',
  }]);
  const [listing] = await api.fetchListings(signal());
  assert.equal(listing.name, 'Studio in Bromma');
  assert.equal(listing.price, 1500.5);
  assert.equal(listing.bedrooms, 0);
  assert.equal(listing.number_of_reviews, 0);
  assert.equal(listing.review_scores_rating, null);
  assert.equal(listing.minimum_nights, null);
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: ListingDetails } = await server.ssrLoadModule('/src/components/explorer/ListingDetails.tsx');
  const html = renderToStaticMarkup(createElement(ListingDetails, { listing, onClose() {} }));
  assert.match(html, /Studio \(0\)/);
  assert.match(html, /SEK \/ night/);
  assert.match(html, /1 shared bath/);
  assert.match(html, /noopener noreferrer/);
});
test('listing hit testing uses screen pixels at different zoom levels and accepts only nearby dots', async () => {
  const { nearestListing, movedBeyondClick, safeExternalUrl } = await server.ssrLoadModule('/src/utils/listing.ts');
  const listings = [{ id: 'near', latitude: 59.3, longitude: 18.1 }, { id: 'far', latitude: 59.4, longitude: 18.2 }];
  for (const scale of [512, 4096, 16384]) {
    const transform = zoomIdentity.translate(-1000, -500).scale(scale);
    const position = transform.apply(map.project(18.1, 59.3));
    assert.equal(nearestListing(listings, transform, [position[0] + 3, position[1] + 2]).id, 'near');
    assert.equal(nearestListing(listings, transform, [position[0] - 20, position[1] - 20]), null);
  }
  assert.equal(movedBeyondClick([100, 100], [102, 101]), false);
  assert.equal(movedBeyondClick([100, 100], [110, 100]), true);
  assert.equal(safeExternalUrl('javascript:alert(1)'), null);
  assert.equal(safeExternalUrl('data:text/html,anything'), null);
  assert.equal(safeExternalUrl('https://user:password@example.com'), null);
  assert.equal(safeExternalUrl('https://www.airbnb.com/rooms/1'), 'https://www.airbnb.com/rooms/1');
});
test('district paths stay in screen coordinates and selected districts retain map opacity and labels sit above listing markers', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data/stockholm-districts-2025.geojson', import.meta.url), 'utf8'));
  globalThis.fetch = async () => reply(raw);
  const geometry = await api.fetchGeometry(signal());
  const transform = map.fittedTransform(geometry, 1440, 900, false);
  const screenPath = map.screenDistrictPath(transform);
  const [[x0, y0], [x1, y1]] = screenPath.bounds(geometry);
  assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1440 && y1 <= 900);
  assert.ok(!/NaN|Infinity/.test(screenPath(geometry)));
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: DistrictMap } = await server.ssrLoadModule('/src/components/explorer/DistrictMap.tsx');
  const html = renderToStaticMarkup(createElement(DistrictMap, {
    geometry, prices: [], listings: [], metric: 'median_airbnb_price',
    selectedDistrict: 'Bromma', hoveredDistrict: null, selectedListingId: null,
    showListings: true, showBasemap: true, comparisonOpen: false,
    onHover() {}, onSelect() {}, onSelectListing() {},
  }));
  assert.equal((html.match(/<path /g) ?? []).length, 11);
  assert.match(html, /fill="#E89A45" fill-opacity="0.7"/);
  assert.doesNotMatch(html, /<g transform="translate/);
  assert.ok(html.indexOf('class="listing-canvas"') < html.indexOf('class="map-label-overlay"'));
  assert.match(html, /aria-label="Recenter map"/);
  assert.match(html, /Zoom in to select listings/);
  assert.doesNotMatch(html, /<path[^>]*tabindex=/);
  const css = await readFile(new URL('../src/pages/Explorer.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /filter:\s*saturate/);
});


test('markers stay small in overview, grow after zoom twelve and become clickable at zoom fourteen', async () => {
  const { markerRadii, canSelectListings } = await server.ssrLoadModule('/src/utils/listing.ts');
  for (const zoom of [0, 8, 10, 11, 12]) {
    assert.equal(markerRadii(2 ** zoom).normal, 2);
    assert.equal(canSelectListings(2 ** zoom), false);
  }
  let previous = 2;
  for (const zoom of [12.5, 13, 14, 15, 16, 17]) {
    const radii = markerRadii(2 ** zoom);
    assert.ok(radii.normal > previous);
    assert.ok(radii.selected > radii.normal);
    previous = radii.normal;
  }
  assert.equal(markerRadii(2 ** 17).normal, 6.5);
  assert.equal(markerRadii(2 ** 17).selected, 11);
  assert.deepEqual(markerRadii(2 ** 30), markerRadii(2 ** 17));
  assert.deepEqual(markerRadii(0), markerRadii(2 ** 12));
  assert.equal(canSelectListings(2 ** 13), false);
  assert.equal(canSelectListings(2 ** 14 - .01), false);
  assert.equal(canSelectListings(2 ** 14), true);
  assert.equal(canSelectListings(Infinity), false);
});
