# Deploy runbook

Two independent deploys, both run by `.github/workflows/ci-cd.yml` after the `test` job passes:

| Branch | Frontend (`frontend/` → Vercel) | Backend (`backend/` → Cloudflare Workers + D1) |
|---|---|---|
| `Staging` | Preview deployment | `sv-class-api-staging` Worker, `sv-class-staging` D1 |
| `main` | Production deployment | `sv-class-api` Worker, `sv-class-prod` D1 |

Each deploy job **skips with a notice** (not a failure) when its secrets are missing, so CI stays green before setup is done. The lesson works without the backend; only the class session (F10/F11) needs it.

## Live now (main deployer: Đạt, 2026-11-04)

| Part | Where | URL |
|---|---|---|
| Frontend | Vercel project `vietnam-history` (account `youngsterdumb`) | https://vietnam-history-eight.vercel.app |
| Backend, production | Cloudflare Worker `sv-class-api`, D1 `sv-class-prod` | https://sv-class-api.suviet.workers.dev |
| Backend, staging | Cloudflare Worker `sv-class-api-staging`, D1 `sv-class-staging` | https://sv-class-api-staging.suviet.workers.dev |

- The repo is bound to these accounts. The Vercel org/project ids are in `ci-cd.yml`; the Cloudflare `account_id` and D1 ids are in `backend/wrangler.toml`. None of them is secret.
- CI needs only two repo secrets: `VERCEL_TOKEN` and `CLOUDFLARE_API_TOKEN`. Adding them needs repo admin rights. Step-by-step guide in Vietnamese: [CI-CD_Vercel_VietnamHistory.md](CI-CD_Vercel_VietnamHistory.md).
- `frontend/src/lib/class-session.ts` (`DEPLOYED_API_BASE`) points every deployed copy, Vercel previews included, at the production Worker. A build can override it with the env var `VITE_API_BASE`.
- Manual deploy from a logged-in machine (check, unit, backend migrate + deploy, smoke, frontend): `npm run deploy`. The parts on their own: `deploy:backend`, `smoke`, `deploy:frontend`.

## What CI runs (v2, `.github/workflows/ci-cd.yml`)

Job `test`, on every push and pull request, Node 24:

1. `npm ci`
2. `bash scripts/check.sh`: `tsc`, every lesson JSON against the zod schema, mandatory labels (including the atlas line "© OpenStreetMap contributors", ODbL), NFC, backend syntax.
3. `npm run test:unit`: Vitest (`frontend/src/lib`) and the backend `node:test` suite.
4. `npm run atlas:test`: atlas data (34 units, Hoàng Sa / Trường Sa, landmarks inside their provinces, search, every lesson's `atlasPlaceIds` resolves). Node ≥ 22.18 is needed because the tests import `.ts` files directly.
5. `npm run build` (Vite → `frontend/dist`), then `npm run budget`: the JS a first visit loads must stay ≤ 200 KB gzip, with three.js and the atlas only in lazy chunks.
6. `npx playwright install --with-deps chromium`, then `npm run test:e2e` (desktop 1280×720 and phone 360×800; the config builds, previews and starts the in-memory API itself).

Jobs `deploy-frontend` and `deploy-backend` need `test` and run only for pushes to `Staging` (Vercel preview, Worker `sv-class-api-staging`) or `main` (production). They use Node 22 for the deploy tools (`vercel@latest`, `wrangler@3`). The Vercel preview URL is printed by the `vercel deploy --prebuilt` step of the run. Every deployed frontend, previews included, calls the production Worker through `DEPLOYED_API_BASE` (see below), so a class session opened on a Staging preview lands in the production D1.

Release flow: feature branch → merge into `Staging` → CI deploys the preview → Đạt reviews it → merge into `main` (production). Nobody else deploys production.

Preview by hand (while the repo secrets are missing), from a checkout of `Staging` with a logged-in Vercel CLI: `npx vercel@latest pull --yes --environment=preview`, `npx vercel@latest build`, `npx vercel@latest deploy --prebuilt`. Never add `--prod`. Previews have Vercel Authentication on, so only signed-in members of the Vercel account can open them; check one from the CLI with `npx vercel@latest curl <url>/index.html`.

The sections below are the from-scratch setup, for a new account.

## 1. Vercel (frontend), once

1. Create a Vercel project from this repo. `vercel.json` already sets `installCommand: npm ci`, `buildCommand: npm run build` (Vite 8, needs Node 20.19+), `outputDirectory: frontend/dist`, and turns off Vercel's own Git deploys (CI deploys instead). CI runs `vercel build` on its own runner, so the Node version is the one in `ci-cd.yml`, not the Vercel project setting.
2. Put `orgId` and `projectId` from `.vercel/project.json` (after `npx vercel link`; do not commit `.vercel/`) into `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` in `ci-cd.yml`.
3. Add the repo secret `VERCEL_TOKEN` (GitHub → Settings → Secrets and variables → Actions; vercel.com → Account Settings → Tokens).

## 2. Cloudflare (backend), once

```bash
cd backend
npx wrangler@3 login
npx wrangler@3 d1 create sv-class-staging
npx wrangler@3 d1 create sv-class-prod
```

1. Paste each printed `database_id` into `backend/wrangler.toml` (`env.staging` and `env.production`) and commit. The id is not a secret. CI skips the backend deploy while the placeholder `00000000-…` is there.
2. Create an API token (dash.cloudflare.com → My Profile → API Tokens → template "Edit Cloudflare Workers", plus permission **Account · D1 · Edit**).
3. Put the account id (`npx wrangler@3 whoami`) into `account_id` in `wrangler.toml`, and add the repo secret `CLOUDFLARE_API_TOKEN`.
4. Push to `Staging`. CI applies migrations (`wrangler d1 migrations apply … --remote`) and deploys the Worker. Check: `curl https://sv-class-api-staging.<subdomain>.workers.dev/api/health` → `{"ok":true}`, then `node backend/scripts/smoke.mjs <worker-url> <site-origin>` (opens a real session, bursts 70 devices, checks the cap, 304, CSV, then deletes it).
5. A new Cloudflare account must register a `workers.dev` subdomain once (dashboard → Workers & Pages, or answer the prompt of the first `wrangler deploy`).

Manual deploy from a laptop (same steps CI runs):

```bash
cd backend
npx wrangler@3 d1 migrations apply sv-class-staging --remote --env staging
npx wrangler@3 deploy --env staging
```

## 3. Connect the frontend to the backend

1. Set `DEPLOYED_API_BASE` in `frontend/src/lib/class-session.ts` (or the build env var `VITE_API_BASE`) to the Worker origin (no trailing slash), e.g. `https://sv-class-api.<subdomain>.workers.dev`. Until then deployed sites show "class features not configured" and run everything else.
2. `ALLOWED_ORIGINS` in `wrangler.toml` must include the site origin. Defaults: staging allows `http://localhost:8080` and `https://*.vercel.app`; production allows `https://*.vercel.app`. Narrow production to the real domain once it is fixed.

## 4. Rollback

- Frontend: Vercel dashboard → Deployments → previous production deployment → Promote (or `vercel rollback`).
- Backend: `npx wrangler@3 rollback --env production` (code only; D1 migrations are additive and stay).

## 5. Data

- Sessions expire 12 h after opening; a daily cron (03:00 UTC) deletes sessions and answers older than 180 days.
- Teachers can delete a session at any time from the class panel.
- Worker request logs are off (`observability.enabled = false`) because they include client IPs.
