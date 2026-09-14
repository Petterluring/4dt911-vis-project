# Installing Docker

These instructions assume that you are connected to the VM instance remotely using a CLI.

## Install Docker

Check whether Docker is installed on the VM:
```bash
docker --version
```

If Docker is not installed, the command should print a message similar to the following:
```bash
Command 'docker' not found, but can be installed with:
sudo apt install docker.io      # version 29.1.3-0ubuntu4.1, or
sudo apt install podman-docker  # version 5.7.0+ds2-3build1
```

The available versions may vary. Install Docker with:
```bash
sudo apt install docker.io
```

Verify the installation:
```bash
docker --version
```

## Install Docker Compose

Make sure that Docker Compose is also installed:
```bash
docker compose version
```

If Docker Compose is not installed, install it with:
```bash
sudo apt install docker-compose-v2
```
