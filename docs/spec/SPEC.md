# Spec: Interactive 3D History Lesson Simulation (Ngọc Hồi - Hạ Hồi demo)

| | |
|---|---|
| Status | Draft 2, 2026-11-01. Timeline cut from 17 weeks to **12 weeks (maximum 15)**. A Vietnamese version is in [SPEC.vi.md](SPEC.vi.md) |
| Sources | PRD `docs/prd/PRD và lộ trình demo Mô phỏng lịch sử 3D.docx` (its timeline of 17 weeks is superseded by §11 of this spec), and the prototype code in `prototype/` as of commit `cba3e58` |
| Product name | Not decided (PRD open question) |
| UI language | Vietnamese. Everything a student or teacher sees is Vietnamese; this spec quotes UI strings verbatim. |

How to read this: sections 1-6 say **what the product must do**. Section 7 says **what exists today** against each requirement, checked in the code. Sections 8-10 are the as-built technical contract. Section 11 is the schedule (12 weeks, maximum 15). Section 12 lists **places where the PRD, the README and the code disagree**; read it before planning work.

---

## 1. Problem and purpose

Students find history dull because it is text and lecture, and a battle is hard to picture. The PM also believes weak history teaching erodes young people's patriotism. **Both are the PM's hypotheses, not findings**; only the first is tested by the class trial (PRD Part 2, §2).

The product turns a textbook history lesson into a 3D simulation grounded in textbooks and state-recognised sources. At the end, a historical figure (for the pilot: Emperor Quang Trung) asks the students what they would do differently, simulates their alternative, compares the numbers with what the ancestors did, and explains the difference. The aim is to widen students' thinking, **not to grade them right or wrong**.

Whether a similar product exists abroad but not in Vietnam is the PM's assessment and is unverified.

## 2. Goals and non-goals (demo)

**Goals** (each is a hypothesis the demo must produce evidence for):

| # | Goal | Measured by (thresholds are set in plan step 1, before building) |
|---|---|---|
| G1 | Students are more interested than in a normal lesson | Short survey vs. a normal class |
| G2 | Students picture and remember the battle better | Short pre- and post-test |
| G3 | The "character asks, student tries another way, compare numbers" loop widens thinking | Count of students who pick and explain a non-original option; interviews |
| G4 | Content is faithful to the sources | Expert review; error/fabrication rate on the character test set |
| G5 | Teachers want to reuse it | Teacher interviews |

**Non-goals** (explicitly out of the demo):

- Selling, or covering the whole textbook.
- Free-text student ideas turned into simulations by AI (later phase, once the basic version is stable).
- VR, a native phone app, real user accounts, payments.
- Any claim that simulated numbers are historical fact.

## 3. Users

| User | Needs | Note |
|---|---|---|
| Student | Understand the lesson, enjoy it, give their own view without fear of being wrong | Level (THCS or THPT) is undecided |
| History teacher | Project it in class, fits one period, follows the textbook | Decides whether it is used |
| History expert / advisor | Make sure content and assumptions do not teach wrong history | Approves; not an end user |
| School | Trustworthy, easy to deploy on existing devices | Potential buyer, unidentified |

**User stories (P0)**

- As a teacher, I want to play, pause, rewind and change the camera on the original battle so that I can stop on any moment and explain it.
- As a student, I want to open the source behind each narration note so that I know where the information comes from.
- As a student, I want to choose a different tactic from a short list so that I can see what would have happened without typing anything.
- As a student, I want the comparison to say clearly that it is a simulation, and to show its assumptions, so that I do not mistake it for history.
- As a student, I want the Emperor to respond encouragingly, never calling me wrong, so that I keep wanting to try again.

## 4. Scope of the demo

**In scope:** one lesson (Ngọc Hồi - Hạ Hồi); 3D simulation of the original course from an approved data set; the Emperor asks 1-2 end-of-lesson questions; 3-5 student-changeable variables chosen from a fixed list; a comparison screen (original vs. new) with a "this is a simulation" notice and the assumption list; runs in a web browser on computer and phone.

**Out of scope:** other lessons; free-text input; VR; native apps; accounts; payments.

## 5. Lesson flow

The PRD describes a 15-20 minute session; the prototype wraps it in a 45-minute lesson plan (§12, item 7).

PRD flow:

1. Teacher opens the lesson and projects the original 3D simulation with narration and sourced notes.
2. Teacher can pause, rewind, change camera.
3. The Emperor appears and asks about the content just covered.
4. The Emperor asks: "if you were us, what would you do differently?" A student (or the class) picks one option per variable.
5. The system simulates the student's plan in 3D.
6. The comparison screen shows original vs. new numbers, a notice that this is a simulation, and the assumptions.
7. The Emperor explains the difference and the real conditions of the time, invites further questions, and **never criticises or declares the student wrong**.

Prototype stages (as built, `prototype/README.md`): Khởi động 5' → Khám phá 3D gốc 10' → Câu hỏi của vua 8' → Thử cách khác 7' → So sánh 8' → Giải thích & Củng cố 7' = 45'.

## 6. Requirements

P0 = required in the demo. P1 = should have if time allows. Acceptance criteria are the PRD's, tightened where the PRD was ambiguous.

| ID | Requirement | Pri | Acceptance criteria |
|---|---|---|---|
| F1 | 3D simulation of the original Ngọc Hồi - Hạ Hồi course | P0 | Course, timestamps and forces match the approved data set; the history advisor signs off |
| F2 | Playback: play, pause, rewind/seek, change camera | P0 | Teacher can stop at any moment |
| F3 | Narration and notes alongside, with sources | P0 | Every key event has a note; clicking shows its source |
| F4 | The Emperor asks 1-2 end-of-lesson questions | P0 | 1-2 questions tied to the lesson |
| F5 | Student picks alternatives from a list of variables | P0 | 3-5 variables, each with ≥2 historically grounded options |
| F6 | Simulation engine runs the student's plan | P0 | Same input always gives the same numbers; every assumption can be viewed |
| F7 | Comparison screen, original vs. new | P0 | Shows the numbers, the notice "this is a simulation" and the assumption list, and the notice cannot be missed on this screen |
| F8 | The Emperor explains the difference, encouragingly | P0 | States context and real conditions; gives no absolute right/wrong verdict |
| F9 | Free Q&A with the character, answers only from the approved data | P1 | Says "tài liệu không ghi lại" when the data has nothing; meets the test-set threshold. **Cut from the demo if not passing at T7.** |
| F10 | Teacher mode: project to class, see the class's choice distribution | P1 | Teacher sees the distribution of student choices in the session |
| F11 | Anonymous trial data: choices, time used, survey results | P1 | Export for the step 9 report; no personal data. Fallback: paper forms |

**Non-functional requirements**

| Area | Requirement |
|---|---|
| Content correctness | Every displayed fact has a source. Content not approved by an expert must not reach students; until then the UI labels it "Nội dung minh họa, chưa được chuyên gia duyệt" and **that label must be kept** |
| Explainability | Every comparison number traces back to engine assumptions and parameters |
| Performance | Runs in a browser on low-end school machines and phones. Concrete thresholds are **not yet set**; set them after testing on real devices (plan checkpoint T5) |
| Language | UI and character in Vietnamese; text normalised to NFC |
| Privacy | Students are minors: collect anonymous data only, no personal information; consent forms from school and parents before the trial |
| Reuse | Engine, asset set and character system are separate from per-lesson content |

## 7. Current status against the requirements (verified 2026-11-01)

Status key: **Built** = works in the prototype; **Partial**; **Not built**. "Built" never means "approved": all lesson content is illustrative and unreviewed.

| ID | Status | Evidence and caveats |
|---|---|---|
| F1 | Built (illustrative) | Silk-map 2.5D scene, 4 camera presets, 4 timeline chapters ([scene-map.js](../../prototype/js/scene-map.js), [lesson-data.js](../../prototype/js/lesson-data.js)). Not expert-confirmed, so the acceptance criterion is **not met** |
| F2 | Built | Play/pause toggle, rewind, timeline slider and camera presets in the viewer and in the 6-stage screens ([index.html](../../prototype/index.html) ~L477-483, 639-645; [app.js](../../prototype/js/app.js) L1550) |
| F3 | Built (unverified sources) | Each chapter has narration, caption, time label and a "Xem nguồn" button ([app.js](../../prototype/js/app.js) L1656). Sources are inline `{book, chapter, quote, note}` strings (e.g. *Hoàng Lê nhất thống chí*, *Đại Nam chính biên liệt truyện*); nothing in the repo checks them against a catalogue (see §12 item 1) |
| F4 | Built | `question.character` speech plus question `q-3` flagged `isEmperorQuestion` |
| F5 | Built | 4 variables × 3 options = 81 combinations (§9.2). Options exceed the PRD's minimum of 2; their historical grounding is unreviewed |
| F6 | Built, verified | Ran all 81 combinations twice through `SimulationEngine.calculate`: identical output every time. The engine has no randomness. Visual jitter of units in the scene uses `Math.random` ([scene-map.js](../../prototype/js/scene-map.js) L429-511); it does not change any number |
| F7 | Built | Notice "ĐÂY LÀ MÔ PHỎNG DỰA TRÊN Ý KIẾN CỦA HỌC SINH VÀ SỰ KIỆN THỰC TẾ, KHÔNG PHẢI SỰ THẬT LỊCH SỬ." hard-coded on the comparison screen ([index.html](../../prototype/index.html) L732); assumptions rendered from `appliedAssumptions` ([app.js](../../prototype/js/app.js) L2322) |
| F8 | Built | `generateExplanation` picks the scripted `variableFeedbacks[variable][option]` text plus an intro and an encouraging conclusion ([engine.js](../../prototype/js/engine.js), [app.js](../../prototype/js/app.js) L2341). Scripted, no LLM |
| F9 | **Not built** | No LLM, no server, by design of the prototype |
| F10 | **Not built** | No class-distribution view exists. The README claims a "38/40" demo survey chart, but nothing in `index.html` or `js/` implements it (§12 item 3) |
| F11 | **Partial** | `LessonStorage.saveStudentRun` stores the last choices/results **per lesson in `localStorage`**, overwriting; there is no export and no survey ([storage.js](../../prototype/js/storage.js) L236-273) |

Only **1 of the 4 seeded lessons is complete**: Ngọc Hồi has 4 chapters and 4 variables. Rạch Gầm (3 chapters), Chi Lăng (1) and the Mongol-Nguyên lesson (0) have no simulation variables, so the question/simulation/comparison stages have nothing to run for them.

## 8. Architecture (as built)

Single-page web app. No build step, no package manager, no test suite. Plain HTML/CSS/JS plus vendored three.js. Static files only; deployed to Vercel from the `prototype/` directory ([vercel.json](../../vercel.json)).

```
prototype/
  index.html          all views in one page, toggled by showView
  js/                 classic <script> tags, shared through window globals
  css/                theme.css (tokens, scene palette) → fonts.css → style.css → editorial.css (loaded last)
  vendor/             three.min.js (~603 KB), OrbitControls.js
  fonts/ assets/      local Noto woff2 (108 KB); sprites override dir (12 KB)
  data/               lesson.root-copy.json, sources.json  (NOT loaded by any script)
```

**Script load order matters** ([index.html](../../prototype/index.html) L913-922): `three.min.js` → `text.js` → `OrbitControls.js` → `auth.js` → `audio.js` → `lesson-data.js` → `storage.js` → `engine.js` → `scene-map.js` → `app.js`.

| Module | Global | Responsibility |
|---|---|---|
| `text.js` | - | Patches `textContent`/`innerHTML` setters to NFC-normalise Vietnamese. Must load first |
| `auth.js` | `window.Auth` | **Client-side demo login only** (`sessionStorage`); `admin` / `123` for both teacher and student. It is not security |
| `audio.js` | `window.BattleAudio` | Procedural Web Audio battle sound |
| `lesson-data.js` | `SEED_LESSONS` | Full lesson schema and the 4 seed lessons |
| `storage.js` | `window.LessonStorage` | Lessons in `localStorage` (seeded when empty), JSON import/export, student visibility rule, one saved student run per lesson |
| `engine.js` | `window.SimulationEngine` | `calculate`, `generateExplanation` |
| `scene-map.js` | `window.BattleScene3D` (class `SilkMapScene`) | Three.js silk-map renderer; `InstancedMesh` sprites; 4 camera presets; HTML overlays for terrain labels (never text in canvas/geometry); PNGs in `assets/sprites/` override procedural sprites |
| `app.js` (~2400 lines) | - | Controller: DOM cache, hash router, teacher dashboard + editor (undo/redo), student dashboard + viewer, 6-stage loop |
| `scene3d.js` | - | Legacy low-poly renderer, **not loaded**; edit `scene-map.js` |

**Routes** (hash router): `#/teacher`, `#/student`, `#/lesson/<id>`, `#/lesson/<id>/edit`, `#/lesson/<id>/preview`, `#/fonttest` (Vietnamese glyph check).

**Scene lifecycle rule:** each surface (editor preview, lesson workspace, student viewer, original/custom stage) owns one `SilkMapScene`, driven through `updateTimeline`, `setCameraPreset`, `updatePropsVisibility`/`applyPropConfig`, `updateFactionColors`, `updateUnitCounts`, `setQuality`. **Call `destroy()` when a view is torn down** so renderers do not accumulate.

**Persistence**

| Key | Content |
|---|---|
| `history_sim_lessons_db_v2` | All lessons. `LessonStorage.init()` seeds only when the key is **absent**, so edits to `SEED_LESSONS` do not show in a browser that already has data. Clear the key or bump `STORAGE_KEY_LESSONS` |
| `history_sim_student_runs` | `{ [lessonId]: {choices, results…, timestamp} }`, last run only |

**Student visibility rule** ([storage.js](../../prototype/js/storage.js) L134-160): students see a lesson only if `status === 'Đã dạy'` **and** `date <= today`. Statuses: `'Nháp' | 'Đã lên lịch' | 'Đã dạy'`.

## 9. Data and simulation contract

### 9.1 Lesson object (one entry of `SEED_LESSONS` / the stored JSON)

| Field group | Fields |
|---|---|
| Identity and plan | `id`, `title`, `subtitle`, `commander`, `opponent`, `year`, `teacher`, `class`, `date`, `subject`, `grade`, `period`, `objectives`, `focusQuestion`, `status`, `isPilot` |
| Labels | `disclaimer` ("Nội dung minh họa, chưa được chuyên gia duyệt"), `simulationDisclaimer`, `introSummary` |
| Chapters | `sections[]`: `id`, `title`, `narration`, `caption`, `timelineRange` (0-1), `timeLabel`, `source {book, chapter, quote, note}` |
| Questions | `questions[]`: `id`, `text`, `type` (`multiple_choice` or `open_discussion`), `sectionId`, `isEmperorQuestion`, `isExplanationReleased`, `options[] {id, text, isCorrect, explanation}` or `guide` |
| Teacher-only | `privateNotes` (hidden in student mode) |
| Baseline | `baseline {durationHours, casualties, positionScore, ratingText}` |
| Scene | `simulation {propsConfig, unitCounts, factionColors, cameraPresets (overview, follow_troops, close_up, top_down), keyframes[{time, preset}]}` |
| The Emperor's question | `question {character {name, dynasty, avatarSvg, greeting, speech}, variables[]}` |
| Variables | `variables[] {id, title, options[] {id, name, shortName, desc, isOriginal, timeDelta, casualtyDelta, positionScoreDelta, assumptions}}` |
| Explanation | `explanations {intro, variableFeedbacks[varId][optId], encouragingConclusion}` |

Rule from the PRD: **tune the model by editing coefficients in lesson data, never in engine code.** The coefficients are the assumption list shown to students.

### 9.2 Engine ([engine.js](../../prototype/js/engine.js))

For each variable, take the chosen option (falling back to the first option, then to a zero-delta default), and sum the deltas:

```
student.durationHours = max(12,  baseline.durationHours + Σ timeDelta)
student.casualties    = max(500, baseline.casualties    + Σ casualtyDelta)
student.positionScore = clamp(baseline.positionScore + Σ positionScoreDelta, 10, 100)
isIdenticalToOriginal = every chosen option has isOriginal === true
```

Outcome tone from `student.positionScore`: identical to original → `perfect`; ≥75 → `positive`; ≥55 → `moderate`; otherwise `challenging`. It returns `original`, `student`, `choiceDetails[]` and `appliedAssumptions[]` (variable, choice, three deltas, explanation text).

**Ngọc Hồi seed data** (all numbers illustrative, none sourced): baseline 36 h, 1,800 casualties, position score 95.

| Variable | Original option | Alternatives (Δtime h / Δcasualties / Δscore) |
|---|---|---|
| 1. Hướng tiến công | `flanking_multidirectional` | `frontal_allout` +8/+950/-18; `siege_starvation` +72/-400/-35 |
| 2. Thời điểm mở màn | `dawn_tet5` | `midday_light` +12/+600/-14; `after_fullmoon` +120/+1100/-40 |
| 3. Che chắn | `wet_straw_shields` | `standard_wood_shields` -4/+850/-15; `dispersed_rush` -6/+1400/-28 |
| 4. Voi chiến | `elephants_vanguard` | `elephants_reserve` +6/+550/-12; `cavalry_instead` -2/+1200/-24 |

**Measured over all 81 combinations:** deterministic (two runs identical); exactly 1 combination equals the original; duration 28-234 h; casualties 1,400-6,450; score 10-95. Tone counts: `perfect` 1, `positive` 4, `moderate` 13, **`challenging` 63**.

> Design concern, not a bug: 63 of the 80 alternative plans (79%) end in the `challenging` tone. Combined with the explanation texts, a student who changes almost anything is told the plan fared badly. That sits uneasily with the PRD rule that the character must not make students feel graded. Decide with the history advisor whether coefficients should be rebalanced so plausible alternatives are not nearly all "challenging". Do it in the data, not the engine.

### 9.3 Labelling rules (must be preserved)

- Permanent footer on lesson views: "⚠️ Nội dung minh họa, chưa được chuyên gia duyệt" ([index.html](../../prototype/index.html) L558).
- A global strip under the header always shows "Nội dung minh họa, chưa được chuyên gia duyệt" ([index.html](../../prototype/index.html) L64).
- The comparison screen always shows the simulation notice (§7, F7).
- Never present a simulated number as history. Do not invent specific historical figures in lesson content; label illustrative numbers as such.
- Terrain labels are HTML overlays; never put Vietnamese text in canvas or geometry (glyph and NFC problems).

## 10. Verification

There is no automated test suite. What exists:

- `bash scripts/check.sh` (also `/check`): `node --check` on `js/*.js`; every `data/*.json` parses; every local `src`/`href` in `index.html` exists; every `js/*.js` (except the legacy `scene3d.js`) is loaded. Runs on every push in CI; Vercel Preview deploys from `Staging`, Production from `main`.
- Manual: load via `cd prototype && python3 -m http.server 8080`, then walk the 6 stages as teacher and as student; check `#/fonttest`.

**Acceptance checklist for the demo (to be run by T9, before the class trial)**

1. All 6 stages complete without console errors, in teacher and student mode, on a real low-end school machine and a phone.
2. Comparison screen shows the simulation notice and the assumption list for every one of the 81 combinations.
3. Same choices give the same numbers across reloads (engine determinism; script exists in the scratch probe used for this spec and should be added to `scripts/`).
4. Student mode never shows `privateNotes`, and never shows a lesson that is not `Đã dạy` with `date <= today`.
5. Every displayed event has a source the advisor has approved; no content reaches students unapproved.
6. F11 export (or paper-form fallback) contains no personal data.
7. Character test set (if F9 is kept): error/fabrication rate under the team's threshold.

## 11. Schedule

Revised 2026-11-01 (Draft 2): **12 weeks planned, hard maximum 15 weeks.** This replaces the 17-week plan in Draft 1 and in the PRD document (see §12 item 11). Week 1 (T1) is **not yet anchored to a date**. Weeks are 1-based and inclusive.

**Structure:** T1-T12 is the committed plan. T13-T15 is a **contingency reserve**, used only when a gate below is missed; it is not planned work. If the work is not done by the end of T15, **cut scope, do not extend the schedule.**

| Step | Weeks | Output / gate | Owner |
|---|---|---|---|
| 0. Prototype v1.0 | **Done**, 24-28/10/2026 | Runnable prototype, illustrative content (F1-F8 built, §7) | Team |
| 1. Lock scope | T1 | One-page scope; success thresholds; **T1 date fixed from the school calendar**; THCS vs. THPT; people, budget, devices | PM |
| 2. Expert partners | T1-3 | ≥1 teacher and ≥1 advisor agree; trial class(es) identified; **school/date commitment due T5** | PM, Content |
| 3. Approved data set | T2-4 | Sourced, labelled data; **advisor approval at end of T4** | Content, Advisor |
| 4. Lesson script | T3-4 | 15-20 min script; 3-5 variables; Emperor's questions and per-option explanations (F4, F8) | PM, Content |
| 5. Engine | T4-7 | Replace placeholder coefficients with sourced ones in lesson data; rebalance the "challenging" skew (§9.2); original run matches the sources; assumptions to advisor at **T6** | AI/Backend |
| 6. 3D scene | T4-7 | Original run follows the approved data; smooth on weak machines; test on a real school device from **T5** | 3D/Frontend |
| 7. AI character | T5-7 | P0 scripted part is already built and needs no LLM. P1 F9 (LLM + RAG) **cut at end of T7 if below threshold** | AI/Backend |
| 8. Integrate and prepare | T8-9 | **T9: runs end to end, no blockers.** Teacher rehearsal; consent forms; survey and pre/post test ready; F11 export or paper fallback ready | Whole team |
| 9. Class trial | T10-11 | 1-2 classes; collect data against a normal class | PM, Content |
| 10. Evaluate | T12 | Report with numbers; decision: expand to next lesson or rework | PM |
| Contingency | T13-15 | Absorbs slips only. Nothing is scheduled here | PM |

**Why 12 is possible.** The prototype already runs the whole loop (F1-F8). Steps 5 and 6 are therefore content and tuning work on existing code, not a build from scratch, and the engine is already deterministic (§9.2).

**What 12 costs** (compared with the 17-week plan):

- Advisor approval is due at the end of **T4**, not T6, so it is the critical path. Everything in steps 5-8 uses the approved data.
- The buffer week is no longer inside the plan; it moved to the contingency reserve.
- Steps 5, 6 and 7 end at T7 and step 8 cannot start before they do. Step 8 is 2 weeks, not 3.
- The trial is 2 weeks (T10-11) and the report 1 week (T12).
- F9 is expected to be cut unless it clearly passes at T7. F10 and F11 should be treated as minimal (paper-form fallback is acceptable for F11).
- This needs **4-5 people full-time**. With part-time staffing, expect to use the reserve and plan for the 15-week maximum.

**Gates that trigger the reserve:**

| Gate | If missed |
|---|---|
| T4: advisor approves the data set | Each week of delay pushes steps 5-9 by one week; the trial moves into the reserve |
| T5: school and trial date committed | The trial cannot be fixed; escalate, find a second school |
| T9: end-to-end with no blockers | Use reserve weeks before the trial starts, not during it |
| T7: F9 below threshold | Cut F9 (no extension) |

Known pressure point: **T4** carries the advisor sign-off, the script finishing and steps 5-6 starting, so it is the most likely slip.

**Calendar.** The trial (T10-11) must not land on exams or the Tết Đinh Mùi school break (Tết day 1 = Saturday 6 Feb 2027; the school's break dates are unconfirmed). Example: if T1 is Monday 16 Nov 2026, T10-11 is 18-31 Jan 2027, T12 is 1-7 Feb 2027, and the reserve (T13-15) falls inside the Tết break, so it would not be usable. A later T1 pushes the trial into Tết. Fix the T1 date in step 1, and confirm the trial dates with the school by T5.

## 12. Discrepancies and gaps (decide or fix before relying on the docs)

1. **`prototype/data/sources.json` is for a different lesson.** Its 4 entries cover Soviet NEP / the 1922 USSR map (textbook *Lịch sử và Địa lí 9*, Bài 1), the 2013 Constitution, the Ngọc Lũ drum and a flag-usage guideline. None supports Ngọc Hồi - Hạ Hồi. The Ngọc Hồi lesson cites its sources inline instead, and nothing links the two. So the PRD's "approved data set" (plan step 3) **does not exist yet**.
2. **Grade level.** The seed lesson says `grade: 'Khối 11'` (THPT). The only textbook in the repo is *Lịch sử và Địa lí 9* (THCS). The PRD leaves THCS-vs-THPT open. Settle it in step 1; it decides which textbook is the reference and the vocabulary level.
3. **README overclaimed F10. Fixed.** `prototype/README.md` described a class-survey chart ("38/40") that no code implements; the README now marks it as not built. F10 stays **not built**.
4. **Accounts.** The PRD puts "tài khoản người dùng" out of scope. The prototype has a demo login and a teacher dashboard/editor with import/export beyond what the PRD asks for. Keep the login labelled demo-only; it protects nothing. Decide whether the editor is in scope for the demo or a bonus that costs maintenance.
5. **F11.** Only a per-lesson `localStorage` record exists (no export, no survey, one run kept). It cannot support the step 9 report.
6. **PRD said single-file + `lesson.json`.** The running app takes lessons from `js/lesson-data.js` and `localStorage`; `data/lesson.root-copy.json` is not loaded. Fine for the prototype; the real content pipeline (step 3 → 4) must define one source of truth.
7. **Session length.** PRD: 15-20 min. Prototype lesson plan: 45 min (6 stages 5/10/8/7/8/7). They fit together only if the PRD's 15-20 min is the simulation core inside a 45-minute period; confirm with the teacher partner.
8. **Hard-coded vs. data-driven notice.** The comparison-screen notice is hard-coded in `index.html`; the per-lesson `simulationDisclaimer` field is read only in the workspace tab ([app.js](../../prototype/js/app.js) L1432). Changing the field does not change the 6-stage comparison text.
9. **Unreviewed numbers.** Baseline (36 h, 1,800 casualties, 95) and all deltas are placeholders. The seed text also states figures such as "100 voi chiến" and "29 vạn quân" that are not tied to an approved source. They must go through step 3 before any student sees them.
10. **Scene randomness.** The scene's unit placement is randomised on every load; two projections of the same lesson look slightly different. Acceptable for the demo; matters only if screenshots must be reproducible.

11. **Timeline conflict. Fixed.** The PRD document (`docs/prd/…`) was updated on 2026-11-01 to the same 12-week plan (maximum 15), including its Gantt chart, step weeks, milestones and risks. It does not yet contain the "12 weeks is too tight" risk row or the two new open questions from §13 (team size, advisor).
12. **Wording mismatch. Partly fixed.** The UI says "Nội dung minh họa, chưa được chuyên gia duyệt" (header strip and footer) and `prototype/README.md` now says the same. The root `CLAUDE.md` still says "Dữ liệu minh họa"; the UI string is the one this spec quotes.

## 13. Open questions

| Question | Owner | Blocks |
|---|---|---|
| Date of T1; school calendar, breaks and exams of the trial school | PM | Step 1 (blocking) |
| Is the team 4-5 people full-time? The 12-week plan assumes yes | PM | Step 1 (blocking) |
| Who is the history advisor? Approval is due end of T4 | PM | Step 3 (blocking) |
| THCS or THPT? Which textbook edition is the standard, and who signs off? | PM, Advisor | Steps 1, 3 (blocking) |
| Whole class with a teacher, or self-study at home? | PM | Step 1 (blocking) |
| Team size, budget, trial devices | PM | Step 1 |
| Where do 3D assets and images come from, and under what licence? | PM | Step 6 |
| Is the teacher editor in scope for the demo? | PM, Dev | Maintenance cost |
| Rebalance the coefficients so alternatives are not 79% "challenging"? | Advisor, Content | Step 5 |
| Product name; who is the buyer (school, teacher, parent)? | PM | Not blocking the demo |
| Fixed choice list (recommended) or free input for the demo? | PM | Already leaning to a fixed list; confirm |

## 14. Risks

| Risk | Mitigation |
|---|---|
| No history advisor or teacher found | Start contact in week 1; use prototype v1.0 as the pitch |
| The AI character says something wrong or invented | RAG over the approved set only, "tài liệu không ghi lại" when unknown, trap-question test set; cut F9 at T7 if it fails |
| Simulated numbers read as fact | Notice on every comparison, visible assumptions, simple explainable model |
| 3D costs too much time or money | Prefer clear over beautiful; reuse assets |
| Weak school devices | Web, light 3D, low-quality mode, test on real machines from T5 |
| Students feel graded | Encouraging character voice; teacher reads the script; review the 79% "challenging" skew |
| Trial lands on a school break or exam period | Fix T1 from the school calendar; confirm the trial date with the school by T5; the 15-week maximum leaves no room to move step 9 past Tết if T1 is late (§11) |
| School or parents refuse data collection from minors | Consent forms ready by T9; anonymous data only; paper-survey fallback |
| 12 weeks is too tight (advisor approval slips, part-time staffing) | Gates and reserve in §11; cut F9, F10 and F11 first; never extend past T15 |
