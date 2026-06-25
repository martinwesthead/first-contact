---
uid: acceptance_criterion-25746b2f
id: AC-475
type: acceptance_criterion
title: Generated pages containing a contact-form module include the Turnstile script
  and site-key meta when a Turnstile site key is configured
created_by: xgd
created_at: '2026-06-25T01:48:10.743435+00:00'
updated_at: '2026-06-25T01:48:10.743435+00:00'
completed_at: null
last_field_updated: created_at
status: pending
fields:
  story_uid: story-37572647
  kind: behavior
  regression_only: false
---

## Criterion

When the static site generator renders a page whose module list contains at least one `contact-form` module, and the build environment supplies a non-empty Turnstile site key, the generated HTML's `<head>` contains:

- A `<meta name="fc-turnstile-site-key">` element whose `content` attribute equals the configured site key (HTML-escaped).
- A `<script>` tag loading the Cloudflare Turnstile JavaScript API from `https://challenges.cloudflare.com/turnstile/v0/api.js` (with an async/defer attribute and an `onload` callback name).

When the page contains no contact-form module, or when the Turnstile site key is empty / unset, the generated HTML does not include the Turnstile script tag or the site-key meta.

## Verification

A test harness runs the generator against a site definition containing a `contact-form` module on the home page, once with a configured Turnstile site key (`"test-site-key"`) and once with the site key unset. The harness reads the generated `index.html` for each variant and asserts: with the key set, the head contains both the `meta[name="fc-turnstile-site-key"]` with the configured content and a script tag loading `challenges.cloudflare.com/turnstile/v0/api.js`; without the key, neither element is present. A second site definition with no contact-form module is also rendered and asserted to never include the Turnstile elements regardless of the site-key configuration.
