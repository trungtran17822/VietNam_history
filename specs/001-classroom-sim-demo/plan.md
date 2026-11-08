# Implementation Plan: Classroom simulation demo with class session

**Branch**: `Dat/feature/core` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-classroom-sim-demo/spec.md`

## Summary

Keep the working prototype (F1-F8) and turn it into the `frontend/` app: static HTML/CSS/JS with
vendored three.js, now carrying Trung's "Sử Việt" redesign. Add a thin `backend/`: one Cloudflare
Worker with a D1 (SQLite) database that stores class sessions and anonymous answers, so a teacher
can see the class's choice distribution (F10) and export anonymous trial data (F11). The frontend
talks to it through one small module (`js/class-session.js`) and keeps working without it.
System-level design (context, components, sequences, deployment, trade-offs) is in
[docs/architecture/SYSTEM_DESIGN.md](../../docs/architecture/SYSTEM_DESIGN.md).

## Technical Context

**Language/Version**: JavaScript (ES2020) in the browser, classic scripts; JavaScript ES modules on Cloudflare Workers (V8). Node 18+ for tooling and tests.

**Primary Dependencies**: three.js (vendored `three.min.js`) + OrbitControls (vendored, unchanged). Backend: none at runtime (Workers platform APIs only). Dev: `wrangler` (deploy, via `npx`), `@playwright/test` (E2E).

**Storage**: Browser `localStorage` for lessons and per-device state (unchanged). Cloudflare D1 for sessions and answers.

**Testing**: `node:test` unit tests (engine, grading-word scan, backend handlers against an in-memory store); Playwright E2E (6-stage loop, class session across 3 browser contexts, offline mode, mobile layout); `scripts/check.sh` static checks.

**Target Platform**: Evergreen browsers on school PCs, projectors (1280×720) and phones (≥360 px). Cloudflare Workers.

**Project Type**: Web application, frontend + backend.

**Performance Goals**: first usable screen ≤3 s on a school connection (SC-007); teacher sees a new answer ≤5 s (poll every 4 s); API p95 well under 300 ms (single-row D1 writes, ≤60-row reads).

**Constraints**: offline-first lesson (FR-019); no personal data (FR-018); request body ≤4 KB; ≤60 answers per session; free tiers (Vercel Hobby, Workers Free: 100k requests/day, D1 Free: 5 GB).

**Scale/Scope**: demo trial of 1-2 classes (≈90 students). Worst case 60 devices polling/answering: teacher polls 15 req/min; answers ≈2 writes per student per run.

## Constitution Check

*GATE: checked before Phase 0 and again after Phase 1.*

| Principle | Check | Status |
|---|---|---|
| I. Labelled, sourced content | No change to labels; comparison notice stays the stage's first element; E2E asserts both labels on every stage | Pass |
| II. Deterministic engine | Engine untouched; unit test runs all 81 combinations twice | Pass |
| III. Encourage, never grade | Grading-word scan over all explanation/outcome texts (SC-008) | Pass |
| IV. Privacy for minors | Random device id per session, no IP/user-agent stored, request logging off, teacher key hashed | Pass |
| V. Offline-first, thin backend | Backend only for F10/F11; frontend shows a plain notice when unreachable or unconfigured | Pass |
| VI. Simplicity | No framework, no build step, no ORM, no websockets, no auth system. One justified abstraction (store interface), see Complexity Tracking | Pass |
| VII. Vietnamese first | All new UI strings Vietnamese; nothing drawn into canvas | Pass |

Re-check after Phase 1 design: still passes; the API in [contracts/api.md](contracts/api.md) holds no identity fields.

## Project Structure

### Documentation (this feature)

```text
specs/001-classroom-sim-demo/
├── spec.md, reviews.md, checklists/requirements.md
├── plan.md              # this file
├── research.md          # Phase 0 decisions
├── data-model.md        # Phase 1 entities, schema, state
├── contracts/api.md     # Phase 1 HTTP contract
├── quickstart.md        # Phase 1 run/validate guide
└── tasks.md             # Phase 2 task list
```

### Source Code (repository root)

```text
frontend/                      # was prototype/; deployed as-is to Vercel (no build)
├── index.html                 # all views; loads scripts in order
├── css/                       # theme → fonts → style → editorial → redesign (Trung) → classroom (new)
├── js/
│   ├── config.js              # NEW window.APP_CONFIG.apiBase (per environment)
│   ├── class-session.js       # NEW window.ClassSession: API client + per-device session state
│   ├── app.js                 # controller; wires the class panel and survey into stages 3 and 6
│   └── engine.js, storage.js, scene-map.js, lesson-data.js, auth.js, audio.js, text.js
├── assets/ fonts/ vendor/ data/
backend/
├── src/
│   ├── index.js               # Worker entry: fetch router + scheduled purge
│   ├── handlers.js            # request validation and endpoint logic (pure, store-injected)
│   └── store.js               # D1Store + MemoryStore (same methods)
├── migrations/0001_init.sql
├── dev-server.js              # Node http adapter + MemoryStore, for local dev and E2E
├── test/handlers.test.js
├── wrangler.toml
└── package.json               # scripts only, no runtime deps
tests/
├── unit/engine.test.js        # frontend modules loaded in a vm sandbox
└── e2e/*.spec.js              # Playwright
playwright.config.js, package.json (root: dev deps + scripts)
```

**Structure Decision**: Web application split into `frontend/` and `backend/` as the user asked.
`prototype/` is renamed to `frontend/` (git mv, history kept). Tests live outside `frontend/` so
they are not published by Vercel.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Store interface with two implementations (D1, memory) | Lets handler tests and Playwright E2E run with no Cloudflare account or network | Mocking D1 SQL per test is more code and tests SQL strings, not behaviour; requiring `wrangler dev` in CI needs Cloudflare login |
| `backend/dev-server.js` (Node adapter) | Same reason: E2E and local dev without Cloudflare credentials | `wrangler dev` works locally but needs a download and a login; kept as an option in quickstart |
