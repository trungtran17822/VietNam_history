# Tasks: Classroom simulation demo with class session

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

Format: `[ID] [P?] [Story] Description`. `[P]` = can run in parallel (different files, no dependency).
Tests are included because the constitution requires unit + E2E on every push.

## Phase 1: Setup

- [x] T001 Merge Trung's UI branch `origin/Process` into `Dat/feature/core`, moving its files into the current layout (logo, svg art, `redesign.css`, research reports, CI doc)
- [x] T002 Initialise Spec Kit (`.specify/`, `.claude/skills/speckit-*`) and write the constitution
- [x] T003 Rename `prototype/` → `frontend/`; update `scripts/check.sh`, `vercel.json`, CLAUDE.md, rules, commands, READMEs, devops skill
- [x] T004 [P] Root `package.json` (Playwright dev dep, scripts) and `playwright.config.js` that starts both servers
- [x] T005 [P] Optimise brand assets: small `logo-transparent.png` in `frontend/assets/logo/`, move the 1.8 MB original to `docs/brand/`

## Phase 2: Foundational (blocks US3, US4)

- [x] T006 [P] `backend/migrations/0001_init.sql` (sessions, answers, index)
- [x] T007 [P] `backend/src/store.js`: `D1Store` and `MemoryStore` with the same methods
- [x] T008 `backend/src/handlers.js`: validation, code/teacher-key generation, all endpoints of contracts/api.md, CSV
- [x] T009 `backend/src/index.js`: Worker `fetch` (CORS, routing, errors) and `scheduled` purge; `backend/wrangler.toml` (staging/production envs, cron, observability off)
- [x] T010 [P] `backend/dev-server.js` Node adapter over MemoryStore
- [x] T011 [P] `frontend/js/config.js` and `frontend/js/class-session.js` (`window.ClassSession`), loaded before `app.js`

## Phase 3: US1 + US2 (P1, existing features verified and hardened) 🎯 MVP

- [x] T012 [P] [US2] `tests/unit/engine.test.js`: 81 combinations × 2 runs identical; exactly 1 equals original; assumptions present
- [x] T013 [P] [US2] Grading-word scan over all explanation and outcome texts (SC-008); fix any lesson text that fails
- [x] T014 [US2] Stage 3: mark the original option ("Cách của nghĩa quân Tây Sơn"); empty-variable lessons show the "chưa có phần thử cách khác" notice and block stages 4-6
- [x] T015 [US2] Stage 5: scroll the simulation notice into view on open
- [x] T016 [US1] [US2] `tests/e2e/lesson-flow.spec.js`: teacher stage 2 controls + source modal; full loop twice gives same numbers; labels on every stage; try-again keeps choices

## Phase 4: US3 class session (P2)

- [x] T017 [P] [US3] `backend/test/handlers.test.js`: create, get, put (insert/merge/replace), cap 60, expiry, teacher-key checks, CORS, body limit
- [x] T018 [US3] Teacher class panel on stage 3 (open session, big code, count, per-variable bars, 4 s polling while visible, offline notice) in `app.js` + `css/classroom.css`
- [x] T019 [US3] Student join card on stage 3 (code input, lesson match, joined state) and submit on "Chạy mô phỏng" with status line
- [x] T020 [US3] `tests/e2e/class-session.spec.js`: teacher + 2 students; count/bars; resubmit replaces; wrong code message

## Phase 5: US4 trial data (P3)

- [x] T021 [US4] Stage 6 survey (3 × 1-5, optional) for joined students; sends ratings + duration
- [x] T022 [US4] Teacher "Tải dữ liệu (CSV)" and "Xoá phiên" actions
- [x] T023 [US4] E2E: CSV has rows, no identity columns; delete makes the code fail

## Phase 6: US5 content intake (P3, Trung's feature)

- [x] T024 [US5] E2E: intake validation, draft created, publish blocked until source confirmed

## Phase 7: Polish and cross-cutting

- [x] T025 UI audit with impeccable detector + Playwright screenshots (desktop 1280×720, phone 360×800); fix findings (max 3 rounds)
- [x] T026 [P] E2E offline mode (backend down) and 360 px no-horizontal-scroll check
- [x] T027 CI: `check` job runs static + unit + E2E; deploy jobs for Vercel (frontend) and Cloudflare (backend) skip cleanly without secrets
- [x] T028 [P] Docs: `docs/architecture/SYSTEM_DESIGN.md`, `docs/srs/SRS.md`, update `docs/spec/SPEC.md` + `SPEC.vi.md` status (F10, F11 built), deploy runbook `docs/devops/DEPLOY.md`

## Dependencies

- Phase 1 → Phase 2 → Phases 3-6 → Phase 7. US1/US2 do not depend on the backend.
- T008 depends on T007; T009 on T008; T018-T023 on T011 and T010 (for E2E).
- US3 before US4 (US4 reuses the session and the answer record).

## Parallel opportunities

T004, T005 together; T006, T007, T010, T011 together; T012, T013, T017 together.
