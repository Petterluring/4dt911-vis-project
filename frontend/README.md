# 4DT911 Visualization Analytics — Frontend

## Introduction

This directory contains the web-based frontend for the 4DT911 visualization
analytics project. It is built with TypeScript and React, and uses Vite for
local development and production builds.

Some important files and folders:

- `src/App.tsx` is the main entry point of the app.
- `src/main.tsx` initializes the React application and renders it into the
  page.
- `src/pages/` contains the different pages in the app.
- `src/components/` contains reusable UI components used by the pages.
- `src/api/` contains frontend API communication. The developer should use `/api` as a prefix when specifying path segments to the API.
- `vite.config.ts` configures Vite, including forwarding `/api` requests to
  the local backend at `http://localhost:8000`. This setting is only relevant during development.

## Prerequisites
- Node 26.0.0 or newer

## Installing and running the app

Install a current version of [Node.js](https://nodejs.org/) before setting up the frontend. From the `frontend` directory, install the project dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal when the server starts. Open this URL in a browser to use the application.

The FastAPI backend must also be running locally on port `8000` for features that communicate with the backend.

## Verify

The frontend provides commands for linting the source code and creating a production build. Run these commands from the `frontend` directory:

```bash
npm run lint
npm run build
```

`npm run lint` runs ESLint to identify potential problems and enforce the project's coding conventions.

`npm run build` creates an optimized production bundle in `dist/` and runs the TypeScript compiler checks as part of the build process. Both commands should complete successfully before changes are considered ready.

## Development guidelines

When developing the frontend, follow these guidelines:

* **Create reasonable UI components.** Break the interface into reusable components when a part of the UI has a clear responsibility or is reused. Avoid both overly large components and unnecessary components that only contain a few lines of markup.
* **Keep components focused.** Components should have a clear purpose and avoid combining unrelated UI, data-fetching, and application logic where possible.
* **Use `api/` for API endpoints.** API endpoint paths should use `/api/` as their prefix, for example `/api/municipalities` or `/api/listings`. Keep API communication separate from presentation logic where practical.
* **Document non-obvious code.** Add comments or documentation when the purpose, behaviour, or reasoning behind an implementation is not immediately clear. Avoid comments that simply restate what the code does.
* **Use meaningful names.** Components, variables, functions, and types should have descriptive names that make their purpose clear.
* **Keep TypeScript types explicit.** Define appropriate types for API responses, component props, and other structured data instead of relying unnecessarily on implicit or loosely typed values.
* **Follow the existing project structure and conventions.** New code should fit the patterns already established in the project rather than introducing alternative approaches without a clear reason.

## SABA - Stockholm Airbnb Analytics (SD1 and SD2)

Use the **Map / Listings** switch at the top to choose the main view. On desktop,
the left side occupies about 75% of the workspace and shows either the map and
its two scatterplots or the sortable listing table. The right sidebar keeps
listing filters and selection details in both views. Compact map settings and
colour legends sit on the map. The desktop workspace fits the viewport; the
listing table and sidebar can scroll independently. Filters, selections, and the map viewport
are retained when switching views. On smaller screens the panels stack.
The existing demo pages remain at `/demos/hello-fast-api` and `/demos/hello-world`.

### Listing clusters (SD3)

Use the existing **Clustering** sidebar tab next to **Filters & Details** and
**Positioning** to open SD3. It contains coordinated profiles, price boxplots,
cluster map markers, address search, nearby statistics, and local/overall price
comparisons. Map/Listings remain the two header views, and tab switching preserves
SD3 state and the other explorer tools.
The map stays in the same persistent container and has the same position and
dimensions across sidebar tabs. Clustering controls and collapsible summaries
fit the normal sidebar; price charts use the existing fixed comparison panel
below the map. The shared desktop and mobile map layout is preserved.

Live API mode is the default: **POST `/api/clustering/perform`** supplies assignments
and price statistics, joined with metadata from **POST `/api/choropleth-map/listings`**.
Failures show a retryable error without synthetic fallback. For explicit development
mock data, set `VITE_CLUSTERING_DATA_MODE=mock` in `frontend/.env.local` and restart
Vite. Mock groups are fixed demonstration assignments; dynamic configuration is
available in API mode and never substitutes synthetic results for a failed request.

#### Clustering configuration and reruns

The collapsible **Clustering configuration** section is inside the existing SD3
sidebar. Select any combination of **Room type**, **Guest capacity**, **Bedrooms**,
**Bathrooms**, and **Beds**, set **Number of clusters (K)**, and click
**Run Clustering**. The initial request retains room type, guest capacity, bedrooms
and beds with K=3; `VITE_CLUSTERING_N_CLUSTERS` can override that initial K.
Bathrooms can be selected before running. Price and geographical coordinates are
excluded from the feature whitelist.

Draft edits do not send requests. The section summary always identifies the
configuration that produced the displayed results, even when collapsed. Unapplied
changes are marked separately. Each explicit run sends the selected settings to
the existing endpoint, for example:

```json
{"features":["room_type","accommodates","bedrooms"],"n_clusters":4}
```

The Pydantic schema requires at least one of the five allowed features and an
integer K of at least 2. KMeans also requires K not to exceed its sample count.
After the first successful response, the UI uses the number of distinct listing
assignments in that backend dataset as the upper bound. It does not derive a
limit from the overview's coordinate-filtered listings or impose an arbitrary
fixed maximum. Before that count is known, minimum/integer validation applies
and any additional backend failure is shown normally. The displayed number of
clusters is always the actual returned count, which can be lower than requested K.

Applying a request immediately hides previous profiles, price plots and listing
markers while calculation is in progress. The searched location, address text,
radius and map viewport remain intact. A success replaces every coordinated view
from one result set and resets cluster/listing selection, since the same numeric
cluster ID can represent a different group after recalculation. Nearby summaries
and local/overall comparisons use the new assignments. A failed run shows an
error with no stale or synthetic results. **Retry clustering data** retries the
last applied configuration; draft edits still require **Run Clustering**.

Users can edit and apply a different valid configuration while another request
is running. The loader aborts superseded fetches and accepts results only for
the current request/retry identity, preventing late replies from overwriting
newer results. Backend work may still finish server-side after a client abort.
Repeated configurations use the backend's existing LRU cache; no frontend result
cache or new endpoint was added. `metadata.configuration` records the submitted
request and `metadata.inputListingCount` records the derived sample count in the
frontend data contract; these are not assumed fields in the backend wire response.

Configuration is disabled in explicit mock mode, with a visible explanation that
the demonstration groups are fixed. The frontend does not implement another
clustering algorithm to simulate changes to features or K.

Validation: TypeScript/Vite build, ESLint, 50 frontend tests and 55 backend tests
passed. Live browser tests verified the default configuration, three-feature K=4,
all five features including bathrooms, K=4→2, coordinated counts/plots/colors,
location/radius persistence, and selection resets. Controlled replies covered
loading, supersession, errors/retry and empty results. Map bounds remained exactly
equal to the existing layout at 320, 390, 768, 1024 and 1440px, with one persistent
map instance and no runtime exceptions. Local screenshots and bounds are saved in
the ignored `frontend/node_modules/.tmp/sd3-configuration/` directory.

Implementation files: `src/components/clustering/ClusteringConfiguration.tsx`,
`ListingClusters.tsx`, `ListingClusters.css`, `src/hooks/useListingClusters.ts`,
`useClusteringData.ts`, `src/api/clustering.ts`, `src/interfaces/clustering.ts`,
`src/utils/clusteringConfiguration.ts`, `test/clusteringConfiguration.test.mjs`,
`test/clustering.test.mjs`, and this README. The shared explorer API, map container,
map CSS, geographical calculations and backend production code are unchanged.

### Map layers and interactions

- A sequential petrol scale encodes the chosen average/median housing/Airbnb price.
- Grey means missing data. The legend gives the actual minimum, maximum and units.
- Hover a district to see its six tooltip statistics. Click it to select it across
  the map and both charts, or use the always-visible district selector by keyboard.
  Clicking again or **Clear selection** resets the shared selection. The selected
  district is orange with the same opacity as the metric layer (70% with the
  street map, 100% without it). Map paths are not focusable and do not draw native
  SVG focus rectangles. Chart points and ordinary controls retain keyboard focus.
- Pan and zoom with the map, touch gestures or the map navigation buttons.
  The labelled **Recenter** button fits all districts again without clearing selections.
  District names are drawn in a separate SVG layer above the listing canvas.
- Listing coordinates are fetched in ID-ordered pages of 1,000 until the final
  raw page is shorter. Invalid coordinates are excluded; duplicate IDs are merged.
  Located listings are drawn on Canvas. Their radius stays at 2 px through zoom level 12, then grows to a maximum of 6.5 px at zoom level 17. At zoom level 14 or
  closer, clicking within 8 screen pixels of a dot
  selects the nearest listing and opens its detail card. The selected dot is
  enlarged to a zoom-dependent 6.5 to 11 px radius with a white halo and orange fill, and its district
  is selected across connected views. A map hint explains when listing clicks are enabled.
  Closing the card preserves the district selection. Hiding listings or choosing
  another district clears the listing selection. Dragging does not select items.
- The **Districts** checkbox beside **Airbnb locations** and **Street map**
  toggles the district layer, which is enabled initially. Disabling it hides
  district fills, boundaries, names, the colour legend and district tooltips;
  it clears the current district selection and hover, and disables the map metric
  and district selectors. Listing details stay open, and listing clicks do not
  select a district while this layer is hidden. Chart comparisons remain available.
  Re-enabling restores the layer using the current metric. The viewport and zoom
  are preserved when toggling; panning, zooming, Recenter and listing clicks still work.
- The street map and listing layers can be independently hidden. If tiles fail,
  district boundaries and data still work. Backend failures show retry controls;
  no illustrative data is substituted.

### Listing ranking and linked selection

The table initially includes every located listing, including entries without a
nightly price. Filters above the table combine minimum/maximum nightly price,
minimum bedrooms and guest capacity, and room type. Price has two handles on
one track; bedrooms and guests each have a single handle. Each slider uses the
largest value allowed by the other filters. The rank column follows the current
filter and sort order. Bounds are inclusive;
zero-bedroom studios are retained, and unknown values are excluded only when a
filter on that field is active. Reset filters restores the full collection.
The filtered collection is shared by the table and map markers. District selection
remains a highlight, and panning or zooming does not change the result set.
Changing a filter clears the listing selection and pending map focus.

Click a numeric column header to sort price, rating, reviews, bedrooms or guests.
Click again to reverse direction. Missing values stay last in both directions;
ties use listing ID. The default is ascending nightly price. Rows are virtualized
at 40 px to keep thousands of listings responsive. The count shows matches / total.
On narrow screens the columns scroll horizontally, while the rows scroll vertically.

Hover a row for 300 ms or focus it by keyboard to see a photo, full title, district,
room/property type, beds, bathrooms and minimum stay in a floating preview.
The preview closes on Escape, blur, pointer leave, scrolling or resizing.
Click a row or press Enter/Space to select it, open details and focus its map
location. Arrow keys, Home and End move keyboard focus between rows. Selecting a
map marker scrolls its row into view. Map focus preserves closer zoom levels.
The table and filters use existing listing fields without backend changes.

### API and metric definitions

All requests use the existing `/api` proxy and JSON POST bodies. The four routes
are `/choropleth-map/district-stats`, `/choropleth-map/tooltip-statistics`,
`/choropleth-map/listings`, and `/scatterplots/district-stats`.
The district body contains all 11 backend district names. Listing requests include
coordinates and the following backend-supported summary columns: `id`, `name`,
`listing_url`, `picture_url`, `district`, `room_type`, `property_type`, `price`,
`accommodates`, `bedrooms`, `beds`, `bathrooms_text`, `review_scores_rating`,
`number_of_reviews`, and `minimum_nights`. These are fetched with the paginated
coordinates because the current endpoint has no listing-ID filter. No raw
CSV-only field is requested. Pictures are loaded for visible ranking rows and the selected listing;
missing or failed images display a photo placeholder. External links and images require valid
HTTPS URLs without embedded credentials. The card groups the image, price and
rating, capacity facts, property type and minimum stay, with a link to the listing.
The counter reports all mapped listings. Missing prices are not converted to
zero, and listings without prices remain on the map.
Decimal-string aggregates are converted to
finite numbers; missing and invalid numeric values remain null, and zero is valid.
The scatterplot adapter reads the backend's separate `scatterplot_1` and
`scatterplot_2` objects in the response array.

Housing prices in the map and price scatterplot are **total selling prices in
SEK per sale**, as currently returned by the backend, not SEK/m². Airbnb prices
are **SEK per night**. The district tooltip separately displays average housing
price per square metre from `average_housing_price_per_m2`. Aggregation and
source inclusion rules are owned by the backend SQL queries; frontend selections
do not recompute those aggregates or filter the datasets.

The price scatterplot switches both axes between average and median together.
The map metric can be changed independently. Every point represents a district;
all axes and map colour scales are linear. Districts missing either chart value
are omitted from that chart, and the count of omitted districts is displayed.
Neither outliers nor zero scores are removed, and points are not jittered.

Tourism scores are read directly from the backend's `tourism_score` field in
both district tooltips and SD2. The frontend does not calculate or substitute
scores, so backend updates appear without frontend changes. Zero remains a
valid value; missing scores are handled as missing data.
The attractions field in the tooltip is a count, as provided by the API.

### District boundaries and basemap

`public/data/stockholm-districts-2025.geojson` is copied unchanged from
`notebooks/data_preprocessing/stockholm_districts_2025.geojson` in the research
repository. Its `Namn` properties are mapped to API district names by removing
Swedish possessive suffixes (for example `Kungsholmens` → `Kungsholmen`). The
adapter verifies that all 11 districts are present. This uses the existing D3
dependency for planar paths, Web Mercator alignment, zooming and chart scales;
no new runtime dependency is added. Paths and tiles are positioned directly in
screen coordinates instead of placing interactive SVG paths inside a large zoom
transform. SVG paths have no browser focus ring and the tile group has no SVG
CSS filter. D3 and pointer gesture tracking distinguish clicks from drags using
a five-pixel threshold, retaining the maximum movement until the next gesture.

The default basemap requests standard OpenStreetMap raster tiles for the visible
viewport only, uses normal browser caching and shows visible OSM attribution.
No offline download, prefetch or tile proxy is provided. For substantial public
traffic, choose a suitable tile provider and update URL/attribution together.
Policy: https://operations.osmfoundation.org/policies/tiles/

### Validation

Run `npm test`, `npm run lint`, and `npm run build`. The Node tests use Vite's
existing TypeScript loader, with mocked HTTP responses and the real district
geometry file. Tests cover numeric normalization, the split API envelope,
pagination, invalid coordinates, duplicate IDs, failure/cancellation behavior,
all boundary-name joins, missing-price colors, tile alignment, screen-space bounds,
listing metadata, marker hit testing, drag thresholds, URL validation, ranking order,
large-list rendering, listing focus coordinates, and the persistent dashboard structure.
An actual backend and network access to the tile server are needed for a live
integration and browser smoke test.

### Select listings on the map

Choose **Rectangle** or **Lasso** beside the map zoom controls and drag over
listing markers. The lasso closes on release. A new shape replaces the current
group; hold Shift while dragging to add listings. Escape or clicking the active
tool exits drawing mode.
The table and summary use the selected listings that pass the active filters.
The summary reports median and average nightly prices, median bedrooms and capacity, mean listing rating,
and counts by district and room type. Missing values are omitted from numeric
aggregates. Hover or focus a row to preview that listing, or select it to open
its details. **Clear group** restores the full filtered table.

### Property positioning (SD4)

Open **Positioning** in the sidebar and change the district, room type, capacity,
bedrooms, beds or amenities, then select **Calculate** to run the comparison and prediction. Choose
5, 10, 20 or 50 comparables (default: 20). Their asking-price histogram and median provide
context for the estimated nightly asking price. Select a histogram bar to
highlight its listings. Selecting a comparable focuses it in the current view.
The star plot shows the magnitude and sign of each contribution in SEK.

The frontend loads amenity associations from POST /amenities at startup
and ranks all options by the number of listings that have them. It sends the scenario to POST /listing-comparisons/compare and
POST /listing-comparisons/predict. Similarity uses the selected amenity names;
the current prediction model uses their count. The location input is a
district, as supported by the API. The sidebar combines filters and selection details, including the selected
listing's amenities from POST /amenities. Positioning has its own tab;
Clustering is reserved for a later implementation.
