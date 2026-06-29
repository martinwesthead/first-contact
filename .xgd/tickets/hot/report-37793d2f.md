---
uid: report-37793d2f
id: REPORT-808
type: report
title: 'Reconciliation Plan: bundle-d3d73016 (split-section, testimonials, banner,
  logo-strip, contrast, image-sizing)'
created_by: xgd
created_at: '2026-06-29T23:09:27.460545+00:00'
updated_at: '2026-06-29T23:21:39.073017+00:00'
completed_at: null
last_field_updated: items
fields:
  report_kind: reconciliation_plan
  subject_uid: bundle-d3d73016
  anchor_uid: bundle-d3d73016
  items:
  - index: 1
    component: Framework Module Catalog — split-section@v1
    item_type: feature
    story_points: 2
    dependencies: []
    description: 'Document the new split-section content module (REQ-39): a two-column
      image+text section registered in the framework catalog at id ''split-section''
      v1. Variants image-left/image-right share a stable image-first DOM order; CSS
      order flips the desktop layout while mobile always stacks image-first. Dials:
      size (sm/md/lg), spacingTop, spacingBottom, surface, imageRatio (square/portrait/landscape,
      default landscape). Content: image (required), heading (required), body markdown
      (required), optional eyebrow and cta {label,href}. validateModuleContent rejects
      missing image/heading/body. Six FC UATs (test_UAT_FC_REQ-39_*) already prove
      this behavior.'
    justification: 'No existing story covers split-section. CAP-34''s stories enumerate
      chrome modules (STORY-41: header/hero/footer) and content modules (STORY-42:
      text-block/services-grid/contact-form/image-gallery); neither mentions split-section.
      This is a genuinely new module capability (distinct content schema and layout)
      within the catalog bucket — uncovered, so a new feature story documents it.
      Sizing: ~6 ACs ≈ 2 pts; combining all four new modules into one story would
      exceed 3 pts.'
    story_uid: story-c4943d39
  - index: 2
    component: Framework Module Catalog — testimonials@v1
    item_type: feature
    story_points: 2
    dependencies: []
    description: 'Document the new testimonials content module (REQ-40): registered
      at id ''testimonials'' v1. Variant ''single'' renders items[0] only regardless
      of how many items are passed; variant ''grid'' renders one card per item (static
      CSS grid, no carousel) and tags the section data-variant=grid, items min 2 max
      9. Dials: spacingTop, spacingBottom, surface, align (left/center, default center)
      applying class fc-testimonials--align-${value}. Items: quote (markdown, rendered
      via set:html, not escaped), name, optional title, optional avatar (asset-ref
      rendered as ~64px circular img with alt when provided, omitted when absent).
      FC UATs test_UAT_FC_REQ-40_* prove this behavior (module source landed in commit
      38a7320 alongside split-section per the attribution note; registry/exports wiring
      landed in 36d7728).'
    justification: No existing story covers testimonials. STORY-42 enumerates specific
      content modules and does not include testimonials; this is a new module capability
      (client-quote display) in the CAP-34 catalog bucket — uncovered, new feature
      story.
    story_uid: story-28887b36
  - index: 3
    component: Framework Module Catalog — banner@v1
    item_type: feature
    story_points: 2
    dependencies: []
    description: 'Document the new banner content module (REQ-42): registered at id
      ''banner'' v1, a full-width statement strip with optional CTA used between content
      sections. Variants simple/with-cta are visual-only — the CTA renders iff the
      cta content field is present, regardless of variant. Dials: size (sm/md/lg),
      align (left/center, default left), spacingTop/spacingBottom (default 6 — tighter
      than hero), surface. Content: eyebrow (optional), heading (required), subhead
      (markdown — matches hero.subhead so inline links/emphasis work), cta {label,href}
      (optional). banner.subhead is registered in render/markdown.ts METAS_BY_ID and
      the module is listed in builder-ui catalog ALL. FC UATs test_UAT_FC_REQ-42_*
      prove registration and both variants (module source landed in commit bd53c80
      per attribution note; registry wiring in c175744).'
    justification: No existing story covers banner. STORY-42's content-module enumeration
      does not include banner; new module capability (announcement/CTA strip) in CAP-34
      — uncovered, new feature story.
    story_uid: null
  - index: 4
    component: Framework Module Catalog — logo-strip@v1 (filed as icon-row)
    item_type: feature
    story_points: 2
    dependencies: []
    description: 'Document the new logo-strip content module (REQ-43, filed under
      request title ''Module:icon-row@v1'' for legacy reasons; framework id is ''logo-strip'').
      Registered at id ''logo-strip'' v1, a horizontal strip of logos/icons. Variants:
      logos (image-dominant, label used as alt only) emits --variant-logos; features
      (icon+label both shown) emits --variant-features. columns dial (3/4/5/6) emits
      --columns-{N} with responsive degradation (mobile 2/1, tablet half rounded up,
      desktop as configured). surface dial (default/subtle/inverse). Content: optional
      heading (h2 like services-grid), items[] (min 1 max 12) each requiring image,
      optional label, optional href. When href present the item is wrapped in <a>;
      external URLs get target=_blank rel=noopener noreferrer. validateModuleContent
      rejects missing items and items without image. FC UATs test_UAT_FC_REQ-43_*
      prove registration, validation, variant classes, columns class, and href anchoring.
      The convert-flow LLM context (reproducing-a-website.md + llm-context.ts) gained
      a logo-strip selection bullet.'
    justification: No existing story covers logo-strip. STORY-42 does not include
      it; new module capability (trust-badge / logo strip) in CAP-34 — uncovered,
      new feature story.
    story_uid: null
  - index: 5
    component: Framework Theme Tokens & CSS Generation — WCAG contrast warnings
    item_type: upgrade
    story_points: 2
    dependencies: []
    description: 'Extend STORY-40 (theme tokens → CSS) to document REQ-48 contrast
      safety. A new contrast utility (contrastRatio, evaluateSurfaceContrast in tokens/contrast.ts,
      exported from tokens/index) scores each rendered surface pair against WCAG AA:
      default (bg↔text) 4.5:1, subtle (surfaceSubtle↔text) 4.5:1, inverse (surfaceInverse↔bg)
      4.5:1, accent (accent↔bg) 3.0:1. generateThemeCss now runs the evaluator on
      the merged palette and, for each failing pair, prepends a /* fc-contrast-warning:
      <surface> — <fg> on <bg> = <ratio>:1 (below WCAG AA <threshold>:1) */ comment
      to the stylesheet and emits a single console.warn naming the failing surfaces.
      The site still renders the operator palette as-is — warn, not block or auto-correct.
      The :root block is unaffected. FC UATs test_UAT_FC_REQ-48_* (contrast_ratio_math,
      surface_contrast_evaluation, theme_css_emits_contrast_warnings) prove this.'
    justification: This extends the existing theme-CSS-generation capability bucket
      in place — generateThemeCss (STORY-40's central behavior) now additionally evaluates
      contrast and emits warnings. No new capability bucket or parallel implementation
      is introduced (the contrast utility is wired into the existing CSS-emit path,
      not a separate generator). Therefore upgrade, not feature.
    story_uid: null
    target_story_ids:
    - story-e53ba4cf
    intent_delta_summary: STORY-40 currently documents token→CSS translation (defaults,
      dark mode, fonts). Add that generateThemeCss also evaluates per-surface foreground/background
      contrast against WCAG AA thresholds and emits stylesheet warning comments +
      a single console.warn for failing pairs, without altering the rendered :root
      output. The doc/instruction sync (reproducing-a-website.md section 1a + llm-context.ts
      byte-for-byte mirror) is supporting evidence carried in the same commit.
    acceptance_criteria_changes:
      add:
      - 'contrastRatio computes WCAG relative-luminance ratio for a fg/bg hex pair
        (known fixtures: black/white=21:1, mid-grey below 4.5, 3-digit hex shorthand
        supported).'
      - evaluateSurfaceContrast returns one ContrastPair per surface (default/subtle/inverse/accent)
        with correct bg/fg mapping and threshold (4.5 body, 3.0 accent), flagging
        pairs below threshold.
      - 'generateThemeCss emits a /* fc-contrast-warning: <surface> ... */ comment
        for each failing pair and a single console.warn naming the failing surfaces;
        emits none for a clean palette; the :root variable block is unchanged.'
      modify: []
      remove: []
  - index: 6
    component: Framework Module Catalog — image sizing constraints & image-gallery
      imageSize dial
    item_type: upgrade
    story_points: 2
    dependencies:
    - 1
    - 2
    - 3
    description: Document REQ-47 image sizing safety across the module catalog. (a)
      Every module rendering a markdown body via set:html now scopes inline <img>
      with max-width:100%; height:auto; display:block — covering hero.subhead, text-block.body,
      services-grid (subhead + items[].body), split-section.body, testimonials.items[].quote,
      banner.subhead (7 markdown bodies). An invalid loading:lazy CSS property was
      dropped from text-block. (b) image-gallery gains an imageSize dial (sm/md/lg,
      default md); only the masonry variant applies the max-height caps, grid stays
      fixed 1:1. (c) The convert-flow LLM context (reproducing-a-website.md + mirrored
      llm-context.ts) documents imageSize and tells convert to match source intent.
      FC UATs test_UAT_FC_REQ-47_* prove the per-module markdown-img cap, the imageSize
      class/default/meta, and the doc mention.
    justification: This modifies how existing catalog modules render images (markdown-body
      img scoping) and adds a dial to the existing image-gallery module — extending
      existing capabilities in place, not adding new modules. No new capability bucket
      or parallel implementation. The single cross-cutting markdown-img-constraint
      UAT covers modules owned by STORY-41 (hero) and STORY-42 (text-block, services-grid,
      image-gallery) plus the three new modules from items 1-3; it is owned here to
      avoid splitting one UAT across stories. Therefore upgrade targeting the existing
      module-catalog stories.
    story_uid: null
    target_story_ids:
    - story-1d5b450f
    - story-f1e061ba
    intent_delta_summary: Extend STORY-41 (hero) and STORY-42 (text-block, services-grid,
      image-gallery) to record that markdown bodies constrain inline <img> dimensions,
      and that image-gallery exposes an imageSize dial (masonry-only max-height caps,
      default md). Note the catalog-wide constraint also applies to the new modules
      documented in items 1-3 (split-section.body, testimonials.items[].quote, banner.subhead);
      those modules' feature stories document their existence, while the cross-cutting
      image-constraint AC is owned here.
    acceptance_criteria_changes:
      add:
      - 'Every module rendering a markdown body via set:html scopes inline <img> with
        max-width:100%; height:auto; display:block (verified per module: hero, text-block,
        services-grid, split-section, testimonials, banner).'
      - image-gallery meta declares an imageSize dial (sm/md/lg, default md); the
        masonry variant applies the corresponding max-height cap class while the grid
        variant (fixed 1:1) is unaffected.
      - The convert-flow LLM context (reproducing-a-website.md and the byte-for-byte
        mirror in apps/control-app/src/llm-context.ts) documents image-gallery's imageSize
        dial and instructs convert to match source image-sizing intent.
      modify: []
      remove: []
---

# Reconciliation Plan — bundle-d3d73016

**Mode**: commits
**Anchor**: bundle-d3d73016 (bundle of REQ-39, REQ-40, REQ-42, REQ-43, REQ-48, REQ-47)
**Subject epic**: bundle-d3d73016 (bundle is a first-class reconcile intent type)

Ground truth is the 11 free-coded commits' diffs; ticket bodies/comments supply intent and decisions. No code changes — capability matrix only.

## Behavior Inventory

```yaml
behavior_inventory:
  source: "free-coded commits on reconcile-BUNDLE-7 (REQ-39/40/42/43/48/47)"
  entry_files:
    - packages/framework/src/modules/registry.ts
    - packages/framework/src/modules/index.ts
    - packages/framework/src/modules/split-section/{meta.ts,index.astro}
    - packages/framework/src/modules/testimonials/{meta.ts,index.astro}
    - packages/framework/src/modules/banner/{meta.ts,index.astro}
    - packages/framework/src/modules/logo-strip/{meta.ts,index.astro}
    - packages/framework/src/modules/image-gallery/{meta.ts,index.astro}
    - packages/framework/src/tokens/{contrast.ts,css.ts,index.ts}
    - packages/framework/src/render/markdown.ts
    - apps/control-app/src/llm-context.ts
    - docs/llm-context/reproducing-a-website.md
  features:
    - name: split-section@v1 module
      description: Two-column image+text section; image-first DOM, CSS order flips desktop for image-right; dials size/spacing/surface/imageRatio; content image+heading+body required, eyebrow+cta optional; required-field validation.
      entry_point: getModule('split-section',1); validateModuleContent
    - name: testimonials@v1 module
      description: single (items[0] only) and grid (one card per item, 2..9, data-variant) variants; align dial class; markdown quote via set:html; optional ~64px circular avatar.
      entry_point: getModule('testimonials',1)
    - name: banner@v1 module
      description: Full-width statement strip; simple/with-cta visual variants, CTA renders iff cta present; markdown subhead; dials size/align/spacing/surface; registered in markdown METAS_BY_ID and builder-ui catalog.
      entry_point: getModule('banner',1)
    - name: logo-strip@v1 module
      description: Logos/features variants emitting variant classes; columns dial with responsive degradation; href wraps item in anchor (external -> target/_blank rel); items 1..12 each require image; required-field validation; LLM convert bullet.
      entry_point: getModule('logo-strip',1); validateModuleContent
    - name: theme contrast warnings
      description: contrastRatio + evaluateSurfaceContrast score 4 surface pairs vs WCAG AA; generateThemeCss prepends fc-contrast-warning comments + single console.warn for failing pairs; render unchanged.
      entry_point: generateThemeCss; evaluateSurfaceContrast
    - name: image sizing safety
      description: markdown-body inline <img> scoped (max-width/height/display) across 7 modules; image-gallery imageSize dial (masonry max-height caps, default md); LLM context documents imageSize.
      entry_point: image-gallery meta.dials.imageSize; per-module :global(img) CSS
```

## Coverage Map

```yaml
coverage_map:
  - feature: split-section@v1
    status: uncovered
    existing_stories: []
    gaps: ["no story documents split-section module"]
    notes: ["CAP-34 catalog; STORY-41 chrome + STORY-42 content do not include it"]
  - feature: testimonials@v1
    status: uncovered
    existing_stories: []
    gaps: ["no story documents testimonials module"]
  - feature: banner@v1
    status: uncovered
    existing_stories: []
    gaps: ["no story documents banner module"]
  - feature: logo-strip@v1
    status: uncovered
    existing_stories: []
    gaps: ["no story documents logo-strip module"]
  - feature: theme contrast warnings
    status: partial
    existing_stories: ["story-e53ba4cf (STORY-40)"]
    gaps: ["generateThemeCss contrast evaluation + warning emission undocumented"]
    notes: ["extends existing generateThemeCss behavior -> upgrade"]
  - feature: image sizing safety
    status: partial
    existing_stories: ["story-1d5b450f (STORY-41)", "story-f1e061ba (STORY-42)"]
    gaps: ["markdown-img scoping undocumented; image-gallery imageSize dial undocumented"]
    notes: ["modifies existing module render + adds dial to existing image-gallery -> upgrade"]
```

## Plan Items

| # | Component | Type | Pts | Deps | Description |
|---|-----------|------|-----|------|-------------|
| 1 | split-section@v1 | feature | 2 | - | New two-column image+text module |
| 2 | testimonials@v1 | feature | 2 | - | New client-quote module (single/grid) |
| 3 | banner@v1 | feature | 2 | - | New statement/CTA strip module |
| 4 | logo-strip@v1 | feature | 2 | - | New logo/icon strip module |
| 5 | theme contrast warnings | upgrade | 2 | - | STORY-40: generateThemeCss WCAG contrast warnings |
| 6 | image sizing | upgrade | 2 | 1,2,3 | STORY-41/42: markdown-img cap + image-gallery imageSize dial |

## Observations

- **Module granularity follows sizing, not the bundle's single-ticket shape.** The four new modules are each a distinct user-visible capability (~6 FC UATs each). Folding all four into one feature story would exceed 3 points, so each becomes its own ~2-pt feature story. This is not flag-inflation — modules are capability-bucket entries, not options within one command.
- **REQ-48 and REQ-47 are upgrades, not features.** Both extend existing capabilities in place (generateThemeCss for contrast; existing module render + image-gallery for image sizing) with no parallel implementation or new bucket — the reuse-first bias resolves these to upgrade.
- **Cross-cutting markdown-img UAT ownership.** test_UAT_FC_REQ-47_markdown_body_images_constrained covers 7 modules in one file (hero+text-block+services-grid owned by STORY-41/42; split-section+testimonials+banner are items 1-3). Because one FC UAT renames to one AC on one story, item 6 owns that cross-cutting AC; items 1-3 document module existence only. Item 6 depends on 1-3 for sequencing.
- **Attribution/SHA-remap noise is benign for the matrix.** REQ-40/42 bodies note module source files landed in interleaved commits attributed to REQ-39, and REQ-40 SHAs were rewritten via filter-branch (3f6cb5e/ab0035a/d4c5e4b -> 38a7320/36d7728/41bb985). The capability matrix reflects current code state, which the registry confirms (all four modules registered and exported). No matrix impact.
- **Doc/instruction edits (CAP-47 convert flow).** REQ-48 and REQ-47 both touch reproducing-a-website.md + the byte-for-byte llm-context.ts mirror (REQ-30 drift guard). Only REQ-47's doc change has a dedicated UAT (llm_context_doc_mentions_imageSize), folded into item 6. REQ-48's doc change has no UAT and is recorded as supporting evidence on item 5 — no separate convert-flow story is warranted.
- **No regressions / scope-creep flagged.** Every commit's footprint matches its ticket's declared scope; the dormant hero bg-color image field is explicitly out of scope (its own future ticket) and is left untouched.