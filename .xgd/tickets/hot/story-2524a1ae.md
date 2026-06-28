---
uid: story-2524a1ae
id: STORY-61
type: story
title: 'Convert flow chat cards: confirm a destructive conversion and watch transcription
  progress'
created_by: xgd
created_at: '2026-06-28T20:54:56.677695+00:00'
updated_at: '2026-06-28T20:54:56.677695+00:00'
completed_at: null
last_field_updated: created_at
status: unplanned
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-e343131c
  story_kind: feature
  story_points: 2
---

## Story
**As an** operator using the builder chat, **I want** the convert flow to present a clear "this will overwrite your draft" confirmation card and a live progress card, **so that** I consciously authorize a destructive site conversion and can watch each transcription stage — including which assets failed to import — without leaving the chat.

## Description
When the operator asks the AI to convert an existing website, two builder chat-card variants surface the flow inside the chat stream (mounted through the builder's tool-result dispatcher):

**Convert confirmation card.** The first conversion attempt does not overwrite anything; instead the builder renders a warning-toned "Convert site" card containing the destructive-overwrite prompt text and an "I own this site" checkbox (unchecked by default), with **Confirm** and **Cancel** actions. Confirming records the operator's consent (and, if the ownership checkbox is checked, requests a per-origin robots override) and lets the conversion proceed; cancelling abandons it. The card collapses after either choice. The card itself performs no API calls — it emits a signal the chat driver wires to the confirm-and-re-invoke turn.

**Transcribe progress card.** Once a confirmed conversion is running, the builder renders an info-toned "Converting {url}" card whose body is a four-row stage list — Screenshot, Theme, Modules, Assets mirrored — initially all pending. As stage events stream in, each row updates **in place** (no card re-render) to reflect started / completed / failed status. During asset mirroring the "Assets mirrored" row shows a running N/M count; any asset that fails to import appears in a "What couldn't mirror" sub-section naming the asset URL and the failure reason, and the count reflects the failures.

**In scope:** the two card variants, their rendering, the confirm/cancel signalling contract, the in-place progress update behaviour, and the failed-mirror surface.

**Out of scope (owned elsewhere):** the `transcribe_site` / `confirm_convert` server orchestration and consent storage (CAP-47 convert orchestration story), asset mirroring to R2 (CAP-47 asset-mirror story), theme-token derivation and the transcription digest (CAP-47 digest story), and the underlying chat-card primitive + tool-result dispatcher (CAP-38 Builder UI, [[REQ-13]]).

## Technical Context
- Both variants register against the [[REQ-13]] tool-result dispatcher and reuse the existing `<ChatCard>` primitive (tones, collapsible body, action buttons) from CAP-38 Builder UI.
- The confirmation card emits browser CustomEvents (`fc:convert-confirmed` / `fc:convert-cancelled`) carrying `{ url, ownsSite }`; the chat driver listens and issues the follow-up `confirm_convert` + `transcribe_site` turns. The card is deliberately side-effect-free beyond emitting the signal.
- The progress card holds its state in DOM data-attributes so a sequence of streamed stage events updates one card without re-rendering. The stage event shape consumed is `{ tool: "transcribe_site", stage: 1|2|3|4, status: "started"|"completed"|"failed"|"asset_mirrored"|"asset_failed", ... }`; events for other tools or malformed shapes are ignored.
- **Intent/code divergence (flagged for regression):** the REQ-28 intent body specs the progress card registered under `kind: "transcribe_progress"` and an SSE event named `transcribe_progress`. The net-state code (after REQ-30 reshaped REQ-28) registers the progress card under `kind: "transcribe_site_done"` and feeds it stage events whose payload is keyed by `tool: "transcribe_site"`. The reconciled behaviour follows the code; ACs describe the observable card behaviour, not the registration key.
- Confirmation prompt text matches the intent contract: "Convert will replace your current draft with a transcription of {url}. This cannot be automatically undone. Continue?"

## Dependencies
None. (The plan sequences the convert orchestration story to consume these cards, but the cards themselves have no build dependency.)

## Story Points
2
