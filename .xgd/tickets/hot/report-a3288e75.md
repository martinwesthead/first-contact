---
uid: report-a3288e75
id: REPORT-818
type: report
title: Claude reconciliation_uat_generation report
created_by: xgd
created_at: '2026-06-29T23:41:40.821835+00:00'
updated_at: '2026-06-29T23:41:40.821835+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_uat_generation
  subject_uid: story-69fa1c75
---

All 7 UATs pass. Tests are grounded in both the ACs and the existing banner implementation, at the proper boundaries (Astro container render for visual behavior, the registry/catalog API for discoverability, the module meta for the content contract, and `bakeModuleContentForRender` to prove the subhead is registered as markdown).

```
UATs generated for story story-69fa1c75 (plan item 3 of 6)

Story: story-69fa1c75
Test file(s) created:
  - tests/test_UAT_AC755_banner_discoverable_in_catalog.test.ts
  - tests/test_UAT_AC756_banner_content_contract.test.ts
  - tests/test_UAT_AC757_banner_simple_heading_no_cta.test.ts
  - tests/test_UAT_AC758_banner_eyebrow_and_markdown_subhead.test.ts
  - tests/test_UAT_AC759_banner_cta_label_and_href.test.ts
  - tests/test_UAT_AC760_banner_cta_gated_by_content_not_variant.test.ts
  - tests/test_UAT_AC761_banner_default_dials.test.ts

Tests written: 7
Tests passed: 7
Tests failed: 0

test_files_created:
  - "tests/test_UAT_AC755_banner_discoverable_in_catalog.test.ts"
  - "tests/test_UAT_AC756_banner_content_contract.test.ts"
  - "tests/test_UAT_AC757_banner_simple_heading_no_cta.test.ts"
  - "tests/test_UAT_AC758_banner_eyebrow_and_markdown_subhead.test.ts"
  - "tests/test_UAT_AC759_banner_cta_label_and_href.test.ts"
  - "tests/test_UAT_AC760_banner_cta_gated_by_content_not_variant.test.ts"
  - "tests/test_UAT_AC761_banner_default_dials.test.ts"
```

**AC → test mapping (1:1):**
- **AC-755** → catalog discoverability: `listRegisteredModules` + `getModule` + builder-ui `findCatalogEntry`, asserting exact variants and dial value sets
- **AC-756** → content contract: `bannerMeta.contentSchema` — `heading` required/string, `eyebrow`/`subhead`/`cta` optional, `subhead` typed markdown, `cta` object of label+href
- **AC-757** → simple variant renders heading, no CTA
- **AC-758** → eyebrow label above heading + markdown subhead (verified both via `bakeModuleContentForRender` markdown registration and the rendered injection)
- **AC-759** → CTA link with supplied label + href (single anchor)
- **AC-760** → CTA gated by `cta` content, not variant name (with-cta+no-cta → none; simple+cta → renders)
- **AC-761** → default dials (align left, surface default, size md, spacing 6/6, not hero's 12)

No runtime code or existing tests were modified.
