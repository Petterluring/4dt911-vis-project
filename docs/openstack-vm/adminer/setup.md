# Installing and Setting Up Adminer

These instructions assume that you are connected to the VM instance remotely using a CLI and that Docker and Docker Compose are already installed.

Adminer is a lightweight, web-based database management tool that allows users to interact with databases through a graphical interface. In this project, Adminer is used to manage and inspect the PostgreSQL database.

## Configure Adminer in Docker Compose

Adminer can be deployed as a Docker container alongside the existing PostgreSQL service.

Open the existing Docker Compose configuration file, typically named `compose.yaml` or `docker-compose.yml`.

Add the following service under the `services` section:

```yaml
adminer:
  image: adminer
  container_name: adminer
  ports:
    - "8080:8080"
  depends_on:
    - mlflow-postgres
```

The configuration defines the following:

- **`image`** – Specifies the official Adminer Docker image.
- **`container_name`** – Assigns the container the name `adminer`.
- **`ports`** – Maps port `8080` on the VM to port `8080` inside the container.
- **`depends_on`** – Ensures that the `mlflow-postgres` service is started before Adminer. Note that this does not guarantee that PostgreSQL is ready to accept connections.

**Note:** The `mlflow-postgres` service must already be defined in the same Docker Compose configuration. Adminer and PostgreSQL must also share a Docker network to communicate.

## Deploy Adminer

Before deploying Adminer, verify that the Docker Compose configuration is valid:

```bash
docker compose config
```

If the configuration is valid, start the Adminer container:

```bash
docker compose up -d adminer
```

Docker Compose will download the Adminer image if necessary and create the container.

## Verify the Installation

Verify that the Adminer container is running:

```bash
docker compose ps adminer
```

The container should report a running status.

You can also inspect the container logs:

```bash
docker compose logs adminer
```

To verify that Adminer responds to HTTP requests, execute:

```bash
curl -I http://localhost:8080
```

A successful HTTP response indicates that the Adminer web server is reachable.

## Security Considerations

Ensure that Adminer is accessible remotely through Nginx, which acts as a reverse proxy and forwards incoming requests to the Adminer service.