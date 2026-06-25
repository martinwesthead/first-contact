---
uid: capability-820fbc22
id: CAP-35
type: capability
title: Static Site Generator
created_by: xgd
created_at: '2026-06-25T01:22:50.756490+00:00'
updated_at: '2026-06-25T01:22:50.756490+00:00'
completed_at: null
last_field_updated: created_at
status: active
fields:
  name: static_site_generator
---

File-backed static site generator that turns a validated site definition (site.json + recursive assets) into a deployable static bundle (HTML pages, per-site theme.css, copied assets). Exposed as both a programmatic API (`runGenerate`) and a CLI (`fc-generate`). Builds on the site-schema contract, the framework theme-token CSS generator, the vetted Google Fonts shortlist, and the framework module registry. Forms the build step that every public-site Worker (or future preview consumer) runs to materialize a site.
