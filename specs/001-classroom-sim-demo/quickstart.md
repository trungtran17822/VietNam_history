# Quickstart: run and validate 001-classroom-sim-demo

## Prerequisites

Node 18+, Python 3 (static server), a Chromium for Playwright (`npx playwright install chromium`).
No Cloudflare or Vercel account is needed to run or test locally.

## Run locally

```bash
npm install                      # root: Playwright only
npm run dev:backend              # http://localhost:8787  (in-memory store)
npm run dev:frontend             # http://localhost:8080  (static server for frontend/)
```

Open `http://localhost:8080`, log in (`admin` / `123`). `config.js` points to `localhost:8787`
automatically on localhost.

## Validate

```bash
bash scripts/check.sh            # static checks: syntax, JSON, references, script load list
npm run test:unit                # engine determinism (81×2), grading-word scan, backend handlers
npm run test:e2e                 # Playwright: starts both servers itself
```

Expected: all green. E2E scenarios map to the spec:

| Spec | E2E scenario |
|---|---|
| US1, FR-001..003, FR-017 | teacher runs stage 2: play, pause, seek, camera, source modal; labels visible |
| US2, FR-004..008 | full 6-stage loop; same numbers twice; notice first on stage 5; try-again keeps choices |
| US3, FR-009..013 | teacher opens session; 2 student contexts join and submit; count and bars update; resubmit replaces |
| US4, FR-014..016 | survey submitted; CSV download has 2 rows, no identity columns; delete stops the code |
| FR-019 | backend stopped: whole loop still completes, notice shown |
| SC-007 | 360 px viewport: no horizontal scroll on login, dashboard, every stage |

## Manual check with real Cloudflare (optional)

```bash
cd backend
npx wrangler@3 d1 create sv-class-staging         # put the id into wrangler.toml [env.staging]
npx wrangler@3 d1 migrations apply sv-class-staging --remote --env staging
npx wrangler@3 deploy --env staging
curl https://<worker-url>/api/health               # {"ok":true}
```

Then set `APP_CONFIG.apiBase` in `frontend/js/config.js` (deployed hosts) to the Worker URL.
