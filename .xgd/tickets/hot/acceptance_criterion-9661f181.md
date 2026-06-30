---
uid: acceptance_criterion-9661f181
id: AC-816
type: acceptance_criterion
title: Builder auto-manages a single chat session per (site, browser) with no session-management
  UI in v1
created_by: xgd
created_at: '2026-06-30T04:43:27.719692+00:00'
updated_at: '2026-06-30T04:43:27.719692+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The builder auto-manages exactly one chat session per (site, browser) pair. On boot it activates a session by the following order: the active session id stored in browser storage for this site if that session still exists on the server; otherwise the most-recently-used session for the site; otherwise a freshly created session. A session always exists after boot — the chat panel never shows a "no active session" empty state — and the chosen session persists across reloads. The chat panel exposes no session-list, new-chat, inline-title-edit, or delete-session affordances in v1; session selection and creation are automatic, not operator-driven.

## Verification

Boot against a site with no existing sessions and confirm exactly one session is created and made active. Boot with a stored active session id that exists on the server and confirm that session is reactivated. Boot with the stored id absent (or no longer on the server) but other sessions present for the site, and confirm the most-recently-used session is activated. Inspect the chat panel and confirm it presents no controls to list, create, rename, or delete sessions.
