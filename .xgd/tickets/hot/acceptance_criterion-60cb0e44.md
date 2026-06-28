---
uid: acceptance_criterion-60cb0e44
id: AC-650
type: acceptance_criterion
title: Page-management tools are offered on the AI site-editing surface
created_by: xgd
created_at: '2026-06-28T20:47:29.402203+00:00'
updated_at: '2026-06-28T20:47:29.402203+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
The builder's AI tool surface advertises three page-management tools as site state-editing tools: `add_page` (accepting `slug` and `title`, with an optional `after_slug`), `remove_page` (accepting `slug`), and `reorder_pages` (accepting a `slugs` array). Each is categorised as a state-editing tool (the same category as the module/theme editing tools), so the assistant can select them during a chat-driven edit.

## Verification
Inspect the operator tool surface exposed to the assistant; assert that an entry exists for each of the three tool names, that each declares its documented required inputs, and that each is categorised as a state-editing tool.
