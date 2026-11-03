-- sessions.version changes on every answer insert or update, so the teacher's summary poll can
-- answer 304 Not Modified from the session row alone (one row read) instead of reading every answer.

ALTER TABLE sessions ADD COLUMN version INTEGER NOT NULL DEFAULT 0;

CREATE TRIGGER IF NOT EXISTS answers_bump_version_insert AFTER INSERT ON answers
BEGIN
  UPDATE sessions SET version = version + 1 WHERE code = NEW.session_code;
END;

CREATE TRIGGER IF NOT EXISTS answers_bump_version_update AFTER UPDATE ON answers
BEGIN
  UPDATE sessions SET version = version + 1 WHERE code = NEW.session_code;
END;
