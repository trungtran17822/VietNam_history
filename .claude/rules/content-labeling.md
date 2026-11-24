---
paths:
  - "frontend/src/content/**"
  - "frontend/src/components/**"
  - "frontend/src/routes/**"
  - "frontend/data/**"
---

# Historical content labeling

- All lesson content is illustrative and not yet reviewed by a historian. Keep the "Nội dung minh họa, chưa được chuyên gia duyệt" label (strip at the top of every page and the footer, `PROTOTYPE_NOTICE` in `components/ui.tsx`) and the mandatory simulation warning shown first on the comparison screen (`SIMULATION_NOTICE`); never remove or soften them. `scripts/check.sh` fails if one disappears.
- Keep every fact traceable to a source: lesson sections carry an inline `source {book, chapter, quote, note}`, and `frontend/data/sources.json` is the catalogue (tier A = textbook) that approved sources should be added to. Do not add unsourced historical claims or invent specific figures; label illustrative numbers as illustrative.
- Write UI text and lesson content in Vietnamese with full diacritics (NFC). `scripts/check.sh` rejects non-NFC source files.
