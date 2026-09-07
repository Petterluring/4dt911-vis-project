# 4DT911 Visualization Backend

FastAPI backend for the 4DT911 visualization project.

## Prerequisites

- Python 3.10 or newer
- Poetry (optional for the Poetry workflow)
- Docker (optional, for the container workflow)

The application runs on `http://127.0.0.1:8000`.

## Setup and run with Poetry

From this directory, install Poetry if it is not already installed:

CHECK
```bash
python3 -m pip install --user poetry
```

Install the application and development dependencies:

```bash
poetry install --extras dev
```

Start the development server:

```bash
poetry run uvicorn app.main:app --reload
```

## Setup and run with Python `venv`

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate # MAC
./.venv/Scripts/activate # Windows
```

On Windows PowerShell, activate it with:

```powershell
.venv\Scripts\Activate.ps1
```

Install the application and development dependencies with pip:

```bash
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

Start the development server:

```bash
uvicorn app.main:app --reload
```

## Run with Docker

Build the image and start the application:

```bash
docker build -t vis-project-backend .
docker run --rm -p 8000:8000 vis-project-backend
```

Open `http://127.0.0.1:8000/` in a browser or use:

```bash
curl http://127.0.0.1:8000/
```

## Tests and linting

When the virtual environment is active, run:

```bash
pytest
ruff check app test
```