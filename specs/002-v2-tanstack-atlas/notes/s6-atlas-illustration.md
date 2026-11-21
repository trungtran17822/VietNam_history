# S6: the atlas page becomes an AI illustration (3D on hold)

Date: 2026-11-21. Branch `Dat/feature/atlas-illustration`. Decision of the owner (Đạt): "Hãy bỏ đi bản đồ 3D, tạm thời Atlas chính sẽ dùng ảnh minh hoạ"; places without a picture are to be added later.

## What changed

- `#/atlas` renders `features/atlas/IllustrationAtlas.tsx`: one AI picture (`public/atlas/illustration-v2.webp`, 1024 × 1535) with a hotspot button on each of the 17 places it shows (8 `ro`, 9 `doan` marked "?"), a side panel (search combobox, kind chips, a strip of the picture's places, the place card), a lightbox ("Phóng to" for the whole picture, each crop for the crop), and the AI caption under the picture. Atlas links opened before sign-in retain their query parameters. The URL contract `?place=&kind=&q=` and the lesson links (chips on the lesson page, "Mở bài giảng" on the card, student visibility) are unchanged.
- Any atlas id opens a card (`places.ts`: 71 landmarks, 34 units, 2 archipelagos). A place with a spot in `content/atlas/illustration-v2.json` gets its crop (`illustration.ts`: `cropStyle`, capped at ~3× the 1024 px source) and its hotspot lit. Any other place gets the card without a picture and the note "Địa danh này chưa có trong ảnh minh hoạ". No crop is invented for the other 56 landmarks.
- Search and chips filter the list and light the strongly matching hotspots (score ≥ 100), dim the others; Hoàng Sa and Trường Sa are in the default list (the 3D list had them only in the province drawer).
- Shared code moved to `AtlasParts.tsx` (place card with a `picture` slot, lesson links, kind marks, OSM credit, province list); `KIND_COLORS` now lives in `places.ts`.
- On hold, kept on disk and imported by no route: `scene.ts`, `AtlasView.tsx`, `public/atlas/terrain.png`. three.js is only in the silk-map chunk again.
- `scripts/check.sh` now requires the OSM credit in `AtlasParts.tsx` and the AI caption in `IllustrationAtlas.tsx`.

## Tests

- `tests/e2e/atlas.spec.js` rewritten (8 tests, desktop and phone-360): labels, no canvas and no three.js request, 17 hotspots, hotspot → card with crop → lightbox, any id (province, picture-less landmark, Trường Sa, unknown), search and chips lighting hotspots, URL reload and browser history, lesson chip both ways, student visibility, stacked layout and crops that fit on phones.
- `frontend/src/features/atlas/places.test.ts` (Vitest) and `tests/atlas/illustration.test.mjs` (node:test).

## Open

- The 9 guessed spots (`confidence: "doan"`) need the owner's confirmation; edit `illustration-v2.json` (pixels of the 1024 × 1535 image).
- The picture is 1024 px wide, so crops are soft; ask for an original ≥ 2048 px (scale `size` and every `box` by the same factor).
- Pictures for the places the illustration does not show will be added by the owner (add an image and a spot, or extend the manifest with per-place images).
- Not measured: the illustration route on a real phone.
