# AGENTS.md

## Project

This is a React frontend for a media streaming platform. The backend provides JWT auth APIs, admin APIs, and video upload/list APIs.

## Current goal

Focus on frontend polish and backend integration. Do not implement Ant Media integration yet unless explicitly asked.

## Priorities

1. Improve layout and navigation
2. Connect login/register to backend auth APIs
3. Connect upload/list/detail to backend video APIs
4. Keep the UI simple, clean, and demo-friendly

## API assumptions

Backend base URL is configurable. Use Bearer token auth. Auth endpoints:

- /api/auth/register
- /api/auth/login
- /api/auth/refresh
- /api/auth/me

Video endpoints:

- /api/videos/
- /api/videos/<id>/

## Rules

- Keep changes minimal and incremental
- Do not refactor unrelated code
- Reuse existing components where possible
- Prefer frontend-friendly error handling
- Add clear loading, empty, and error states

## Validation

- App should run locally after changes
- Do not break existing routes
- Summarize changed files and test steps

## UI Consistency Rules (CRITICAL)

- LiveCard MUST reuse VideoCard layout and spacing
- DO NOT introduce new card designs
- Header structure is fixed (see PROJECT_CONTEXT.md)
- Any removal of header actions is forbidden

---

## Icon Safety Rule

- Every icon used in JSX MUST be imported from '@ant-design/icons'
- NEVER use icons that are not imported
- ALWAYS verify before commit

---

## i18n Rules

- No hardcoded UI text
- Always use intl.formatMessage
- Brand name MUST NOT be translated

---

## Change Strategy

Before coding:

1. Explain what will change
2. Show affected files
3. Keep patch minimal
4. Do NOT refactor unrelated code

---

## Validation Checklist

Before commit:

- UI layout unchanged unless intended
- Header still has:
  - Go Live
  - Theme toggle
  - User avatar
- Live and Video grid are consistent
- No console errors
