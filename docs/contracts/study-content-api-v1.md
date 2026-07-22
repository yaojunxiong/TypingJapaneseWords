# Study Content API v1

## Decision

Study exposes versioned, read-only lesson content for the future AIOS BFF. The browser-facing AIOS workspace is out of scope for this API, and Study remains the content authority.

Endpoints:

- `GET /api/v1/lessons` returns `LessonSummary[]`.
- `GET /api/v1/lessons/{lessonNo}` returns `LessonDetail`.

Every DTO, including nested roles, lines, and media, carries `schemaVersion: "1"`. The response types mirror the Mission 022A AIOS contracts instead of exposing Study database or source-file shapes.

## Source mapping

The adapter reads the existing Lesson 1–50 JSON and `loadRecitationLesson()` data. It does not copy lesson content or query Supabase.

| Public field | Existing Study source |
| --- | --- |
| `lessonId` | Deterministic `minna_lesson_NN` course identity; verified against source IDs when present |
| `lessonNo` | Existing lesson number, used for display and route lookup |
| `title` | Lesson JSON Japanese and Chinese title |
| `topic` | Lesson JSON Japanese and Chinese subtitle when both exist |
| `description` / objectives | Lesson JSON Japanese and Chinese focus when both exist |
| roles | Unique real speakers from recitation lines |
| lines | Existing recitation line IDs, order, Japanese, reading, Chinese, and original-audio links |
| media | Existing public conversation image, video, subtitle, conversation audio, and line audio URLs |

Lesson 39–50 source files do not currently carry all top-level metadata fields used by Lesson 1–38. The adapter uses the deterministic course identity and returns nullable optional fields rather than inventing missing content.

## Stable identity rules

- `lessonId`: `minna_lesson_NN`, where `minna` is the stable course namespace and `NN` is the official lesson identity within that course.
- `lineId`: reuse the existing approved source `lineId`; a missing or duplicate source ID is a mapping failure. Array position is never an ID.
- `roleId`: first 20 hex characters of SHA-256 over `lessonId + "speaker" + normalized source speaker name`, prefixed with `role_`.
- `mediaId`: first 20 hex characters of SHA-256 over `lessonId + semantic media slot`, prefixed with `media_`. Slots include `conversation-cover`, `conversation-video`, `conversation-subtitle`, and `line:{lineId}:original-audio`.
- media `version`: full SHA-256 of public media kind, MIME type, and URL. Updating a media URL changes its version without changing its semantic media ID.
- `contentVersion`: full SHA-256 of the canonical version-1 public lesson DTO before `contentVersion` is attached.

SHA input objects are serialized with sorted object keys. Source array reordering does not change IDs, and line output order is derived from the existing explicit `order` field.

## Errors

Errors use the versioned `StudyApiError` shape and never return raw exceptions or stacks.

| Code | HTTP | Retryable |
| --- | ---: | --- |
| `INVALID_LESSON_NO` | 400 | no |
| `LESSON_NOT_FOUND` | 404 | no |
| `CONTENT_MAPPING_FAILED` | 500 | no |
| `INTERNAL_ERROR` | 500 | yes |

Error responses use `Cache-Control: no-store`.

## Cache and access policy

The endpoints are public and read-only because they contain only the lesson content already used by public Study pages. They contain no progress, recordings, membership state, unlock decisions, user identifiers, Supabase rows, storage paths, or server configuration.

Successful responses use:

`Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400`

Next.js revalidation is one hour. The API does not enable browser-to-Study cross-origin access; the future AIOS BFF remains the browser-facing boundary.

The repository contains official-textbook provenance labels but no explicit content-access restriction policy. This adapter exposes only URLs and text already used by the public Study product. Broader redistribution or third-party syndication still requires a separate content-rights review.
