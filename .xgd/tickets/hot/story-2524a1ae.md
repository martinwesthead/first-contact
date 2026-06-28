---
uid: story-2524a1ae
id: STORY-61
type: story
title: 'Convert flow chat cards: confirm a destructive conversion and watch transcription
  progress'
created_by: xgd
created_at: '2026-06-28T20:54:56.677695+00:00'
updated_at: '2026-06-28T23:36:56.549759+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-24c4d23c
  capability_uid: capability-e343131c
  story_kind: upgrade
  story_points: 2
  updated_by:
  - bundle-d4ce3987
---

## Story
**As an** operator using the builder chat, **I want** the convert flow to surface a live, multi-stage transcription-progress card directly in the chat — including which assets failed to import — **so that** I can watch each stage of a destructive conversion (starting with the draft being cleared) without leaving the chat.

## Description
When the operator asks the AI to convert an existing website, the convert runs immediately with no confirmation step. The builder surfaces the flow through a single chat-card variant mounted via the builder's tool-result dispatcher:

**Transcribe progress card.** When the terminal `transcribe_site_done` tool result is rendered, the builder mounts an info-toned "Converting {url}" card whose body is a **five-row** stage list, in order:

0. Clearing draft
1. Screenshot
2. Theme
3. Modules
4. Assets mirrored

All rows start in a pending state. As stage events stream in, each row updates **in place** (no card re-render) to reflect its status — Stage 0 flips to "cleared" when the clear-to-empty-scaffold step reports, and stages 1–4 flip to started / completed / failed. During asset mirroring the "Assets mirrored" row shows a running N/M count; any asset that fails to import appears in a "What couldn't mirror" sub-section naming the asset URL and the failure reason, and the count reflects the failures.

The progress card is **registered at boot**: `bootBuilder` calls `registerTranscribeProgress()` (alongside `registerDigestReport()`), so a `transcribe_site_done` result routes to the multi-stage card rather than falling through to the plain summary fallback.

**There is no convert-confirmation card.** The earlier destructive-confirmation gate — a warning-toned "Convert site" card with an "I own this site" checkbox, Confirm/Cancel actions, and the `fc:convert-confirmed` / `fc:convert-cancelled` signalling bridge — has been removed (superseded by the convert-orchestration change that drops the gate). No renderer is registered for `kind: "convert_confirmation"`, so a tool result carrying that kind has no special card and falls back to the plain summary.

**In scope:** the transcribe-progress card variant, its boot registration, the five-row (Stage 0..4) stage list including the "Clearing draft" row, the in-place progress update behaviour, the running asset-mirror count, and the failed-mirror surface.

**Out of scope (owned elsewhere):** the `transcribe_site` server orchestration, the Stage 0 clear-to-empty-scaffold behaviour and the SSE `transcribe_progress` event it emits (convert-orchestration story), asset mirroring to R2 (asset-mirror story), theme-token derivation and the transcription digest (digest story), and the underlying chat-card primitive + tool-result dispatcher (CAP-38 Builder UI, [[REQ-13]]).

## Technical Context
- The progress card registers against the [[REQ-13]] tool-result dispatcher under `kind: "transcribe_site_done"` and reuses the existing `<ChatCard>` primitive (tones, collapsible body) from CAP-38 Builder UI.
- The progress card holds its state in DOM data-attributes so a sequence of streamed stage events updates one card without re-rendering. The stage event shape consumed is `{ tool: "transcribe_site", stage: 0|1|2|3|4, status: "started"|"completed"|"failed"|"cleared"|"asset_mirrored"|"asset_failed", ... }`; events for other tools or malformed shapes are ignored.
- **Intent/code divergence (flagged for regression):** the originating intent specced the progress card registered under `kind: "transcribe_progress"`; the net-state code registers it under `kind: "transcribe_site_done"` and feeds it stage events keyed by `tool: "transcribe_site"`. The reconciled behaviour follows the code; ACs describe observable card behaviour, not the registration key.
- The `<ChatCard>` source still carries a documentation comment referencing the (now-deleted) ConvertConfirmation card; this is a stale comment only — no convert-confirmation component, export, renderer registration, or listener bridge exists in the code.

## Dependencies
Convert-orchestration story (plan item 5): it removes the confirmation gate and adds the Stage 0 clear-to-empty-scaffold step plus the `stage: 0, status: "cleared"` SSE event this card surfaces.

## Story Points
2