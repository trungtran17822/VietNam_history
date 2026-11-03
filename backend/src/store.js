// Storage for class sessions and anonymous answers.
// D1Store is used on Cloudflare; MemoryStore backs the tests and dev-server.js.
// Both expose the same methods and return plain objects in the same shape.

const ANSWER_COLUMNS =
  'client_id, choices, duration_sec, rating_interest, rating_visualize, rating_again, updated_at';

function rowToAnswer(row) {
  return {
    clientId: row.client_id,
    choices: JSON.parse(row.choices || '{}'),
    durationSec: row.duration_sec ?? null,
    ratings: {
      interest: row.rating_interest ?? null,
      visualize: row.rating_visualize ?? null,
      again: row.rating_again ?? null
    },
    updatedAt: row.updated_at
  };
}

function rowToSession(row) {
  return {
    code: row.code,
    lessonId: row.lesson_id,
    teacherKeyHash: row.teacher_key_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at
  };
}

export class D1Store {
  constructor(db) {
    this.db = db;
  }

  // Returns false when the code is already taken.
  async createSession(s) {
    const res = await this.db
      .prepare(
        'INSERT OR IGNORE INTO sessions (code, lesson_id, teacher_key_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
      )
      .bind(s.code, s.lessonId, s.teacherKeyHash, s.createdAt, s.expiresAt)
      .run();
    return res.meta.changes === 1;
  }

  async getSession(code) {
    const row = await this.db.prepare('SELECT * FROM sessions WHERE code = ?').bind(code).first();
    return row ? rowToSession(row) : null;
  }

  async countAnswers(code) {
    const row = await this.db
      .prepare('SELECT COUNT(*) AS n FROM answers WHERE session_code = ?')
      .bind(code)
      .first();
    return row ? row.n : 0;
  }

  async getAnswer(code, clientId) {
    const row = await this.db
      .prepare(`SELECT ${ANSWER_COLUMNS} FROM answers WHERE session_code = ? AND client_id = ?`)
      .bind(code, clientId)
      .first();
    return row ? rowToAnswer(row) : null;
  }

  // `answer` is the full merged record (handlers do the merge).
  async upsertAnswer(code, a) {
    await this.db
      .prepare(
        `INSERT INTO answers (session_code, ${ANSWER_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (session_code, client_id) DO UPDATE SET
           choices = excluded.choices, duration_sec = excluded.duration_sec,
           rating_interest = excluded.rating_interest, rating_visualize = excluded.rating_visualize,
           rating_again = excluded.rating_again, updated_at = excluded.updated_at`
      )
      .bind(
        code,
        a.clientId,
        JSON.stringify(a.choices),
        a.durationSec,
        a.ratings.interest,
        a.ratings.visualize,
        a.ratings.again,
        a.updatedAt
      )
      .run();
  }

  async listAnswers(code) {
    const { results } = await this.db
      .prepare(`SELECT ${ANSWER_COLUMNS} FROM answers WHERE session_code = ? ORDER BY rowid`)
      .bind(code)
      .all();
    return results.map(rowToAnswer);
  }

  async deleteSession(code) {
    await this.db.batch([
      this.db.prepare('DELETE FROM answers WHERE session_code = ?').bind(code),
      this.db.prepare('DELETE FROM sessions WHERE code = ?').bind(code)
    ]);
  }

  // Deletes sessions created before `ts` (and their answers). Returns the number removed.
  async purgeBefore(ts) {
    const [, res] = await this.db.batch([
      this.db
        .prepare('DELETE FROM answers WHERE session_code IN (SELECT code FROM sessions WHERE created_at < ?)')
        .bind(ts),
      this.db.prepare('DELETE FROM sessions WHERE created_at < ?').bind(ts)
    ]);
    return res.meta.changes;
  }
}

export class MemoryStore {
  constructor() {
    this.sessions = new Map();
    this.answers = new Map(); // code -> Map(clientId -> answer), insertion-ordered
  }

  async createSession(s) {
    if (this.sessions.has(s.code)) return false;
    this.sessions.set(s.code, { ...s });
    this.answers.set(s.code, new Map());
    return true;
  }

  async getSession(code) {
    const s = this.sessions.get(code);
    return s ? { ...s } : null;
  }

  async countAnswers(code) {
    return this.answers.get(code)?.size ?? 0;
  }

  async getAnswer(code, clientId) {
    const a = this.answers.get(code)?.get(clientId);
    return a ? structuredClone(a) : null;
  }

  async upsertAnswer(code, a) {
    this.answers.get(code).set(a.clientId, structuredClone(a));
  }

  async listAnswers(code) {
    return [...(this.answers.get(code)?.values() ?? [])].map((a) => structuredClone(a));
  }

  async deleteSession(code) {
    this.sessions.delete(code);
    this.answers.delete(code);
  }

  async purgeBefore(ts) {
    let n = 0;
    for (const [code, s] of this.sessions) {
      if (s.createdAt < ts) {
        await this.deleteSession(code);
        n += 1;
      }
    }
    return n;
  }
}
