CREATE TABLE sites (
  id                     TEXT PRIMARY KEY,
  account_id             TEXT NOT NULL REFERENCES accounts(id),
  slug                   TEXT NOT NULL UNIQUE,
  display_name           TEXT NOT NULL,
  draft_definition       TEXT NOT NULL,
  published_definition   TEXT,
  published_at           INTEGER,
  published_revision_id  TEXT,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);

CREATE INDEX idx_sites_account_id ON sites(account_id);
CREATE INDEX idx_sites_slug ON sites(slug);
