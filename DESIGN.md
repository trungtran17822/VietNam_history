---
name: Sử Việt
description: History lessons on a silk-painting tabletop map, sized for a classroom projector.
colors:
  lacquer: "#1f4037"
  lacquer-deep: "#173129"
  page-ivory: "#f4eedd"
  card-paper: "#fbf7ec"
  silk: "#efe5cd"
  ink: "#2a2622"
  ink-muted: "#6b6256"
  rule-straw: "#cdbf9f"
  vermilion-action: "#8e2b22"
  vermilion-action-deep: "#76241e"
  faction-a-vermilion: "#a8412f"
  faction-b-indigo: "#3e5c76"
  moss-ok: "#345743"
  amber-warn: "#7a4a12"
  notice-straw: "#e9dcbc"
  simulation-notice: "#f3e1c9"
typography:
  display:
    fontFamily: "Noto Serif, Times New Roman, serif"
    fontSize: "clamp(1.728rem, 1.2rem + 1.6vw, 2.074rem)"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "Noto Serif, Times New Roman, serif"
    fontSize: "1.44rem"
    fontWeight: 600
    lineHeight: 1.25
  title:
    fontFamily: "Noto Serif, Times New Roman, serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Noto Sans, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
  metric:
    fontFamily: "Noto Serif, Times New Roman, serif"
    fontSize: "1.44rem"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
  xl: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.vermilion-action}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.vermilion-action-deep}"
  button-secondary:
    backgroundColor: "{colors.card-paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
    height: "44px"
  field:
    backgroundColor: "#fffdf7"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
    height: "44px"
  card:
    backgroundColor: "{colors.card-paper}"
    rounded: "{rounded.xl}"
  header:
    backgroundColor: "{colors.lacquer}"
    textColor: "{colors.page-ivory}"
    height: "64px"
  chip-active:
    backgroundColor: "{colors.lacquer}"
    textColor: "{colors.page-ivory}"
    rounded: "{rounded.pill}"
  status-published:
    backgroundColor: "#dde9d8"
    textColor: "{colors.moss-ok}"
    rounded: "{rounded.pill}"
  status-scheduled:
    backgroundColor: "#f0e3bd"
    textColor: "#72531e"
    rounded: "{rounded.pill}"
  status-draft:
    backgroundColor: "#e8e1d2"
    textColor: "#665d53"
    rounded: "{rounded.pill}"
---

# Design System: Sử Việt

## Overview

**Creative North Star: "The Lacquered Lesson Plan"**

A teacher's lesson plan bound in a lacquered cover: a dark green lacquer band frames the work, and everything inside is flat ivory paper ruled with thin straw-coloured lines. The silk-painting map is the one rich, textured object on the page, so it reads as the thing to look at from the back of a classroom. Everything around it stays quiet, legible and orderly.

The primary user is a teacher driving a projector, so the system favours large hit areas (44 px minimum), high contrast and a calm hierarchy over decoration. Students use the same screens on phones at 360 px; nothing scrolls sideways. Depth comes from tonal paper layers and 1 px rules, not from shadows. The only brand commitments are the name Sử Việt and the seal logo (PRODUCT.md); the rest of the identity is the silk palette inherited from the v1 renderer.

**Key Characteristics:**
- Lacquer-green header, ivory paper page, cards one tone lighter, straw rules.
- One action colour (vermilion lacquer) for the primary action per area.
- Serif (Noto Serif) for headings, the class code and result numbers; sans (Noto Sans) for everything else. Both are local files.
- Mandatory labels are part of the layout, never hidden: the prototype strip at the top, the footer line, and the simulation notice first on the comparison screen.

## Colors

A warm, low-chroma silk palette with one lacquer green and one vermilion; faction colours live only on the map and in data.

### Primary
- **Vermilion Lacquer** (#8e2b22): primary buttons, selected choice borders, the active stepper number, focus rings on paper. White text on it is 9.5:1.
- **Lacquer Green** (#1f4037): the header band, active chips and camera pills, the class code, the login curtain (#173129). Ivory on it is above 10:1.

### Secondary
- **Faction A Vermilion** (#a8412f) and **Faction B Indigo** (#3e5c76): default colours of the two sides on the map and in the class distribution bars. A lesson may override them in `factions`.

### Neutral
- **Page Ivory** (#f4eedd): page background.
- **Card Paper** (#fbf7ec): cards, panels, inputs sit one step lighter (#fffdf7).
- **Silk** (#efe5cd): the map table colour; hover fill for list rows.
- **Ink** (#2a2622): body text. **Ink Muted** (#6b6256): secondary text, 5.1:1 on the page.
- **Straw Rule** (#cdbf9f): 1 px borders and dividers.
- **Moss** (#345743) for confirmations and the "original" badge; **Amber** (#7a4a12) for warnings that are not errors.

### Named Rules
**The Map Is The Colour Rule.** Saturated pigment belongs on the silk map. UI chrome stays ivory, ink and lacquer; vermilion is reserved for the one primary action in each area.

**The Pigments Live In CSS Rule.** The scene reads `--silk-ivory`, `--vermilion`, `--scene-*` and friends from `frontend/src/styles.css` at runtime. Add a token there, never a hex value in `src/scene/`.

## Typography

**Display Font:** Noto Serif (with Times New Roman)
**Body Font:** Noto Sans (with Arial)

**Character:** A scholarly serif for what a teacher would write on the board (titles, the character's speech, results), a plain humanist sans for controls. Both cover every Vietnamese diacritic; `#/fonttest` checks them.

### Hierarchy
- **Display** (700, clamp 1.73–2.07 rem, 1.25): page titles.
- **Headline** (600, 1.44 rem): stage titles, section heads, modal titles.
- **Title** (600, 1.2 rem): card titles, variable names.
- **Body** (400, 1 rem, 1.6): narration and copy; keep lines under ~75ch.
- **Label** (600, 0.875 rem): field labels, chips, stepper names.
- **Metric** (700 serif, 1.44 rem, tabular numbers): comparison numbers, class counts.

### Named Rules
**The No Kicker Rule.** No small uppercase eyebrow above a heading. Context goes in a muted meta line after the title.

## Layout

A centred container (max 90 rem, 16 px gutters). Lesson screens use a two-column grid on desktop, the map or main content first and a 22 rem side column (chapters, class panel, quick-try panel); on phones the side column stacks, with the class join card placed above the choices. The 6-stage stepper is a horizontal strip that scrolls on phones and shows only the active step's name. Spacing follows 4/8/16/24/32 px.

## Elevation & Depth

Flat paper with tonal layers: page → card (one step lighter) → field (lighter still), separated by 1 px straw rules. Shadows exist only for things that float above the page.

### Shadow Vocabulary
- **Overlay** (`box-shadow: 0 18px 48px rgb(43 41 38 / 0.18)`): modals, menus, the class toast.
- **Map frame** (`box-shadow: 0 6px 20px rgb(43 41 38 / 0.12)`): the player frame, so the map reads as an object on the table.

### Named Rules
**The Flat Paper Rule.** Cards never carry a shadow. If something needs to stand out, give it a tone or a rule, not a lift.

## Shapes

Soft rectangles: 8 px for controls, 10–12 px for cards and panels, pills only for chips, camera presets, status chips and rating dots. No coloured side stripes on callouts; notices use a full tinted background instead.

## Components

- **Buttons**: primary (vermilion), secondary (paper with a straw rule), quiet (text only), danger (paper with vermilion text). All 44 px tall (36 px for the small toolbar size). Icons are the authored 24 px stroke set in `components/ui.tsx`; never emoji.
- **Choice tiles** (`.variable-option`): the whole tile is the hit area; the checked tile gets a vermilion border and a faint warm fill. The original option carries a moss "original" badge whose text comes from the lesson.
- **Stepper** (`.lesson-stepper`): numbered circles, a check mark for completed steps, the active one filled vermilion; steps 4–6 are disabled for lessons without variables.
- **Player**: map, camera pills over the map (top right), a paper control bar below (timeline, readout, rewind, play, speed).
- **Class panel**: paper card; the class code in large spaced serif on an ivory well; live bars in faction indigo (moss for the original option).
- **Notices**: the prototype strip (straw band), the simulation notice (warm sand panel with a warning glyph), the scene caveat (small label in the map corner).

## Do's and Don'ts

- **Do** keep every mandatory label verbatim (`.claude/rules/content-labeling.md`).
- **Do** keep 44 px targets and visible focus rings (3 px, vermilion on paper, ivory on lacquer).
- **Do** honour reduced motion: transitions collapse, the camera jumps instead of gliding, the login curtain lasts 250 ms.
- **Don't** put text inside the 3D scene; labels are HTML overlays.
- **Don't** grade students in copy: results are "differences from the original", never right or wrong.
- **Don't** add gradient text, glassy cards, hard offset shadows or a second accent colour.
