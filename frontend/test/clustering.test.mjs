import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom' });
after(async () => { await server.close(); });
const { createMockClustering, mockClusterId } = await server.ssrLoadModule('/src/data/clusteringMock.ts');
const { priceDistribution, medianValue, validDistribution } = await server.ssrLoadModule('/src/utils/clustering.ts');
const { fetchClustering } = await server.ssrLoadModule('/src/api/clustering.ts');

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
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Mock service must not request an unimplemented endpoint'); };
  try {
    const data = await fetchClustering(new AbortController().signal, null);
    assert.equal(data.listings.length, 90);
    assert.equal(data.metadata.mode, 'mock');
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(fetchClustering(controller.signal, null), { name: 'AbortError' });
  } finally { globalThis.fetch = originalFetch; }
});

test('API mode reports its missing integration explicitly without guessing endpoints or substituting mock data', async () => {
  const apiServer = await createServer({
    configFile: false,
    define: { 'import.meta.env.VITE_CLUSTERING_DATA_MODE': JSON.stringify('api') },
    server: { middlewareMode: true, watch: null, hmr: false, ws: false }, appType: 'custom',
  });
  try {
    const api = await apiServer.ssrLoadModule('/src/api/clustering.ts');
    assert.equal(api.CLUSTERING_DATA_MODE, 'api');
    await assert.rejects(api.fetchClustering(new AbortController().signal, null), /Live clustering is not configured yet/);
  } finally { await apiServer.close(); }
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
  assert.match(card, /Cluster 5/);
  assert.match(card, /0.5/);
  assert.match(card, /Room-type composition/);
});

test('cluster map excludes invalid coordinates and reports unassigned listings while preserving map navigation', async () => {
  const { default: ClusterMap } = await server.ssrLoadModule('/src/components/clustering/ClusterMap.tsx');
  const data = createMockClustering(null);
  const html = renderToStaticMarkup(createElement(ClusterMap, {
    geometry: { status: 'loading' }, clusters: data.clusters,
    listings: [{ ...data.listings[0], clusterId: 'missing-cluster' }, { ...data.listings[1], latitude: NaN }],
    selectedClusterId: null, selectedListingId: null, onSelectCluster() {}, onSelectListing() {}, onClear() {}, onRetry() {},
  }));
  assert.match(html, /1 mapped listings/);
  assert.match(html, /1 unassigned/);
  assert.match(html, /1 listings have no valid map coordinates/);
  assert.match(html, /All clusters/);
  assert.match(html, /Loading Stockholm district boundaries/);
});
