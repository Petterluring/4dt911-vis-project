# Listing Clusters (SD3)

Open **Listing Clusters** in the explorer's existing Map / Listings switch.
The original views and their filters, selections, and navigation remain available.
Overall SD3 summaries use all loaded listings; the SD1/SD2 sidebar filters do not affect them. Location search adds a separate radius filter for nearby exploration.

## Components and interactions

- Profile cards show listing counts, median guests/bedrooms/beds, and every room-type share.
- The D3 boxplots show Q1, median, Q3, observed Tukey whiskers, and outliers in SEK/night. Hover or focus a plot for statistics; click, Enter, or Space selects it.
- The cluster map reuses `DistrictMap` and its projection, tiles, canvas markers, hit testing, and zoom controls. It adds optional marker colors and highlighting without changing the default map behavior. Zoom in and click a marker to inspect the existing listing detail card and select its cluster.
- A single selected-cluster state in `ListingClusters` coordinates cards, plots, map markers, and legend. Click the selected cluster again, **Show all clusters**, **Clear selection**, or the legend's **All clusters** to clear it.
- The cards wrap with the available width. The charts stack on narrower screens, and boxplots scroll horizontally when needed to keep labels readable for any number of clusters.

## Location-based exploration

Enter an address, district, neighbourhood, or municipality in **Explore near a location**. Select an autocomplete suggestion with the mouse or arrow keys and Enter. **Reset location** removes the search point and geographic filter while retaining the selected cluster and radius setting. **Show all clusters** and **Clear cluster selection** remove only the cluster selection while keeping the search location.

Choose **500 m**, **1 km**, **3 km**, or **5 km**. The existing map recentres to a blue location pin and a dashed radius outline; its Recenter control fits this area while a location is active. Only listings matching both the radius and selected cluster are emphasized. Other markers remain visible in their existing colors at reduced opacity. Selecting a marker preserves the search point and opens the usual listing details, with its distance and inside/outside status. An inspected listing that moves outside the radius remains dimmed on the map.

The nearby table shows every cluster's local listing count, share of all listings inside the radius, median local asking price, and distance to its nearest valid listing **anywhere in the loaded dataset**. Rows are ordered by that nearest distance. This allows clusters with zero local listings to still report their nearest competition. Unassigned listings are included in the percentage denominator and explicitly counted; missing prices are excluded from medians and distributions. No local listings and no local prices have separate empty states. A selected search point can still be shown when the dataset itself is empty.

Select a profile, nearby row, overall boxplot, or map listing to see the selected cluster's **local vs overall** boxplots. The existing D3 component is reused with a shared SEK/night axis: solid local box, dashed overall box, scope labels, sample counts, and tooltips. Overall includes local listings as part of the full dataset; it is not an outside-radius comparison. The original profile cards and primary price chart remain overall summaries, and are labeled accordingly when a location is selected.

### Geocoding and geography

`src/api/geocoding.ts` integrates the real [Photon API](https://github.com/komoot/photon/blob/master/docs/api-v1.md). Search requests use a Sweden country filter and a bounding box covering Stockholm County. The response mapper additionally checks the county/state metadata (`Stockholm County` or `Stockholms län`), so neighbouring counties inside that rectangular box are excluded. No place coordinates are hardcoded into the search. Addresses and place names use the returned point; broad districts/municipalities are explored around that representative point, not their administrative boundary. Geocoding detail depends on OpenStreetMap coverage, so select the result whose displayed address matches the intended place.

`useLocationSearch` waits 600 ms after typing at least three characters and aborts outdated requests. The service caches up to 50 queries in memory, sets a 12-second timeout, and reports no matches, throttling, connection errors, and retry states. The UI credits Photon and OpenStreetMap. Searches go directly to the geocoding provider; clustering continues to use mock assignments through the existing clustering service.

The default geocoding endpoint is `https://photon.komoot.io/api/` and needs no API key. To use your own or a hosted Photon-compatible endpoint, set the complete API URL and restart Vite/rebuild:

```dotenv
VITE_GEOCODING_URL=https://your-photon-host.example/api/
```

The endpoint must permit browser CORS access, or be reachable through your own same-origin proxy. Keep provider requests and mapping in `src/api/geocoding.ts`. Photon's public demo server is intended for reasonable request volumes and has no availability guarantee; use an appropriate hosted/private instance for larger deployments ([provider usage guidance](https://github.com/komoot/photon#demo-server)). No backend or deployment proxy configuration was changed.

`src/utils/location.ts` contains reusable spherical great-circle distances, geographic validity checks, nearby summaries, intersection highlighting, and geodesic radius geometry. The same Earth radius is used for filtering and drawing the circle. `focusedAreaTransform` in the existing map utility fits the projected circle into the map viewport. These are straight-line distances, not walking or driving routes. Proximity does not change cluster membership and is not presented as accommodation similarity or an investment recommendation. Search/radius changes never reload or retrain clusters.

## Data boundary

`src/interfaces/clustering.ts` defines the frontend contract, not a proposed backend schema. It includes string cluster IDs, labels/colors, profile summaries, price summaries, listing assignments and coordinates, and optional metadata. Components have no knowledge of the mock groups or any particular algorithm.

`src/hooks/useClusteringData.ts` handles loading, aborts, and errors using the existing `Resource<T>` pattern. `src/api/clustering.ts` is the integration boundary. The existing `src/api/explorer.ts` is unchanged.

`VITE_CLUSTERING_DATA_MODE` defaults to `mock`. You can set it in `frontend/.env.local`:

```dotenv
VITE_CLUSTERING_DATA_MODE=mock
```

In mock mode, the hook waits for the explorer's existing listing resource and reuses it without issuing another listing request. The deterministic demonstration assignment uses room type, guest capacity, bedrooms, and beds. It never uses price or location. Private/shared rooms are compact; entire homes with at least five guests, three bedrooms, or four beds are larger stays; other entire homes are standard apartments. Other known small-capacity accommodation can be compact. Listings with insufficient characteristics stay unassigned.

Profiles and price distributions are computed from the assigned listings, not separately fabricated summaries. Unknown room types are counted as Unknown; missing/invalid numeric values are excluded from medians and prices; zero remains valid. Whiskers end at observed values within 1.5 IQR of Q1/Q3; points outside those fences are outliers. Cluster counts include listings without prices. The UI preserves fractional medians.

If the existing listing request fails, `src/data/clusteringMock.ts` supplies 90 deterministic fictional listings around approximate Stockholm neighbourhood centres. The notice explicitly identifies this synthetic fallback. A successful empty response stays empty. All mock assignments are visibly labeled as demonstrations, including when the listing characteristics and prices come from the existing backend. No model is trained or executed.

## Replace mock data with the clustering API

1. Agree on the backend endpoint, request, and response contract with the backend developer. No clustering endpoint was found in this checkout; the comparison/prediction endpoints are separate functionality.
2. Replace `fetchRealClustering(signal)` in `src/api/clustering.ts`. Use the agreed request with the provided abort signal, check HTTP failures, and map the response into `ClusteringData`. Keep endpoint URLs and response mapping in this module. Use `/api` for the existing Vite/reverse-proxy convention.
3. Assign one stable ID and color per cluster in that mapping. Join assignments by listing ID. Set missing or unknown assignments to `null`; preserve missing characteristic values as `null`. If the backend omits colors, choose a deterministic palette here. Match summary counts to the supplied listings. Price statistics should use the documented whisker convention, or update that convention and the chart caption together.
4. Return `metadata.mode: 'api'`, `metadata.source: 'api'`, and a factual description. Optional algorithm, generation time, or extra metadata belong in the same object. No UI rewrite is required.
5. Set `VITE_CLUSTERING_DATA_MODE=api` and restart Vite (or rebuild for production). API mode does not wait for the explorer listing request. Until step 2 is implemented, it intentionally displays a configuration error rather than guessing an endpoint or silently substituting demo results.

Invalid coordinates are excluded only from the map and reported underneath it; those listings remain in the profiles/price summaries. Unknown cluster IDs use the unassigned map color. A cluster without prices keeps its profile and map listings, and its plot says “No price data.” A listing with no assignment can still be inspected on the map.

## Assumptions and verification

The project proposal PDF/SD3 illustration was not present in this checkout. The layout follows the supplied task description: cards above boxplots and map. Street tiles require OpenStreetMap access; marker rendering, zoom, and selection still work when tiles fail. Cluster navigation uses existing local React view state, so no route or routing dependency was added; `App.tsx` and the demo routes are unchanged.

Run from `frontend`:

```bash
npm run build
npm run lint
npm test
```

`test/clustering.test.mjs` covers deterministic assignment, price independence, consistent summaries, missing values, empty/unassigned data, Tukey outliers, cancellation, arbitrary cluster counts/IDs, and invalid map locations. Existing explorer tests continue to cover SD1/SD2 behavior.

Implementation validation passed:

- TypeScript and Vite production build; ESLint with no errors or warnings.
- 37 frontend tests, including the 21 existing explorer tests, 8 SD3 tests, and 8 location/geocoding tests.
- 25 existing backend tests, with no backend changes.
- Headless Chrome interaction checks with controlled listing responses: coordinated card/boxplot/map selection and clearing, keyboard tooltips and selection, marker inspection using the existing map zoom behavior, synthetic fallback when listing requests fail, reuse of existing listing coordinates/data, successful empty responses, and navigation back to Map/Listings. Layouts were checked at 320, 390, 768, 1024, and 1440 pixels without page overflow or browser runtime exceptions. External street tiles were replaced with neutral tiles for these checks; live clustering remains unconfigured.
- Real browser geocoding succeeded for **Södermalm**, **Nacka**, and **Sveavägen 24 Stockholm**. Additional controlled browser checks covered all four radii, local shares/medians, local-vs-overall price samples, zero-local clusters, independent location/cluster resets, map marker inspection with a location active, autocomplete keyboard selection, cancellation/cache, no matches, service errors/retry, and responsive location layouts. Geographic changes did not issue new listing requests.

## Files

Created:

- `src/api/clustering.ts`
- `src/api/geocoding.ts`
- `src/interfaces/clustering.ts`
- `src/interfaces/location.ts`
- `src/hooks/useClusteringData.ts`
- `src/hooks/useLocationSearch.ts`
- `src/data/clusteringMock.ts`
- `src/utils/clustering.ts`
- `src/utils/location.ts`
- `src/components/clustering/ListingClusters.tsx`
- `src/components/clustering/ListingClusters.css`
- `src/components/clustering/ClusterProfileCard.tsx`
- `src/components/clustering/ClusterPriceBoxplot.tsx`
- `src/components/clustering/ClusterMap.tsx`
- `src/components/clustering/LocationSearch.tsx`
- `src/components/clustering/NearbyClusters.tsx`
- `test/clustering.test.mjs`
- `test/location.test.mjs`
- `SD3.md`

Modified:

- `src/pages/Explorer.tsx` — adds the third view and hides the SD1/SD2 sidebar while viewing clusters.
- `src/components/explorer/DistrictMap.tsx` — optional marker color/highlight props and geographic search overlay/focus, retaining existing defaults and selection behavior.
- `src/utils/map.ts` — fits a geographic search radius using the existing map projection and viewport utilities.
- `README.md` — links to this guide.
