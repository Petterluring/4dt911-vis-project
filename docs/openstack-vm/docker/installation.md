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
Then run 
```bash
sudo apt install docker.io
```
and check docker version again.
