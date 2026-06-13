CREATE TABLE leads (
  id              TEXT PRIMARY KEY,
  site_id         TEXT NOT NULL,
  form_id         TEXT NOT NULL,
  created_at      INTEGER NOT NULL,
  name            TEXT,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT,
  extra_fields    TEXT,
  page_path       TEXT,
  user_agent      TEXT,
  ip_country      TEXT,
  turnstile_pass  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new',
  notes           TEXT
);

CREATE INDEX leads_site_created ON leads (site_id, created_at DESC);
CREATE INDEX leads_status ON leads (site_id, status);
