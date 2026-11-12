import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
  define: { 'import.meta.env.VITE_CLUSTERING_DATA_MODE': JSON.stringify('api'), 'import.meta.env.VITE_CLUSTERING_N_CLUSTERS': JSON.stringify('3') },
  server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
});
after(async () => { await server.close(); });
const { createMockClustering, mockClusterId } = await server.ssrLoadModule('/src/data/clusteringMock.ts');
const { priceDistribution, medianValue, validDistribution } = await server.ssrLoadModule('/src/utils/clustering.ts');
const { fetchClustering, parseClustering, CLUSTERING_DATA_MODE, CLUSTERING_REQUEST } = await server.ssrLoadModule('/src/api/clustering.ts');

test('fallback demo is deterministic with matching assignments, counts, profiles and observed price summaries', () => {
  const data = createMockClustering(null);
  assert.deepEqual(createMockClustering(null), data);
  assert.equal(data.metadata.mode, 'mock');
  assert.equal(data.metadata.source, 'synthetic-fallback');
  assert.equal(data.listings.length, 90);
  assert.equal(new Set(data.listings.map(listing => listing.id)).size, 90);
  assert.equal(data.clusters.length, 3);
  assert.equal(new Set(data.clusters.map(cluster => cluster.color)).size, data.clusters.length);
  assert.equal(data.clusters.reduce((count, cluster) => count + cluster.listingCount, 0), data.listings.length);
  for (const cluster of data.clusters) {
    const members = data.listings.filter(listing => listing.clusterId === cluster.id);
    assert.equal(cluster.listingCount, members.length);
    assert.equal(cluster.medianAccommodates, medianValue(members.map(listing => listing.accommodates)));
    assert.equal(cluster.medianBedrooms, medianValue(members.map(listing => listing.bedrooms)));
    assert.equal(cluster.medianBeds, medianValue(members.map(listing => listing.beds)));
    assert.deepEqual(cluster.prices, priceDistribution(members.map(listing => listing.price)));
    assert.ok(validDistribution(cluster.prices));
    assert.equal(cluster.roomTypes.reduce((sum, type) => sum + type.count, 0), members.length);
    assert.ok(Math.abs(cluster.roomTypes.reduce((sum, type) => sum + type.percentage, 0) - 100) < .0001);
    assert.ok(cluster.prices.lowerWhisker <= cluster.prices.q1);
    assert.ok(cluster.prices.q1 <= cluster.prices.median);
    assert.ok(cluster.prices.median <= cluster.prices.q3);
    assert.ok(cluster.prices.q3 <= cluster.prices.upperWhisker);
  }
  assert.ok(data.clusters.find(cluster => cluster.id === 'compact').prices.median < data.clusters.find(cluster => cluster.id === 'large').prices.median);
});

test('existing coordinates and values are reused unchanged; membership is independent of price', () => {
  const original = createMockClustering(null).listings.map(({ clusterId, ...listing }) => { void clusterId; return listing; });
  const data = createMockClustering(original);
  assert.equal(data.metadata.source, 'existing-listings');
  assert.deepEqual(data.listings.map(({ clusterId, ...listing }) => { void clusterId; return listing; }), original);
  const changedPrices = createMockClustering(original.map(listing => ({ ...listing, price: listing.price * 100 + 1 })));
  assert.deepEqual(changedPrices.listings.map(listing => listing.clusterId), data.listings.map(listing => listing.clusterId));
  assert.notDeepEqual(changedPrices.clusters[0].prices, data.clusters[0].prices);
  assert.equal(mockClusterId({ room_type: 'Private room', accommodates: 2, bedrooms: 1, beds: 1 }), 'compact');
  assert.equal(mockClusterId({ room_type: 'Entire home/apt', accommodates: 4, bedrooms: 1, beds: 2 }), 'apartment');
  for (const characteristics of [{ accommodates: 6 }, { bedrooms: 3 }, { beds: 4 }]) {
    assert.equal(mockClusterId({ room_type: 'Entire home/apt', accommodates: null, bedrooms: null, beds: null, ...characteristics }), 'large');
  }
});

test('empty inputs stay empty and missing accommodation information stays unassigned', () => {
  const empty = createMockClustering([]);
  assert.equal(empty.listings.length, 0);
  assert.equal(empty.clusters.length, 0);
  assert.equal(empty.metadata.source, 'existing-listings');
  const listing = { ...createMockClustering(null).listings[0], id: 'unknown', room_type: null, accommodates: null, bedrooms: null, beds: null };
  const missing = createMockClustering([listing, listing]);
  assert.equal(missing.listings.length, 1);
  assert.equal(missing.listings[0].clusterId, null);
  assert.equal(missing.clusters.length, 0);
  assert.equal(mockClusterId({ room_type: null, accommodates: NaN, bedrooms: -1, beds: Infinity }), null);
});

test('Tukey summaries retain zero, exclude invalid prices and separate outliers from whiskers', () => {
  assert.deepEqual(priceDistribution([null, NaN, -1, Infinity]), null);
  assert.deepEqual(priceDistribution([0]), { count: 1, lowerWhisker: 0, q1: 0, median: 0, q3: 0, upperWhisker: 0, outliers: [] });
  const result = priceDistribution([100, 200, 300, 400, 500, 600, 10000, null, -2]);
  assert.deepEqual(result, { count: 7, lowerWhisker: 100, q1: 250, median: 400, q3: 550, upperWhisker: 600, outliers: [10000] });
  assert.equal(medianValue([null, 0, 1, NaN, -1]), .5);
  assert.equal(medianValue([null]), null);
  assert.equal(validDistribution({ ...result, q1: 5000 }), false);
  assert.equal(validDistribution(null), false);
});

test('mock service works without network requests and respects cancellation', async () => {
  const mockServer = await createServer({ configFile: false,
    define: { 'import.meta.env.VITE_CLUSTERING_DATA_MODE': JSON.stringify('mock') },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
  });
  const { fetchClustering } = await mockServer.ssrLoadModule('/src/api/clustering.ts');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Mock service must not request an unimplemented endpoint'); };
  try {
    const data = await fetchClustering(new AbortController().signal, null);
    assert.equal(data.listings.length, 90);
    assert.equal(data.metadata.mode, 'mock');
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(fetchClustering(controller.signal, null), { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; await mockServer.close(); }
});

test('live mode is the default and uses the implemented request, paginated metadata, exact listing IDs and backend assignments', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const largeId = '1364738370991276918';
  globalThis.fetch = async (url, options) => {
    const body = JSON.parse(options.body); calls.push({ url, body });
    assert.equal(options.method, 'POST');
    if (url === '/api/clustering/perform') {
      assert.deepEqual(body, { features: ['room_type', 'accommodates', 'bedrooms', 'beds'], n_clusters: 3 });
      // Deliberately numeric and beyond Number.MAX_SAFE_INTEGER on the wire.
      return new Response(`{"cluster_assignments":[{"id":${largeId},"price":0,"cluster":0},{"id":1001,"price":400,"cluster":4}],"cluster_statistics":{}}`);
    }
    assert.equal(url, '/api/choropleth-map/listings');
    assert.equal(body.limit, 1000);
    assert.ok(body.columns.includes('latitude') && body.columns.includes('beds'));
    if (body.offset === 0) return new Response(`[${Array.from({ length: 1000 }, (_, i) => i === 0
      ? `{"id":${largeId},"latitude":59.315,"longitude":18.071,"room_type":"Private room","accommodates":2,"bedrooms":0,"beds":1}`
      : JSON.stringify({ id: i + 1, latitude: 59.3, longitude: 18, price: 100 })).join(',')}]`);
    return new Response(JSON.stringify([{ id: 1001, latitude: null, longitude: null, room_type: 'Entire home/apt', accommodates: 6, bedrooms: 3, beds: 4 }]));
  };
  try {
    assert.equal(CLUSTERING_DATA_MODE, 'api');
    const data = await fetchClustering(new AbortController().signal, null);
    assert.equal(data.metadata.mode, 'api');
    assert.equal(data.metadata.source, 'api');
    assert.equal(data.listings.length, 1001);
    assert.deepEqual(data.clusters.map(cluster => cluster.id), ['0', '4']);
    const first = data.listings.find(listing => listing.id === largeId);
    assert.equal(first.clusterId, '0'); assert.equal(first.price, 0); assert.equal(first.bedrooms, 0);
    assert.equal(data.clusters[0].medianBedrooms, 0);
    const second = data.listings.find(listing => listing.id === '1001');
    assert.ok(Number.isNaN(second.latitude)); assert.equal(second.clusterId, '4');
    assert.equal(data.clusters[1].medianAccommodates, 6);
    assert.deepEqual(calls.filter(call => call.url.endsWith('/listings')).map(call => call.body.offset), [0, 1000]);
  } finally { globalThis.fetch = originalFetch; }
});

test('backend price fences become observed whiskers, with outliers and missing-price counts kept consistent', () => {
  const prices = [100, 200, 300, 400, 500, 600, 10000, null];
  const data = parseClustering({ cluster_assignments: prices.map((price, index) => ({ id: String(index), cluster: 0, price })),
    cluster_statistics: { 0: { q25: 250, median: 400, q75: 550, lower_whisker: 0, upper_whisker: 1000, count: 8 } },
  }, []);
  const cluster = data.clusters[0];
  assert.equal(cluster.id, '0'); assert.equal(cluster.listingCount, 8);
  assert.deepEqual(cluster.prices, { count: 7, q1: 250, median: 400, q3: 550, lowerWhisker: 100, upperWhisker: 600, outliers: [10000] });
  assert.equal(cluster.medianAccommodates, null);
  assert.equal(cluster.roomTypes[0].label, 'Unknown');
  assert.match(data.metadata.description, /no matching listing metadata/);
});

test('partial live data retains unassigned listings, null prices and arbitrary cluster IDs without inventing accommodation types', () => {
  const metadata = createMockClustering(null).listings.slice(0, 4).map((listing, i) => ({ ...listing, id: String(i) }));
  const data = parseClustering({ cluster_assignments: [
    { id: 0, cluster: 0, price: null }, { id: 1, cluster: 'north', price: '1500.5' }, { id: 2, cluster: null, price: 100 },
    { id: 9, cluster: -1, price: 100 },
  ], cluster_statistics: {} }, metadata);
  assert.deepEqual(data.clusters.map(cluster => cluster.id), ['0', 'north']);
  assert.equal(data.clusters[0].label, 'Cluster 0'); assert.equal(data.clusters[0].prices, null);
  assert.equal(data.clusters[1].prices.median, 1500.5);
  assert.equal(data.listings.filter(listing => listing.clusterId === null).length, 3);
  const repeated = parseClustering({ cluster_assignments: [{ id: 1, cluster: 'north', price: 500 }], cluster_statistics: {} }, metadata);
  assert.equal(data.clusters[1].color, repeated.clusters[0].color);
  assert.deepEqual(parseClustering({ cluster_assignments: [], cluster_statistics: {} }, []).clusters, []);
  assert.throws(() => parseClustering({ cluster_statistics: {} }, metadata), /invalid list/);
});

test('live API and metadata failures surface errors without silently returning mock results; aborts stop work', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async url => url.endsWith('/perform') ? new Response('', { status: 503 }) : new Response('[]');
    await assert.rejects(fetchClustering(new AbortController().signal, []), /503/);
    globalThis.fetch = async url => url.endsWith('/perform') ? new Response('{"cluster_assignments":[],"cluster_statistics":{}}') : new Response('', { status: 502 });
    await assert.rejects(fetchClustering(new AbortController().signal, []), /502/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(fetchClustering(controller.signal, null), { name: 'AbortError' });
    assert.ok(!CLUSTERING_REQUEST.features.includes('price'));
  } finally { globalThis.fetch = originalFetch; }
});

test('boxplot and card contracts support arbitrary cluster IDs and counts, missing prices and selected state', async () => {
  const { default: ClusterPriceBoxplot } = await server.ssrLoadModule('/src/components/clustering/ClusterPriceBoxplot.tsx');
  const { default: ClusterProfileCard } = await server.ssrLoadModule('/src/components/clustering/ClusterProfileCard.tsx');
  const base = createMockClustering(null).clusters[0];
  const clusters = Array.from({ length: 5 }, (_, index) => ({ ...base, id: `future-${index}`, label: `Future cluster ${index}`, prices: index === 4 ? null : base.prices }));
  const html = renderToStaticMarkup(createElement(ClusterPriceBoxplot, { clusters, selectedClusterId: 'future-2', onSelect() {} }));
  assert.equal((html.match(/class="cluster-boxplot"/g) ?? []).length, 5);
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1);
  assert.equal((html.match(/opacity="0.3"/g) ?? []).length, 4);
  assert.match(html, /No price data/);
  assert.match(html, /SEK \/ night/);
  assert.doesNotMatch(html, /NaN/);
  const card = renderToStaticMarkup(createElement(ClusterProfileCard, { cluster: { ...base, medianBedrooms: .5 }, index: 4, selected: true, dimmed: false, onSelect() {} }));
  assert.match(card, /aria-pressed="true"/);
  assert.match(card, /Cluster ID: compact/);
  assert.match(card, /0.5/);
  assert.match(card, /Room-type composition/);
});

test('SD3 sidebar and map legend share state without owning a separate map or price chart', async () => {
  const { default: Legend } = await server.ssrLoadModule('/src/components/clustering/ClusterMapLegend.tsx');
  const { default: Sidebar } = await server.ssrLoadModule('/src/components/clustering/ListingClusters.tsx');
  const data = createMockClustering(null);
  data.listings.push({ ...data.listings[0], id: 'unassigned', clusterId: null, latitude: NaN });
  const state = { resource: { status: 'success', data }, data, mappedListings: data.listings.slice(0, 90), unassigned: 1,
    selectedClusterId: null, selectedCluster: null, selectedListing: null, searchArea: null, nearby: null, radiusMeters: 1000, location: null,
    selectCluster() {}, clearSelection() {}, selectLocation() {}, setRadiusMeters() {}, retry() {}, closeListing() {} };
  const html = renderToStaticMarkup(createElement(Legend, { state }));
  assert.match(html, /90 mapped listings/);
  assert.match(html, /1 unassigned/);
  assert.match(html, /All clusters/);
  const sidebar = renderToStaticMarkup(createElement(Sidebar, { state, onRetry() {} }));
  assert.match(sidebar, /1 listings have no valid map coordinates/);
  assert.match(sidebar, /<details class="cluster-sidebar-section panel" open/);
  assert.match(sidebar, /role="combobox"/);
  assert.doesNotMatch(sidebar + html, /class="district-map"|<canvas|cluster-map-canvas|class="cluster-price/);
});

test('cluster prices reuse the fixed comparison panel and retain selected local-overall scopes', async () => {
  const { default: Prices } = await server.ssrLoadModule('/src/components/clustering/ClusterPricePanel.tsx');
  const { analyzeNearbyClusters } = await server.ssrLoadModule('/src/utils/location.ts');
  const data = createMockClustering(null);
  const selectedCluster = data.clusters[0];
  const nearby = analyzeNearbyClusters(data.listings, data.clusters, { location: data.listings[0], radiusMeters: 500 });
  const state = { resource: { status: 'success', data }, data, selectedCluster, selectedClusterId: selectedCluster.id,
    nearby, localCluster: nearby.clusters.find(row => row.cluster.id === selectedCluster.id), radiusMeters: 500, selectCluster() {} };
  const html = renderToStaticMarkup(createElement(Prices, { state }));
  assert.match(html, /class="comparison-panel panel cluster-comparison-panel"/);
  assert.equal((html.match(/class="cluster-price cluster-price--compact"/g) ?? []).length, 2);
  assert.equal((html.match(/class="cluster-boxplot cluster-boxplot--static"/g) ?? []).length, 2);
  assert.match(html, /Local · 500 m/);
  assert.match(html, /Overall dataset/);
  assert.match(html, /aria-pressed="true"/);
  assert.doesNotMatch(html, /district-map|height="360"/);
});
