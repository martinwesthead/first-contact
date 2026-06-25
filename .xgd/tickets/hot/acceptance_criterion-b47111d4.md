---
uid: acceptance_criterion-b47111d4
id: AC-447
type: acceptance_criterion
title: Per-site theme.css concatenates theme-token CSS variables with every registered
  framework module's styles
created_by: xgd
created_at: '2026-06-25T01:24:09.600943+00:00'
updated_at: '2026-06-25T01:24:09.600943+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-d111f966
  kind: behavior
  regression_only: false
---

## Criterion

The generator writes a single per-site stylesheet whose content combines two parts: first, the CSS custom-property declarations produced by the theme-token CSS generator for the site's theme; and second, the `<style>` block content of every framework module registered in the catalog. The stylesheet is written to `/assets/theme.css` inside the output directory.

## Verification

Generate a fixture site whose theme defines a recognizable token (e.g. a specific primary color or spacing value) and inspect the emitted stylesheet at `<out>/assets/theme.css`. Assert that the file contains the expected token declaration AND at least one selector defined by a framework module (e.g. a hero or header class). Both portions must coexist in the same file.
