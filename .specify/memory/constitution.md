# Sử Việt (3D History Lesson Simulation) Constitution

## Core Principles

### I. Labelled, sourced content (NON-NEGOTIABLE)
Every historical fact shown to a student carries a source. Until a history advisor approves the
data set, the UI shows "Nội dung minh họa, chưa được chuyên gia duyệt" (header strip and lesson
footer) and the comparison screen shows the simulation notice. These labels are never removed,
hidden on any viewport, or softened. Simulated numbers are never presented as history.

### II. Deterministic, explainable simulation
The engine is a transparent rule-based calculator: the same choices always give the same numbers,
and every number traces back to coefficients declared in lesson data. Tune behaviour in lesson
data, never in engine code. No randomness may change a displayed number.

### III. Encourage, never grade
The character responds to student choices with context and real conditions of the time. No screen
tells a student their plan is "wrong" or scores them as a person.

### IV. Privacy by design for minors
Students are minors. The system collects only anonymous data: no names, emails, accounts, IP
addresses or device fingerprints are stored. Class data is keyed by a random session code and a
random per-device id that is never linked to identity.

### V. Offline-first frontend, thin backend
The lesson (playback, question, simulation, comparison, explanation) runs entirely in the browser
with no server. The backend exists only for features that need more than one device (class choice
distribution, anonymous trial data export). If the backend is unreachable, the lesson still runs
and the UI says so plainly.

### VI. Simplicity (YAGNI)
No build step, framework or dependency unless a requirement cannot be met without it. Frontend is
plain HTML/CSS/JS with vendored three.js; backend is one Cloudflare Worker with one D1 database.
Every added abstraction must be justified in the plan's Complexity Tracking table.

### VII. Vietnamese first
All UI text and character speech are Vietnamese with full diacritics, NFC-normalised. Text never
goes into canvas or 3D geometry; terrain labels are HTML overlays.

## Technical Constraints

- Frontend (`frontend/`): static files served by Vercel; works from any static host and degrades
  to local-only mode without the backend. Must stay usable on low-end school PCs, projectors
  (1280×720) and phones (360 px wide).
- Backend (`backend/`): Cloudflare Workers + D1. Public endpoints are rate-bounded by validation
  (body size, field limits, max responses per session). Teacher-only reads require the session's
  teacher key; only its SHA-256 hash is stored.
- No LLM or third-party AI service in the demo (F9 is deferred; see spec).

## Development Workflow and Quality Gates

- Branch flow: `<name>/feature/<topic>` → `Staging` (Preview) → `main` (Production).
- Every push runs: static checks (`scripts/check.sh`), unit tests (engine, storage rules, backend
  handlers) and Playwright end-to-end tests of the 6-stage loop and the class session.
- Behaviour changes update `specs/`, `docs/spec/SPEC.md`/`SPEC.vi.md` and `docs/srs/SRS.md` in the
  same change.
- Review loops are capped at 3 rounds; after the third, pick the best option and record the
  remaining risk.

## Governance

This constitution overrides other practice documents. Amendments are made in a PR that states the
reason and updates dependent templates and docs. Reviewers verify the principles above on every PR.

**Version**: 1.0.0 | **Ratified**: 2026-11-03 | **Last Amended**: 2026-11-03
