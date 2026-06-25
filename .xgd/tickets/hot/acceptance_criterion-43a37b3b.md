---
uid: acceptance_criterion-43a37b3b
id: AC-410
type: acceptance_criterion
title: A set of vetted font specs produces a Google Fonts CSS2 URL listing each family
  and its weights with display=swap
created_by: xgd
created_at: '2026-06-25T00:50:02.109377+00:00'
updated_at: '2026-06-25T00:50:02.109377+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-e53ba4cf
  kind: behavior
  regression_only: false
---

## Criterion

Given one or more vetted font specs, the framework produces a single
Google Fonts CSS2 stylesheet URL of the form:

```
https://fonts.googleapis.com/css2?family=<Google-encoded-family>:wght@<w1>;<w2>;…&family=<…>&display=swap
```

- Base URL is the Google Fonts CSS2 endpoint.
- One `family=` parameter per supplied spec, in the order supplied, using
  the spec's URL-encoded family name and its weights joined by `;`
  after `:wght@`.
- A single `display=swap` parameter appears in the URL.

Given an empty set of specs, no URL is produced.

## Verification

- Build a URL from a single spec (e.g. Inter at weights 400/500/600/700)
  and assert the returned URL has the Google Fonts CSS2 base, contains
  `family=Inter:wght@400;500;600;700`, and contains `display=swap`.
- Build a URL from multiple specs (e.g. Manrope + Inter) and assert the
  returned URL contains two `family=` parameters in the supplied order,
  each with its encoded family name and weights, and a single
  `display=swap` parameter.
- Build a URL from an empty list and assert no URL is returned.
