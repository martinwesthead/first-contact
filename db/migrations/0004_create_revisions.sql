CREATE TABLE revisions (
  id              TEXT PRIMARY KEY,
  site_id         TEXT NOT NULL REFERENCES sites(id),
  definition      TEXT NOT NULL,
  published_at    INTEGER NOT NULL,
  published_by    TEXT,
  description     TEXT,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_revisions_site_id ON revisions(site_id);
CREATE INDEX idx_revisions_site_id_published_at ON revisions(site_id, published_at DESC);
