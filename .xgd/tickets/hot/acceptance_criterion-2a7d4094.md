---
uid: acceptance_criterion-2a7d4094
id: AC-813
type: acceptance_criterion
title: Four server-executed AI memory tools, site-scoped, do not emit FE tool-pane
  SSE events
created_by: xgd
created_at: '2026-06-30T04:29:59.226650+00:00'
updated_at: '2026-06-30T04:29:59.226650+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-ba9f2715
  kind: behavior
  regression_only: false
---

## Criterion

The Anthropic tool list for a turn carries, in addition to the plan-tier-filtered builder tools, four read-only **AI memory tools** executed server-side: `search_transcripts` (full-text search over this site's prior chat messages, returning session id / ordinal / snippet hits), `read_session_range` (a contiguous ordinal range of messages from any session in this site), `list_reference_docs` (the platform reference-doc index), and `read_reference_doc` (one doc's full body, or a single named section when a `section` is given, falling back to the full body when the section is not found). These tools are **site-scoped**: transcript search and range reads only see sessions whose `site_id` matches the request's session, and a `session_id` belonging to another site is reported to the model as not-found rather than returning its messages. The reference docs available to the model are also listed in the system prompt. Memory-tool invocations and their results are fed back to the model (so it can chain lookups within the turn) but are **not** emitted as client-facing `tool_call` / `tool_result` SSE events, so they never surface in the front-end tool-use pane.

## Verification

For a turn whose stubbed upstream response calls `search_transcripts`, assert (1) the four memory-tool names appear in the upstream `tools` list alongside the builder tools; (2) hits returned to the model are limited to messages from the requesting site (a message in another site's session is absent); (3) no `tool_call` or `tool_result` SSE event is emitted for the memory call (only builder-tool calls surface to the FE). For `read_session_range` with a `session_id` owned by a different site, assert the model receives a not-found error rather than that session's messages. For `read_reference_doc` with a `section`, assert the returned body is narrowed to that section, and that an unknown section yields the full body.
