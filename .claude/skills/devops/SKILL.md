---
name: devops
description: CI/CD, Vercel (frontend) and Cloudflare Workers + D1 (backend) deployment for this repo. Use when editing .github/workflows/, vercel.json or backend/wrangler.toml, when a CI run or deploy fails, when rolling back production, or when setting up the projects and repo secrets.
---

# DevOps: GitHub Actions + Vercel + Cloudflare

`frontend/` is a static site served as-is by Vercel (no build). `backend/` is one Cloudflare Worker with a D1 database, used only for class sessions. Keep the pipeline that small. Full setup runbook: [docs/devops/DEPLOY.md](../../../docs/devops/DEPLOY.md).

## The pipeline

| File | Role |
| --- | --- |
| [.github/workflows/ci-cd.yml](../../../.github/workflows/ci-cd.yml) | `test` job on every push and PR (check + unit + Playwright E2E); `deploy-frontend` and `deploy-backend` after it on `Staging` and `main` |
| [vercel.json](../../../vercel.json) | serves `frontend/` with no install/build step; turns off Vercel's Git auto-deploy |
| [scripts/check.sh](../../../scripts/check.sh) | static checks (same script as `/check`) |
| [backend/wrangler.toml](../../../backend/wrangler.toml) | Worker envs `staging` / `production`, D1 bindings, cron, logs off |

Branch flow: `<name>/feature/<topic>` → `Staging` (Vercel **Preview**) → `main` (Vercel **Production**). Feature-branch pushes run `test` only. Backend: `Staging` → `sv-class-api-staging`, `main` → `sv-class-api` (migrations applied before each deploy).

Deploys go through the Vercel CLI in Actions (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`), so a deploy only happens after `test` passes. Each deploy job skips with a notice (not a failure) when its secrets or the D1 `database_id` are missing. Vercel's Git integration stays off (`git.deploymentEnabled: false`) so Actions is the single deploy path; turning it on would double-deploy and skip the `check` gate.

## Changing the pipeline

- New static checks go into `scripts/check.sh` and tests into `tests/` or `backend/test/`, so local `npm test` and CI stay identical.
- Routing, headers, redirects go in `vercel.json`. The app uses a hash router (`#/...`), so it needs no rewrites.
- After editing `vercel.json`, verify locally without credentials: copy `frontend/` and `vercel.json` to a scratch dir, add `.vercel/project.json` = `{"projectId":"x","orgId":"y","settings":{"framework":null}}`, run `npx vercel@latest build --yes`, and confirm `.vercel/output/static/index.html` exists and `docs/` is absent.
- Match the scale of the project: a static classroom prototype. Reach for Docker, Terraform, extra environments, or monitoring stacks only when the user asks for them.

## Setup

Trung owns both the GitHub repo (`trungtran17822`) and the Vercel account, so he does this once:

1. From the repo root: `npx vercel@latest link` → creates/links the Vercel project and writes `orgId` and `projectId` to `.vercel/project.json` (gitignored). Leave the project unconnected to Git; `vercel.json` supplies the build settings.
2. Create a token at vercel.com/account/tokens, scoped to the same team.
3. Add repo secrets (Settings → Secrets and variables → Actions): `VERCEL_TOKEN`, `VERCEL_ORG_ID` = `orgId`, `VERCEL_PROJECT_ID` = `projectId`.

For the backend, add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` and fill the D1 ids in `backend/wrangler.toml` (see DEPLOY.md). A deploy job without its secrets skips with a notice naming the missing one. Preview URLs sit behind Vercel Authentication by default; production is public.

## When something fails

1. CI `test` red: run `npm test` locally. Static FAIL lines name the file; E2E failures upload `playwright-report` / `test-results` as a workflow artifact (screenshots + traces).
2. Deploy red: read the failing step in `gh run view --log-failed`. Missing secret → Setup step 3. `vercel pull` 401/403 → token expired or wrong team. `vercel build` error → re-run the local build check above.
3. Backend deploy red: `wrangler` 10000/auth errors → token lacks Workers or D1 Edit permission; "database not found" → wrong `database_id` in `wrangler.toml`.
4. Deployed but broken: inspect with the Vercel MCP tools (`list_deployments`, `get_deployment`, `get_runtime_errors`) using the team and project from Setup.

## Rollback

Production is whatever `main` last deployed. Fastest: `vercel rollback <previous-deployment-url> --token=...` (or the Vercel MCP `request_rollback`), then revert the bad commit on `main` so the next push stays fixed. Backend: `npx wrangler@3 rollback --env production` (D1 migrations are additive and stay).
