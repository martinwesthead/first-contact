---
uid: capability-e343131c
id: CAP-47
type: capability
title: Site Transcription (Convert Flow)
created_by: xgd
created_at: '2026-06-28T20:09:20.865858+00:00'
updated_at: '2026-06-28T20:09:20.865858+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: site_transcription_convert_flow
---

# Site Transcription (Convert Flow)

The operator-facing "convert an existing website" capability: an operator
pastes the URL of a live site and 1st Contact mechanically converts the
analyzed Reference Digest into an editable draft of their own site within
the framework — a recognizable reproduction (palette, typography, text,
images, page count), not a pixel-perfect clone.

This capability is **mechanical orchestration only**. It builds and persists
a structured TranscriptionDigest artifact (theme tokens, per-page plan,
R2-mirrored asset inventory) and drives the staged progressive reveal; the
chat AI is the synthesizer that reads the digest and reconstructs the draft
via its structured-edit and page-CRUD tools. There is no internal LLM
site-synthesis step.

Reconciled from BUNDLE-4 (REQ-28 as reshaped by REQ-30).
