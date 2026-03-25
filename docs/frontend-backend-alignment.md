# Frontend ↔ Backend API Alignment

## 1) Purpose

This document clarifies the **current API contract** between the frontend (`meow-media-frontend`) and backend (`django-auth-core`) so frontend engineers can:

- use endpoints that are actually available,
- rely on stable response fields,
- identify risky assumptions already present in frontend code,
- apply safe compatibility handling without changing backend APIs.

---

## 2) Endpoint inventory

## Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`

## Videos (authenticated)
- `GET /api/videos/`
- `POST /api/videos/`
- `GET /api/videos/{id}/`
- `PATCH /api/videos/{id}/`
- `DELETE /api/videos/{id}/`
- `POST /api/videos/{id}/regenerate-thumbnail/`

## Public videos / categories
- `GET /api/public/videos/`
- `GET /api/public/videos/{id}/`
- `GET /api/public/categories/`

## Live
- `GET /api/live/`
- `GET /api/live/{id}/`
- `POST /api/live/create/`
- `POST /api/live/{id}/start/`
- `POST /api/live/{id}/end/`

## Engagement
- `GET /api/public/videos/{id}/interaction-summary/`
- `POST /api/videos/{id}/like/`
- `DELETE /api/videos/{id}/like/`
- `GET /api/public/videos/{id}/comments/`
- `POST /api/videos/{id}/comments/`
- `POST /api/channels/{id}/subscribe/`
- `DELETE /api/channels/{id}/subscribe/`

## Admin
- `GET /api/admin/videos/`

---

## 3) Endpoint contract details

> Notes:
>
> - Request/response examples below reflect **current frontend usage** and **current backend implementation/docs**.
> - `stable fields` are generally safe to depend on.
> - `optional/risky fields` should be normalized or treated defensively.

## Auth

| Method | Path | Frontend usage | Request shape | Response shape | Stable fields | Optional / risky fields |
|---|---|---|---|---|---|---|
| POST | `/api/auth/register` | Create account | `{ email, password }` | `{ user? }` (tokens may be absent) | `user.email` (when returned) | access/refresh may be missing; frontend currently falls back to login |
| POST | `/api/auth/login` | Sign in | `{ email, password }` | `{ access, refresh }` | `access`, `refresh` | backend error payload variants (`detail`, `non_field_errors`, field arrays) |
| POST | `/api/auth/refresh` | Refresh access token | `{ refresh }` | `{ access }` (refresh may not rotate) | `access` | refresh rotation not guaranteed |
| GET | `/api/auth/me` | Resolve current user | Bearer token | user profile | `id`, `email` | `username` may be absent in backend response |

## Videos (authenticated)

| Method | Path | Frontend usage | Request shape | Response shape | Stable fields | Optional / risky fields |
|---|---|---|---|---|---|---|
| GET | `/api/videos/` | My videos list | Bearer token | paginated list of videos | `id`, `title`, `category`, `created_at` | some deploys may return array vs paginated object |
| POST | `/api/videos/` | Upload video | `multipart/form-data` (`title`, `file`, optional `description`, `category`) | created video | `id`, `title`, `file_url?` | processing fields (`thumbnail_url`, `file_url`) may be unavailable immediately |
| GET | `/api/videos/{id}/` | Video detail | Bearer token | video object | `id`, `title`, `description` | `thumbnail_url`, `file_url` may be delayed |
| PATCH | `/api/videos/{id}/` | Update metadata | JSON (`title`, optional `description`, `category`) | updated video | `id`, updated metadata | category validation depends on backend category set |
| DELETE | `/api/videos/{id}/` | Delete video | Bearer token | 204/empty | HTTP success status | no response body expected |
| POST | `/api/videos/{id}/regenerate-thumbnail/` | Trigger thumbnail regeneration | optional JSON | video/empty | HTTP success status | async result timing; may not return immediate new thumbnail |

## Public videos / categories

| Method | Path | Frontend usage | Request shape | Response shape | Stable fields | Optional / risky fields |
|---|---|---|---|---|---|---|
| GET | `/api/public/videos/` | Browse/list public videos | query: `search`, `category`, `ordering`, `page`, `page_size` | paginated list | `results[]`, `count`, `id`, `title`, `category_display` | unsupported ordering values may be ignored by backend |
| GET | `/api/public/videos/{id}/` | Public detail page | none | video object | `id`, `title`, `description`, `owner_name` | `owner_avatar_url` may be empty |
| GET | `/api/public/categories/` | Sidebar/filter/category options | none | list (possibly paginated) | `slug`, `name` | `id` may be absent; treat optional |

## Live

| Method | Path | Frontend usage | Request shape | Response shape | Stable fields | Optional / risky fields |
|---|---|---|---|---|---|---|
| GET | `/api/live/` | Live listing | optional Bearer token | list/paginated live streams | `id`, `title`, `status`, `category`, `viewer_count` | nested `creator` not guaranteed by backend |
| GET | `/api/live/{id}/` | Live room detail | none | live stream object | `id`, `status`, `stream_key`, `rtmp_url`, `playback_url` | `playback_url` may be empty before stream starts |
| POST | `/api/live/create/` | Create live session | JSON (`title`, optional `category`, `description`, optional `visibility`, optional `payment_address`) | created live stream | `id`, `status`, `stream_key` | `rtmp_url` may depend on server config |
| POST | `/api/live/{id}/start/` | Start lifecycle state | Bearer token | updated live stream | `status` transition | streaming pipeline external availability still required |
| POST | `/api/live/{id}/end/` | End lifecycle state | Bearer token | updated live stream | `status` transition | playback cleanup timing can vary |

## Engagement

| Method | Path | Frontend usage | Request shape | Response shape | Stable fields | Optional / risky fields |
|---|---|---|---|---|---|---|
| GET | `/api/public/videos/{id}/interaction-summary/` | likes/comments/subscription summary | optional Bearer token | summary object | `video_id`, `like_count`, `comment_count`, `viewer_has_liked`, `viewer_is_subscribed`, `subscriber_count` | none significant |
| POST | `/api/videos/{id}/like/` | Like video | Bearer token | updated summary | same as summary | none significant |
| DELETE | `/api/videos/{id}/like/` | Unlike video | Bearer token | updated summary | same as summary | frontend currently ignores returned summary |
| GET | `/api/public/videos/{id}/comments/` | List comments | query: `page`, `page_size` | paginated comments | `results[]`, `count`, `next`, `previous` | user profile subfields may be partially empty |
| POST | `/api/videos/{id}/comments/` | Create comment | JSON (`content`, optional `parent_id`) | created comment | `id`, `content`, `created_at`, `user` | reply threading fields may vary by backend evolution |
| POST | `/api/channels/{id}/subscribe/` | Subscribe channel | Bearer token | `{ channel_id, subscriber_count, viewer_is_subscribed }` | all listed fields | frontend currently ignores returned payload |
| DELETE | `/api/channels/{id}/subscribe/` | Unsubscribe channel | Bearer token | `{ channel_id, subscriber_count, viewer_is_subscribed }` | all listed fields | frontend currently ignores returned payload |

## Admin

| Method | Path | Frontend usage | Request shape | Response shape | Stable fields | Optional / risky fields |
|---|---|---|---|---|---|---|
| GET | `/api/admin/videos/` | Admin video list/manage | query-driven filters | paginated admin list | `results[]`, `count` | role gating (403) for non-admin users |

---

## 4) Known mismatches / risks

1. **Browse ordering mismatch**
   - Frontend offers ordering by `title` / `-title`.
   - Backend public list currently only guarantees `created_at` / `-created_at` handling.
   - Impact: UI appears to support A–Z/Z–A but backend may ignore it.

2. **Live creator mapping mismatch**
   - Frontend normalization supports nested `creator`.
   - Backend stable fields are `owner_id` / `owner_name`.
   - Impact: creator display can fall back to generic labels.

3. **Subscribe/unsubscribe response ignored**
   - Backend returns authoritative subscription state/count.
   - Frontend service typing treats these as `void` and doesn’t reconcile state from server response.
   - Impact: optimistic UI can drift from backend truth.

4. **Unlike response ignored**
   - Backend returns updated interaction summary on unlike.
   - Frontend currently treats unlike as `void` and uses optimistic local decrement.
   - Impact: potential count drift under concurrent updates.

5. **List shape variability assumptions**
   - Frontend defensively accepts array or paginated object in multiple services.
   - Impact: helpful for compatibility, but hides strict contract expectations and can mask backend regressions.

---

## 5) Frontend-safe recommendations (minimal)

1. **Constrain browse ordering to backend-supported values**
   - Keep only `created_at` and `-created_at` unless backend officially adds title ordering.

2. **Normalize live owner fields explicitly**
   - In live normalization, map `owner_name` into display creator fallback (without requiring nested `creator`).

3. **Consume authoritative responses for unlike/subscribe**
   - Update frontend service typings to parse returned summary/subscription payloads.
   - Merge backend response into local state after optimistic updates.

4. **Keep defensive parsing, but log/monitor unexpected shapes**
   - Preserve array-vs-paginated compatibility, but add lightweight diagnostics in development to detect contract drift early.

5. **Document required vs optional fields per screen**
   - For each page (browse/live/detail), keep a concise field dependency list to reduce accidental assumptions.

---

## 6) Non-goals

- This document **does not modify backend APIs**.
- This document **is not a backend redesign proposal**.
- This document **does not implement code changes** by itself; it is a contract reference for frontend-safe implementation decisions.
