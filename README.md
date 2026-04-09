# Docker Networking: Cross-Container Communication

This project is a compact experimental Node.js/MongoDB application designed to demonstrate Docker networking and cross-container communication. The core objective is to show how two isolated containers can exchange data reliably when attached to the same user-defined Docker network.

<div align="center">
  
| 1 |
| :---: |
| <img src="https://github.com/Figrac0/Docker-Kubernetes-Complete/blob/Cross-Container-Communication/assets/DOCKER.png" width="600"/> |


| 2 |
| :---: |
| <img src="https://github.com/Figrac0/Docker-Kubernetes-Complete/blob/Cross-Container-Communication/assets/networks.png" width="600"/> |

</div>

## Research Focus

The application consists of two runtime components:

- `favorites-node`: a Node.js/Express API
- `mongodb`: a MongoDB database container

The API persists favorite movies and characters in MongoDB and exposes HTTP endpoints on port `3000`. The database is not published to the host; it is reachable internally through Docker DNS by the container name `mongodb`.

## Communication Model

The decisive implementation detail is the MongoDB connection string in [app.js]:

```js
mongodb://mongodb:27017/swfavorites
```

Here, `mongodb` is not a localhost reference. It is the container name resolved by Docker's internal DNS once both containers join the same custom network.

## Build And Run

Build the application image:

```bash
docker build -t favorites-node .
```

Create an isolated bridge network:

```bash
docker network create favorites-net
```

Start MongoDB inside that network:

```bash
docker run -d --name mongodb --network favorites-net mongo
```

Start the Node.js API in the same network and publish the API port to the host:

```bash
docker run -d --name favorites -p 3000:3000 --network favorites-net favorites-node
```

The API then becomes available at:

```text
http://localhost:3000
```

## API Surface

- `GET /movies` - fetches Star Wars films from SWAPI
- `GET /people` - fetches Star Wars characters from SWAPI
- `GET /favorites` - reads persisted favorites from MongoDB
- `POST /favorites` - stores a favorite document in MongoDB

## Console Findings

The console session above supports several concrete observations:

- Running `docker run -d --name mongodb mongo` without an explicit network starts MongoDB on Docker's default `bridge` network.
- `docker container inspect mongodb` shows that the official `mongo` image declares volumes for `/data/db` and `/data/configdb`; Docker created anonymous volumes for both paths automatically.
- Before a custom network was created, MongoDB had an internal bridge IP such as `172.17.0.2`, but that alone is not the intended application integration strategy.
- After `docker network create favorites-net`, both containers could be started in the same isolated network and communicate by container name.
- `docker stop favorites-node` failed because `favorites-node` is an image name, while the actual container name was `favorites`.
- When a container was started with `--rm`, it disappeared automatically after exit, which explains the later `No such container` responses for `docker logs favorites`.
- `docker run -d --name mongodb --network favorites-net mongo` failed while a stopped container named `mongodb` still existed. Docker requires unique container names even for stopped containers.

## Why A Custom Network Matters

Using a user-defined bridge network is preferable to the default `bridge` network for cross-container applications because it provides:

- automatic container name resolution
- explicit service isolation
- predictable application topology
- cleaner multi-container orchestration

In practical terms, the application container does not need to know a changing container IP. It only needs the stable hostname `mongodb`, provided by Docker networking.

## Conclusion

This repository demonstrates a standard Docker networking pattern: one application container, one database container, one shared custom network, and hostname-based service discovery. The result is a minimal but rigorous example of cross-container communication without hard-coded IP addresses.
