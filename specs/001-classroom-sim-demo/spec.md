# Feature Specification: Classroom simulation demo (Ngọc Hồi - Hạ Hồi) with class session

**Feature Branch**: `Dat/feature/core` (spec dir `specs/001-classroom-sim-demo`)

**Created**: 2026-11-03

**Status**: Ready for planning (review round 3 passed, see [reviews.md](reviews.md))

**Input**: User description: "Design the system for this project from the PRD (`docs/prd/PRD và lộ trình demo Mô phỏng lịch sử 3D.docx`): a Vietnamese 3D history lesson where Emperor Quang Trung asks the class what they would do differently, simulates the alternative, compares it with history and explains the difference. Sync Trung's new UI, keep frontend and backend in separate folders, and make it deployable (Vercel + Cloudflare) without over-engineering."

**Scope of this spec**: the demo of one lesson. F1-F8 (PRD P0) already run in the prototype; this
spec states them as requirements so they can be verified, and adds the two P1 features that need
more than one device: **F10** (class choice distribution) and **F11** (anonymous trial data).
**F9** (free Q&A with an LLM character) is **deferred** and out of scope here (PRD gate T7).

## Clarifications

### Session 2026-11-03 (decided with documented defaults; confirm with the PM at plan step 1)

- Q: How does a student device join the class view without accounts (PRD: no user accounts)? → A: The teacher opens a *class session* that shows a short code on the projector; students type the code on their device. No names are asked.
- Q: Who may see the class distribution and export data? → A: Only the device that opened the session (it holds a secret teacher key shown nowhere else). The code alone lets a device *submit*, not *read*.
- Q: How long does a session accept answers, and how long is data kept? → A: Answers are accepted for 12 hours after the session opens. Data is kept until the teacher deletes the session, and at most 180 days (long enough for the trial report at T12).
- Q: What does the survey ask? → A: Three 1-5 ratings after the explanation screen: interest ("Em thấy bài học hôm nay thú vị như thế nào?"), ability to picture the battle ("Em hình dung diễn biến trận đánh rõ đến đâu?"), and wish to learn this way again ("Em có muốn học các bài khác theo cách này không?"). All optional, no free text.
- Q: Maximum class size? → A: 60 responses per session (covers a Vietnamese class of 40-45 with margin).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Teacher projects the original battle with sourced narration (Priority: P1)

A history teacher opens the Ngọc Hồi - Hạ Hồi lesson on the classroom projector, plays the original
course of the battle on the silk-map sandbox, pauses at any moment, rewinds, changes the camera,
and opens the source behind each narration note while explaining.

**Why this priority**: It is the core of the demo (F1-F3); every other story starts from it.

**Independent Test**: Log in as teacher, open the lesson, run stage 2 of the 6-stage flow: play,
pause, seek, switch each of the 4 camera presets, click a chapter, open "Xem nguồn".

**Acceptance Scenarios**:

1. **Given** the lesson is open at stage 2, **When** the teacher presses play, **Then** the battle advances through the 4 chapters in time order and the time readout updates.
2. **Given** playback is running, **When** the teacher presses pause or drags the timeline, **Then** the scene stops or jumps to that moment within one second.
3. **Given** any chapter, **When** the teacher opens its source, **Then** book, chapter, quote and note are shown.
4. **Given** any lesson screen, **Then** the notice "Nội dung minh họa, chưa được chuyên gia duyệt" is visible.

---

### User Story 2 - The Emperor asks, the class tries another way, compares and hears the explanation (Priority: P1)

After the original course, Emperor Quang Trung asks "Nếu là các con… các con sẽ làm khác ở điểm
nào?". A student (or the class together) picks one option for each variable, watches the simulated
alternative, sees a comparison with the original that is clearly labelled as a simulation, opens
the assumptions, and hears an encouraging explanation. They can try again.

**Why this priority**: It is the learning loop the demo exists to test (F4-F8, goal G3).

**Independent Test**: Run stages 3-6 with the original choices and with every alternative of one
variable; check numbers, notice, assumptions and explanation text.

**Acceptance Scenarios**:

1. **Given** stage 3 of the Ngọc Hồi lesson, **Then** its 4 variables are shown, each with 3 options, and the original (historical) option is preselected and marked "Cách của nghĩa quân Tây Sơn".
2. **Given** a set of choices, **When** the simulation is run twice (also after reload), **Then** the comparison numbers are identical.
3. **Given** the comparison screen opens, **Then** the simulation notice is its first element and the view scrolls so the notice is on screen (1280×720 projector and 360 px phone), and "Xem giả định" lists every applied coefficient.
4. **Given** any choice set, **When** the explanation shows, **Then** it gives one point per variable on the historical conditions and none of its text (intro, points, closing, outcome summary) contains a grading word from the list in SC-008.
5. **Given** stage 6, **When** "Thử phương án khác" is pressed, **Then** stage 3 reopens with the previous choices kept.

---

### User Story 3 - Teacher sees the class's choices live (Priority: P2)

At stage 3 the teacher opens a class session. The projector shows a 6-character code. Students
open the lesson on their own phones or PCs, enter the code, make their choices and run the
simulation. The teacher's screen shows, per variable, how many students chose each option, updated
within a few seconds, and how many students have answered.

**Why this priority**: PRD F10 (P1). It makes the "what would you do" question a class discussion
and produces the G3 evidence (how many students pick a non-original option).

**Independent Test**: Teacher device opens a session; two other browser contexts join with the
code and submit different choices; the teacher panel shows count 2 and the right distribution.

**Acceptance Scenarios**:

1. **Given** the teacher is at stage 3, **When** they press "Mở phiên lớp", **Then** a code of 6 characters without look-alike characters (0/O, 1/I/L) is shown in large type with the answer count 0.
2. **Given** a valid code, **When** a student enters it at stage 3 and presses "Chạy mô phỏng", **Then** their choices are recorded, the student sees "Đã gửi lựa chọn tới lớp", and the teacher's count increases by 1 within 5 seconds.
3. **Given** a student changes choices and runs again, **Then** their previous answer is replaced, not added (count unchanged).
4. **Given** a wrong or expired code, **When** a student submits, **Then** they see "Mã phiên không đúng hoặc đã hết hạn" and their own lesson continues normally.
5. **Given** the service is unreachable, **Then** the teacher sees "Chưa kết nối được máy chủ lớp học; bài học vẫn chạy bình thường trên máy này" and every stage of the lesson still works.
6. **Given** a student device, **Then** no control to see other students' answers exists.

---

### User Story 4 - Anonymous trial data and export (Priority: P3)

At the end of the lesson each student may answer three 1-5 questions. The session records, for each
anonymous device, the choices, the time spent in the 6-stage flow and the survey answers. The
teacher downloads the session data as CSV for the trial report.

**Why this priority**: PRD F11 (P1), needed for step 9 (class trial). A paper-form fallback exists,
so it ranks below US3.

**Independent Test**: Two student contexts submit choices and survey answers; the teacher exports
CSV; the file has 2 rows with choices, duration and ratings and no personal data columns.

**Acceptance Scenarios**:

1. **Given** a student device that joined a session reaches stage 6, **Then** the three survey questions are shown and each may be left blank. Devices not in a session see no survey and send nothing.
2. **Given** survey answers, **When** submitted, **Then** they are attached to the same anonymous answer as the student's choices.
3. **Given** the teacher presses "Tải dữ liệu (CSV)", **Then** a UTF-8 CSV downloads with one row per answer and columns: code, lesson, anonymous id, each variable's choice, seconds spent, three ratings, last update time.
4. **Given** any export, **Then** it contains no name, email, IP address or free text.
5. **Given** the teacher presses "Xoá phiên", **Then** the session and all its answers are deleted and the code stops working.

---

### User Story 5 - Teacher drafts a lesson from a sourced document, gated by source review (Priority: P3)

The teacher adds new lesson content with its source (title, publisher, link, year, the claim it
supports). The lesson is created as a draft and cannot be published to students until the teacher
confirms they have checked the content against the source.

**Why this priority**: Trung's UI update (content intake). Supports the PRD rule that unreviewed
content never reaches students; not needed for the Ngọc Hồi demo itself.

**Independent Test**: Create a draft through "Bắt đầu", try to publish (blocked), confirm the
source check, publish.

**Acceptance Scenarios**:

1. **Given** the intake form, **When** a required field is empty or the link is not HTTPS, **Then** the form explains what to fix and creates nothing.
2. **Given** a lesson created from intake, **Then** its status is draft and a notice shows the source awaiting review.
3. **Given** that notice, **When** the teacher has not confirmed the source check, **Then** publishing is refused with an explanation.

---

### Edge Cases

- Lessons without simulation variables (the 3 other seed lessons): stage 3 says "Bài học này chưa có phần thử cách khác" and offers to return to the lesson, instead of an empty form; stages 4-6 cannot be reached.
- WebGL unavailable or very slow device: the lesson text, chapters, sources, question, comparison and explanation still work; the scene area shows a short notice; low quality mode reduces drawn units.
- Teacher reloads the page during a session: the session (code and teacher key) is restored on that device, for the same lesson, until it expires.
- A student who joined but loses the connection: the submission fails with a retry message; the lesson continues; pressing "Chạy mô phỏng" again retries.
- A student's device joins a session for a different lesson than the one open: the code is refused with "Mã phiên này dành cho bài học khác".
- A 61st answer: refused with "Phiên đã đủ số lượng"; the student's lesson continues.
- Malformed or oversized request bodies are rejected without storing anything.
- Two teachers in different classes: each session is independent; codes do not collide with an open session.
- Student opens the lesson by link while it is a draft or scheduled for a later date: "Bài học chưa mở" (existing visibility rule).
- Phone 360 px wide: no horizontal page scroll; buttons at least 44 px tall.

## Requirements *(mandatory)*

### Functional Requirements

Lesson playback and sources (F1-F3)
- **FR-001**: The system MUST play the original battle in a 2.5D/3D scene following the lesson's chapters and time ranges.
- **FR-002**: Users MUST be able to play, pause, rewind to start, seek to any point, and switch among 4 camera presets at any moment.
- **FR-003**: Each chapter MUST show narration, a time label and a way to open its source (book, chapter, quote, note).

Question, simulation, comparison, explanation (F4-F8)
- **FR-004**: After the original course, the character MUST ask 1-2 questions tied to the lesson, including "what would you do differently".
- **FR-005**: Students MUST pick one option for each of 3-5 variables from a fixed list; free text input MUST NOT exist.
- **FR-006**: The simulation MUST produce identical results for identical choices and MUST derive every number from coefficients declared in lesson data.
- **FR-007**: The comparison screen MUST show original vs. student values for duration, estimated losses and position score, the simulation notice, and an assumptions list with every applied coefficient.
- **FR-008**: The explanation MUST cover each variable's historical conditions, end with an invitation to keep thinking, and offer "try another way" that keeps the previous choices.

Class session (F10)
- **FR-009**: A teacher MUST be able to open a class session for a lesson and see its join code; the code MUST be 6 characters from the 31-character alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0, O, 1, I, L) and MUST NOT equal the code of another unexpired session. Only teacher-role users see this control.
- **FR-010**: A student device MUST be able to join with the code and submit its choices; a resubmission from the same device MUST replace its earlier answer.
- **FR-011**: The teacher MUST see the number of answers and, per variable, the count per option, refreshed at least every 5 seconds while the panel is open.
- **FR-012**: Only the device holding the session's teacher key MUST be able to read the distribution, export or delete the session.
- **FR-013**: A session MUST accept answers for 12 hours and at most 60 answers.

Trial data (F11)
- **FR-014**: The system MUST record, per anonymous answer, the time spent in the 6-stage flow (whole seconds from opening stage 1 to the latest submission, capped at 7,200) and up to three optional integer ratings from 1 to 5.
- **FR-015**: The teacher MUST be able to export a session as UTF-8 CSV (with BOM, so spreadsheet apps show Vietnamese correctly).
- **FR-016**: The teacher MUST be able to delete a session and all its answers; sessions MUST be deleted automatically after 180 days.

Labelling, privacy, resilience
- **FR-017**: The labels "Nội dung minh họa, chưa được chuyên gia duyệt" (global strip and lesson footer) and the comparison-screen simulation notice MUST be visible on every viewport and MUST NOT be removable by lesson data.
- **FR-018**: The system MUST NOT collect or store names, emails, IP addresses, device fingerprints or free text from students in session data.
- **FR-019**: Every stage of the lesson MUST work when the class session service is unreachable; session-only controls MUST say so in plain Vietnamese.
- **FR-020**: Student mode MUST NOT show teacher private notes or lessons that are not published (status "Đã dạy" and date not in the future).

Content intake (Trung's update)
- **FR-021**: The teacher MUST be able to create a draft lesson from content plus a source (title, publisher, HTTPS link, optional year, supported claim) and MUST NOT be able to publish it before confirming the source check.

### Key Entities

- **Lesson**: one teaching unit (chapters with sources, questions, variables with options and coefficients, baseline, explanations, status, date). Lives in the browser; seeded from the app.
- **Variable / Option**: a choice the student can change; each option declares its deltas (time, losses, score) and assumption text. The original option is flagged.
- **Simulation result**: original and student values, tone, applied assumptions. Computed in the browser, never stored on the server.
- **Class session**: join code, lesson id, opening time, expiry, hashed teacher key.
- **Anonymous answer**: session code, random device id, choices (variable → option), seconds spent, optional ratings, last update time. No identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A teacher goes from login to the original battle playing in under 60 seconds on a school PC.
- **SC-002**: 100% of the 81 choice combinations give identical numbers on repeated runs, and each shows the simulation notice and its assumptions.
- **SC-003**: With 40 student devices answering, the teacher sees each new answer within 5 seconds.
- **SC-004**: A student joins a class session and submits in under 30 seconds after seeing the code.
- **SC-005**: Exported trial data has one row per student device and 0 fields that identify a person.
- **SC-006**: With the class service switched off, a full 6-stage run completes with 0 blocking errors.
- **SC-007**: The first screen is usable within 3 seconds on a typical school connection, and the page never scrolls sideways on a 360 px wide phone.
- **SC-008**: For all 81 choice combinations, the explanation and outcome texts contain none of the grading words "sai", "sai lầm", "thất bại", "kém", "tệ", "dở", "ngu" (whole-word, case-insensitive).

## Assumptions

- Lesson content stays illustrative until the advisor approves the data set at T4; labels stay on.
- The demo login (admin/123) remains a client-side demo convenience, not security; real accounts are out of scope (PRD).
- Lesson authoring data stays in the browser (localStorage) for the demo; only class-session data goes to the server.
- Schools have internet for the class session; without it, the lesson still runs and the paper-form fallback covers F11.
- The trial uses one session per class period; one teacher device per session.
- Hosting: frontend as static files, backend as a small serverless service with a managed SQL store; both on free tiers for the demo.
