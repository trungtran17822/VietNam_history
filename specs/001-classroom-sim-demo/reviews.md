# Spec review log: 001-classroom-sim-demo

Rule (constitution, workflow): at most 3 review rounds; after round 3, choose the best option and
record what is left. Each finding below was fixed in `spec.md` unless marked "kept".

## Round 1: ambiguity and testability (2026-11-03)

| # | Finding | Resolution |
|---|---|---|
| 1 | US2-1 said "4 variables, 3 options" as if every lesson had them; the general rule is 3-5 variables | Scoped to the Ngọc Hồi lesson; the original option is preselected and visibly marked |
| 2 | US2-4 "no word that grades the student" was not testable | Word list fixed in SC-008 and checked over all 81 combinations |
| 3 | FR-014 "time spent" had no start, end or unit | Whole seconds from opening stage 1 to the latest submission, capped at 7,200 |
| 4 | FR-009 "no look-alike characters" did not name the alphabet; code collisions not covered | 31-character alphabet stated; must differ from every unexpired code; teacher-only control |
| 5 | Survey: unclear whether devices outside a session see it or send data | Only devices in a session see it; others send nothing (privacy, FR-018) |
| 6 | Empty-variable lessons: "explain" was vague | Exact message; stages 4-6 unreachable |

## Round 2: consistency with the PRD, the code and Trung's UI (2026-11-03)

| # | Finding | Resolution |
|---|---|---|
| 1 | US2-3 "visible without scrolling" conflicts with a 360 px phone where header and stepper take the first screen | Notice is the first element of the stage and the view scrolls to it when the stage opens |
| 2 | US3-2 did not say *when* a student submits | On "Chạy mô phỏng" at stage 3, with a confirmation message |
| 3 | Student visibility rule vs. a live session: could students be blocked from the lesson being taught? | Checked `lesson-data.js`: the Ngọc Hồi seed is `Đã dạy`, dated 2026-10-27, so students can open it. Kept the existing rule (FR-020) |
| 4 | Trung's content-intake flow (UI update on `Process`) was not in the spec | Added as US5 / FR-021 (P3); it supports the "no unreviewed content to students" rule |
| 5 | Wrong-lesson code and lost connection not covered | Two edge cases added with exact messages |
| 6 | F9 status unclear | Stated as deferred (PRD gate T7); no LLM in this feature |

## Round 3: privacy, security, scope creep (2026-11-03)

| # | Finding | Resolution |
|---|---|---|
| 1 | Could the join code alone read class data? | No: reads, export and delete require the teacher key (FR-012); the code only submits |
| 2 | Platform request logs may contain IPs | FR-018 is about stored session data; the plan disables request logging on the API and stores no IP. Kept as a plan-level control |
| 3 | Retention not bounded | 180-day automatic deletion (FR-016) plus manual delete |
| 4 | Risk of over-engineering: accounts, websockets, LLM | Rejected: polling every 5 s is enough for 60 devices (SC-003), no accounts (PRD), no LLM (F9 deferred) |
| 5 | Grading-word list could flag "sai" meaning "sent" in historical quotes | The check covers explanation and outcome texts only, not source quotes |

**Result after round 3**: no `[NEEDS CLARIFICATION]` markers; all checklist items pass
([checklists/requirements.md](checklists/requirements.md)). Remaining risk, accepted: the
clarification answers (session length, retention, survey wording, class size) are documented
defaults that the PM should confirm at plan step 1; changing them changes constants, not design.
