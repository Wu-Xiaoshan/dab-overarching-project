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

let consume_enabled = false;
let is_consuming = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processQueue = async () => {
  if (is_consuming) return;
  is_consuming = true;

  while (consume_enabled) {
    const submissionId = await redis.lpop("submissions");

    if (!submissionId) {
      await sleep(250);
    } else {
      await sql`
        UPDATE exercise_submissions
        SET grading_status = 'processing'
        WHERE id = ${submissionId}
      `;

      const delay = Math.floor(Math.random() * 2000) + 1000;
      await sleep(delay);

      const grade = Math.floor(Math.random() * 101);
      await sql`
        UPDATE exercise_submissions
        SET grading_status = 'graded', grade = ${grade}
        WHERE id = ${submissionId}
      `;
    }
  }

  is_consuming = false;
};

app.get("/api/status", async (c) => {
  const queue_size = await redis.llen("submissions");
  return c.json({ queue_size, consume_enabled });
});

app.post("/api/consume/enable", async (c) => {
  consume_enabled = true;
  processQueue();
  return c.json({ consume_enabled });
});

app.post("/api/consume/disable", async (c) => {
  consume_enabled = false;
  return c.json({ consume_enabled });
});

export default app;
