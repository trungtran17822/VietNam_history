# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: a history teacher at the classroom projector.** A Vietnamese lower or upper secondary (THCS/THPT) history teacher runs one 45-minute period from a school PC or laptop projected at about 1280×720. They play the original course of a battle on the map, pause to explain, open sources, put the character's question to the class, and lead the comparison and wrap-up. They also prepare lessons beforehand in the editor (content, questions, simulation variables) and decide when a lesson is published to students.
- **Second: students on their own phones.** Students (about 40-45 per class) follow at stage 3 on a 360 px phone: they enter a 6-character class code, pick one option per variable, run the simulation, and answer an optional 3-question survey. After class they revisit published lessons on their own.

## Product Purpose

Sử Việt teaches a Vietnamese history lesson through a 2.5D map ("sa bàn") and a fixed 6-stage loop: warm-up, the original battle, the character's question ("what would you have done differently?"), the student's alternative simulated, a transparent comparison with history, and an encouraging explanation. Success is a class that argues about trade-offs using the lesson's sources, not a class that memorises outcomes.

## Positioning

The simulation is deterministic and transparent: every number comes from coefficients declared in the lesson data, the same choices always give the same result, and the student can open every assumption. The comparison is always labelled as a simulation, never as historical truth. The class session lets the teacher see the whole class's choices live without accounts or names.

## Operating Context

- A projector in a lit classroom; the teacher stands away from the screen, so text and controls must read at a distance and work with a mouse or clicker.
- Student phones on school or mobile data; the class server can be unreachable and the lesson must still run.
- The lesson plan ritual: date, class, period (45 minutes), objectives, focus question, status Nháp → Đã lên lịch → Đã dạy.
- Sources: the Lịch sử và Địa lí 9 textbook (`docs/sources/`) and chronicles quoted inline per chapter.

## Capabilities and Constraints

- Roles: teacher and student, demo login only (`admin` / `123`); no real accounts, CMS or analytics (out of scope for v2).
- Lessons live in the browser (`localStorage`); one JSON file per lesson ships with the app. Students only see lessons with status "Đã dạy" and a date not in the future.
- Class session API (Cloudflare Worker): 6-character code, 60 answers, 12 h window, anonymous CSV; stores no names, emails or IPs.
- All UI text and content in Vietnamese with full diacritics (NFC).
- Static build on Vercel; the 3D map loads on demand.

## Brand Commitments

- Name: **Sử Việt**.
- Logo: the round seal in `frontend/public/assets/logo/logo-transparent.png`.
- Content labels are mandatory and verbatim: "Nội dung minh họa, chưa được chuyên gia duyệt" (header strip and footer) and the comparison screen's simulation notice.

## Evidence on Hand

- One complete pilot lesson (Ngọc Hồi - Hạ Hồi 1789); three seed lessons without simulation variables (being completed in session S2); two more lessons planned.
- All simulation numbers are illustrative placeholders. No historian has reviewed the content yet; no testimonials, adoption figures or study results exist and none may be invented.

## Product Principles

1. The lesson never blocks: no network, WebGL or class-server failure stops a teacher from finishing the period.
2. Transparency over spectacle: every simulated number can be traced to a declared coefficient and is labelled as a simulation.
3. Encourage, never grade: explanation text praises reasoning and explains historical conditions; it never calls a choice wrong.
4. The projector is the main stage: design for a teacher explaining to a room, then for a student's phone.
5. Adding a lesson is adding data, not code.

## Accessibility & Inclusion

WCAG 2.1 AA: text contrast ≥ 4.5:1, visible keyboard focus, touch targets ≥ 44 px on phones, no horizontal scroll at 360 px, `prefers-reduced-motion` respected. Fonts are local (Noto Sans / Noto Serif with Vietnamese subsets) so diacritics render offline.
