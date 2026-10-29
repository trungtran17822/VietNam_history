---
paths:
  - "prototype/js/scene-map.js"
  - "prototype/assets/**"
  - "prototype/css/theme.css"
---

# Silk-map scene

- `scene-map.js` is the active renderer (`window.BattleScene3D`); `scene3d.js` is legacy and not loaded.
- Colors come from CSS variables in `theme.css`; add a token there instead of hard-coding a hex value in the scene.
- Never draw Vietnamese text in canvas or geometry. Use the HTML label overlays.
- Replace sprites by dropping PNGs in `prototype/assets/sprites/` (names in that folder's README). Always keep the procedural fallback.
- Call `destroy()` on a scene instance when its view is torn down.
