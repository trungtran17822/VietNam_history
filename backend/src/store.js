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
    expiresAt: row.expires_at,
    version: row.version ?? 0
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

  // Inserts or merges one device's answer in a single statement, so the MAX_ANSWERS cap holds
  // under concurrent submits. `patch` holds only the fields being changed (handlers validate it).
  // Returns false when this is a new device and the session already has `max` answers.
  // Triggers in migrations/0002 bump sessions.version on every insert or update.
  async saveAnswer(code, clientId, patch, updatedAt, max) {
    const r = patch.ratings || {};
    const res = await this.db
      .prepare(
        `INSERT INTO answers (session_code, ${ANSWER_COLUMNS})
         SELECT ?1, ?2, COALESCE(?3, '{}'), ?4, ?5, ?6, ?7, ?8
         WHERE EXISTS (SELECT 1 FROM answers WHERE session_code = ?1 AND client_id = ?2)
            OR (SELECT COUNT(*) FROM answers WHERE session_code = ?1) < ?9
         ON CONFLICT (session_code, client_id) DO UPDATE SET
           choices = COALESCE(?3, choices),
           duration_sec = COALESCE(?4, duration_sec),
           rating_interest = CASE WHEN ?10 THEN ?5 ELSE rating_interest END,
           rating_visualize = CASE WHEN ?11 THEN ?6 ELSE rating_visualize END,
           rating_again = CASE WHEN ?12 THEN ?7 ELSE rating_again END,
           updated_at = ?8`
      )
      .bind(
        code,
        clientId,
        patch.choices ? JSON.stringify(patch.choices) : null,
        patch.durationSec ?? null,
        r.interest ?? null,
        r.visualize ?? null,
        r.again ?? null,
        updatedAt,
        max,
        'interest' in r ? 1 : 0,
        'visualize' in r ? 1 : 0,
        'again' in r ? 1 : 0
      )
      .run();
    return res.meta.changes > 0;
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
    this.sessions.set(s.code, { ...s, version: 0 });
    this.answers.set(s.code, new Map());
    return true;
  }

  async getSession(code) {
    const s = this.sessions.get(code);
    return s ? { ...s } : null;
  }

  async saveAnswer(code, clientId, patch, updatedAt, max) {
    const answers = this.answers.get(code);
    const base = answers.get(clientId);
    if (!base && answers.size >= max) return false;
    const prev = base || { choices: {}, durationSec: null, ratings: { interest: null, visualize: null, again: null } };
    answers.set(clientId, {
      clientId,
      choices: structuredClone(patch.choices ?? prev.choices),
      durationSec: patch.durationSec ?? prev.durationSec,
      ratings: { ...prev.ratings, ...(patch.ratings || {}) },
      updatedAt
    });
    this.sessions.get(code).version += 1;
    return true;
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
