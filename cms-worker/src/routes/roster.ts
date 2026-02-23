import { Hono } from "hono";
import type { Env } from "../types";

const roster = new Hono<{ Bindings: Env }>();

// POST /lookup — roll number suffix → { name, email }
roster.post("/lookup", async (c) => {
  const { suffix } = await c.req.json<{ suffix: string }>();

  if (!suffix || !/^\d{3}$/.test(suffix)) {
    return c.json({ error: "Suffix must be exactly 3 digits" }, 400);
  }

  const rollNumber = "240957" + suffix;

  const student = await c.env.DB.prepare(
    "SELECT name, email FROM allowed_students WHERE roll_number = ?"
  )
    .bind(rollNumber)
    .first<{ name: string; email: string }>();

  if (!student) {
    return c.json({ error: "Roll number not found" }, 404);
  }

  // Check if already registered
  const existing = await c.env.DB.prepare(
    'SELECT 1 FROM "user" WHERE email = ?'
  )
    .bind(student.email)
    .first();

  if (existing) {
    return c.json({ error: "Already registered" }, 409);
  }

  return c.json({ name: student.name, email: student.email });
});

export default roster;
