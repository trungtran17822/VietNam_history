-- Class sessions and anonymous answers (spec 001, data-model.md).
-- No column may hold a name, email, IP address, user agent or free text.

CREATE TABLE IF NOT EXISTS sessions (
  code             TEXT PRIMARY KEY,
  lesson_id        TEXT NOT NULL,
  teacher_key_hash TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at);

CREATE TABLE IF NOT EXISTS answers (
  session_code     TEXT NOT NULL REFERENCES sessions (code) ON DELETE CASCADE,
  client_id        TEXT NOT NULL,
  choices          TEXT NOT NULL DEFAULT '{}',
  duration_sec     INTEGER,
  rating_interest  INTEGER,
  rating_visualize INTEGER,
  rating_again     INTEGER,
  updated_at       INTEGER NOT NULL,
  PRIMARY KEY (session_code, client_id)
);
