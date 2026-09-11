# 4DT911 Visualization Project

This repository contains the full-stack visualization project for the course
**4DT911**. It combines a React frontend, a FastAPI backend, and a research
submodule used for ML experiments and analytics work.

The frontend provides the user-facing visualization interface, while the backend
exposes the application's API layer and serves as the integration point for the
project's data and model workflows.

## Requirements

- Python 3.14
- [Poetry](https://python-poetry.org/docs/#installation) 2.x
- Node.js 20 LTS or newer
- npm 10 or newer
- Docker (optional, for containerized backend workflows)

The project is intended to be run locally during development, and the backing
research repository is kept separate as a Git submodule for reproducible ML work.

## Initialize and install

Clone the repository and initialize the submodules:

```bash
git clone https://github.com/Petterluring/4dt911-vis-project.git
cd 4dt911-vis-project
git submodule update --init --recursive
```

Make sure Poetry creates virtual environments inside the project directory:

```bash
poetry config virtualenvs.in-project true
```

Install the backend dependencies:

```bash
cd backend
poetry install --extras dev
```

Install the frontend dependencies:

```bash
cd ../frontend/my-app
npm install
```

## Running the application

### Backend

From the `backend/` directory, start the FastAPI development server:

```bash
poetry run uvicorn app.main:app --reload
```

The backend is available at:

```text
http://127.0.0.1:8000
```

### Frontend

From the `frontend/my-app/` directory, run the Vite development server:

```bash
npm run dev
```

The frontend is typically available at:

```text
http://127.0.0.1:5173
```

## Research submodule

This repository includes the ML research component as a Git submodule:

```text
research/
```

The research repository contains notebooks, model experimentation code, and the
MLflow-related data and analytics tooling used to support the visualization
project. For details and setup instructions specific to the research workflow,
see the README in `research/`.

## Repository layout

```text
backend/                   # FastAPI backend service

frontend/                  # React + Vite frontend application

research/                  # ML research submodule

README.md                  # Main project overview
.gitmodules                # Git submodule configuration
```

## Development workflow

A typical local workflow is:

1. Start the backend in `backend/`
2. Start the frontend in `frontend/my-app/`
3. Use the frontend to interact with the API while developing the visualization UI
4. Keep research experiments isolated in the `research/` submodule

## Security and data handling

- Do not commit secrets, credentials, or sensitive project data to the repository.
- Store environment variables locally and keep them outside version control.
- Be careful with notebooks, generated outputs, and any MLflow-related credentials.
- Treat the research configuration and MLflow credentials as sensitive material.
- Keep any institutional or private certificates outside the repository unless
  explicitly approved for use.
