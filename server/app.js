import { Hono } from "@hono/hono";
import postgres from "postgres";
import Redis from "ioredis";

const app = new Hono();

const sql = postgres({
  host: Deno.env.get("POSTGRES_HOST") || "database",
  user: Deno.env.get("POSTGRES_USER") || "username",
  pass: Deno.env.get("POSTGRES_PASSWORD") || "password",
  database: Deno.env.get("POSTGRES_DB") || "database",
  port: 5432,
});

let redis;
if (Deno.env.get("REDIS_HOST")) {
  redis = new Redis(
    Number.parseInt(Deno.env.get("REDIS_PORT")),
    Deno.env.get("REDIS_HOST"),
  );
} else {
  redis = new Redis(6379, "redis");
}

const cache = new Map();

app.get("/api/languages", async (c) => {
  if (cache.has("languages")) {
    return c.json(cache.get("languages"));
  }

  const languages = await sql`SELECT id, name FROM languages`;
  cache.set("languages", languages);
  return c.json(languages);
});

app.get("/api/languages/:id/exercises", async (c) => {
  const id = c.req.param("id");
  const cacheKey = `exercises_${id}`;

  if (cache.has(cacheKey)) {
    return c.json(cache.get(cacheKey));
  }

  const exercises = await sql`
    SELECT id, title, description
    FROM exercises
    WHERE language_id = ${id}
  `;

  cache.set(cacheKey, exercises);
  return c.json(exercises);
});

app.get("/api/exercises/:id", async (c) => {
  const id = c.req.param("id");
  const result = await sql`
    SELECT id, title, description
    FROM exercises
    WHERE id = ${id}
  `;

  if (result.length === 0) {
    return new Response(null, { status: 404 });
  }

  const row = result[0];
  return c.json({
    id: row.id,
    title: row.title,
    description: row.description,
  });
});

app.get("/api/submissions/:id/status", async (c) => {
  const id = c.req.param("id");
  const result = await sql`
    SELECT grading_status, grade
    FROM exercise_submissions
    WHERE id = ${id}
  `;

  if (result.length === 0) {
    return new Response(null, { status: 404 });
  }

  const row = result[0];
  c.header("Cache-Control", "no-store, no-cache, must-revalidate");
  c.header("Pragma", "no-cache");

  return c.json({
    grading_status: row.grading_status,
    grade: row.grade,
  });
});

app.post("/api/exercises/:id/submissions", async (c) => {
  const exerciseId = c.req.param("id");
  const body = await c.req.json();
  const sourceCode = body.source_code;

  const result = await sql`
    INSERT INTO exercise_submissions (exercise_id, source_code)
    VALUES (${exerciseId}, ${sourceCode})
    RETURNING id
  `;

  const submissionId = result[0].id;

  await redis.rpush("submissions", submissionId.toString());

  return c.json({ id: submissionId });
});

export default app;
