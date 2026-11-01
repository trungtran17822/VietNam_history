---
name: devops
description: CI/CD and Vercel deployment for this repo. Use when editing .github/workflows/ or vercel.json, when a CI run or Vercel deploy fails, when rolling back production, or when setting up the Vercel project and repo secrets.
---

# DevOps: GitHub Actions + Vercel

The app is a static site: `prototype/` is served as-is. There is no build, no package manager, no server, no database. Keep the pipeline that small; the whole thing is two files.

## The pipeline

| File | Role |
| --- | --- |
| [.github/workflows/ci-cd.yml](../../../.github/workflows/ci-cd.yml) | `check` job on every push; `deploy` job after it on `Staging` and `main` |
| [vercel.json](../../../vercel.json) | serves `prototype/` with no install/build step; turns off Vercel's Git auto-deploy |
| [scripts/check.sh](../../../scripts/check.sh) | the only CI gate (same script as `/check`) |

Branch flow: `<name>/feature/<topic>` → `Staging` (Vercel **Preview**) → `main` (Vercel **Production**). Feature-branch pushes run `check` only.

Deploys go through the Vercel CLI in Actions (`vercel pull` → `vercel build` → `vercel deploy --prebuilt`), so a deploy only happens after `check` passes. Vercel's Git integration stays off (`git.deploymentEnabled: false`) because the GitHub repo is owned by another account and a second deploy path would double-deploy.

## Changing the pipeline

- New CI checks go into `scripts/check.sh`, so local `/check` and CI stay identical. The workflow only calls the script.
- Routing, headers, redirects go in `vercel.json`. The app uses a hash router (`#/...`), so it needs no rewrites.
- After editing `vercel.json`, verify locally without credentials: copy `prototype/` and `vercel.json` to a scratch dir, add `.vercel/project.json` = `{"projectId":"x","orgId":"y","settings":{"framework":null}}`, run `npx vercel@latest build --yes`, and confirm `.vercel/output/static/index.html` exists and `docs/` is absent.
- Match the scale of the project: a static classroom prototype. Reach for Docker, Terraform, extra environments, or monitoring stacks only when the user asks for them.

## Setup (once)

1. Vercel project `vietnam-history` in team `youngsterdumbs-projects`, created empty (no Git connection; `vercel.json` supplies the build settings). From the repo root, `npx vercel@latest link` creates it and writes both IDs to `.vercel/project.json` (`orgId`, `projectId`).
2. Token: vercel.com/account/tokens, scoped to that team.
3. Repo secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: setting them needs admin on the GitHub repo (owner `trungtran17822`). The deploy job fails fast with a named error when one is missing.

## When something fails

1. CI `check` red: run `bash scripts/check.sh` locally; the FAIL line names the file.
2. Deploy red: read the failing step in `gh run view --log-failed`. Missing secret → setup step 3. `vercel pull` 401/403 → token expired or wrong team. `vercel build` error → re-run the local build check above.
3. Deployed but broken: inspect with the Vercel MCP tools (`list_deployments`, `get_deployment`, `get_runtime_errors`) using the team and project from Setup.

## Rollback

Production is whatever `main` last deployed. Fastest: `vercel rollback <previous-deployment-url> --token=...` (or the Vercel MCP `request_rollback`), then revert the bad commit on `main` so the next push stays fixed.
