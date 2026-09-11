This instruction assumes that the user is remotely connected to the VM instance.

Check if docker exists on the vm.
```bash
 docker --version
```
If the following is printed
```bash
Command 'docker' not found, but can be installed with:
sudo apt install docker.io      # version 29.1.3-0ubuntu4.1, or
sudo apt install podman-docker  # version 5.7.0+ds2-3build1
```
Versions of these will vary.

Then run 
```bash
sudo apt install docker.io
```
and check docker version again.

Make also sure that docker compose was installed.
```bash
docker compose version
```

If not, the user can install by running
```bash
sudo apt install docker-compose-v2
```
