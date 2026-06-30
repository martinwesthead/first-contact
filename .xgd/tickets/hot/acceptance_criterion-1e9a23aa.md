---
uid: acceptance_criterion-1e9a23aa
id: AC-791
type: acceptance_criterion
title: Static-only cached digests are force-upgraded to rendered before transcription
  (best-effort)
created_by: xgd
created_at: '2026-06-30T01:39:22.903449+00:00'
updated_at: '2026-06-30T01:39:22.903449+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-b3866352
  kind: behavior
  regression_only: false
---

## Criterion
When a page's cached Reference Digest was captured static-only (its `fetchPath`
is `"static"`), a convert upgrades it via the rendered fetch path before
assembling the transcription digest. The upgrade runs for the home page and for
every same-origin nav-linked page that already has a cached digest, and is gated
by the browser budget. On success the upgraded Reference Digest persisted in the
fetch cache has `fetchPath: "rendered"` with a desktop screenshot key, and the
resulting transcription's per-page plan carries that screenshot — subsequent
read-backs of the cached digest see the rendered view rather than the static one.

The upgrade is best-effort: when the browser binding is absent, the browser
budget is exhausted, or the rendered fetch driver fails, the convert emits a
progress notification (`render_upgrade_skipped` / `render_upgrade_failed`) and
proceeds with the existing static digest — the page still appears in the
transcription, just without a screenshot, and the conversion does not fail.

## Verification
Convert a site whose cached home digest has `fetchPath: "static"` with a stub
rendered-fetch driver available: assert the driver was invoked, assert the
digest re-read from the fetch cache now has `fetchPath: "rendered"` and a desktop
screenshot key, and assert the resulting per-page plan exposes the screenshot.
Then repeat with no browser binding (or an exhausted budget) and assert the
convert still succeeds against the static digest and emits a render-upgrade-
skipped notification.
