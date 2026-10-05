# 4DT911 Visualization Project

This repository contains the full-stack visualization project for the course
**4DT911**. It combines a React frontend, a FastAPI backend, and a research
submodule used for ML experiments and analytics work.

The frontend provides the user-facing visualization interface, while the backend
exposes the application's API layer and serves as the integration point for the
project's data and model workflows.

The project is maintained by Petter Gustafsson, Kim Wong, and Moritz
Steinke.

## Cloning the project

Clone the repository and initialize the submodules:

```bash
git clone --recurse-submodules https://github.com/Petterluring/4dt911-vis-project.git
cd 4dt911-vis-project
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
docker-compose.yaml        # Compose file for app orchestration
docs/                      # Directory containing various instructions, including guidelines for configuring the virtual machine required by the project.
.gitmodules                # Git submodule configuration
```

## Development workflow

A typical local workflow is:

1. Start the backend in `backend/` (see README in `backend/`)
2. Start the frontend in `frontend/` (see README in `frontend/`)
3. Use the frontend to interact with the API while developing the visualization UI
4. Keep research experiments isolated in the `research/` submodule

## Remote Services

The project depends on a remote virtual machine hosted on Linnaeus University's (LNU) Computer Science (CS) cloud. The machine is accessible at [cu0089.camp.lnu.se](https://cu0089.camp.lnu.se/).

Access to the virtual machine requires a connection to the EDU VPN when accessing it from outside the campus network. See the [VPN instructions](https://www.lnu.se/mot-linneuniversitetet/aktuellt/nyheter/2025/nytt-student-vpn/) for information on configuring the VPN connection.

The project also requires access to the `4dt911-resources` folder, which contains the credentials necessary to connect to the remote services. Contact a project member to obtain access to this folder. Also, see `backend/` README for more details.




## Running the App with Docker Compose

Make sure that the ports defined in the `.env` file are available before starting the application.

The backend and frontend projects each have a `Dockerfile` specifying how they are built. The `docker-compose.yaml` file builds and orchestrates these services together with an Nginx server, which routes HTTP requests to the appropriate service. In addition to defining the build process, the file specifies exposed ports, environment variables, container names, and other configuration.

Start the application using:

```bash
docker compose up -d
```

Verify that the application is running as intended by inspecting the output of:
```bash
docker ps
```


Once the services have started, open `http://localhost:<PORT>` in a web browser. If Nginx is configured to use port 80, `http://localhost/` is sufficient.



## Security and data handling

- Do not commit secrets, credentials, or sensitive project data to the repository.
- Store environment variables locally and keep them outside version control.
- Be careful with notebooks, generated outputs, and any MLflow-related credentials.
- Treat the research configuration and MLflow credentials as sensitive material.
- Keep any institutional or private certificates outside the repository unless
  explicitly approved for use.
