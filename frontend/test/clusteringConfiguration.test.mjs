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
const { CLUSTERING_FEATURES } = await server.ssrLoadModule('/src/interfaces/clustering.ts');
const { validateClusteringConfiguration: validate, sameClusteringConfiguration, formatClusteringConfiguration } = await server.ssrLoadModule('/src/utils/clusteringConfiguration.ts');
const { fetchClustering } = await server.ssrLoadModule('/src/api/clustering.ts');
const reply = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });

test('configuration accepts exactly the backend feature whitelist and rejects empty, price, and geographic inputs', () => {
  assert.deepEqual(CLUSTERING_FEATURES, ['room_type', 'accommodates', 'bedrooms', 'bathrooms', 'beds']);
  assert.deepEqual(validate(CLUSTERING_FEATURES, '4').request, { features: CLUSTERING_FEATURES, n_clusters: 4 });
  assert.match(validate([], '3').errors.features, /at least one/);
  for (const forbidden of ['price', 'nightly_price', 'latitude', 'longitude', 'district', 'location', null, false, {}]) {
    const result = validate(['room_type', forbidden], '3');
    assert.equal(result.request, null); assert.ok(result.errors.features);
  }
  const features = [' beds ', 'bathrooms', 'beds', 'room_type'];
  const original = [...features];
  assert.deepEqual(validate(features, '4').request, { features: ['room_type', 'bathrooms', 'beds'], n_clusters: 4 });
  assert.deepEqual(features, original);
});

test('K uses the backend minimum and sample-count constraint without an arbitrary fixed maximum', () => {
  for (const k of ['', ' ', 'abc', 0, 1, -2, 2.5, '2.5', Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(validate(['beds'], k).request, null, `Reject ${String(k)}`);
  }
  for (const k of [2, '4', '4.0', '1e2', 1234]) assert.equal(validate(['beds'], k).request.n_clusters, Number(k));
  assert.ok(validate(['beds'], '4', 4).request);
  assert.match(validate(['beds'], '5', 4).errors.k, /cannot exceed the 4 listings/);
  assert.equal(validate(['beds'], '2', 0).request, null);
});

test('draft comparison ignores feature order while detecting changed features or K', () => {
  const request = { features: ['room_type', 'beds'], n_clusters: 3 };
  assert.equal(sameClusteringConfiguration(request, { features: ['beds', 'room_type'], n_clusters: 3 }), true);
  assert.equal(sameClusteringConfiguration(request, { ...request, n_clusters: 4 }), false);
  assert.equal(sameClusteringConfiguration(request, { features: ['bedrooms'], n_clusters: 3 }), false);
  assert.match(formatClusteringConfiguration(request), /K = 3.*Room type, Beds/);
});

test('configured requests send selected features and K through the implemented endpoint and preserve result provenance', async () => {
  const originalFetch = globalThis.fetch;
  let submitted;
  globalThis.fetch = async (url, options) => {
    if (url === '/api/clustering/perform') {
      submitted = JSON.parse(options.body);
      return reply({ cluster_assignments: Array.from({ length: 4 }, (_, index) => ({ id: index, cluster: index, price: 400 + index * 100 })), cluster_statistics: {} });
    }
    assert.equal(url, '/api/choropleth-map/listings');
    return reply(Array.from({ length: 4 }, (_, id) => ({ id, latitude: 59.315, longitude: 18.071, accommodates: id + 1, bedrooms: id, beds: id + 1, room_type: 'Entire home/apt' })));
  };
  try {
    const configuration = { features: ['room_type', 'accommodates', 'bedrooms', 'bathrooms'], n_clusters: 4 };
    const data = await fetchClustering(new AbortController().signal, null, configuration);
    assert.deepEqual(submitted, configuration);
    assert.deepEqual(data.metadata.configuration, configuration);
    assert.deepEqual(data.metadata.details.request, configuration);
    assert.equal(data.metadata.inputListingCount, 4);
    assert.deepEqual(data.clusters.map(cluster => cluster.id), ['0', '1', '2', '3']);
    assert.equal(data.clusters.reduce((sum, cluster) => sum + cluster.listingCount, 0), data.listings.length);
    for (const cluster of data.clusters) {
      assert.equal(data.listings.filter(listing => listing.clusterId === cluster.id).length, cluster.listingCount);
      assert.equal(cluster.prices.count, cluster.listingCount);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('in-flight requests own immutable configuration snapshots, including after the caller edits its object', async () => {
  const originalFetch = globalThis.fetch;
  let finish, submitted;
  globalThis.fetch = (url, options) => {
    if (url.endsWith('/perform')) {
      submitted = JSON.parse(options.body);
      return new Promise(resolve => { finish = resolve; });
    }
    return Promise.resolve(reply([]));
  };
  try {
    const request = { features: ['bedrooms', 'beds'], n_clusters: 4 };
    const pending = fetchClustering(new AbortController().signal, null, request);
    request.features.push('bathrooms'); request.n_clusters = 5;
    finish(reply({ cluster_assignments: [], cluster_statistics: {} }));
    const data = await pending;
    assert.deepEqual(submitted, { features: ['bedrooms', 'beds'], n_clusters: 4 });
    assert.deepEqual(data.metadata.configuration, submitted);
    assert.equal(data.metadata.inputListingCount, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('invalid configuration never sends a request', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('Should not fetch'); };
  try {
    for (const request of [
      { features: [], n_clusters: 3 }, { features: ['price'], n_clusters: 3 },
      { features: ['latitude', 'beds'], n_clusters: 3 }, { features: ['beds'], n_clusters: 1 },
      { features: ['beds'], n_clusters: 2.5 },
    ]) await assert.rejects(fetchClustering(new AbortController().signal, null, request));
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('configuration controls expose all five features, active versus pending settings, validation, and explicit mock limitations', async () => {
  const { default: Configuration } = await server.ssrLoadModule('/src/components/clustering/ClusteringConfiguration.tsx');
  const active = { features: ['room_type', 'beds'], n_clusters: 3 };
  const configuration = {
    draftFeatures: ['room_type', 'bedrooms'], draftK: '4', request: active, active,
    validation: validate(['room_type', 'bedrooms'], '4', 20), pending: true, running: false, mock: false,
    inputListingCount: 20, canRun: true, toggleFeature() {}, setK() {}, run() {},
  };
  const html = renderToStaticMarkup(createElement(Configuration, { state: { configuration, data: { clusters: [{}, {}, {}] } } }));
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 5);
  assert.match(html, /name="bathrooms"/); assert.match(html, /name="n_clusters"/);
  assert.match(html, /min="2" step="1" max="20"/);
  assert.match(html, /Displayed results: K = 3/); assert.match(html, /Unapplied changes/);
  assert.match(html, /<summary>Clustering configuration[\s\S]*Displayed results: K = 3[\s\S]*<\/summary>/);
  assert.match(html, /Run Clustering/);
  assert.doesNotMatch(html, /name="price"|name="latitude"|name="longitude"/);
  const invalid = { ...configuration, draftFeatures: [], draftK: '1', validation: validate([], '1', 20), canRun: false };
  const error = renderToStaticMarkup(createElement(Configuration, { state: { configuration: invalid } }));
  assert.match(error, /Select at least one/); assert.match(error, /aria-invalid="true"/);
  assert.match(error, /type="submit"[^>]*disabled/);
  const mock = renderToStaticMarkup(createElement(Configuration, { state: { configuration: { ...configuration, mock: true, canRun: false } } }));
  assert.match(mock, /Demonstration groups are fixed/); assert.match(mock, /<fieldset disabled/);
});
