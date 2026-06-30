---
uid: acceptance_criterion-7065dc16
id: AC-815
type: acceptance_criterion
title: Scrolling to the top of the chat log loads the next older page with scroll-position
  anchoring; exhausted sessions stop requesting
created_by: xgd
created_at: '2026-06-30T04:43:22.627202+00:00'
updated_at: '2026-06-30T04:43:22.627202+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The builder shows the tail (most-recent messages) of the active chat session and pages older messages on demand. When the operator scrolls to the top of the message list and older messages remain unloaded, the builder requests the next older page — the page immediately preceding the oldest currently-loaded message — and prepends those messages to the chat log, visually anchoring the scroll position so the view does not jump as content is inserted above it. When the session has no older messages remaining, the builder records that the log is fully loaded and issues no further older-page requests on subsequent scroll-to-top.

## Verification

Activate a session whose message count exceeds one page. Confirm boot renders only the tail. Scroll to the top and confirm: a request for the page before the oldest loaded message is issued, the returned messages are prepended, and the previously-topmost message stays under the operator's eye (scroll position compensated for the inserted height). Repeat until the session is exhausted; confirm that once no older messages remain, further scroll-to-top events issue no additional requests.
