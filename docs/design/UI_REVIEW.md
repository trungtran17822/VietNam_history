# UI review: Trung's redesign + classroom flow (2026-11-03)

Scope: the UI Trung pushed on `origin/Process` (merged into `frontend/`) plus the new class-session parts (stage 3 panel, stage 6 survey). Tools: the impeccable detector (static + rendered page) and Playwright screenshots at desktop 1280×720 and phone 360×800 for login, dashboard, lesson page and all 6 stages. Capped at 3 rounds (constitution, workflow rule).

## Result

| Round | Findings | What changed |
|---|---|---|
| 1 | 40 (14 low contrast, 7 side-tab borders, 5 tiny/undersized text, 3 buried raster, 2 cramped padding, 2 skipped headings, 7 style tells) | Baseline after merging Trung's UI |
| 2 | 15 | Contrast floor raised (`--text-secondary-ui #5d574b`, `--text-muted #655d51`), comparison colours left over from the old dark theme replaced (#86efac → #2f6b47, #fca5a5 → #9d3026, light blues → `--muted-indigo`), 12-13 px minimum text, notice strip larger (0.8rem / 600), side-tab accents removed from the new class cards, heading order fixed (student key notes `h3` → `h2`) |
| 3 | 9 desktop / 7 phone | Phone player overflow fixed (inline `min-height` plus aspect-ratio made it ~920 px wide; now `aspect-ratio: 4/5`), login text colours, padding on stage 3 tiles |

## Kept on purpose

These are Trung's identity choices for the "silk painting / school lesson planner" look. The detector flags them as generic AI style, but they are deliberate and consistent across the app:

- Cream/beige paper palette and the radial glow behind the hero.
- Small uppercase kicker above section headings ("KHÔNG GIAN GIẢNG DẠY", "CHƯƠNG 1 · LỜI DẪN").
- Lesson cards inside the paper panel (nested cards).
- Bronze drum / flag art under a light wash (buried raster); it is decoration, not content.
- `#/fonttest` heading levels: a developer-only glyph test page.

## Layout decisions for the new parts

- Stage 3 is two columns on desktop: the Emperor's question and variable tiles on the left, the class panel (sticky) on the right. Below 1024 px the panel moves above the choices so students see the join box first.
- Each variable is a `fieldset` of large tiles (≥ 44 px touch height); the original option carries the badge "Cách của nghĩa quân Tây Sơn" and is preselected.
- The stepper is clickable, shows completed / current / disabled states, and disables stages 4-6 for lessons without variables (with a plain notice instead).
- The teacher sees one large class code, answer count and per-option bars; status lines use plain Vietnamese with a tone colour, never error codes.

## Checked by tests

`tests/e2e/layout.spec.js` (no horizontal scroll at 360 px on login, dashboard and every stage; join card above choices; tile height ≥ 44 px) and the labelling checks in `tests/e2e/lesson-flow.spec.js` keep these decisions from regressing.
