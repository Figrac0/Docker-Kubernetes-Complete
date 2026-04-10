# Multi-Container Docker Goals Application

This project is a Docker-focused multi-container application that demonstrates how an isolated frontend, backend, and database can run as separate containers while still working as one system.

The application itself is intentionally simple: a React frontend sends goal-related HTTP requests to a Node.js/Express backend, and the backend stores the data in MongoDB. The main purpose of the repository is not the UI logic, but the Docker architecture behind it: images, containers, networks, volumes, bind mounts, environment variables, and cross-container communication.

## Architecture

```text
Browser
  |
  | http://localhost:3000
  v
frontend-react container
  |
  | browser request to http://localhost/goals
  v
goals-backend container
  |
  | Docker network DNS: mongodb:27017
  v
mongodb container
```

Runtime containers:

- `frontend-react` - React development server, published on host port `3000`.
- `goals-backend` - Express API, published on host port `80`.
- `mongodb` - MongoDB database, reachable only inside the Docker network.

The key Docker concept is that the backend does not connect to MongoDB through `localhost`. It connects through Docker's internal DNS name:

```js
mongodb://<username>:<password>@mongodb:27017/course-goals?authSource=admin
```

Inside the custom Docker network, `mongodb` resolves to the MongoDB container.

## Docker Network

The containers use a user-defined bridge network:

```bash
docker network create goals-net
```

This network provides:

- container-to-container communication
- automatic DNS resolution by container name
- isolation from unrelated Docker containers
- a stable database hostname for the backend

MongoDB does not publish port `27017` to the host. It only exposes it internally to containers that join `goals-net`.

## Backend Dockerfile

The backend image is defined in [`backend/Dockerfile`](backend/Dockerfile):

```dockerfile
FROM node

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 80

ENV MONGODB_USERNAME figraco
ENV MONGODB_PASSWORD secret

CMD ["npm", "start"]
```

Docker behavior:

- `FROM node` provides the Node.js runtime.
- `WORKDIR /app` defines the working directory inside the container.
- `COPY package.json .` and `RUN npm install` install dependencies in a cache-friendly layer.
- `COPY . .` copies the backend source code into the image.
- `EXPOSE 80` documents the backend HTTP port.
- `ENV MONGODB_USERNAME` and `ENV MONGODB_PASSWORD` provide default database credentials.
- `CMD ["npm", "start"]` starts the Express server through `nodemon`.

The backend writes request logs to `/app/logs/access.log`, which can be persisted through a named Docker volume.

## Frontend Dockerfile

The frontend image is defined in [`frontend/Dockerfile`](frontend/Dockerfile):

```dockerfile
FROM node:18

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

Docker behavior:

- `FROM node:18` provides a stable Node.js runtime for the React development server.
- `EXPOSE 3000` documents the React dev server port.
- `CMD ["npm", "start"]` starts `react-scripts start`.
- `CHOKIDAR_USEPOLLING=true` is used at runtime so file watching works reliably inside Docker on Windows.

The frontend uses a bind mount during development, so local source code changes are reflected inside the container.

## Build Images

From the project root:

```bash
docker build -t goals-node ./backend
docker build -t goals-react ./frontend
```

Published backend image:

[`lyalkin/docker_kubernetes_complete:backend`](https://hub.docker.com/repository/docker/lyalkin/docker_kubernetes_complete/tags/backend/sha256-30fc94064d5e043395098cba980cf8650656c6cee2ff3f7251d1a7ef0f0e43c5)

Backend image digest:

```text
sha256:30fc94064d5e043395098cba980cf8650656c6cee2ff3f7251d1a7ef0f0e43c5
```

## Recommended Development Run

Create the shared Docker network:

```bash
docker network create goals-net
```

Run MongoDB with authentication and persistent data:

```bash
docker run --name mongodb -v data:/data/db --rm -d --network goals-net -e MONGO_INITDB_ROOT_USERNAME=figraco -e MONGO_INITDB_ROOT_PASSWORD=secret mongo
```

Run the backend with logs, source-code bind mount, and protected container dependencies:

```bash
docker run --name goals-backend --rm -v logs:/app/logs -v D:/arst.hw/sv.code/Docker/multi-container/backend:/app -v /app/node_modules -e MONGODB_USERNAME=figraco -e MONGODB_PASSWORD=secret -d -p 80:80 --network goals-net goals-node
```

Run the frontend with live source-code updates:

```bash
docker run --name frontend-react --rm -p 3000:3000 -it -e CHOKIDAR_USEPOLLING=true -v D:/arst.hw/sv.code/Docker/multi-container/frontend:/app -v /app/node_modules goals-react
```

Open the application:

```text
http://localhost:3000
```

## Volumes And Mounts

This project uses different storage mechanisms for different purposes:

- `data:/data/db` persists MongoDB documents outside the database container.
- `logs:/app/logs` persists backend access logs.
- `D:/arst.hw/sv.code/Docker/multi-container/backend:/app` bind-mounts backend source code for development.
- `D:/arst.hw/sv.code/Docker/multi-container/frontend:/app` bind-mounts frontend source code for development.
- `/app/node_modules` creates an anonymous volume so container-installed dependencies are not overwritten by the host bind mount.

This combination demonstrates a standard Docker development pattern: source code comes from the host machine, runtime dependencies stay inside the container, and important generated data is stored in named volumes.

## Console Evidence

Observed running containers:

```text
CONTAINER ID   IMAGE         COMMAND                  CREATED              STATUS              PORTS                                         NAMES
a4db136efe45   goals-node    "docker-entrypoint.s..."   3 seconds ago        Up 3 seconds        0.0.0.0:80->80/tcp, [::]:80->80/tcp           goals-backend
322e1d4ecac4   goals-react   "docker-entrypoint.s..."   About a minute ago   Up About a minute   0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp   frontend-react
51ee201179bc   mongo         "docker-entrypoint.s..."   8 minutes ago        Up 8 minutes        27017/tcp                                     mongodb
```

Initial MongoDB container attached to the custom network:

```bash
docker run --name mongodb --rm -d --network goals-net mongo
```

Backend container attached to the same network:

```bash
docker run --name goals-backend --rm -d -p 80:80 --network goals-net goals-node
```

Authenticated MongoDB with persistent database storage:

```bash
docker run --name mongodb -v data:/data/db --rm -d --network goals-net -e MONGO_INITDB_ROOT_USERNAME=figraco -e MONGO_INITDB_ROOT_PASSWORD=secret mongo
```

Backend with logs, bind mount, anonymous `node_modules`, and runtime MongoDB username:

```bash
docker run --name goals-backend --rm -v logs:/app/logs -v D:/arst.hw/sv.code/Docker/multi-container/backend:/app -v /app/node_modules -e MONGODB_USERNAME=figraco -d -p 80:80 --network goals-net goals-node
```

Frontend with polling and live bind mount:

```bash
docker run --name frontend-react --rm -p 3000:3000 -it -e CHOKIDAR_USEPOLLING=true -v D:/arst.hw/sv.code/Docker/multi-container/frontend:/app -v /app/node_modules goals-react
```

The failed shell check:

```text
cat /app/src/components/CourseGoals/CourseGoals.js
cat: /app/src/components/CourseGoals/CourseGoals.js: No such file or directory
```

The reason is path case sensitivity inside the Linux container. The actual project path is:

```text
/app/src/components/goals/CourseGoals.js
```

`CourseGoals` and `goals` are different directory names in a Linux filesystem.

## Important Docker Notes

- `localhost` inside the backend container would mean the backend container itself, not MongoDB.
- `mongodb` works as a hostname only because both backend and database containers share `goals-net`.
- The React frontend is served from a container, but its `fetch("http://localhost/goals")` requests are executed by the browser on the host machine.
- The backend must publish port `80` to the host because the browser calls `http://localhost/goals`.
- MongoDB does not need a published host port because only the backend container talks to it.
- `--rm` removes a container after it stops, but named volumes such as `data` and `logs` remain.
- `.dockerignore` prevents `node_modules`, `.git`, and Dockerfile metadata from being copied into the build context.

## Cleanup

Stop the running containers:

```bash
docker stop frontend-react goals-backend mongodb
```

Remove the network:

```bash
docker network rm goals-net
```

Remove named volumes only if the stored database and logs are no longer needed:

```bash
docker volume rm data logs
```

## Conclusion

This repository demonstrates a complete Docker multi-container workflow without Docker Compose: separate images, isolated containers, a shared user-defined network, persistent volumes, development bind mounts, and environment-based runtime configuration. It shows the essential mechanics behind containerized full-stack applications.
