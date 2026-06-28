---
uid: story-ddc928fd
id: STORY-62
type: story
title: 'Markdown body copy: inline-or-file content with verbatim convert capture'
created_by: xgd
created_at: '2026-06-28T22:53:12.367820+00:00'
updated_at: '2026-06-28T23:05:29.446577+00:00'
completed_at: null
last_field_updated: status
status: reconciling
fields:
  intent_uid: bundle-d4ce3987
  capability_uid: capability-a83368ba
  story_kind: feature
  story_points: 3
---

## Story
**As a** site operator converting and editing a website in the builder, **I want** body copy to live as markdown that can be either inlined or stored as a discrete text file, and to be captured verbatim from a source site, **so that** my published pages reproduce the original wording exactly and my text stays cleanly editable rather than buried inside a large JSON document.

## Description
This capability makes markdown the single format for all body copy end-to-end — inline strings, stored files, capture output, and AI output. Any module content field declared as markdown accepts EITHER an inline markdown string (existing behaviour) OR a text-kind asset reference pointing at a stored `.md` file. The choice is made per content instance; a short inline block can be promoted to a file as it grows, and a one-line file can be inlined back, with no schema change.

The framework renderer owns conversion. When rendering a markdown field it first sniffs for trusted HTML: a string beginning with `<` (after leading whitespace) is emitted as-is, preserving the existing baseline site's `<p>...</p>` content with no migration. Otherwise the markdown is converted to HTML. When the field value is a text-kind asset reference, the renderer resolves the reference through an injected resolver and converts the returned markdown; if no resolver is available or resolution fails, the renderer emits the reference's fallback alt text (or empty string). The same renderer runs in two contexts: the builder preview resolves references live per edit, while static generation resolves and bakes the converted HTML at build time so the published site performs no runtime content fetch or markdown conversion.

During convert, the transcription flow captures each source section's body HTML, converts it mechanically to verbatim markdown (no AI involved in the text path), rewrites embedded image references to mirrored asset paths, and either writes the markdown to a per-section stored file or — for short, single-paragraph blocks below a size threshold — inlines it. The transcription digest carries, per captured content entry, a ready-made text-kind asset reference (and/or an inline-markdown string) that the AI drops directly into a content-setting tool call, so it references pre-built copy verbatim instead of paraphrasing. A dedicated operator action lets the AI write markdown to a body-copy file under a guarded key pattern for user-directed copy edits.

**In scope:** the markdown content union (inline string | text asset ref), the text/image asset-ref discriminator, render-time HTML-sniff + markdown-to-HTML conversion + resolver-based text resolution with alt fallback, mechanical HTML-to-markdown capture with image-ref rewriting, per-section verbatim file writes with a short-block inline heuristic, the digest's pre-built copy references, the guarded text-asset write action, static baking with no runtime content fetch, and the AI how-to guidance to set pre-built copy rather than author it.

**Out of scope:** the click-to-edit popup/WYSIWYG editor UX; the asset-manager UI; rewriting source-site internal links to local page slugs (captured markdown keeps source absolute link URLs); migrating the existing baseline site from inline HTML to markdown; per-module confidence reporting on captured copy; and captured video references.

## Technical Context
- New capability bucket: no prior story covered markdown-as-content, text asset references, verbatim mechanical capture, or render-time markdown conversion. Threads across site-schema (the content union + asset-ref discriminator), the framework renderer (sniff/convert/resolve), the extractor (HTML-to-markdown), the convert/transcription orchestration (capture Stage), the operator API (text-asset write action), and static generation (build-time bake).
- **Image AssetRef sibling:** the image side of the same verbatim-reproduction goal — precomputed image asset references in the digest — is documented separately under the transcription-digest story (BUG-5, plan item 7). This story owns the text/markdown half only.
- **Digest contract:** extends the transcription digest (Reference Digest Extraction / Site Transcription capabilities) with per-entry `copy` (text asset ref) and `inlineMarkdown` fields.
- **Asset storage:** body-copy files live in the existing assets namespace under a `sites/{siteId}/copy/{slug}.md` key scheme with `text/markdown` content type; the write action validates keys against that pattern and rejects others.
- **Back-compat invariant:** existing inline HTML content must continue to render unchanged via the leading-`<` sniff; no baseline-site migration is performed.
- **Code-vs-intent note for regression:** the operator-action category and key-pattern enforcement, the short-block inline threshold (intent names ~200 chars / single paragraph / no block structure), and the build-time-only resolution guarantee are the highest-risk areas to verify the implementation matches the spec.

## Dependencies
None (plan item 4 has no dependencies).

## Story Points
3