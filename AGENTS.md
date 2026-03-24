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

## Ant Design icon safety

- Every used Ant Design icon must be explicitly imported.
- Never introduce JSX icon usage without verifying imports.
- Always run a compile check before committing.
