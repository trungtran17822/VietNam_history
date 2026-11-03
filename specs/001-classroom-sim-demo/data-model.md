# Data model: 001-classroom-sim-demo

Two stores. **Browser** (unchanged): lessons, progress and the per-device class state.
**Server (D1)**: class sessions and anonymous answers only. Lesson content never goes to the server.

## Browser (localStorage)

| Key | Shape | Notes |
|---|---|---|
| `history_sim_lessons_db_v2` | `Lesson[]` | Existing; see `docs/spec/SPEC.md` §9.1 |
| `history_sim_student_runs` | `{ [lessonId]: run }` | Existing; last run per lesson |
| `sv_class_teacher_<lessonId>` | `{ code, teacherKey, expiresAt }` | NEW. Teacher device only. Removed on delete or expiry |
| `sv_class_student` | `{ code, lessonId, clientId, joinedAt, expiresAt }` | NEW. Student device only. One joined session at a time |

`clientId` is `crypto.randomUUID()` created at join time; joining another code creates a new one.

## Server (D1)

### ClassSession (`sessions`)

| Field | Type | Rule |
|---|---|---|
| `code` | TEXT PK | 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` |
| `lesson_id` | TEXT NOT NULL | `^[a-z0-9-]{1,64}$` |
| `teacher_key_hash` | TEXT NOT NULL | hex SHA-256 of the 32-hex-char teacher key |
| `created_at` | INTEGER NOT NULL | epoch ms |
| `expires_at` | INTEGER NOT NULL | `created_at + 12 h`; answers refused after it |

### AnonymousAnswer (`answers`)

| Field | Type | Rule |
|---|---|---|
| `session_code` | TEXT NOT NULL | FK → `sessions.code` |
| `client_id` | TEXT NOT NULL | `^[A-Za-z0-9-]{8,64}$`; PK with `session_code` |
| `choices` | TEXT NOT NULL | JSON object, ≤10 entries, keys and values `^[A-Za-z0-9_-]{1,64}$` |
| `duration_sec` | INTEGER NULL | 0-7200 (larger values are capped to 7200) |
| `rating_interest` | INTEGER NULL | 1-5 |
| `rating_visualize` | INTEGER NULL | 1-5 |
| `rating_again` | INTEGER NULL | 1-5 |
| `updated_at` | INTEGER NOT NULL | epoch ms |

No column holds a name, email, IP, user agent or free text (FR-018).

### Rules and state

```
ClassSession:  open ──(now ≥ expires_at)──▶ closed ──(created_at + 180 d, cron)──▶ deleted
                 └──────────────(teacher DELETE)──────────────────────────────────▶ deleted
AnonymousAnswer: upsert while session open; a later PUT merges only the fields it sends
                 (choices / duration_sec / ratings); count per session ≤ 60.
```

- Distribution = for each variable id, count of answers per option id (computed from ≤60 rows).
- Ratings summary = per rating, number of answers and mean (1 decimal).
- Deleting a session deletes its answers in the same batch.
