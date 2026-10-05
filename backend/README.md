# 4DT911 Visualization Analytics — Backend

## Introduction

This directory contains the backend for the 4DT911 visualization
analytics project. It is built with python and FastAPI, and uses Uvicorn as the development and production server.

## Prerequisites

- Python 3.14 or newer
- Poetry 2.4 or newer
- Access to Linneaus University EDU VPN (instructions found below Access to Remote Services header)
- `backend/` folder as root.

The application runs on `http://localhost:8000`.

## Setup with poetry

From this directory, install Poetry if it is not already installed:

```bash
python3 -m pip install --user poetry
```

Configure Poetry to create the virtual environment inside the project directory, rather than in Poetry's global cache. Run the following command from the project directory:

```bash
poetry config virtualenvs.in-project true
```

After this, running commands such as `poetry install` will create the virtual environment in a `.venv` folder within the project directory.


Install the application and development dependencies:

```bash
poetry install --extras dev # Omit --extras dev to exclude development dependencies.
```

## Access to Remote Services

The app depends on a remote virtual machine hosted on Linnaeus University's (LNU) Computer Science (CS) cloud. The machine is accessible at [cu0089.camp.lnu.se](https://cu0089.camp.lnu.se/).

Access to the virtual machine requires a connection to the EDU VPN when accessing it from outside the campus network. See the [VPN instructions](https://www.lnu.se/mot-linneuniversitetet/aktuellt/nyheter/2025/nytt-student-vpn/) for information on configuring the VPN connection.

The project also requires access to the `4dt911-resources` folder, which contains the credentials necessary to connect to the remote services. Contact a project member to obtain access to this folder. The folder contains configuration files with the credentials required to access the two services on which the application depends:

* **MLflow** — used for machine learning experiment tracking and model management.
* **PostgreSQL** — used as the project's database.

Once you have obtained the folder, place it in your home directory. Make sure that the `HOME` environment variable is correctly configured on your machine. You can verify this by running:

```bash
echo $HOME
```

If configured correctly, the command should print the path to your home directory.

### Testing connections
TODO: Explain how to test

## Running the app

Make sure that the the virtual environment is activated by running:
```bash
source .venv/bin/activate # MAC
./.venv/Scripts/activate # Windows
```

Start the development server from `backend/`:

```bash
uvicorn app.main:app --reload # Runs on port 8000 by default
```

Once the server is running, the backend API is available at `http://localhost:8000`. Verify that the server is running and responding correctly by executing:

```bash
curl http://localhost:8000/health
```

To explore and interact with the available API endpoints using the Swagger UI, open:

`http://localhost:8000/docs`

The Swagger UI provides an interactive overview of the API endpoints and allows you to send requests directly to the running backend.



## Testing and Linting

The application is tested using **pytest** and checked with **Ruff** and **mypy**:

* **pytest** — a testing framework for Python used to discover and run automated tests and verify that the application behaves as expected.
* **Ruff** — a fast Python linter that checks the code for common errors, code-quality issues, and violations of the project's formatting and style rules.
* **mypy** — a static type checker that analyzes Python code and reports potential type-related errors without executing the application.

To run these tools, the development dependencies must be installed during project setup, as described in [Setup with Poetry](#setup-with-poetry). The virtual environment must also be activated, as described in [Running the App](#running-the-app).

With the virtual environment activated, run the following commands from the project directory:

```bash
pytest
ruff check
mypy
```

`pytest` runs the project's test suite, while `ruff check` and `mypy` perform static checks on the source code. All three commands should complete without errors before the code is considered ready.
