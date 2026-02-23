-- Allowlisted students table (schema only — seed data is in seed_roster.sql, gitignored)
CREATE TABLE IF NOT EXISTS allowed_students (
  roll_number TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

-- Existing admin user must have emailVerified=1 so requireEmailVerification doesn't lock them out
UPDATE "user" SET "emailVerified" = 1 WHERE email = 'achyuthanugraha@gmail.com';
