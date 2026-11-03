# HTTP contract: class session API (`backend/`)

Base URL: `APP_CONFIG.apiBase` (e.g. `https://sv-class-api.<account>.workers.dev`). All paths start
with `/api`. JSON in and out (`Content-Type: application/json; charset=utf-8`) except the CSV export.

Common rules

- Request body ≤ 4096 bytes, else `413`.
- Errors: `{ "error": "<code>", "message": "<Vietnamese text for the UI>" }`.
- Teacher-only endpoints need header `X-Teacher-Key: <32 hex>`; wrong or missing → `403 forbidden`.
- CORS: `Access-Control-Allow-Origin` echoes the request origin only if it is in `ALLOWED_ORIGINS`
  (comma-separated; `*` allowed in dev). Preflight `OPTIONS` → `204`.
- `Cache-Control: no-store` on every response.
- CORS allows request headers `Content-Type, X-Teacher-Key, If-None-Match` and exposes
  `Content-Disposition, ETag`.

| Error code | HTTP | Message |
|---|---|---|
| `bad_request` | 400 | Dữ liệu gửi lên không hợp lệ. |
| `forbidden` | 403 | Không có quyền xem phiên này. |
| `not_found` | 404 | Mã phiên không đúng hoặc đã hết hạn. |
| `closed` | 410 | Mã phiên không đúng hoặc đã hết hạn. |
| `full` | 409 | Phiên đã đủ số lượng. |
| `too_large` | 413 | Dữ liệu gửi lên quá lớn. |
| `server_error` | 500 | Máy chủ lớp học đang gặp sự cố. |

## GET /api/health

`200 { "ok": true }`

## POST /api/sessions — open a class session (teacher)

Body `{ "lessonId": "ngoc-hoi-ha-hoi-1789" }`

`201 { "code": "K7M2QX", "teacherKey": "9f…(32 hex)", "lessonId": "…", "expiresAt": 1762200000000 }`

## GET /api/sessions/:code — check a code before joining (anyone)

`200 { "code": "K7M2QX", "lessonId": "…", "expiresAt": 1762…, "open": true }`; `404` if unknown.
Never returns answers or counts.

## PUT /api/sessions/:code/answers/:clientId — submit or update an anonymous answer

Body (every field optional, at least one required):

```json
{ "choices": { "direction": "frontal_allout", "timing": "dawn_tet5" },
  "durationSec": 412,
  "ratings": { "interest": 5, "visualize": 4, "again": 5 } }
```

`200 { "ok": true }`. Merges with the existing answer for the same `clientId`.
`404/410` if the session is unknown/expired; `409 full` if this is a new `clientId` and 60 answers exist.
The cap is checked in the same statement as the insert, so a burst of new devices never exceeds it.

## GET /api/sessions/:code/summary — class distribution (teacher)

```json
{ "code": "K7M2QX", "lessonId": "…", "expiresAt": 1762…, "open": true,
  "count": 23,
  "distribution": { "direction": { "flanking_multidirectional": 12, "frontal_allout": 8, "siege_starvation": 3 } },
  "ratings": { "interest": { "n": 10, "avg": 4.3 }, "visualize": { "n": 9, "avg": 3.9 }, "again": { "n": 10, "avg": 4.6 } },
  "updatedAt": 1762… }
```

Response header `ETag: "v<version>-<open 1|0>"`. A request with a matching `If-None-Match` gets
`304` with no body (the teacher key is still required). The version changes on every answer write,
so a 304 means nothing changed; the client keeps showing its last summary.

## GET /api/sessions/:code/export.csv — anonymous trial data (teacher)

`200 text/csv; charset=utf-8`, UTF-8 BOM, `Content-Disposition: attachment; filename="phien-K7M2QX.csv"`.
Columns: `session_code, lesson_id, anonymous_id, <one column per variable id, sorted>, duration_sec,
rating_interest, rating_visualize, rating_again, updated_at_iso`. `anonymous_id` is `A01, A02…` in
first-seen order (the stored `clientId` is not exported). Cells are CSV-escaped; a cell starting with
`= + - @` is prefixed with `'` (spreadsheet formula injection).

## DELETE /api/sessions/:code — delete session and answers (teacher)

`204`.

## Scheduled (cron `0 3 * * *`)

Deletes sessions with `created_at < now − 180 days` and their answers.
