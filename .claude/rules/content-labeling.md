---
paths:
  - "prototype/js/lesson-data.js"
  - "prototype/data/**"
  - "prototype/index.html"
---

# Historical content labeling

- All lesson content is illustrative and not yet reviewed by a historian. Keep the "Nội dung minh họa, chưa được chuyên gia duyệt" label (header strip and footer) and the mandatory simulation warning on the comparison screen; never remove or soften them.
- Keep every fact traceable to a source: lesson sections carry an inline `source {book, chapter, quote, note}`, and `prototype/data/sources.json` is the catalogue (tier A = textbook) that approved sources should be added to. Do not add unsourced historical claims or invent specific figures; label illustrative numbers as illustrative.
- Write UI text and lesson content in Vietnamese with full diacritics (NFC).
