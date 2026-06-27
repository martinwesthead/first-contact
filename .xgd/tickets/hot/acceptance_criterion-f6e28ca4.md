---
uid: acceptance_criterion-f6e28ca4
id: AC-592
type: acceptance_criterion
title: Content structure reports headings, nav links, form fields, and group counts
created_by: xgd
created_at: '2026-06-27T01:10:47.944507+00:00'
updated_at: '2026-06-27T01:10:47.944507+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-3f73931a
  kind: behavior
  regression_only: false
---

## Criterion
Given an HTML document, the digest's content signal reports: a `headings` tree as an ordered list of `{ level, text }` for every non-empty h1–h6; `navLinks` as `{ text, href }` for every anchor inside a `<nav>` that has both non-empty text and href; `formFields` as `{ name, kind }` for every input/select/textarea inside a `<form>` (kind taken from an input's `type`, else the element tag; name taken from the `name`/`id` attribute, else the tag); a `listGroupCount` of `<ul>`/`<ol>` elements; and a `sectionCount` of `<section>` elements.

## Verification
Run content extraction against a fixture with a heading hierarchy, a nav with several links, a form with named inputs of differing types, and a couple of lists and sections → assert the heading tree preserves level and order, nav links carry text and href, form fields carry name and kind, and the list-group and section counts match the markup. Also assert an empty document yields empty arrays and zero counts.
