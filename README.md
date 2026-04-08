# Docker Volumes Demo

This project is a small Node.js/Express feedback app created to demonstrate how Docker volumes work in a real containerized setup.

Users can submit feedback through a simple form. The app writes data to a temporary file first and then stores the final result inside the `feedback/` directory. The main goal of this project is to show how different Docker volume types behave when used together.

## Purpose

This repository focuses on:

- named volumes for persistent app data
- bind mounts for local source code syncing
- anonymous volumes for container-only folders

## Docker Image

Docker Hub image:

[`lyalkin/docker_kubernetes-complete:volumes`](https://hub.docker.com/repository/docker/lyalkin/docker_kubernetes-complete/tags/volumes/sha256-8df1a8acd0b0684466b19a293f2c5478056900c6d8e9d9cb7205e3e5dc0d95b5)

## Run The Container

Build the image locally:

```bash
docker build -t feedback-node:volumes .
```

Run the container:

```bash
docker run -p 3000:8000 -d --rm --env PORT=8000 --name feedback-app -v feedback:/app/feedback -v ".../Docker/data-volumes-3.1:/app" -v /app/temp -v /app/node_modules feedback-node:volumes
```

Open the app at:

```text
http://localhost:3000
```

## Volume Setup Explained

### 1. Named volume

```bash
-v feedback:/app/feedback
```

This stores submitted feedback in a Docker-managed volume. The data survives container removal, so using `--rm` does not delete saved feedback.

### 2. Bind mount

```bash
-v ".../Docker/data-volumes-3.1:/app"
```

This links the local project folder to the container. It is useful during development because source code changes on the host are reflected inside the container immediately.

### 3. Anonymous volume for temp files

```bash
-v /app/temp
```

This keeps temporary container data separate from the bind mount.

### 4. Anonymous volume for dependencies

```bash
-v /app/node_modules
```

This protects container-installed dependencies from being overwritten by the host project folder when `/app` is bind-mounted.

## Why Multiple Volumes Are Used Together

This setup demonstrates a common Docker development pattern:

- application code comes from the host machine via a bind mount
- persistent user data is stored in a named volume
- container-specific folders are isolated with anonymous volumes

Because `/app` is bind-mounted, the more specific mounts for `/app/feedback`, `/app/temp`, and `/app/node_modules` override that parent mount for those directories.

## Project Structure

- `server.js` - Express server and feedback file handling
- `pages/` - HTML pages
- `public/` - static assets
- `feedback/` - final stored feedback files
- `temp/` - temporary files before processing
- `Dockerfile` - container setup for the app

## Notes

- The correct container port in the run command is `8000`, because the app is started with `PORT=8000`.
- If you use `-p 3000:800`, the app will not be exposed correctly.
