---
paths:
  - "prototype/js/**"
  - "prototype/index.html"
---

# Adding or changing JS modules

- Scripts are classic `<script>` tags in `index.html` sharing `window` globals, not ES modules. Order matters: a new file goes after everything it uses and before `app.js`.
- Wrap each file in an IIFE `(function (window) { 'use strict'; ... })(window);` and expose one namespace (`window.LessonStorage`, `window.SimulationEngine`, ...). Do not add loose globals.
- New domain logic goes in its own `js/<name>.js`, not into `app.js` (already ~2400 lines). `app.js` stays the controller.
- Simulation behavior belongs in lesson data coefficients, not in `engine.js`.
- After editing, run `/check` (`bash scripts/check.sh`). It fails on syntax errors and on a `js/*.js` file that `index.html` does not load.
