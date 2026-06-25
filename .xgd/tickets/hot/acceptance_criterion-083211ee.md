---
uid: acceptance_criterion-083211ee
id: AC-433
type: acceptance_criterion
title: Contact-form renders one labeled input per configured field with the field's
  type, name, label, and required attribute
created_by: xgd
created_at: '2026-06-25T01:11:55.282096+00:00'
updated_at: '2026-06-25T01:11:55.282096+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-f1e061ba
  kind: behavior
  regression_only: false
---

## Criterion

When a contact-form is rendered with an array of field definitions, the rendered form contains exactly one input element per field. Each input's type matches the field's declared type (`text`, `email`, `tel` → `<input type>`; `textarea` → `<textarea>`), name matches the field's `name`, the form contains a `<label>` whose `for` references the input and whose text contains the field's `label`, and the input's required attribute is present when the field is required.

## Verification

Render a contact-form with three or more field definitions covering at least one text, one email, and one textarea (with mixed required flags); assert the rendered markup contains exactly one input per field with matching type and name, a label whose `for` references each input and whose text contains the label, and the required attribute set on inputs whose definitions are required.
