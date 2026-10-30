# Installing Docker

These instructions assume that you are connected to the VM instance remotely using a CLI.

## Install Docker

First, update the package list to ensure that the latest available package information is retrieved:

```bash
sudo apt update
```

Check whether Docker is already installed on the VM:

```bash
docker --version
```

If Docker is not installed, the command should print a message similar to the following:

```text
Command 'docker' not found, but can be installed with:
sudo apt install docker.io      # version 29.1.3-0ubuntu4.1, or
sudo apt install podman-docker  # version 5.7.0+ds2-3build1
```

The available versions may vary depending on the Ubuntu version and configured package repositories.

Install Docker using:

```bash
sudo apt install docker.io
```

## Verify the Docker Installation

Once the installation is complete, verify that Docker is installed correctly:

```bash
docker --version
```

The command should produce output similar to:

```text
Docker version 29.x.x, build xxxxxxx
```

Next, verify that the Docker service is running:

```bash
sudo systemctl status docker
```

The service should report `active (running)`.

If the service is not running, start it using:

```bash
sudo systemctl start docker
```

Finally, verify that Docker can successfully run containers:

```bash
sudo docker run --rm hello-world
```

If Docker is functioning correctly, the container should print a confirmation message indicating that the installation is working.

## Install Docker Compose

Docker Compose is used to define and manage multi-container applications through a YAML configuration file, typically named `compose.yaml` or `docker-compose.yml`.

First, check whether Docker Compose is already installed:

```bash
docker compose version
```

If Docker Compose is not installed, install the Docker Compose V2 plugin:

```bash
sudo apt install docker-compose-v2
```

**Note:** Package availability and versions depend on the Ubuntu release and configured package repositories.

## Verify the Docker Compose Installation

Once the installation is complete, verify that Docker Compose is available:

```bash
docker compose version
```

The command should produce output similar to:

```text
Docker Compose version v2.x.x
```

Docker and Docker Compose are now installed and can be used to build, deploy, and manage containerized applications.

## Optional: Run Docker Without sudo

By default, Docker commands may require elevated privileges.

To allow the current user to execute Docker commands without `sudo`, add the user to the `docker` group:

```bash
sudo usermod -aG docker $USER
```

The new group membership will take effect after starting a new login session. Alternatively, execute:

```bash
newgrp docker
```

Verify that Docker can now be executed without `sudo`:

```bash
docker run --rm hello-world
```

If successful, Docker is ready to use without requiring elevated privileges for each command.

**Security note:** Membership in the `docker` group effectively grants root-level privileges on the host. Only trusted users should be added to this group.