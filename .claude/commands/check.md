---
description: Run static checks (JS syntax, JSON validity, index.html references) and unit tests
---

Run `bash scripts/check.sh` from the repo root. Report each FAIL line with the file involved and fix them; if all pass, say so in one line. Then run `npm run test:unit`; for UI changes also `npm run test:e2e`.
