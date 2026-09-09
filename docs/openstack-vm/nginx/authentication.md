Nginx Basic Authentication
1. Install htpasswd
```bash
sudo apt install apache2-utils
```

2. Create a username and password
```bash
sudo htpasswd -c /etc/nginx/.htpasswd <username>
```

You will be prompted to enter the password.

3. Enable Basic Authentication

Add the following to the relevant Nginx location block:

```bash
auth_basic "Restricted";
auth_basic_user_file /etc/nginx/.htpasswd;
```
For example:

```bash
location /<path>/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;

    # Some action to be taken. For instance, return a file.
}
```

5. Test and reload Nginx
nginx -t
sudo nginx -s reload

6. Visit the server and see if the browser prompts username and password.