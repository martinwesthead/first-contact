---
uid: report-7b195be3
id: REPORT-810
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-29T23:17:49.781036+00:00'
updated_at: '2026-06-29T23:17:49.781036+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-c4943d39
---

All 7 AC UATs pass. Each maps 1:1 to an acceptance criterion for story-c4943d39, named `test_UAT_AC{N}_*` per the enforced convention, with multi-variant logic looped inside a single test body (not `it.each`) so the names stay regex-clean. Tests verify existing code at the proper boundaries (Astro container rendering for the `.astro` component; `validateModuleContent` / catalog APIs via the `@1stcontact/framework` package entry point) — no runtime code touched, no existing tests modified.

```
UATs generated for story story-c4943d39 (plan item 1 of 6)

Story: story-c4943d39
Test file(s) created:
  - tests/test_UAT_AC742_split_section_registered_in_catalog.test.ts
  - tests/test_UAT_AC743_split_section_image_left_variant.test.ts
  - tests/test_UAT_AC744_split_section_image_right_variant.test.ts
  - tests/test_UAT_AC745_split_section_dials_apply_style_hooks_with_defaults.test.ts
  - tests/test_UAT_AC746_split_section_optional_eyebrow_and_cta.test.ts
  - tests/test_UAT_AC747_split_section_accepts_valid_content.test.ts
  - tests/test_UAT_AC748_split_section_rejects_invalid_content.test.ts

Tests written: 7
Tests passed: 7
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC742_split_section_registered_in_catalog.test.ts"
  - "tests/test_UAT_AC743_split_section_image_left_variant.test.ts"
  - "tests/test_UAT_AC744_split_section_image_right_variant.test.ts"
  - "tests/test_UAT_AC745_split_section_dials_apply_style_hooks_with_defaults.test.ts"
  - "tests/test_UAT_AC746_split_section_optional_eyebrow_and_cta.test.ts"
  - "tests/test_UAT_AC747_split_section_accepts_valid_content.test.ts"
  - "tests/test_UAT_AC748_split_section_rejects_invalid_content.test.ts"
```

AC→test coverage:
- **AC-742** → catalog registration + id/version resolution + both variants declared
- **AC-743** → image-left variant marker, media-before-content DOM order, image/heading/body present
- **AC-744** → image-right variant marker, image-first DOM order preserved
- **AC-745** → every imageRatio/size/surface/spacing dial emits its style hook; defaults (landscape, md, default, 12/12) when unspecified
- **AC-746** → eyebrow/cta omitted when absent, rendered (label + href) when supplied
- **AC-747** → minimal and fuller valid content both pass with no issues
- **AC-748** → each missing required field and a hrefless cta each reported with the offending path

One operational note: the 3 package-import tests initially failed because this reconcile worktree's `node_modules` had stale `@gendev/*` links instead of `@1stcontact/*`; `pnpm install --offline` relinked them (consistent with the documented worktree-relink fix). They pass now.
