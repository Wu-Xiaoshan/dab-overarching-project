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
| Local observability | [Grafana OTEL LGTM](https://grafana.com/docs/opentelemetry/docker-lgtm/) (`grafana/otel-lgtm`) |

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
| Grafana (LGTM) | http://localhost:3000 (default login `admin` / `admin`) |
| OpenTelemetry HTTP collector | `http://lgtm:4318` (from other containers) |
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

### Submissions and user ownership (step 11)

- Migration **`database-migrations/V4__user_exercise_submissions.sql`** clears existing rows in **`exercise_submissions`** (so a **`NOT NULL`** `user_id` can be added), then runs:
  `ALTER TABLE exercise_submissions ADD COLUMN user_id VARCHAR(255) NOT NULL REFERENCES app_user(id);`
- **`POST /api/exercises/:id/submissions`** stores the **current session user’s id** in `user_id` (`requireSession` sets `userId` from Better Auth’s `session.user.id`).
- **`GET /api/submissions/:id/status`**: still **401** without a session; with a session, returns **404** if the submission is missing or **`user_id` does not match** the logged-in user; otherwise returns status JSON as before.

#### Step 11 assignment zip (server folder only)

Some hand-ins want a zip of **only** the contents of **`server/`**, with **`app.js` at the root** of the archive (no `server/` prefix). From the repo root:

```powershell
Push-Location server
Compress-Archive -Path * -DestinationPath ..\dab-step11-server.zip -Force
Pop-Location
```

### Exercises, solutions, and grading (step 12)

- **`V5__exercise_solutions.sql`** adds non-null **`solution_code`** on **`exercises`** (existing rows backfilled with `''` first).
- **`V6__sql_exercises.sql`** inserts the **SQL** language and three sample SQL exercises with reference solutions.
- **`grader/grader-utils.js`** exports **`levenshteinDistance(a, b)`** (classic edit distance).
- **`grader/app.js`** keeps the same queue loop: set **`processing`** → sleep **1–3 s** (random) → load **`source_code`** and **`solution_code`** via join →  
  **`grade = ceil(100 * (1 - distance / max(len(submission), len(solution))))`** (if both lengths are 0, grade **100**) → set **`graded`** with that grade → next job or **250 ms** wait when the queue is empty.

The public API still returns only **`id`**, **`title`**, and **`description`** for exercises (not **`solution_code`**).

#### Step 12 assignment zip (grader folder only)

Hand-in zip of **only** the contents of **`grader/`**, with **`app.js` at the archive root**:

```powershell
Push-Location grader
Compress-Archive -Path * -DestinationPath ..\dab-step12-grader.zip -Force
Pop-Location
```

### Client auth (UI)

- **`client/src/utils/auth.js`** — `createAuthClient()` from Better Auth (Svelte integration).
- **`client/src/states/userState.svelte.js`** — shared session state via `useUserState()` (loads once per page load).
- **`client/src/components/auth/RegistrationAndLoginForm.svelte`** — register / login form; **`client/src/components/auth/AuthBar.svelte`** — top-of-page auth strip.
- **`client/src/pages/auth/register.astro`** and **`login.astro`** — auth pages.

Every Astro page includes **`AuthBar`** (`client:visible`): authenticated users see their **email** in a paragraph; guests see **Login** and **Register** links. On **`/exercises/:id`**, the exercise title and description still load for everyone; the **editor, submit, and grading UI** appear only when logged in. Otherwise the page shows: **`Login or register to complete exercises.`**

### Observability (LGTM) and bind mounts

- **`lgtm`** service: `grafana/otel-lgtm:0.8.6`, ports **3000** (Grafana) and **4318** (OTLP HTTP). Data is persisted with a **bind mount** `./lgtm-data:/data` (see [docker-otel-lgtm: persist data](https://github.com/grafana/docker-otel-lgtm#persist-data-across-container-instantiation)).
- **`database`**: PostgreSQL data is persisted with **`./postgres-data:/var/lib/postgresql/data`**. **Redis** stays ephemeral (no data volume), as in the course materials.
- **`project.env`** includes Deno OpenTelemetry settings used by the **server** image:
  - `OTEL_DENO=true`
  - `OTEL_EXPORTER_OTLP_ENDPOINT=http://lgtm:4318`
  - `OTEL_SERVICE_NAME=deno_server`
- **Server Dockerfile** uses **Deno 2.2.3**, `DENO_FUTURE=1 deno install`, and runs with **`--unstable-otel`** so traces/logs export to the collector.
- **Traefik** sends OTLP metrics to LGTM: `--metrics.otlp=true` and `--metrics.otlp.http.endpoint=http://lgtm:4318/v1/metrics` (metrics appear in Grafana with a `traefik_` prefix).
- Smoke-test endpoint: **`GET /api/lgtm-test`** → logs `Hello log collection :)` and returns `{"message":"Hello, world!"}`. After `docker compose up`, call e.g. `curl http://localhost:8000/api/lgtm-test` a few times, then in Grafana → **Explore** → **Logs** / **Metrics** filter by service **`deno_server`** or HTTP-related metrics.

Host directories **`postgres-data/`** and **`lgtm-data/`** are listed in **`.gitignore`** (local data only).

#### Step 10 assignment zip (compose + env only)

Some course hand-ins ask for a zip that contains **only** `compose.yaml` and `project.env` at the **root** of the archive (no folders). From the project root:

```powershell
Compress-Archive -Path compose.yaml, project.env -DestinationPath dab-step10-compose-env.zip -Force
```

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
database-migrations/    # Flyway (V3 auth, V4 user_id, V5 solution_code, V6 SQL exercises)
redis/                  # Redis configuration
compose.yaml            # Services, Traefik, LGTM, bind mounts
project.env             # DB, PG*, Better Auth, OpenTelemetry (Deno)
postgres-data/          # Host bind mount for PostgreSQL (gitignored)
lgtm-data/              # Host bind mount for LGTM /data (gitignored)
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
