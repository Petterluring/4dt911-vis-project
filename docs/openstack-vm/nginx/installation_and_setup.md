# Installing and Setting Up Nginx

These instructions assume that you are connected to the VM instance remotely using a CLI.

## Install Nginx

First, update the package list to ensure that the latest available package information is retrieved:

```bash
sudo apt update
```

Check whether Nginx is already installed:

```bash
nginx -v
```

If Nginx is not installed, the command should produce an error indicating that the command could not be found.

Install Nginx using:

```bash
sudo apt install nginx
```

Next, install the Nginx stream module, which enables TCP and UDP traffic proxying. This is useful when forwarding connections to services such as PostgreSQL.

```bash
sudo apt install libnginx-mod-stream
```

**Note:** The stream module is separate from Nginx's standard HTTP reverse proxy functionality. It is required only when configuring TCP or UDP proxying.

## Verify the Installation

Once the installation is complete, verify that Nginx is installed correctly:

```bash
nginx -v
```

The command should produce output similar to:

```text
nginx version: nginx/1.x.x
```

Next, verify that the Nginx configuration is valid:

```bash
sudo nginx -t
```

If the configuration is valid, the command should produce output similar to:

```text
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

You can also verify that Nginx is running:

```bash
sudo systemctl status nginx
```

The service should report `active (running)`.

If Nginx is not running, start it using:

```bash
sudo systemctl start nginx
```

To ensure that Nginx starts automatically when the VM boots, execute:

```bash
sudo systemctl enable nginx
```

## Verify Network Accessibility

To verify that Nginx is accessible from outside the VM, follow these steps:

1. Ensure that **TCP port 80** is permitted by the VM's security group in OpenStack. If a host firewall is enabled, it must also allow incoming traffic on this port.
2. Open a web browser and navigate to `http://<FLOATING_IP>`, replacing `<FLOATING_IP>` with the floating IP address assigned to the VM.
3. Confirm that the default **Welcome to nginx!** page is displayed.

If the page is displayed successfully, Nginx is running and accepting HTTP connections.


## Managing the Nginx Service

The following commands can be used to manage Nginx after installation.

**Check the service status:**

```bash
sudo systemctl status nginx
```

**Start Nginx:**

```bash
sudo systemctl start nginx
```

**Stop Nginx:**

```bash
sudo systemctl stop nginx
```

**Restart Nginx:**

```bash
sudo systemctl restart nginx
```

**Reload the configuration without restarting the service:**

```bash
sudo systemctl reload nginx
```

When modifying Nginx configuration files, it is recommended to validate the configuration before reloading:

```bash
sudo nginx -t && sudo nginx -s reload
```

This ensures that the configuration is reloaded only if the syntax validation succeeds.

Nginx is now installed and ready to be configured as an HTTP reverse proxy or TCP/UDP stream proxy for services hosted on the VM.

## Current Setup

The current Nginx configuration is documented in the `config/` directory, which contains the configuration files used for our deployment.