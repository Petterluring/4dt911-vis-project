This instruction assumes that the user is remotely connected to the VM instance.

Install nginx by running.
```bash
sudo apt install nginx
```

Check if nginx is running:
```bash
sudo systemctl status nginx
```
If not running, run
```bash
sudo systemctl start nginx
```
- Make sure that port 80 is open in your instances' security group.
- Test and see if the "Welcome to nginx!" page shows when entering http://<IP> in your browser using the floating IP of your VM.