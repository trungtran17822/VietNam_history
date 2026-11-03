# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vietnamese-language classroom app that simulates a history lesson (Trận Ngọc Hồi - Hạ Hồi, 1789) on an interactive 2.5D "silk painting" tabletop map. All UI text and lesson content are in Vietnamese. It is a prototype: content is marked "Nội dung minh họa, chưa được chuyên gia duyệt" (illustrative content, not expert-reviewed) in a header strip and a footer, and the comparison screen carries a mandatory simulation notice. All of that labeling must be preserved. A small optional backend adds class sessions (teacher sees the class's choices; anonymous trial data); the lesson itself never depends on it.

## Repository layout

- `frontend/` - the static web app, deployed to Vercel: `index.html`, `js/`, `css/`, `fonts/`, `assets/`, `vendor/` (three.js, OrbitControls), `data/`.
- `backend/` - class session API: Cloudflare Worker + D1 (`src/`, `migrations/`, `wrangler.toml`), a Node dev server, and its unit tests. See `backend/README.md`.
- `specs/001-classroom-sim-demo/` - Spec Kit feature spec: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/api.md`, `tasks.md`, `reviews.md`. `.specify/` holds Spec Kit templates and the constitution (`.specify/memory/constitution.md`).
- `docs/` - `prd/` (PRD and 12-week plan, .docx), `spec/` (`SPEC.md` / `SPEC.vi.md`: requirements, status, as-built contract), `srs/SRS.md` (Vietnamese SRS), `architecture/SYSTEM_DESIGN.md`, `design/UI_REVIEW.md`, `devops/DEPLOY.md` (Vercel + Cloudflare runbook), `research/`, `brand/` (original logo files), `sources/` (textbook PDF).
- `tests/` - `unit/` (frontend modules in a `vm` sandbox) and `e2e/` (Playwright). Backend unit tests live in `backend/test/`.
- `.claude/` - `settings.json`, `rules/` (content labeling, scene rendering, JS modules), `commands/` (`/serve`, `/check`), `skills/` (devops, `speckit-*`).
- `scripts/check.sh` - static checks, run by `/check` and by CI.
- `.github/workflows/ci-cd.yml` + `vercel.json` - CI on every push (check, unit, E2E), then from `Staging` (preview/staging) and `main` (production): frontend → Vercel, backend → Cloudflare. Branches: `<name>/feature/<topic>` → `Staging` → `main`.

## Running

The frontend has no build step: plain HTML/CSS/JS with three.js and `OrbitControls.js` vendored in `frontend/vendor/`. The backend has no runtime dependencies. The root `package.json` only holds dev tooling (Playwright).

```bash
npm run dev:frontend   # python3 -m http.server 8080 --directory frontend → http://localhost:8080
npm run dev:backend    # node backend/dev-server.js 8787 (in-memory store; optional)
```

On `localhost` the frontend calls the API at `http://localhost:8787` (`frontend/js/config.js`); deployed, it uses `DEPLOYED_API_BASE` in the same file (empty = class features off).

Verify changes:

```bash
npm run check       # scripts/check.sh: node --check on frontend + backend JS, JSON validity, index.html refs, every js/*.js loaded
npm run test:unit   # node:test: engine determinism (81 combos), grading-word scan, visibility rule, backend API
npm run test:e2e    # Playwright, desktop 1280×720 + phone 360×800; starts both servers itself (reuses running ones locally)
npm test            # all three
```

First E2E run: `npm ci && npx playwright install chromium`. The E2E class-session test is slow (three browsers rendering WebGL in software).

Opening `index.html` via `file://` mostly works but a local server is recommended. `#/fonttest` is a built-in route for checking Vietnamese glyph rendering.

Demo login (hard-coded in `js/auth.js`): username `admin`, password `123`, for both the teacher and student roles.

## Architecture

Paths in this section are relative to `frontend/`. Scripts are loaded as classic `<script>` tags in `index.html` (order matters) and communicate through `window` globals, not ES modules: vendored `three.min.js` → `text.js` → vendored `OrbitControls.js` → `auth.js` → `audio.js` → `lesson-data.js` → `storage.js` → `engine.js` → `scene-map.js` → `config.js` → `class-session.js` → `class-panel.js` → `app.js`.

- `js/app.js` (~2500 lines) is the controller: DOM caching (`elements`), a hash router (`handleRoute`, routes like `#/teacher`, `#/student`, `#/lesson/<id>`, `#/lesson/<id>/edit`, `#/lesson/<id>/preview`, `#/lesson/<id>/interactive` for the 6-stage loop, both roles), the teacher dashboard and lesson editor (with undo/redo), the student dashboard and viewer, and the 6-stage classroom loop (`launch6StagesLoop` / `goTo6StageScreen`). All views live in the one large `index.html` and are toggled by `showView`.
- `js/lesson-data.js` defines `SEED_LESSONS`, the full lesson schema: sections, questions, key notes, private teacher notes, simulation variables and coefficients, props, camera keyframes, and status.
- `js/storage.js` (`window.LessonStorage`) persists lessons in `localStorage` (seeded from `SEED_LESSONS` when empty) and supports JSON import/export. It enforces the visibility rule that students only see lessons with `status === 'Đã dạy'` and `date <= today`.
- `js/engine.js` (`window.SimulationEngine.calculate`) is a deterministic, rule-based calculator. It adds the coefficient deltas declared in the lesson's `question.variables` to the `baseline` (duration, casualties, position score), so the same choices always give the same result. Keep it transparent and data-driven: tweak coefficients in lesson data, not in engine code.
- `js/scene-map.js` is the active renderer. It defines the Three.js silk-map scene (class `SilkMapScene`) and exposes it as `window.BattleScene3D`. It reads its palette from CSS variables in `css/theme.css`, uses canvas-drawn sprites with `InstancedMesh`, offers four camera presets, and lets PNGs in `assets/sprites/` override the procedural sprites (see `assets/sprites/README.md`). Terrain labels are HTML overlays, never text in canvas or geometry. `app.js` creates one instance per surface (editor preview, lesson workspace, student viewer, and the original/custom stages of the 6-stage loop) and drives it through `updateTimeline`, `setCameraPreset`, `updatePropsVisibility`/`applyPropConfig`, `updateFactionColors`, `updateUnitCounts`, `setQuality`, and `destroy`. Call `destroy()` when a view is torn down so renderers don't pile up.
- `js/text.js` patches `textContent` and `innerHTML` setters to NFC-normalize Vietnamese strings. Keep it loaded first so that composed and decomposed diacritics never mix.
- `js/audio.js` is procedural Web Audio battle sound (`window.BattleAudio`). `js/auth.js` is a client-side demo login using `sessionStorage`.
- `js/config.js` (`window.APP_CONFIG`), `js/class-session.js` (`window.ClassSession`, the API client; teacher key and student id kept in `localStorage`) and `js/class-panel.js` (`window.ClassPanel`, the stage 3 teacher panel / student join card and the stage 6 survey). Every API failure maps to a Vietnamese message and never blocks the lesson.
- `backend/src/handlers.js` exports `handle(request, ctx)`, which runs unchanged on Workers (`src/index.js`, `D1Store`) and Node (`dev-server.js`, `MemoryStore`). Contract: `specs/001-classroom-sim-demo/contracts/api.md`.
- CSS: `theme.css` (design tokens and the scene palette), `fonts.css` (local Noto Sans/Serif woff2 in `fonts/`), `style.css` (main), `editorial.css`, `redesign.css` (Trung's redesign), `classroom.css` (stepper, stage 3, class panel, survey, accessibility floor; loaded last).

## Gotchas

- `js/scene3d.js` is a legacy low-poly renderer and is not referenced from `index.html`. Edit `scene-map.js` for scene changes.
- `data/lesson.root-copy.json` (formerly the root `lesson.json`) and `data/sources.json` are not loaded by any script. The running app takes its lesson data from `js/lesson-data.js` and `localStorage`. `sources.json` has 4 entries (the Lịch sử và Địa lí 9 textbook, the 2013 Constitution, the Ngọc Lũ drum, a flag-usage guideline) and none supports the Ngọc Hồi lesson; that lesson cites its sources inline in each section's `source {book, chapter, quote, note}`.
- `LessonStorage.init()` only seeds when the key is absent, so edits to `SEED_LESSONS` don't show up in a browser that already has data. Clear `history_sim_lessons_db_v2` in the browser or bump `STORAGE_KEY_LESSONS` in `storage.js` to see seed changes.
- `frontend/README.md` describes the 6-stage classroom flow in detail; its "Kiến trúc" section covers the teacher editor, auth, and storage layers.
- Only the Ngọc Hồi lesson is complete (4 chapters, 4 variables); the other three seed lessons have no simulation variables, so the question, simulation and comparison stages have nothing to run for them. All numbers (baseline 36 h / 1,800 casualties / score 95 and every delta) are illustrative placeholders.
- `docs/` and `specs/` are reference material, not code. `docs/spec/SPEC.md` is the checked record of what is built versus required; update it, `SPEC.vi.md` and (for requirement changes) `docs/srs/SRS.md` when behavior changes.
- Deploy jobs need repo secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) and real D1 `database_id`s in `backend/wrangler.toml`. Missing ones make the job skip with a notice, not fail. Setup: `docs/devops/DEPLOY.md`.
- Class sessions store no names or IPs (Worker logs are off). Keep it that way: no identity fields in `backend/` or in the CSV.
- The post-login animation (`#cinematic-transition`) delays the dashboard by 2 s; E2E `login()` clicks "Bỏ qua" and waits for the route.
- `README.md` at the root is a short index; details are in `frontend/README.md` and `backend/README.md`.
