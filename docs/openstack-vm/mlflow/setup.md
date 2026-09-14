This instruction assumes that the user is remotely connected to the VM instance.

We use docker to run an mlflow service on the vm machine. The service was deployed using these instructions (see Docker Compose section):
https://mlflow.org/docs/latest/self-hosting/

Make sure to open all ports that the services runs on in the security group, including mlflow server, PostgresSQL, Rust, etc.
