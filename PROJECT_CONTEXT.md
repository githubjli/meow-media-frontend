# PROJECT_CONTEXT.md

## Project Name

Meow Media Stream (Frontend)

## Current Stable Baseline

The current UI baseline is restored from commit:

ac167e9

This version is considered the last stable reference for layout and header behavior.

---

## Product Positioning

A clean, modern media streaming platform UI:

- YouTube-like browsing experience
- Supports video + live streaming
- Demo-friendly + scalable architecture

---

## Design System (CRITICAL)

### Theme

- Light: warm beige / gold tone (NOT pure white)
- Dark: soft dark (NOT pure black)
- Avoid high contrast harsh dark mode

### Visual Style

- Rounded cards (12–16px radius)
- Soft shadows (not heavy)
- Subtle borders (#f0e6d2 style)
- Premium + warm feeling (NOT cold tech style)

---

## Layout System (STRICT)

### Global Layout

Header (top) Sidebar (left) Content grid (center)

---

### Header (FINAL STRUCTURE)

Left:

- Logo (Meow Media Stream, NOT translated)
- Search bar

Right:

- Go Live button (PRIMARY CTA)
- Theme toggle (light/dark)
- User avatar (dropdown trigger)

❗ DO NOT:

- Add extra icons in header
- Reintroduce global language button

---

### User Dropdown (FINAL)

Order MUST be:

1. My Videos
2. Upload Video
3. Go Live

--- divider ---

4. Language (submenu)

   - English
   - 中文
   - ไทย
   - မြန်မာ

5. Settings
6. Help

--- divider ---

7. Log out

---

### Sidebar

- Home
- Browse
- Category list

Categories MUST be localized:

- 中文 → 2 字优先（科技 / 教育 / 游戏 / 新闻 / 娱乐 / 其他）

---

## Card System (VERY IMPORTANT)

### VideoCard = GOLD STANDARD

All cards MUST follow this structure:

- Thumbnail (16:9)
- Duration badge (bottom-right)
- Category label
- Title
- Meta (author + time)

---

### LiveCard (MUST MATCH VideoCard)

❗ DO NOT redesign separately

Must follow:

- Same width
- Same grid (4 per row)
- Same spacing
- Same border radius

Differences allowed:

- Status badge (top-left)
  - small size
  - strong contrast
  - no large background block

Example:

- ready → green dot + text
- ended → gray

---

## Grid System

- Desktop: 4 cards per row
- Equal spacing
- No extra vertical gaps

---

## i18n Strategy

Supported languages:

- en-US
- zh-CN
- th-TH
- my-MM

Rules:

- Use Umi locale system
- Default = browser language
- Fallback = English

❗ Brand name "Meow Media Stream" MUST NOT be translated

---

## Header Behavior Rules

- Theme toggle MUST exist
- User avatar MUST exist
- Go Live MUST exist

❗ Any PR removing these is INVALID

---

## Known Pitfalls (DO NOT REPEAT)

- ❌ Header actions disappearing
- ❌ Live cards using different layout
- ❌ Hardcoded English text
- ❌ Missing icon imports (crash risk)
- ❌ Over-dark dark mode

---

## Development Approach

- Minimal changes only
- No global refactors
- No redesign without approval
- UI consistency > new features

---

## How to Work (FOR AI)

Before any change:

1. Read AGENTS.md
2. Read PROJECT_CONTEXT.md
3. Summarize current structure
4. Propose minimal patch
5. Then implement
