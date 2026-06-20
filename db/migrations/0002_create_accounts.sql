CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  plan_tier     TEXT NOT NULL DEFAULT 'trial',
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);
