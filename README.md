# 4DT911 Visualization Project

This repository contains the full-stack visualization project for the course
**4DT911**. It combines a React frontend, and a FastAPI backend.

The frontend provides the user-facing visualization interface, while the backend
exposes the application's API layer and serves as the integration point for the
project's data and model workflows.

The project is maintained by Petter Gustafsson, Kim Wong, and Moritz
Steinke.

## Cloning the project

Clone the repository and initialize the submodules:

```bash
git clone https://github.com/Petterluring/4dt911-vis-project.git
cd 4dt911-vis-project
```

## Research repository

The application uses various machine learning models to support its visualization and analytical features. The ML research component is maintained in a separate repository dedicated to model development, experimentation, and evaluation.

The research repository contains Jupyter notebooks for model experimentation code, MLflow-related tooling for experiment tracking, model management, analysis, and data analysis.

For further details and setup instructions specific to the research workflow, refer to the [research repository](https://github.com/Petterluring/4dt911-vis-project-research) and its README.

## Repository layout

```text
backend/                   # FastAPI backend service

frontend/                  # React + Vite frontend application

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


## Git strategy

This project follows a Git branching strategy designed to maintain code quality, support collaborative development, and ensure a clear release history. The repository has two protected branches, `main` and `dev`, each serving a distinct purpose.

### Protected branches

Both `main` and `dev` are protected against deletion and enforce several rules regarding contributions:

- All changes must be submitted through a **pull request (PR)**.
- Each pull request must be reviewed and approved by at least **one other project member**.
- All required GitHub Actions checks, including linting and automated tests, must pass before merging.
- Both branches enforce a **linear commit history**, meaning that merge commits are not permitted.

### Development branch (`dev`)

The `dev` branch serves as the integration branch for ongoing development. New features, bug fixes, and other contributions are developed in separate branches and subsequently merged into `dev` through pull requests. The only exception to this strategy occurs after a new release has been merged into `main`. Before starting the next sprint, we reset `dev` to match `main`, ensuring that both branches have identical commit histories and provide a clean starting point for further development. This operation can only be performed by the repository administrator, who has permission to bypass the branch protection rules enforced on `dev`.

Before submitting a pull request, contributors must **rebase their branch onto the latest `dev`** to incorporate recent changes and resolve potential conflicts.

To maintain a linear commit history, contributions are integrated using **rebase and merge** rather than regular merge commits.

### Release branch (`main`)

The `main` branch contains the official releases of the application. At the end of each sprint, the latest stable version from `dev` is merged into `main` through a pull request.

The following rules apply:

- Pull requests targeting `main` usually originates from `dev`.
- Each pull request requires approval from at least one other project member.
- All required GitHub Actions checks must pass.
- Changes are integrated using **squash and merge**, preserving a linear history with one commit per release.
- Release commits follow the naming convention `R1`, `R2`, `R3`, ..., `RN`.

This approach provides a clear release history where each commit on `main` represents a distinct release of the application.

### Other branches

Branches other than `main` and `dev` are not subject to additional protection rules. However, they must follow the established branch naming convention.

The supported branch prefixes are:

- `feature/` – Development of new features.
- `fix/` – General bug fixes.
- `hotfix/` – Urgent fixes.
- `docs/` – Documentation changes.
- `release/` – Release-related work.

For example, `feature/add-map-filter` or `fix/database-connection`.

### Contribution workflow

The typical development workflow is as follows:

1. Create a new branch from the latest `dev`, following the branch naming convention.
2. Implement the changes and commit them to the branch.
3. Rebase the branch onto the latest `dev` before opening a pull request.
4. Open a pull request targeting `dev`.
5. Ensure that all required GitHub Actions checks pass and obtain approval from at least one other project member.
6. Integrate the changes into `dev` using **rebase and merge**.
7. At the end of a sprint, open a pull request from `dev` to `main` and integrate the release using **squash and merge**, naming the resulting commit according to the release convention.

To rebase a development branch onto the latest `dev`, execute:

```bash
git fetch origin
git rebase origin/dev
```

If conflicts occur during rebasing, resolve them and continue with:

```bash
git rebase --continue
```

After successfully rebasing a branch that has already been pushed to the remote repository, update it using:

```bash
git push --force-with-lease
```

**Note:** Rebasing rewrites commit history. Therefore, contributors should avoid rebasing shared branches without coordinating with other project members.


## Security and data handling

- Do not commit secrets, credentials, or sensitive project data to the repository.
- Store environment variables locally and keep them outside version control.
- Be careful with notebooks, generated outputs, and any MLflow-related credentials.
- Treat the research configuration and MLflow credentials as sensitive material.
- Keep any institutional or private certificates outside the repository unless
  explicitly approved for use.
