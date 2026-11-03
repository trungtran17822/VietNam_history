# Research and decisions: 001-classroom-sim-demo

Format per decision: Decision, Rationale, Alternatives considered.

## R1. Where class data lives

- **Decision**: Cloudflare Workers + D1 (SQLite) in `backend/`.
- **Rationale**: The user asked for Vercel and Cloudflare with separate frontend and backend folders. Workers and D1 are free at demo scale (100k requests/day, 5 GB), run close to Vietnamese users (Cloudflare has PoPs in Hanoi and Ho Chi Minh City), need no server management, and D1's SQL makes the per-variable count and the CSV export a few lines.
- **Alternatives**: Vercel Functions + a hosted Postgres (second vendor for data, more setup); Workers KV (no queries, eventual consistency makes "count within 5 s" unreliable); Durable Objects with websockets (real-time, but more moving parts than a 4-second poll needs); Firebase (third vendor, client SDK weight on weak devices).

## R2. Real-time updates

- **Decision**: Teacher panel polls `GET /summary` every 4 s while visible; stops when the stage changes or the tab is hidden.
- **Rationale**: SC-003 needs ≤5 s. 60 students × at most a few writes plus one teacher polling is ~15 reads/min, trivial. Polling survives school proxies that break websockets.
- **Alternatives**: WebSockets/Durable Objects, Server-Sent Events (both need long-lived connections; overkill).

## R3. Identity without accounts

- **Decision**: Teacher gets a random 128-bit `teacherKey` at session creation; the server stores only its SHA-256. Students get a random `clientId` (UUID v4) generated per joined session in the browser.
- **Rationale**: PRD excludes accounts; minors' data must be anonymous. A bearer secret held by the projecting device is enough for a 12-hour classroom session. A new `clientId` per session prevents linking a student across lessons.
- **Alternatives**: Reusing the demo login (it is client-side only, protects nothing); signed JWTs (no benefit over an opaque key for one resource).

## R4. Join code format

- **Decision**: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (31 symbols, ≈8.9×10⁸ codes), generated with `crypto.getRandomValues`; primary key in D1; retry up to 5 times on collision.
- **Rationale**: Readable from the back of a classroom; no 0/O, 1/I/L confusion. Guessing a code only lets someone *add* an answer to a session that caps at 60 and expires in 12 h; reading needs the teacher key.
- **Alternatives**: 4 digits (too guessable), QR code (nice later; needs a library or a generator).

## R5. Frontend ↔ backend wiring

- **Decision**: `frontend/js/config.js` sets `window.APP_CONFIG.apiBase`: `http://localhost:8787` on localhost, the Worker URL in deployed builds (empty string = class features off, with a plain notice). The Worker answers CORS only for origins listed in `ALLOWED_ORIGINS`.
- **Rationale**: No build step means no env injection; one config file is the smallest switch. Direct CORS keeps Vercel a pure static host.
- **Alternatives**: Vercel rewrite `/api/*` → Worker (needs the Worker URL baked into `vercel.json`, and double hop); build-time env injection (introduces a build).

## R6. Testing without Cloudflare credentials

- **Decision**: Handlers are pure functions over a `store` with 8 methods. `MemoryStore` backs unit tests and `backend/dev-server.js` (Node `http`), which Playwright starts alongside a static server for the frontend.
- **Rationale**: CI and contributors can run every test with no Cloudflare login. The D1 store is thin SQL, covered by the migration and a smoke test after deploy (`/api/health`, create + read session).
- **Alternatives**: Miniflare/`wrangler dev` in CI (download + version coupling); mocking D1 per test.

## R7. Playwright version

- **Decision**: `@playwright/test` 1.49.1 (Chromium build 1148), Chromium only, plus a mobile viewport project (Pixel 5 emulation in Chromium).
- **Rationale**: Matches the browser already cached on the dev machine; works on Node 18. School devices are mostly Chromium-based (Chrome, Edge, Cốc Cốc).
- **Alternatives**: All three engines (3× CI time for little demo value).

## R8. Data retention and privacy controls

- **Decision**: Workers cron (daily 03:00 UTC) deletes sessions older than 180 days with their answers; `DELETE /sessions/:code` for manual deletion. `observability.enabled = false` in `wrangler.toml` so request logs (which include IPs) are not retained by the Worker.
- **Rationale**: FR-016, FR-018; minimal code.
- **Alternatives**: Manual purge only (relies on a person remembering).

## R9. Deployment

- **Decision**: GitHub Actions: `check` (static + unit + E2E) on every push; on `Staging`/`main`, deploy frontend to Vercel (Preview/Production) and backend to Cloudflare (`wrangler deploy --env staging|production` with separate D1 databases). Each deploy job is skipped with a clear notice when its secrets are missing instead of failing the pipeline.
- **Rationale**: Keeps the existing branch flow; secrets belong to the repo owner (Trung), so the pipeline must not go red for a settings problem.
- **Alternatives**: Vercel Git integration (would deploy twice alongside Actions); Cloudflare Pages for the frontend too (the user asked for Vercel).

## R10. Asset weight (optimisation found while syncing Trung's UI)

- **Decision**: Replace the 821 KB `logo-transparent.png` used in 3 places by a resized PNG (≤ 256 px, ≈30-60 KB); drop the unused 1.8 MB `logo.png` from the published folder (kept in `docs/brand/`).
- **Rationale**: SC-007 (3 s first screen on a school connection); the logo is shown at ≤ 64 px.
- **Alternatives**: WebP only (fine, but PNG keeps transparency everywhere without fallbacks).
