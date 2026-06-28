---
uid: report-e637bd1f
id: REPORT-748
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-28T23:05:24.151239+00:00'
updated_at: '2026-06-28T23:05:24.151239+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-ddc928fd
---

All 14 test names conform to `^test_UAT_AC\d+_\w+$`, and every AC (684–697) for story-ddc928fd has exactly one UAT. All pass against the existing implementation.

## Completion Report

```
UATs generated for story story-ddc928fd (plan item 4 of 8)

Story: story-ddc928fd
Test file(s) created:
  - tests/test_reconciliation_markdown_body_copy.test.ts

Tests written: 14
Tests passed: 14
Tests failed: 0

test_files_created:
  - "tests/test_reconciliation_markdown_body_copy.test.ts"
```

### AC → test mapping (1:1, all passing)

| AC | Behaviour | Boundary exercised |
|----|-----------|--------------------|
| AC-684 | Asset ref carries image/text kind, defaults to image | `AssetRef.safeParse` (site-schema) |
| AC-685 | Markdown field accepts inline string OR text asset ref | `validateModuleContent(textBlockMeta, …)` |
| AC-686 | Empty-source text ref rejected, identifies field | `validateModuleContent` → issue at `body` |
| AC-687 | Inline `<…>` rendered as trusted HTML passthrough | `renderModuleInstance` |
| AC-688 | Inline markdown converted to HTML | `renderModuleInstance` |
| AC-689 | Text-asset-ref resolved + converted to HTML | `renderModuleInstance` + resolver |
| AC-690 | No/failed resolution → alt fallback (or empty, no throw) | `renderModuleInstance` |
| AC-691 | Source HTML mechanically → verbatim markdown subset; scripts/styles/classes dropped | `htmlToMarkdown` (extractor) |
| AC-692 | Convert writes per-section `.md` + schema-valid digest `copy` ref | `transcribeSiteHandler` via harness |
| AC-693 | Short single-paragraph inlined, no file | `transcribeSiteHandler` via harness |
| AC-694 | Guarded write succeeds; out-of-pattern key rejected, nothing written | `write_text_asset` action |
| AC-695 | How-to instructs setting pre-built copy verbatim, not authoring | `REPRODUCING_A_WEBSITE_DOC` inspection |
| AC-696 | End-to-end convert reproduces body verbatim (normalized) | transcribe → `renderSite` roundtrip |
| AC-697 | Static gen bakes resolved content inlined; no `.md` ref in served HTML | `renderSite` (multi-page) |

**Notes for downstream:**
- No runtime code was modified; tests document existing REQ-33 behaviour.
- Existing `test_UAT_FC_REQ-33_*.test.ts` files remain on disk — these are the FC-evidence tests this story reconciles. The reconciliation review/`check_fc_orphans` phase owns renaming/deleting them; I did not touch them per the "create only" constraint.
- AC-685/686 are verified through the markdown-aware content validator (`validateModuleContent`), which is the path that actually enforces the markdown union — the site-schema structural `validateSite` uses a loose `ContentValue` and would not reject an empty-source ref.
