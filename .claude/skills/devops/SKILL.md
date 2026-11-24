---
name: devops
description: CI/CD, Vercel (frontend) and Cloudflare Workers + D1 (backend) deployment for this repo. Use when editing .github/workflows/, vercel.json or backend/wrangler.toml, when a CI run or deploy fails, when rolling back production, or when setting up the projects and repo secrets.
---

# DevOps: GitHub Actions + Vercel + Cloudflare

`frontend/` is a Vite + React app; Vercel serves the build in `frontend/dist` (`npm ci`, `npm run build`, Node >= 20.19). `backend/` is one Cloudflare Worker with a D1 database, used only for class sessions. Keep the pipeline that small. Full setup runbook: [docs/devops/DEPLOY.md](../../../docs/devops/DEPLOY.md).

## The pipeline

| File | Role |
| --- | --- |
| [.github/workflows/ci-cd.yml](../../../.github/workflows/ci-cd.yml) | `test` job on every push and PR, Node 24 (check, unit, atlas tests, build, bundle budget, Playwright E2E); `deploy-frontend` and `deploy-backend` after it on `Staging` and `main` |
| [vercel.json](../../../vercel.json) | `installCommand: npm ci`, `buildCommand: npm run build`, `outputDirectory: frontend/dist`; turns off Vercel's Git auto-deploy |
| [scripts/check.sh](../../../scripts/check.sh) | static checks (same script as `/check`) |
| [backend/wrangler.toml](../../../backend/wrangler.toml) | Worker envs `staging` / `production`, D1 bindings, cron, logs off |

Branch flow: `<name>/feature/<topic>` → `Staging` (Vercel **Preview**) → `main` (Vercel **Production**). Feature-branch pushes run `test` only. Backend: `Staging` → `sv-class-api-staging`, `main` → `sv-class-api` (migrations applied before each deploy).

Deploys go through the Vercel CLI in Actions (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`), so a deploy only happens after `test` passes. Each deploy job skips with a notice (not a failure) when its secrets or the D1 `database_id` are missing. Vercel's Git integration stays off (`git.deploymentEnabled: false`) so Actions is the single deploy path; turning it on would double-deploy and skip the `check` gate.

## Changing the pipeline

- New static checks go into `scripts/check.sh` and tests into `tests/` or `backend/test/`, so local `npm test` and CI stay identical.
- Routing, headers, redirects go in `vercel.json`. The app uses a hash router (`#/...`), so it needs no rewrites.
- After editing `vercel.json`, verify locally with a logged-in CLI: `npx vercel@latest pull --yes --environment=preview`, `npx vercel@latest build`, and confirm `.vercel/output/static/index.html` and `assets/` exist and `docs/` is absent.
- Match the scale of the project: a static classroom prototype. Reach for Docker, Terraform, extra environments, or monitoring stacks only when the user asks for them.

## Setup

Đạt (GitHub `YoungsterDumb`) is the main deployer. Trung's Vercel is no longer used.

The repo is bound to Đạt's accounts:
- Vercel project `vietnam-history`, team `youngsterdumbs-projects`. Its org and project ids are in `ci-cd.yml`.
- Cloudflare account `suviet.workers.dev`. Its `account_id` and the D1 ids are in `backend/wrangler.toml`.

CI needs only the repo secrets `VERCEL_TOKEN` and `CLOUDFLARE_API_TOKEN`. Adding them needs admin on `trungtran17822/VietNam_history`, and Đạt currently has push only. Steps: `docs/devops/CI-CD_Vercel_VietnamHistory.md`.

Until the secrets exist, deploy by hand from a machine logged in to `vercel` and `wrangler@3`: `npm run deploy` (check, unit tests, D1 migrations, the Worker deploy, the smoke test, then `vercel deploy --prod`), or frontend only with `vercel pull --yes --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod` (drop `--prod` everywhere for a preview). Production only after Đạt approves the Staging preview.

A deploy job without its token skips with a notice. Preview URLs sit behind Vercel Authentication; production is public.

## When something fails

1. CI `test` red: run `npm test` locally. Static FAIL lines name the file; E2E failures upload `playwright-report` / `test-results` as a workflow artifact (screenshots + traces).
2. Deploy red: read the failing step in `gh run view --log-failed`. Missing secret → Setup step 3. `vercel pull` 401/403 → token expired or wrong team. `vercel build` error → re-run the local build check above.
3. Backend deploy red: `wrangler` 10000/auth errors → token lacks Workers or D1 Edit permission; "database not found" → wrong `database_id` in `wrangler.toml`.
4. Deployed but broken: run `npm run smoke` against the API. Inspect the frontend with the Vercel MCP tools (`list_deployments`, `get_deployment`) using team `team_6P2BlZoToZdS3VjdEqi6VnTy` and project `prj_yOHOIp7diLJsl0u98CfC6DDWnlnK`.

## Rollback

Production is whatever `main` last deployed. Fastest: `vercel rollback <previous-deployment-url> --token=...` (or the Vercel MCP `request_rollback`), then revert the bad commit on `main` so the next push stays fixed. Backend: `npx wrangler@3 rollback --env production` (D1 migrations are additive and stay).
