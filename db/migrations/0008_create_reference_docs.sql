CREATE TABLE reference_docs (
  slug         TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT NOT NULL,
  toc_json     TEXT NOT NULL,
  body         TEXT NOT NULL,
  kind         TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE INDEX idx_reference_docs_kind ON reference_docs(kind);

CREATE VIRTUAL TABLE reference_docs_fts USING fts5(
  title,
  summary,
  body,
  slug UNINDEXED,
  content='reference_docs',
  content_rowid='rowid'
);

CREATE TRIGGER reference_docs_ai AFTER INSERT ON reference_docs BEGIN
  INSERT INTO reference_docs_fts(rowid, title, summary, body, slug)
  VALUES (new.rowid, new.title, new.summary, new.body, new.slug);
END;

CREATE TRIGGER reference_docs_ad AFTER DELETE ON reference_docs BEGIN
  INSERT INTO reference_docs_fts(reference_docs_fts, rowid, title, summary, body, slug)
  VALUES ('delete', old.rowid, old.title, old.summary, old.body, old.slug);
END;

CREATE TRIGGER reference_docs_au AFTER UPDATE ON reference_docs BEGIN
  INSERT INTO reference_docs_fts(reference_docs_fts, rowid, title, summary, body, slug)
  VALUES ('delete', old.rowid, old.title, old.summary, old.body, old.slug);
  INSERT INTO reference_docs_fts(rowid, title, summary, body, slug)
  VALUES (new.rowid, new.title, new.summary, new.body, new.slug);
END;
