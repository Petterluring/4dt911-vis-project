# 4DT911 Visualization Analytics — Backend

## Introduction

This directory contains the backend for the 4DT911 visualization
analytics project. It is built with python and FastAPI, and uses Uvicorn as the development and production server.

## Prerequisites

- Python 3.10 or newer
- Poetry (optional for the Poetry workflow)
- Docker (optional, for the container workflow)

The application runs on `http://127.0.0.1:8000`.

The application is maintained by Petter Gustafsson, Kim Wong, and Moritz
Steinke.

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
uvicorn app.main:app --reload # Runs on port 8000 by default
```

## Tests and linting

When the virtual environment is active, run:

```bash
pytest
ruff check
```