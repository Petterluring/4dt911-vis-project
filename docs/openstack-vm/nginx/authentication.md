# Nginx Basic Authentication

These instructions assume that you are connected to the VM instance remotely using a CLI.

These instructions configure HTTP Basic Authentication for an Nginx location.

## Install `htpasswd`

Install the `apache2-utils` package, which provides the `htpasswd` command:
```bash
sudo apt install apache2-utils
```

## Create a User

Create a username and password:
```bash
sudo htpasswd -c /etc/nginx/.htpasswd <username>
```

Replace `<username>` with the username you want to create. You will be prompted to enter the password.

## Enable Basic Authentication

Add the following directives to the relevant Nginx `location` block:

```bash
auth_basic "Restricted";
auth_basic_user_file /etc/nginx/.htpasswd;
```
For example:

```bash
location /<path>/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Add the location-specific configuration here.
}
```

## Test and Reload Nginx

Test the Nginx configuration:
```bash
nginx -t
```

If the test succeeds, reload Nginx:
```bash
sudo nginx -s reload
```

Visit the protected path in a browser and confirm that it prompts you for a username and password.