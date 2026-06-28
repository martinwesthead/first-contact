---
uid: acceptance_criterion-86d842f5
id: AC-717
type: acceptance_criterion
title: Nav, page-metadata, and duplicate-module tools are offered on the AI site-editing
  surface and documented
created_by: xgd
created_at: '2026-06-28T23:54:09.831657+00:00'
updated_at: '2026-06-28T23:54:09.831657+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e893e643
  kind: behavior
  regression_only: false
---

## Criterion
The builder's AI tool surface advertises `set_nav_pattern`, `set_nav_entries`, `set_page_metadata`, and `duplicate_module` as state-editing tools (same category as the module/theme/page tools), each declaring its documented inputs. These four tools are also surfaced to the assistant through the system-prompt editing rules and the reproducing-a-website how-to (including a 'wire up the nav' step instructing `set_nav_entries` after adding pages).

## Verification
Inspect the operator tool surface and assert an entry exists for each of the four tool names, categorised as state-editing tools with their required inputs; confirm the system prompt / how-to text references the four tools and the nav-wiring step.