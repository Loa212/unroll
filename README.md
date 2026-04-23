# my-app

## Environment

1. Copy the sample file and adjust values as needed:

```bash
cp .env.example .env
```

2. Point `DATABASE_URL` to any reachable PostgreSQL instance (the default value matches the Docker Compose stack). `PORT` controls the HTTP server port and `NODE_ENV` is used for runtime logging and tooling.

## Local development

```bash
bun install
bun run dev
```

The server expects a PostgreSQL database reachable via `DATABASE_URL`. If you use the provided Compose stack (below), keep it running while developing locally.

## Docker

Build and run both the Bun app and PostgreSQL using Docker Compose:

```bash
docker compose up --build
```

This exposes the Bun server on `http://localhost:3000` and PostgreSQL on `localhost:5432`. Data is persisted in the `postgres_data` volume. Stop everything with `docker compose down` (add `-v` to also remove the volume).

### Makefile helpers

For quick database-only workflows (handy when running the Bun app locally), use the provided Make targets:

```bash
make db-up      # start postgres in the background
make db-down    # stop postgres but keep the data volume
make db-reset   # stop everything managed by docker-compose and delete volumes
```

These commands wrap `docker compose` and assume Docker is installed. After `make db-up`, ensure your `.env` still points at `postgres://postgres:postgres@localhost:5432/todos`. `make db-reset` will also stop the Bun app if it was running via Compose.
