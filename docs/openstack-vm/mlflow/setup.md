# Setting Up MLflow

These instructions assume that you are connected to the VM instance remotely using a CLI.

## Deploy MLflow with Docker

We use Docker to run the MLflow service on the VM. Deploy the service by following the instructions in the **Docker Compose** section of the [MLflow self-hosting documentation](https://mlflow.org/docs/latest/self-hosting/).

## Configure Network Access

Make sure that the ports used by the services are open in the VM instance's security group. This includes the MLflow server, PostgreSQL, Rust, and any other services deployed on the VM.
