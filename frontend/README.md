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

The home page is a full-screen district map. Open **Compare districts** to show
both scatterplots side by side. On narrow screens they stack below the map.
The existing demo pages remain at `/demos/hello-fast-api` and `/demos/hello-world`.

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
- The street map and listing layers can be independently hidden. If tiles fail,
  district boundaries and data still work. Backend failures show retry controls;
  no illustrative data is substituted.

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
CSV-only field is requested. Pictures are loaded only for the selected listing;
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

**Current backend limitation:** both tourism-score queries return a literal zero
pending the definition of that metric. SD2 displays those zero values honestly
and labels them as backend placeholders. No attraction-count substitute is used.
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
listing metadata, marker hit testing, drag thresholds, URL validation and chart markup.
An actual backend and network access to the tile server are needed for a live
integration and browser smoke test.
