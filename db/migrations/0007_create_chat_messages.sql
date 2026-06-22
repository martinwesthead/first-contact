CREATE TABLE chat_messages (
  id               TEXT PRIMARY KEY,
  session_id       TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  ord              INTEGER NOT NULL,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  tool_calls_json  TEXT,
  ts               INTEGER NOT NULL,
  UNIQUE(session_id, ord)
);

CREATE INDEX idx_chat_messages_session_ord ON chat_messages(session_id, ord);

CREATE VIRTUAL TABLE chat_messages_fts USING fts5(
  content,
  session_id UNINDEXED,
  ord UNINDEXED,
  content='chat_messages',
  content_rowid='rowid'
);

CREATE TRIGGER chat_messages_ai AFTER INSERT ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(rowid, content, session_id, ord)
  VALUES (new.rowid, new.content, new.session_id, new.ord);
END;

CREATE TRIGGER chat_messages_ad AFTER DELETE ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content, session_id, ord)
  VALUES ('delete', old.rowid, old.content, old.session_id, old.ord);
END;

CREATE TRIGGER chat_messages_au AFTER UPDATE ON chat_messages BEGIN
  INSERT INTO chat_messages_fts(chat_messages_fts, rowid, content, session_id, ord)
  VALUES ('delete', old.rowid, old.content, old.session_id, old.ord);
  INSERT INTO chat_messages_fts(rowid, content, session_id, ord)
  VALUES (new.rowid, new.content, new.session_id, new.ord);
END;
