---
uid: acceptance_criterion-ab438543
id: AC-822
type: acceptance_criterion
title: analyze_page renders a static-rich (non-SPA) page by default, returning rendered
  fetchPath and screenshots
created_by: xgd
created_at: '2026-06-30T06:09:20.760028+00:00'
updated_at: '2026-06-30T06:09:20.760028+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
`analyze_page` renders a content-rich, non-SPA page by default: even when the static signal extractors would have produced a complete digest on their own, the action still runs the Browser-Rendering path and returns `fetchPath: "rendered"` with all three viewport screenshots (`mobile`, `tablet`, `desktop`) and computed typography. There is no body-density or script-ratio gate that keeps a static-rich page on the static path; rendering is unconditional whenever Browser Rendering is available and within budget.

## Verification
Invoke `analyze_page` with an injected rendered-fetch driver against a static-rich (non-SPA) HTML fixture whose visible body text comfortably exceeds the old thin-body threshold. Assert `result.status === "ok"`, `payload.digest.fetchPath === "rendered"`, and that `payload.digest.screenshotKeys` carries non-empty `mobile`, `tablet`, and `desktop` keys.
