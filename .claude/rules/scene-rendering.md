---
paths:
  - "frontend/src/scene/**"
  - "frontend/src/components/Player.tsx"
---

# Silk-map scene

- `src/scene/silk-map.ts` (`SilkMapScene`) is the renderer; `src/scene/artwork.ts` paints the map and sprites (no three.js, also used for thumbnails). Everything lesson-specific comes from `simulation.scene` in the lesson JSON: terrain preset, features, labels, routes, formations, special units.
- Colors come from CSS variables in `src/styles.css`; add a token there instead of hard-coding a hex value in the scene.
- Never draw Vietnamese text in canvas or geometry. Use the HTML label overlays (`.lesson-scene-label`).
- Replace sprites by dropping PNGs in `frontend/src/scene/sprites/` (names in that folder's README). Always keep the procedural fallback.
- Mount scenes through `SceneView`/`Player` (`components/Player.tsx`); they call `destroy()` on unmount. Anything else that creates a `SilkMapScene` must destroy it too.
