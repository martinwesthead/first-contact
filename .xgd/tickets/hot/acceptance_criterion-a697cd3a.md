---
uid: acceptance_criterion-a697cd3a
id: AC-696
type: acceptance_criterion
title: End-to-end convert reproduces source body text verbatim
created_by: xgd
created_at: '2026-06-28T22:54:59.024249+00:00'
updated_at: '2026-06-28T22:54:59.024249+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ddc928fd
  kind: behavior
  regression_only: false
---

## Criterion
A full chat-loop reconstruction of a converted source site produces a draft whose text-block body content matches the source text verbatim after the capture round-trip, under whitespace normalization — the model references captured copy rather than rewriting it.

## Verification
Drive an end-to-end convert + reconstruction over an assets-heavy fixture, render the resulting draft, and assert character equality (normalized) between the rendered body paragraph content and the corresponding source paragraph content.