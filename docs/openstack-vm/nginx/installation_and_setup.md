# Installing and Setting Up Nginx

These instructions assume that you are connected to the VM instance remotely using a CLI.

## Install Nginx

Install Nginx:
```bash
sudo apt install nginx
```

Make sure to include the ngx_stream_proxy_module also:
```bash
sudo apt install libnginx-mod-stream
````

Check whether Nginx is running:
```bash
sudo systemctl status nginx
```

If Nginx is not running, start it with:
```bash
sudo systemctl start nginx
```

## Verify the Installation

1. Make sure that port 80 is open in the VM instance's security group.
2. Open `http://<IP>` in a browser, replacing `<IP>` with the VM's floating IP.
3. Confirm that the **Welcome to nginx!** page is displayed.