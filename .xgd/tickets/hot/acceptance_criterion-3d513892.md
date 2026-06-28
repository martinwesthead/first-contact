---
uid: acceptance_criterion-3d513892
id: AC-620
type: acceptance_criterion
title: AI commentary becomes multimodal when a desktop screenshot is available, attaching
  it as an image block and asking for visual observations
created_by: xgd
created_at: '2026-06-28T19:58:11.742904+00:00'
updated_at: '2026-06-28T19:58:11.742904+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-15bae45e
  kind: behavior
  regression_only: false
---

## Criterion
When a desktop screenshot has been captured to R2 for the analysis, the Haiku 4.5 commentary call includes that screenshot as a base64 `image/png` image content block in the user message, and the system prompt instructs the model to comment on visual properties (alignment, density, imagery/hero treatment, layout). The model's response may therefore carry a summary sentence referring to what is visible in the image. The deterministic fallback still applies when no model key is configured or the call fails.

## Verification
Invoke `analyze_page` with a stubbed Anthropic endpoint and a desktop screenshot present in the assets bucket. Assert exactly one model call is made; its request body's `messages[0].content` contains an `image` block whose `source.type === "base64"` and `source.media_type === "image/png"`; and the system prompt text references visual properties (e.g. `visual`, `alignment`, or `density`).
