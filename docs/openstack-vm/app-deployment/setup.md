# Deploying the Application on the VM

## Introduction

This guide describes how to deploy the application on the VM using Docker Compose. It assumes that the reader is already connected to the VM through a command-line interface (CLI).

## Deployment Steps

### 1. Create the Deployment Directory

Navigate to the home directory and create a new directory named `app-deployment`:

```bash
mkdir -p ~/app-deployment
cd ~/app-deployment
```

### 2. Configure Docker Compose

Create the following configuration files inside `app-deployment`:

- **`docker-compose.yml`** — Copy the contents of `docker-compose.txt` into this file.
- **`.env`** — Copy the contents of `env.txt` into this file.

These files define the application's services and environment variables. Adjust the configuration values as needed for the VM environment.

### 3. Add Application Resources

Copy the `4dt911-resources` directory into the home directory of the VM. This directory contains the configuration files and credentials required by the application. For further details on this configuration, refer to `/backend/README.md`.

### 4. Update Database Connection Settings

Review the configuration files inside `4dt911-resources` and update the database connection settings to match the Docker environment.

For example, when connecting to PostgreSQL from another container on the same Docker network, use the PostgreSQL container's service name (`mlflow-postgres`) instead of the VM's public hostname.

**Original configuration:**

```yaml
username: airbnb_user
password: SECRET
host: cu0089.camp.lnu.se
port: 5433
database: airbnb
```

**Updated configuration:**

```yaml
username: airbnb_user
password: SECRET
host: mlflow-postgres
port: 5432
database: airbnb
```

The changes are:

- **Host:** `mlflow-postgres` identifies the PostgreSQL service within the Docker network, eliminating the need to connect through the VM's public hostname.
- **Port:** `5432` is the PostgreSQL container's internal port, whereas `5433` is the port exposed on the VM host.

**Important:** Ensure that the application containers and the PostgreSQL container are connected to the same Docker network (`mlflow-network`). Otherwise, the hostname `mlflow-postgres` may not be resolvable.

### 5. Start the Application

Once the configuration files and resources are in place, start the application:

```bash
docker compose up -d
```

Verify that the containers are running:

```bash
docker compose ps
```

To inspect application logs:

```bash
docker compose logs -f
```

Ensure that the services start successfully and that the backend can establish a connection to the PostgreSQL database. It is essential to run Docker commands as the current user rather than with sudo, ensuring that the HOME environment variable resolves to the correct home directory.
