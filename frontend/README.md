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
