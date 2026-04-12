# Dockerized Laravel / PHP Stack

This repository is a Docker-focused development environment for a Laravel-style PHP application. It demonstrates how to split a traditional web stack into isolated containers, each responsible for a single concern: web serving, PHP execution, database storage, dependency management, and CLI tooling.

The project is designed as infrastructure-first Docker practice. The main subject is not application business logic, but the container architecture itself.

## What This Project Contains

The stack is defined in [`docker-compose.yaml`](docker-compose.yaml) and includes:

- `server` - Nginx reverse proxy, exposed on port `8000`
- `php` - PHP 8.0 FPM application runtime
- `mysql` - MySQL 5.7 database
- `composer` - utility container for PHP package management
- `artisan` - utility container for Laravel CLI commands
- `npm` - utility container for frontend asset commands

## Architecture

```text
Browser -> Nginx (server) -> PHP-FPM (php) -> MySQL (mysql)
```

This is the key idea of the repository: the application is not run inside one large container. Instead, each runtime responsibility is isolated and connected through Docker Compose networking.

## Docker Design

The stack follows a clear Docker separation of concerns:

- Nginx handles incoming HTTP traffic.
- PHP-FPM executes PHP code.
- MySQL stores relational data.
- Composer is used only when dependencies must be installed or updated.
- Artisan is used only for framework CLI operations.
- NPM is used only for frontend tooling.

This model is closer to production-style container design than putting the entire stack into a single image.

## Dockerfiles

### `dockerfiles/nginx.dockerfile`

Builds a lightweight Nginx container, copies the custom Nginx configuration, and serves the application from `/var/www/html/public`.

### `dockerfiles/php.dockerfile`

Builds a PHP 8.0 FPM runtime, installs `pdo` and `pdo_mysql`, copies the application source, and runs as a non-root `laravel` user.

### `dockerfiles/composer.dockerfile`

Builds a dedicated Composer utility image based on `composer:latest`, switches to a non-root user, and uses:

```dockerfile
ENTRYPOINT [ "composer", "--ignore-platform-reqs" ]
```

This makes Composer available as an isolated tool container instead of requiring Composer on the host machine.

## Service Behavior

### `server`

- builds from `dockerfiles/nginx.dockerfile`
- publishes `8000:80`
- mounts the application source from `./src`
- mounts `nginx/nginx.conf` as a read-only configuration file
- depends on `php` and `mysql`

### `php`

- builds from `dockerfiles/php.dockerfile`
- mounts `./src` into `/var/www/html`
- provides the FastCGI endpoint consumed by Nginx at `php:9000`

### `mysql`

- uses `mysql:5.7`
- loads credentials from [`env/mysql.env`](env/mysql.env)

### `composer`

- runs Composer commands against the mounted application source
- allows dependency installation without polluting the host environment

### `artisan`

- reuses the PHP image
- overrides the entrypoint with:

```text
php /var/www/html/artisan
```

- provides a clean containerized way to run Laravel CLI commands

### `npm`

- uses `node:14`
- mounts the source tree into `/var/www/html`
- runs frontend tooling commands through an `npm` entrypoint

## Nginx Configuration

The custom Nginx configuration in [`nginx/nginx.conf`](nginx/nginx.conf) is important to understanding the stack:

- the document root is `/var/www/html/public`
- requests are routed through `index.php` when no static file exists
- PHP requests are forwarded to `php:9000`

This means Nginx does not execute PHP itself. It delegates execution to the separate `php` service over the internal Docker network.

## Why This Project Is Useful

This repository is a practical example of:

- Docker Compose orchestration
- service-to-service communication
- containerized PHP development
- separation between web server and PHP runtime
- using Docker as a local development toolchain
- running Composer, Artisan, and NPM without installing them globally

## Typical Workflow

Start the core services:

```bash
docker compose up -d server php mysql
```

Install PHP dependencies:

```bash
docker compose run --rm composer install
```

Run a Laravel Artisan command:

```bash
docker compose run --rm artisan migrate
```

Run an NPM command:

```bash
docker compose run --rm npm install
```

Open the application:

```text
http://localhost:8000
```

## Notes

- The source code is expected inside the `src/` directory.
- The stack is Laravel-oriented, but the main educational value of the repository is Docker architecture.
- Because the tooling is containerized, the host machine does not need local installations of PHP, Composer, or Node.js to work with the project.

## Conclusion

This project is best understood as a clean Docker-based PHP/Laravel environment. It demonstrates how to compose Nginx, PHP-FPM, MySQL, Composer, Artisan, and NPM into a coherent containerized workflow suitable for learning Docker and publishing as a dedicated Docker repository on GitHub.
