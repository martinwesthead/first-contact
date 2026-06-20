---
uid: request-0f327580
id: REQ-37
type: request
title: Robust transcription pipeline with error reporting
created_by: xgd
created_at: '2026-06-20T21:08:41.521098+00:00'
updated_at: '2026-06-20T22:54:03.785172+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
  commits:
  - e5cec1a8782609483c46747956de1b8eb3b3a5f8
  - a1ed6998efaae1601b8611e960723b6f8d5bc069
  version: 0.0.16
---

The `transcribe_site` + `read_transcription_digest` flow needs to surface failures at each stage rather than silently continuing. Specifically:

- Each asset mirror should report success/failure individually

- The digest write should confirm before the tool returns

- `read_transcription_digest` should never return a stale or partial digest

- Tool call failures during the module-building phase should be collected and reported back to me as a summary so I can retry failed steps rather than silently missing them

## Decisions (2026-06-20)

1. **Asset mirror reporting** — per-asset SSE events already fire. Add the failed URLs + reasons to the final tool-return `summary` payload (currently only aggregate counts). Shape: `summary.assetFailures: Array<{ url, reason }>`.

2. **Digest write confirmation** — after `bucket.put(digestKey, ...)`, do a read-back (`bucket.get`) and verify the round-tripped JSON parses and matches a sentinel (e.g., `capturedAt`). If verification fails, return `failed` with `digest_write_unverified`.

3. **Stale/partial digest** — at Stage 0 of `transcribe_site`, delete the previous digest from R2 before anything else runs. `read_transcription_digest` returns a distinct `not_ready` status (not the generic `digest_not_found` error) when nothing is present, so the AI can poll without it looking like a hard failure.

4. **Module-building failure summary** — client-side panel + AI context reinjection:
   - `chat-driver` accumulates `action:failed` events (and any `action:notify` events carrying `status === "failed"`) for actions invoked after `transcribe_site` returns.
   - Failures are surfaced in a builder-UI panel the user can dismiss/retry.
   - On the next AI turn, the accumulated failures are appended to the chat context as a system note ("Previous turn had N failed module-building tool calls: …") so the AI can retry without the user manually prompting.