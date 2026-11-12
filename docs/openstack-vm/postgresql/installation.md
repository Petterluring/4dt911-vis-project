# Installing PostgreSQL Client

These instructions assume that you are connected to the VM instance remotely using a CLI.

## Install PostgreSQL Client

First, update the package list to ensure that the latest available package information is retrieved:

```bash
sudo apt update
```


Install the common PostgreSQL client utilities:

```bash
sudo apt install postgresql-client-common
```

Next, install PostgreSQL Client version 18:

```bash
sudo apt install postgresql-client-18
```

**Note:** The available PostgreSQL client versions depend on the configured package repositories. If version 18 is unavailable, you may need to configure the official PostgreSQL APT repository or install another available version.

## Verify the Installation

Once the installation is complete, verify that the PostgreSQL client is installed correctly:

```bash
psql --version
```

The command should produce output similar to:

```text
psql (PostgreSQL) 18.x
```

The PostgreSQL client is now installed and can be used to connect to remote PostgreSQL databases.

## Connect to a PostgreSQL Database

To connect to a remote PostgreSQL database, execute:

```bash
psql -h <HOST> -p <PORT> -U <USERNAME> -d <DATABASE>
```

Replace the placeholders with the appropriate connection details:

- `<HOST>` – Hostname or IP address of the PostgreSQL server.
- `<PORT>` – Port on which PostgreSQL is listening (typically `5432`).
- `<USERNAME>` – PostgreSQL username.
- `<DATABASE>` – Name of the database to connect to.

If the connection succeeds, you will be presented with an interactive PostgreSQL terminal where you can execute SQL queries and manage database resources, subject to your user's permissions.

To exit the PostgreSQL terminal, execute:

```sql
\q
```