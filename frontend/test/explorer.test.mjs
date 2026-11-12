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
    mode: 'median', selectedDistrict: 'Bromma', hoveredDistrict: 'Bromma',
    onMode() {}, onHover() {}, onSelect() {}, onClose() {},
  }));
  assert.equal((html.match(/<circle /g) ?? []).length, 2);
  assert.match(html, /Housing price \(SEK \/ sale\)/);
  assert.match(html, /Airbnb price \(SEK \/ night\)/);
  assert.match(html, /10 without complete data/);
  assert.match(html, /role="tooltip"/);
  assert.doesNotMatch(html, /class="chart-readout"|class="chart-count"|comparison-panel__footer/);
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
  const transform = map.fittedTransform(geometry, 1440, 900);
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
    showListings: true, showBasemap: true, showDistricts: true,
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


test('disabling districts removes map geometry and labels while preserving listings and navigation', async () => {
  const raw = JSON.parse(await readFile(new URL('../public/data/stockholm-districts-2025.geojson', import.meta.url), 'utf8'));
  globalThis.fetch = async () => reply(raw);
  const geometry = await api.fetchGeometry(signal());
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: DistrictMap } = await server.ssrLoadModule('/src/components/explorer/DistrictMap.tsx');
  const props = {
    geometry, prices: [], listings: [], metric: 'median_airbnb_price',
    selectedDistrict: 'Bromma', hoveredDistrict: 'Farsta', selectedListingId: null,
    showListings: true, showBasemap: true,
    onHover() {}, onSelect() {}, onSelectListing() {},
  };
  const withoutDistricts = renderToStaticMarkup(createElement(DistrictMap, { ...props, showDistricts: false }));
  assert.doesNotMatch(withoutDistricts, /class="map-districts"|class="map-label-overlay"|<path /);
  assert.match(withoutDistricts, /class="listing-canvas"/);
  assert.match(withoutDistricts, /tile\.openstreetmap\.org/);
  assert.match(withoutDistricts, /aria-label="Recenter map"/);
  assert.match(withoutDistricts, /OpenStreetMap contributors/);
  assert.doesNotMatch(withoutDistricts, /District boundaries:/);
  const withDistricts = renderToStaticMarkup(createElement(DistrictMap, { ...props, showDistricts: true }));
  assert.equal((withDistricts.match(/<path /g) ?? []).length, 11);
  assert.match(withDistricts, /class="map-label-overlay"/);
});

test('listing rankings sort numeric values, keep missing values last and preserve source order', async () => {
  const { rankListings } = await server.ssrLoadModule('/src/utils/ranking.ts');
  const source = [
    { id: '10', price: 200, review_scores_rating: 4.8, number_of_reviews: 20 },
    { id: '2', price: 200, review_scores_rating: null, number_of_reviews: 0 },
    { id: '3', price: null, review_scores_rating: 4.9, number_of_reviews: null },
    { id: '4', price: 0, review_scores_rating: 4.8, number_of_reviews: 120 },
  ];
  const original = [...source];
  assert.deepEqual(rankListings(source, 'price', 'asc').map(row => row.id), ['4', '2', '10', '3']);
  assert.deepEqual(rankListings(source, 'price', 'desc').map(row => row.id), ['2', '10', '4', '3']);
  assert.deepEqual(rankListings(source, 'review_scores_rating', 'desc').map(row => row.id), ['3', '4', '10', '2']);
  assert.deepEqual(rankListings(source, 'number_of_reviews', 'desc').map(row => row.id), ['4', '10', '2', '3']);
  assert.deepEqual(source, original);
});
test('large listing rankings render a bounded window and retain all records in list semantics', async () => {
  const { listingWindow, LISTING_ROW_HEIGHT } = await server.ssrLoadModule('/src/utils/ranking.ts');
  const window = listingWindow(4806, 1000 * LISTING_ROW_HEIGHT, 240);
  assert.ok(window.start <= 1000 && window.end > 1000);
  assert.ok(window.end - window.start < 20);
  assert.equal(window.top + (window.end - window.start) * LISTING_ROW_HEIGHT + window.bottom, 4806 * LISTING_ROW_HEIGHT);
  assert.deepEqual(listingWindow(0, 0, 240), { start: 0, end: 0, top: 0, bottom: 0 });
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: ListingRanking } = await server.ssrLoadModule('/src/components/explorer/ListingRanking.tsx');
  const listings = Array.from({ length: 4806 }, (_, index) => ({ id: String(index + 1), name: `Listing ${index + 1}`, price: index, number_of_reviews: 0 }));
  const html = renderToStaticMarkup(createElement(ListingRanking, {
    resource: { status: 'success', data: listings }, listings, allListings: listings,
    selectedListingId: '2', onSelect() {},
  }));
  assert.match(html, /aria-rowcount="4807"/);
  assert.match(html, /aria-selected="true"/);
  assert.ok((html.match(/role="row"/g) ?? []).length < 20);
  assert.match(html, /Price \/ night \(SEK\)/);
});
test('listing focus centres the point in the clear map area without zooming out of a close view', () => {
  const listing = { latitude: 59.33, longitude: 18.06 };
  for (const [width, height] of [[1440, 550], [800, 480], [360, 450]]) {
    const viewport = map.mapViewport(width, height);
    const transform = map.focusedListingTransform(listing, width, height, 1024);
    const position = transform.apply(map.project(listing.longitude, listing.latitude));
    assert.ok(Math.abs(position[0] - (viewport.left + viewport.width / 2)) < .001);
    assert.ok(Math.abs(position[1] - (viewport.top + viewport.height / 2)) < .001);
    assert.equal(transform.k, 2 ** 15);
  }
  assert.equal(map.focusedListingTransform(listing, 1440, 550, 2 ** 17).k, 2 ** 17);
});
test('dashboard starts in map view with shared filters and both scatterplots', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { default: Explorer } = await server.ssrLoadModule('/src/pages/Explorer.tsx');
  const html = renderToStaticMarkup(createElement(Explorer));
  assert.match(html, /aria-pressed="true">Map/);
  assert.match(html, /aria-pressed="false">Listings/);
  assert.equal((html.match(/aria-label="Controls and information"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-pressed="false">Clustering/g) ?? []).length, 1);
  assert.match(html, /aria-pressed="false">Positioning/);
  assert.doesNotMatch(html, />Listing Clusters<|class="listing-clusters"/);
  assert.match(html, /Listing filters/);
  assert.doesNotMatch(html, /id="ranking-title"/);
  assert.match(html, /id="district-comparison"/);
  assert.doesNotMatch(html, /Compare districts|Close district comparison/);
});

test('listing filters combine inclusive bounds, preserve zero and exclude unknown values only for active fields', async () => {
  const { filterListings, EMPTY_FILTERS, rankListings, LISTING_RANGES, listingRangeMaximum } = await server.ssrLoadModule('/src/utils/ranking.ts');
  const listings = [
    { id: '1', price: 0, bedrooms: 0, accommodates: 2, room_type: 'Private room' },
    { id: '2', price: 200, bedrooms: 2, accommodates: 4, room_type: 'Entire home/apt' },
    { id: '3', price: null, bedrooms: null, accommodates: null, room_type: null },
    { id: '4', price: 400, bedrooms: 3, accommodates: 6, room_type: 'Entire home/apt' },
  ];
  assert.deepEqual(filterListings(listings, EMPTY_FILTERS), listings);
  const ids = filters => filterListings(listings, { ...EMPTY_FILTERS, ...filters }).map(row => row.id);
  assert.deepEqual(ids({ minPrice: '0', maxPrice: '0' }), ['1']);
  assert.deepEqual(ids({ minPrice: '200', maxPrice: '400', bedrooms: '2', guests: '4', roomType: 'Entire home/apt' }), ['2', '4']);
  assert.deepEqual(ids({ maxPrice: '200', bedrooms: '2' }), ['2']);
  assert.deepEqual(ids({ minPrice: '500', maxPrice: '100' }), []);
  assert.deepEqual(ids({ bedrooms: '0' }), ['1', '2', '4']);
  assert.equal(listingRangeMaximum(listings, { ...EMPTY_FILTERS, bedrooms: '3', maxPrice: '200' }, LISTING_RANGES[1]), 2);
  assert.equal(listingRangeMaximum(listings, { ...EMPTY_FILTERS, minPrice: '500' }, LISTING_RANGES[2]), null);
  assert.deepEqual(ids({ roomType: 'Private room' }), ['1']);
  assert.deepEqual(rankListings(listings, 'bedrooms', 'desc').map(row => row.id), ['4', '2', '1', '3']);
  assert.deepEqual(rankListings(listings, 'accommodates', 'asc').map(row => row.id), ['1', '2', '4', '3']);
});

test('rectangle selection uses projected marker positions and accepts reverse drags', async () => {
  const { listingsInRectangle } = await server.ssrLoadModule('/src/utils/selection.ts');
  const listings = [{ id: '1', longitude: 18, latitude: 59 }, { id: '2', longitude: 19, latitude: 59 }];
  const [x, y] = map.project(18, 59);
  const transform = { apply: ([a, b]) => [a * 2 + 10, b * 2 + 20] };
  const [left, top] = transform.apply([x, y]);
  assert.deepEqual(listingsInRectangle(listings, transform, [left + .1, top + .1], [left, top]).map(item => item.id), ['1']);
  assert.deepEqual(listingsInRectangle(listings, transform, [0, 0], [1, 1]), []);
});

test('group summaries use known values and retain zero bedrooms and unknown categories', async () => {
  const { summarizeListings } = await server.ssrLoadModule('/src/utils/selection.ts');
  const summary = summarizeListings([
    { price: 100, review_scores_rating: 4, bedrooms: 0, accommodates: 2, district: 'Farsta', room_type: 'Private room' },
    { price: 300, review_scores_rating: null, bedrooms: 1, accommodates: 4, district: 'Farsta', room_type: null },
    { price: null, review_scores_rating: 5, bedrooms: null, accommodates: null, district: null, room_type: 'Private room' },
  ]);
  assert.equal(summary.medianPrice, 200);
  assert.equal(summary.averagePrice, 200);
  assert.equal(summarizeListings([{ price: null }]).averagePrice, null);
  assert.equal(summary.averageRating, 4.5);
  assert.equal(summary.medianBedrooms, .5);
  assert.equal(summary.medianGuests, 3);
  assert.deepEqual(summary.districts, [['Farsta', 2], ['Unknown', 1]]);
  assert.deepEqual(summary.roomTypes, [['Private room', 2], ['Unknown', 1]]);
  assert.equal(summarizeListings([]).medianPrice, null);
});

test('lasso includes points inside a concave shape but excludes its cutout', async () => {
  const { listingsInLasso } = await server.ssrLoadModule('/src/utils/selection.ts');
  const listings = [{ id: 'inside', longitude: 18, latitude: 59 }, { id: 'cutout', longitude: 19, latitude: 59 }];
  const [x, y] = map.project(18, 59);
  const transform = { apply: ([a, b]) => [(a - x) * 10 + 1, (b - y) * 10 + 3] };
  const lasso = [[0, 0], [10, 0], [10, 2], [4, 2], [4, 6], [0, 6]];
  assert.deepEqual(listingsInLasso(listings, transform, lasso).map(item => item.id), ['inside']);
  assert.deepEqual(listingsInLasso(listings, transform, lasso.slice(0, 2)), []);
});

test('positioning sends amenities to both endpoints and reads signed price contributions in SEK', async () => {
  const { fetchComparables, fetchPrediction } = await server.ssrLoadModule('/src/api/positioning.ts');
  const requests = [];
  globalThis.fetch = async (path, init) => {
    requests.push([path, JSON.parse(init.body)]);
    return path.endsWith('/predict')
      ? reply([{ predicted_price_sek: 988.53, explanation: { baseline_sek: 2063.68, contributions_sek: { room_type: -551.61, district: 301.80, beds: 0 } } }])
      : reply([{ id: 42, latitude: 59.31, longitude: 18.06, price: 935, similarity: .87, review_scores_rating: 4.44 }]);
  };
  const input = { district: 'Bromma', room_type: 'Private room', accommodates: 2, bedrooms: 1, beds: 1, amenities: ['Wifi'] };
  const matches = await fetchComparables(input, 5, signal());
  const prediction = await fetchPrediction(input, signal());
  assert.equal(requests[0][0], '/api/listing-comparisons/compare');
  assert.equal(requests[0][1].top_n, 5);
  assert.deepEqual(requests[0][1].amenities, ['Wifi']);
  assert.deepEqual(requests[1], ['/api/listing-comparisons/predict', input]);
  assert.equal(matches[0].listing.id, '42');
  assert.equal(matches[0].similarity, .87);
  assert.equal(prediction.price, 988.53);
  assert.equal(prediction.baseline, 2063.68);
  assert.deepEqual(prediction.contributions.map(item => item.contribution), [-551.61, 301.8, 0]);
});

test('amenities use the exact ID of listings whose ID exceeds JavaScript integer precision', async () => {
  const { fetchListingAmenities } = await server.ssrLoadModule('/src/api/positioning.ts');
  const id = '1674762291066512278';
  globalThis.fetch = async (path, init) => {
    if (path === '/api/choropleth-map/listings') {
      return new Response('[{"id":' + id + ',"latitude":59.3,"longitude":18.1}]');
    }
    assert.equal(path, '/api/amenities');
    assert.deepEqual(JSON.parse(init.body), { listing_ids: [id] });
    return reply([{ amenity: 'Wifi' }, { amenity: 'Kitchen' }, { amenity: 'Wifi' }]);
  };
  const [listing] = await api.fetchListings(signal());
  assert.equal(listing.id, id);
  assert.deepEqual(await fetchListingAmenities(listing.id, signal()), ['Kitchen', 'Wifi']);
});

test('amenity options are ranked by distinct listing counts, preserving long listing IDs', async () => {
  const { fetchAmenities } = await server.ssrLoadModule('/src/api/positioning.ts');
  globalThis.fetch = async (path, init) => {
    assert.equal(path, '/api/amenities');
    assert.deepEqual(JSON.parse(init.body), { listing_ids: [] });
    return new Response('[{"amenity":"Wifi","listing_id":1674762291066512278},{"amenity":"Wifi","listing_id":1674762291066512279},{"amenity":"Kitchen","listing_id":42},{"amenity":"Kitchen","listing_id":42},{"amenity":"Balcony","listing_id":42}]');
  };
  assert.deepEqual(await fetchAmenities(signal()), ['Wifi', 'Balcony', 'Kitchen']);
});

test('listing colour gradient spreads common prices across three anchors and clips outliers', () => {
  const listings = [0, 600, 1000, 1370, 1600, 1940, 2625, 3400, 4494, 7000, 40000].map(price => ({ price }));
  const scale = utils.listingMetricScale(listings, [], 'median_airbnb_price');
  assert.deepEqual(scale.stops.map(stop => stop.value), [600, 1940, 7000]);
  assert.equal(scale.color({ price: 0 }), scale.color({ price: 600 }));
  assert.equal(scale.color({ price: 40000 }), scale.color({ price: 7000 }));
  assert.notEqual(scale.color({ price: 1370 }), scale.color({ price: 1940 }));
  assert.notEqual(scale.color({ price: 2625 }), scale.color({ price: 1940 }));
  assert.equal(scale.color({ price: null }), utils.LISTING_COLORS.missing);
  assert.equal(utils.listingMetricScale([{ price: 900 }, { price: 900 }], [], 'median_airbnb_price').color({ price: 900 }), utils.LISTING_COLORS.mid);
});
