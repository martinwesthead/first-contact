---
uid: acceptance_criterion-8a0e288d
id: AC-646
type: acceptance_criterion
title: Response Content-Type maps to the correct file extension, with .bin fallback
created_by: xgd
created_at: '2026-06-28T20:40:18.942301+00:00'
updated_at: '2026-06-28T20:40:18.942301+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-5d1952ba
  kind: behavior
  regression_only: false
---

## Criterion
The mirror operation derives the stored object's file extension and canonical content type from the response `Content-Type`: `image/png`→png, `image/jpeg`→jpg, `image/webp`→webp, `image/svg+xml`→svg, `image/gif`→gif, `image/avif`→avif, `video/mp4`→mp4, `video/webm`→webm, `video/quicktime`→mov. Charset/parameter suffixes on the header are ignored. A missing or unrecognized `Content-Type` falls back to extension `bin` (canonical `application/octet-stream`), and the bytes are still stored.

## Verification
For each supported content-type, mirror an asset and assert the returned storage key ends with the expected extension. Mirror an asset whose header includes a `; charset=...` suffix and assert it still resolves to the base type's extension. Mirror an asset with no `Content-Type` and one with an unknown type, and assert each yields a `.bin` key while still writing the object.
