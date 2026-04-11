# Docker Compose Multi-Service Stack

This project is a concise demonstration of Docker Compose as an orchestration layer for a multi-service application. The central artifact is [`docker-compose.yaml`](docker-compose.yaml), which defines how the frontend, backend, and MongoDB containers are built, connected, configured, and persisted as one reproducible runtime system.

## Compose File Scope

The Compose file coordinates three services:

- `mongodb` - database service based on the official `mongo` image
- `backend` - Node.js API built from `./backend`
- `frontend` - React development server built from `./frontend`

The purpose of the file is not merely to start containers, but to formalize service topology:

- image build context
- port publishing
- volume strategy
- environment injection
- startup order
- default network creation

## Scientific View Of The Compose Model

Docker Compose converts the application into a declarative system. Instead of starting containers manually with separate `docker run` commands, the runtime topology is encoded once in YAML and can then be recreated consistently with a single command.

In this repository, the Compose file establishes:

- a shared application network for inter-service communication
- persistent named volumes for data and logs
- bind mounts for development-time source synchronization
- environment separation through `env_file`

## Service Semantics

### `mongodb`

- uses the official `mongo` image
- loads credentials from [`env/mongo.env`](env/mongo.env)
- persists database state in the named volume `data`

This service is the database endpoint addressed internally as `mongodb`.

### `backend`

- is built from [`backend/Dockerfile`](backend/Dockerfile)
- publishes port `80:80`
- loads credentials from [`env/backend.env`](env/backend.env)
- mounts `logs:/app/logs` for persistent access logs
- mounts `./backend:/app` for live backend code updates
- mounts `/app/node_modules` as an anonymous volume to protect container-installed dependencies
- declares `depends_on: mongodb`

The backend uses the hostname `mongodb` in its MongoDB connection string, which works because Compose places both services on the same default network.

### `frontend`

- is built from [`frontend/Dockerfile`](frontend/Dockerfile)
- publishes port `3000:3000`
- mounts `./frontend/src:/app/src` to support live React source updates
- enables `stdin_open: true` and `tty: true` for interactive development behavior

## Volumes

Two named volumes are declared at the bottom of the Compose file:

- `data` - persists MongoDB database files
- `logs` - persists backend access logs

This separation is important. Database state and application logs survive container replacement, while source code remains bind-mounted for rapid iteration.

## Default Network Behavior

The console output shows that Compose created and removed the network `compose_default` automatically:

```text
+ Network compose_default Created
+ Network compose_default Removed
```

This is a core Docker Compose behavior. Unless custom networks are declared, Compose provisions a project-scoped default network and attaches all services to it. That network enables backend-to-database communication without hard-coded container IP addresses.

## Observed Runtime Evidence

The recorded `docker ps` output confirms that the Compose file materialized three running services:

```text
CONTAINER ID   IMAGE              COMMAND                  CREATED         STATUS         PORTS                                         NAMES
7e730e9971a0   compose-backend    "docker-entrypoint.s..."   7 seconds ago   Up 6 seconds   0.0.0.0:80->80/tcp, [::]:80->80/tcp           compose-backend-1
f0d2212743c3   compose-frontend   "docker-entrypoint.s..."   8 seconds ago   Up 6 seconds   0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp   compose-frontend-1
b49ff6f63cfb   mongo              "docker-entrypoint.s..."   8 seconds ago   Up 6 seconds   27017/tcp                                     compose-mongodb-1
```

The `docker compose down` output confirms complete teardown of the Compose-managed runtime:

```text
+ Container compose-backend-1 Removed
+ Container compose-mongodb-1 Removed
+ Network compose_default Removed
```

The `docker compose up -d` output also confirms that Compose built application images and then created all declared services:

- `compose-frontend` was built from source
- `compose-backend` was built from source
- MongoDB was instantiated from the upstream `mongo` image

## Important Compose Note

The CLI emitted this warning:

```text
the attribute `version` is obsolete, it will be ignored
```

That warning is correct. In Docker Compose v2, the top-level `version` field is no longer required. The file still works, but the `version: "3.8"` line should be removed to avoid ambiguity.

## Methodological Note On `depends_on`

`depends_on` expresses startup order, not database readiness. It ensures that Compose starts `mongodb` before `backend`, but it does not guarantee that MongoDB is fully ready to accept connections at the exact moment the backend starts. This is an important Compose distinction in real systems.

## Conclusion

This repository is best understood as a Compose orchestration exercise rather than an application exercise. The essential subject is the Compose file itself: one declarative specification that builds two local images, starts three coordinated services, injects environment variables, provisions persistent storage, and creates a shared network for inter-service communication.
