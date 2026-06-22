CREATE TABLE chat_sessions (
  id               TEXT PRIMARY KEY,
  site_id          TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id          TEXT,
  title            TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  last_message_at  INTEGER,
  message_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_chat_sessions_site_last ON chat_sessions(site_id, last_message_at DESC);
