---
uid: request-4b47cc13
id: REQ-28
type: request
title: 'Site Transcription (Layer B): convert flow that maps a Reference Digest into
  module instances and theme tokens'
created_by: xgd
created_at: '2026-06-16T23:29:01.955584+00:00'
updated_at: '2026-06-16T23:34:03.479560+00:00'
completed_at: null
last_field_updated: body
status: draft
fields:
  priority: high
  story_points: 9
  auto_merge_back: true
  needs_review: false
---

## Problem

The convert flow is the pre-launch killer demo per [[DOC-9]] §2.1: operator pastes a URL → screenshot appears within 2 seconds → palette and type apply within 8 seconds → an editable themed draft populated with module instances appears within 60 seconds → operator AI is already conversing throughout. This REQ delivers Layer B — the LLM-driven step that maps a Reference Digest + rendered DOM + screenshots into 1st contact module instances and theme tokens.

This is **not** deterministic parsing. It is the AI mapping "this hero with centered headline + image-right" onto our `hero-split` module with specific theme tokens — mediated by [[DOC-7]]'s structured-edit discipline so the output must pass the same validator as any operator-driven edit. The output lands in the user's draft via the existing AI tool surface; from that moment the converted site is just a normal site the operator iterates on.

## Scope

Add the `transcribe_site` AI tool plus the progressive-reveal orchestration. After this REQ:

- An AI tool call `transcribe_site(digestId)` (where `digestId` references a digest produced by [[REQ-21]] / [[REQ-22]]) produces a draft set of theme tokens and module instances in the 1st contact schema, written into the current site draft via existing AI tool calls.
- The flow is staged so the operator sees output at 0–2s (screenshot), 2–8s (palette + type applied), and 10–60s (module instances populated).
- Every transcribed output passes [[DOC-7]]'s framework-catalog validator before being committed.
- Each transcribed module carries a `confidence` field that the AI surfaces to the operator for low-confidence items.
- The flow includes a destructive-action confirmation: "this will replace your current draft" with explicit operator consent before the first overwrite.

## Decisions already made (open questions closed)

These resolve [[DOC-9]] §13 items 6 (transcription confidence) and the destructive-import question from [[CHAT-13]] turn 2:

- **Destination of the converted site** ([[CHAT-13]] turn 2 question 1): the convert flow writes **directly into the operator's current draft**, with a single explicit confirmation modal before the first overwrite. The killer-demo wins; side-by-side import is not v1. Confirmation modal text: "Convert will replace your current draft with a transcription of {url}. This cannot be automatically undone. Continue?" Cancel exits the flow; confirm proceeds.
- **Confidence reporting** ([[DOC-9]] §13.6): the LLM is prompted to return a `confidence: 'high' | 'medium' | 'low'` per module instance and per theme-token group (`palette`, `typography`, `layout`). The AI's narrative after the transcription explicitly names the low-confidence items ("I matched the hero with high confidence but the testimonial block was unfamiliar — please verify the structure"). Never refuses the conversion outright — even at 100% low confidence, a draft is produced.
- **Module fallback policy**: when a section of the source page doesn't match any module in the framework catalog, the transcription produces a `text-block` module containing the rendered HTML's text content + a `confidence: 'low'` flag. The AI's narrative names this explicitly: "I couldn't match section X; I dropped its content into a text block — you may want to ask for a more specific module."
- **Theme token derivation**: palette role inference from the digest ([[REQ-21]]) maps directly to theme tokens: `background → tokens.surface`, `body → tokens.text`, `accent → tokens.accent`, `cta → tokens.action`. Typography: digest `primary_pair` body + heading → token `typography.body` and `typography.heading`. When digest signals are `not_detected`, the framework's default tokens remain.
- **Progressive reveal sequencing**: the tool dispatches three sequential AI tool batches: (1) `apply_screenshot_preview` (an ephemeral preview module that just shows the desktop screenshot, swapped out at step 3), (2) `set_theme_tokens` from the digest's signals, (3) `replace_modules` with the LLM-transcribed module instances. The operator AI is free to converse between steps; the tool batches run on a Worker-managed orchestration so the chat isn't blocked.
- **LLM model + prompt**: model is Claude Opus 4.7 (the canonical builder model). Prompt receives: framework module catalog (per [[REQ-3]] / [[REQ-5]]), the Reference Digest body, the desktop screenshot as multimodal input, the rendered DOM extract from [[REQ-22]]. Output is a JSON object validated against the 1st contact schema; on validation failure the LLM is given the validator error and one retry. Two failures in a row produces a fallback "I couldn't transcribe this site automatically; here's a hero-only draft as a starting point." Never throws.
- **Idempotency**: `transcribe_site(digestId)` with the same digest produces the same theme tokens deterministically (no LLM in the token step). Module instances are LLM-driven so are non-deterministic; calling twice produces two different drafts, and the second call is gated behind the destructive confirmation again.
- **No transcription caching** ([[REQ-20]] cache policy): transcriptions are one-shot per draft and explicitly **not** cached. Repeating against the same URL re-runs Layer A and Layer B fresh.
- **Robots.txt and convert-the-operator's-own-site** ([[DOC-9]] §13.7): the operator-confirms-per-origin override from [[REQ-20]] is the mechanism. The convert flow's destructive-confirmation modal includes a checkbox "I own this site" that, when checked, also registers a robots override for the origin. UX is folded into the one modal.

## Design conversation

Full thread: [[CHAT-13]]. Most relevant operator framing for this REQ:

> "It would be for a very powerful demonstration to be able to point to an existing site suck in all the style content and assets and then allow for an interactive discussion with the AI and make changes to the site in real time. That sounds like a killer demo."
> — [[CHAT-13]] turn 2

> "I think the convert existing site is sufficiently important use case that we are going to need it before launch."
> — [[CHAT-13]] turn 2

> "The recreate my website in your framework game. Would require probably much more detailed information about the site but both could start from the same place and just use different kinds of summarization and digesting"
> — [[CHAT-13]] turn 3

The "same starting place" — the Reference Digest — is exactly what [[REQ-21]] / [[REQ-22]] produced. This REQ is what takes that starting place to module instances.

## IN

### `packages/extractor` additions

- `deriveThemeTokens(digest)` — deterministic mapping from digest palette / typography / layout signals to a theme-token patch. Pure function. Output validates against [[REQ-4]]'s theme-token schema.
- `composePromptForTranscription(digest, catalog, screenshotKey)` — assembles the multimodal Opus prompt.
- `validateTranscription(transcription, catalog)` — runs the transcribed module instances through [[REQ-3]]'s validator. Returns `{ ok: true } | { ok: false, errors: [...] }`.

### AI tool: `transcribe_site`

Added to the operator AI's tool surface:

```
input: { digestId: string }
output: { ok: true, draftCommitted: true } | { ok: false, error: typed-error }
```

Implementation flow:

1. Fetch the digest record from the chat history. If not found, return `digest_not_found`.
2. Check the destructive-confirmation flag on the chat metadata (`convertConfirmed[chatId] === true`). If not set, return `requires_confirmation` with the confirmation prompt text; the AI surfaces a `ConvertConfirmation` `tool_result` in chat; operator clicks Confirm → flag is set → the AI re-invokes `transcribe_site`.
3. Stage 1 — `apply_screenshot_preview`: write an ephemeral preview module to the draft showing the desktop screenshot.
4. Stage 2 — `deriveThemeTokens(digest)` → apply theme tokens to the draft via existing tool surface.
5. Stage 3 — LLM transcription: invoke Opus 4.7 with the composed prompt. Validate output. On validation failure, retry once with validator errors fed back. On second failure, fall back to the hero-only draft.
6. Replace the ephemeral preview module + the rest of the draft with the transcribed module list.
7. Emit a chat note: "I converted {url} into a draft. Confidence: {summary}. Low-confidence items: {names}."

### Builder UI

- `ConvertConfirmation` `tool_result` renderer: modal-style card in the chat with the confirmation text, "I own this site" checkbox, Confirm / Cancel buttons.
- Progressive-reveal staging: the preview panel renders each stage as it lands (per existing iframe preview model from [[DOC-8]]). The screenshot stage is just an image module; theme-token stage flips CSS variables in the preview; module-instance stage re-renders the module list.

### Worker-managed orchestration

- The three stages run as a single async orchestration in the control-app Worker (not as three separate AI turns) so the operator AI can converse while transcription proceeds. The orchestration uses [[REQ-9]]'s SSE event registry to stream stage-completion events to the builder.
- Each stage emits a `transcribe_progress` SSE event with `{ stage: 1|2|3, status: 'started'|'completed'|'failed', details }`. The chat panel renders these as faint progress notes inline.

### Confidence surfacing

- The chat note after a successful transcription is structured: `{ summary, lowConfidenceItems: [{section, reason}] }`. Rendered as a list with "Verify or replace" affordances that emit pre-filled chat messages on click.

## OUT (explicitly deferred)

- Side-by-side import workspace — destructive direct overwrite is v1 per Decisions.
- Asset download to R2 — module instances reference external image URLs in v1; an operator action ("download external assets") triggers a separate flow that's [[REQ-16]]-adjacent and out of scope here.
- Per-module manual replacement UI — operator iterates via the existing AI tool surface (asking for a specific module change).
- Multiple URL transcription in one shot ("clone these three pages") — single URL only in v1.
- Domain-aware customizations (e.g. "recognize plumbing-trade conventions") — pure framework-catalog matching in v1.
- Confidence re-derivation as the operator edits — confidence is a snapshot from the transcription moment, not a live property.

## Dependencies

- [[REQ-3]] — site-schema + validator (every transcription output must validate).
- [[REQ-4]] — theme tokens (token derivation maps into this).
- [[REQ-5]] — content modules + chrome (the catalog the transcription targets).
- [[REQ-9]] — Operator API + SSE registry (progressive-reveal events).
- [[REQ-20]] — safety contract, including the robots-override mechanism the destructive modal hooks.
- [[REQ-21]] — Reference Digest schema (input to this REQ).
- [[REQ-22]] — Browser Rendering (the screenshot + computed signals this REQ leans on).
- [[DOC-7]] §6.2 — allowed-edits list; the transcribed output uses the same tool surface.
- [[DOC-8]] §6 — four-layer validation gate.
- [[DOC-9]] §6.2, §7.3 — Layer B transcription, progressive-reveal latency targets.

## Acceptance criteria

1. `transcribe_site(digestId)` on a digest the chat metadata has not confirmed: returns `requires_confirmation`; no draft mutation occurs; chat shows the `ConvertConfirmation` card.
2. Operator clicks Confirm: chat metadata gains `convertConfirmed[chatId] = true`; the AI re-invokes `transcribe_site`; transcription proceeds.
3. Stage 1 fires within 2 seconds of confirmation: the preview iframe renders the desktop screenshot full-bleed. Verified by a `transcribe_progress` SSE event with `stage: 1, status: completed`.
4. Stage 2 fires within 8 seconds of confirmation: theme tokens are applied to the draft; the preview iframe's body / accent / heading CSS variables match the digest's palette and typography signals.
5. Stage 3 fires within 60 seconds of confirmation: the draft's module list is replaced with the LLM-transcribed instances. The preview re-renders with the new modules.
6. Every transcribed module instance passes [[REQ-3]]'s validator before being written; a validation failure triggers exactly one Opus retry with errors fed back.
7. After two validation failures, the fallback hero-only draft lands; the chat note explicitly names "I couldn't transcribe this site automatically; here's a hero-only draft."
8. Each module in the transcribed list carries a `confidence` field; the post-transcription chat note enumerates low-confidence modules with their sections.
9. `deriveThemeTokens(digest)` for a digest with `not_detected` palette and typography returns the framework default theme tokens unchanged; the transcription still proceeds with module instances derived from layout / content signals.
10. The "I own this site" checkbox on the `ConvertConfirmation` modal, when checked at Confirm, also registers a `robotsOverrides` entry for the origin in the chat metadata.
11. Re-invoking `transcribe_site` on the same digest in the same chat (without a destructive-confirmation reset) returns `requires_confirmation` again; one-shot confirmation does not blanket-authorize repeats.
12. UAT — full killer-demo: operator pastes URL → digest produced ([[REQ-21]] / [[REQ-22]]) → confirms convert modal → screenshot appears at 0–2s → palette + type apply at 2–8s → module list populates at 10–60s → operator asks "make the hero darker" and the AI responds in the same chat without flow interruption.


---

## Alignment with persistent chat infrastructure (REQ-23 / REQ-24)

[[REQ-23]] / [[REQ-24]] / [[DOC-10]] landed after this REQ was drafted. Two integration points are worth pinning down:

- **Destructive-confirmation flag persistence**: the `convertConfirmed[chatId]` flag lives on the `chat_sessions` row in [[REQ-23]]'s schema (a JSON `metadata` column on `chat_sessions`, also used by [[REQ-20]]'s per-chat `robotsOverrides`). This means a confirmation persists across reloads of the same session.
- **Progressive-reveal SSE events** ([[REQ-9]]'s `transcribe_progress`): chat-side, each stage's completion is also appended as a `system` role message to `chat_messages` (per [[REQ-23]] role enum) so the staged narrative is visible in scrollback and reachable via [[REQ-24]]'s `search_transcripts` later. The SSE event is the live update; the `chat_messages` row is the durable record.
- **Brief integration**: after successful transcription, the AI is prompted to call `propose_brief_update` (from [[REQ-27]]) for `Project context`, `Palette`, `Typography`, and `References` sections so the converted site's Brief reflects what was imported. This is a soft prompt nudge in the LLM transcription prompt, not a hard tool chain.

## Additional dependencies (alignment)

- [[REQ-23]] — `chat_sessions` metadata column (confirmation flag, robots overrides).
- [[REQ-24]] — Chat dispatcher (the path `transcribe_site` runs through).
- [[REQ-27]] — Brief update tool (post-transcription Brief population).
- [[DOC-10]] §4.1, §4.2 — session metadata and message append model.
