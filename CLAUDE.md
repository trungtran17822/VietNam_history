# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vietnamese-language, single-page classroom app that simulates a history lesson (Trận Ngọc Hồi - Hạ Hồi, 1789) on an interactive 2.5D "silk painting" tabletop map. All UI text and lesson content are in Vietnamese. It is a prototype: content is marked "Dữ liệu minh họa, chưa được chuyên gia duyệt" (illustrative data, not expert-reviewed) and that labeling must be preserved.

## Repository layout

- `prototype/` - the runnable app (everything below lives here unless stated otherwise): `index.html`, `js/`, `css/`, `fonts/`, `assets/`, `vendor/` (three.js, OrbitControls), `data/`.
- `docs/` - `prd/` (product requirements .docx) and `sources/` (textbook PDF cited by `prototype/data/sources.json`).
- `.claude/` - `settings.json` (shared permissions), `rules/` (path-scoped guidance on content labeling and scene rendering), `commands/serve.md` (`/serve`).

## Running

There is no build step, package manager, linter, or test suite. It is plain HTML/CSS/JS with three.js and `OrbitControls.js` vendored in `prototype/vendor/`.

```bash
cd prototype && python3 -m http.server 8080   # then open http://localhost:8080
```

Opening `index.html` via `file://` mostly works but a local server is recommended. `#/fonttest` is a built-in route for checking Vietnamese glyph rendering.

Demo login (hard-coded in `js/auth.js`): username `admin`, password `123`, for both the teacher and student roles.

## Architecture

Paths in this section are relative to `prototype/`. Scripts are loaded as classic `<script>` tags in `index.html` (order matters) and communicate through `window` globals, not ES modules: `text.js` → `auth.js` → `audio.js` → `lesson-data.js` → `storage.js` → `engine.js` → `scene-map.js` → `app.js`.

- `js/app.js` (~2400 lines) is the controller: DOM caching (`elements`), a hash router (`handleRoute`, routes like `#/teacher`, `#/student`, `#/lesson/<id>`, `#/lesson/<id>/edit`, `#/lesson/<id>/preview`), the teacher dashboard and lesson editor (with undo/redo), the student dashboard and viewer, and the 6-stage classroom loop (`launch6StagesLoop` / `goTo6StageScreen`). All views live in the one large `index.html` and are toggled by `showView`.
- `js/lesson-data.js` defines `SEED_LESSONS`, the full lesson schema: sections, questions, key notes, private teacher notes, simulation variables and coefficients, props, camera keyframes, and status.
- `js/storage.js` (`window.LessonStorage`) persists lessons in `localStorage` (seeded from `SEED_LESSONS` when empty) and supports JSON import/export. It enforces the visibility rule that students only see lessons with `status === 'Đã dạy'` and `date <= today`.
- `js/engine.js` (`window.SimulationEngine.calculate`) is a deterministic, rule-based calculator. It adds the coefficient deltas declared in the lesson's `question.variables` to the `baseline` (duration, casualties, position score), so the same choices always give the same result. Keep it transparent and data-driven: tweak coefficients in lesson data, not in engine code.
- `js/scene-map.js` is the active renderer. It defines the Three.js silk-map scene (class `SilkMapScene`) and exposes it as `window.BattleScene3D`. It reads its palette from CSS variables in `css/theme.css`, uses canvas-drawn sprites with `InstancedMesh`, offers four camera presets, and lets PNGs in `assets/sprites/` override the procedural sprites (see `assets/sprites/README.md`). Terrain labels are HTML overlays, never text in canvas or geometry. `app.js` creates one instance per surface (editor preview, lesson workspace, student viewer, and the original/custom stages of the 6-stage loop) and drives it through `updateTimeline`, `setCameraPreset`, `updatePropsVisibility`/`applyPropConfig`, `updateFactionColors`, `updateUnitCounts`, `setQuality`, and `destroy`. Call `destroy()` when a view is torn down so renderers don't pile up.
- `js/text.js` patches `textContent` and `innerHTML` setters to NFC-normalize Vietnamese strings. Keep it loaded first so that composed and decomposed diacritics never mix.
- `js/audio.js` is procedural Web Audio battle sound (`window.BattleAudio`). `js/auth.js` is a client-side demo login using `sessionStorage`.
- CSS: `theme.css` (design tokens and the scene palette), `fonts.css` (local Noto Sans/Serif woff2 in `fonts/`), `style.css` (main), `editorial.css` (overrides loaded last).

## Gotchas

- `js/scene3d.js` is a legacy low-poly renderer and is not referenced from `index.html`. Edit `scene-map.js` for scene changes.
- `data/lesson.json`, `data/lesson.root-copy.json` (formerly the root `lesson.json`), and `data/sources.json` are not loaded by any script. The two lesson files differ. The running app takes its lesson data from `js/lesson-data.js` and `localStorage`. `sources.json` is a source/citation catalogue for the textbook-based content.
- `LessonStorage.init()` only seeds when the key is absent, so edits to `SEED_LESSONS` don't show up in a browser that already has data. Clear `history_sim_lessons_db_v2` in the browser or bump `STORAGE_KEY_LESSONS` in `storage.js` to see seed changes.
- `prototype/README.md` is partly out of date. It describes only the 6-stage student flow and does not mention the teacher editor, auth, or storage layers.
- `docs/` holds the PRD and the source textbook PDF. Both are reference material, not code.
- `README.md` at the root is a short index; the detailed prototype README is `prototype/README.md`.
