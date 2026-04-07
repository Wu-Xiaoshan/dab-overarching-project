# DAB Overarching Project

Course full-stack project: programming exercises, submissions, and asynchronous grading. The **Traefik** load balancer is the single entry point; the **server** exposes the REST API; the **grader** pulls jobs from a Redis queue and updates PostgreSQL.

## Stack

| Layer | Technology |
|--------|------------|
| Client | [Astro](https://astro.build/) + [Svelte 5](https://svelte.dev/) |
| API | [Deno](https://deno.com/) + [Hono](https://hono.dev/) |
| Database | PostgreSQL 17, migrations via [Flyway](https://flywaydb.org/) |
| Queue / cache | Redis |
| Grader | Deno + Hono (consumes the `submissions` queue) |
| Edge routing | [Traefik](https://traefik.io/) v3.3 |

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose

## Run

From the repository root:

```bash
docker compose up --build
```

Flyway runs migrations on startup. Default credentials live in `project.env` (for local learning only; do not expose on the public internet).

### Useful URLs

| Purpose | URL |
|---------|-----|
| App (via load balancer) | http://localhost:8000 |
| Traefik dashboard | http://localhost:8080 |

- `/` → **client**  
- `/api/*` → **server**  
- `/grader-api/*` → **grader** (path rewritten to `/api/*`)

### Enable grading

The grader does not process the queue until consumption is enabled:

```bash
curl -X POST http://localhost:8000/grader-api/consume/enable
```

## Layout

```
client/                 # Astro + Svelte frontend
server/                 # Main API (languages, exercises, submissions, status)
grader/                 # Grading worker
database-migrations/    # Flyway SQL
redis/                  # Redis configuration
compose.yaml            # Services and Traefik labels
project.env             # DB and related env vars
pack-submission.ps1     # Optional Windows helper to zip for coursework (see below)
```

## About `pack-submission.ps1`

Optional **PowerShell** helper for packaging coursework submissions:

- Removes `client/node_modules` if present
- Builds a zip whose **root** contains `compose.yaml`, `project.env`, and the `client`, `database-migrations`, `grader`, `redis`, and `server` folders (no extra parent directory)
- Verifies `server/app.js` exists at the archive root to avoid “module not found” on the autograder

You do **not** need this script to run the stack; it is only convenient when the course asks for a zip upload.

## License

For educational use unless stated otherwise.
