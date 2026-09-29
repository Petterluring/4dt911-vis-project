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
  the FastAPI demo.
- `vite.config.ts` configures Vite, including forwarding `/api` requests to
  the local backend at `http://localhost:8000`.

The application is maintained by Petter Gustafsson, Kim Wong, and Moritz
Steinke.

## Prerequisites
- npm 11.19.0 or newer

## Installing and running the app

Install a current version of Node.js and npm, then run the following commands
from the `frontend` directory:

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal when the server starts.
Open that URL in a browser to use the app. The FastAPI demo also requires its
backend to be running locally on port `8000`.

## Verify

Run the linter and production build from the `frontend` directory:

```bash
npm run lint
npm run build
```

The build command runs the TypeScript project checks and creates the optimized
production bundle in `dist/`.
