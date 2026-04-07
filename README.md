# DAB Overarching Project

Course full-stack project: programming exercises, submissions, and asynchronous grading. The **Traefik** load balancer is the single entry point; the **server** exposes the REST API; the **grader** pulls jobs from a Redis queue and updates PostgreSQL.

## Stack

| Layer | Technology |
|--------|------------|
| Client | [Astro](https://astro.build/) + [Svelte 5](https://svelte.dev/) |
| API | [Deno](https://deno.com/) + [Hono](https://hono.dev/) |
| Auth | [Better Auth](https://www.better-auth.com/) (email + password, session cookie) |
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

Flyway runs migrations on startup. Default credentials and auth secrets live in `project.env` (for local learning only; do not expose on the public internet).

### Useful URLs

| Purpose | URL |
|---------|-----|
| App (via load balancer) | http://localhost:8000 |
| Traefik dashboard | http://localhost:8080 |
| Register | http://localhost:8000/auth/register |
| Login | http://localhost:8000/auth/login |

- `/` → **client**  
- `/api/*` → **server** (including `/api/auth/*` for Better Auth)  
- `/grader-api/*` → **grader** (path rewritten to `/api/*`)

### Authentication

- Better Auth is mounted at **`/api/auth/**`** (same pattern as the course materials).
- Database tables are defined in **`database-migrations/V3__better_auth_schema.sql`** (core Better Auth schema with `app_user` as the user model).
- **`POST /api/exercises/:id/submissions`** and **`GET /api/submissions/:id/status`** require a **valid session** (session cookie). Unauthenticated requests get **401** with an empty body.
- Public JSON endpoints such as **`/api/languages`**, **`/api/languages/:id/exercises`**, and **`/api/exercises/:id`** stay available without login.
- After registering or signing in, the browser stores the Better Auth session cookie; the exercise editor sends **`credentials: "include"`** on submit and status polling so the cookie is attached.

Environment variables for auth (see `project.env`): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, plus `PGHOST` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` / `PGPORT` for Postgres (used by Better Auth’s dialect and the app).

### Client auth (UI)

- **`client/src/utils/auth.js`** — `createAuthClient()` from Better Auth (Svelte integration).
- **`client/src/states/userState.svelte.js`** — shared session state via `useUserState()` (loads once per page load).
- **`client/src/components/auth/RegistrationAndLoginForm.svelte`** — register / login form; **`client/src/components/auth/AuthBar.svelte`** — top-of-page auth strip.
- **`client/src/pages/auth/register.astro`** and **`login.astro`** — auth pages.

Every Astro page includes **`AuthBar`** (`client:visible`): authenticated users see their **email** in a paragraph; guests see **Login** and **Register** links. On **`/exercises/:id`**, the exercise title and description still load for everyone; the **editor, submit, and grading UI** appear only when logged in. Otherwise the page shows: **`Login or register to complete exercises.`**

### Enable grading

The grader does not process the queue until consumption is enabled:

```bash
curl -X POST http://localhost:8000/grader-api/consume/enable
```

## Layout

```
client/src/utils/auth.js          # Better Auth client (createAuthClient)
client/src/states/userState.svelte.js
client/src/pages/auth/            # login.astro, register.astro
client/                 # Astro + Svelte frontend (remainder)
server/                 # Main API + auth.js (Better Auth)
grader/                 # Grading worker
database-migrations/    # Flyway SQL (includes V3 Better Auth schema)
redis/                  # Redis configuration
compose.yaml            # Services and Traefik labels
project.env             # DB, PG*, and Better Auth env vars
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
