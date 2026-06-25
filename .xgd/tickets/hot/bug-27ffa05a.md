---
uid: bug-27ffa05a
id: BUG-15
type: bug
title: Preview screenshots don't render /assets/ images — breaks hero bg-image and
  service card photos
created_by: xgd
created_at: '2026-06-25T00:14:27.595296+00:00'
updated_at: '2026-06-25T00:14:27.595296+00:00'
completed_at: null
last_field_updated: created_at
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

When preview_generated_page renders a screenshot, images stored at /assets/sites/anonymous/imports/... are not loading. The hero module uses variant bg-image with a valid assetRef (id: sites/anonymous/imports/17cfe3cb0fe61c5b.jpg, src: /assets/sites/anonymous/imports/17cfe3cb0fe61c5b.jpg) but the screenshot shows no background image — just the inverse surface colour. Service card images in services-grid are also missing. The preview digest flags 'no hero image inferred' even though the content field is correctly populated.

This makes the preview comparison tool useless for image-heavy sites because:
1. The hero bg-image variant is visually indistinguishable from bg-color in screenshots
2. The inspirationDelta comparison cannot detect image-related differences
3. Operators cannot verify photo placement visually before publishing

Root cause hypothesis: the screenshot browser (Puppeteer/headless Chrome) fetches the page from a localhost preview URL but the /assets/ route is not being served at that origin, so <img> src and CSS background-image both 404 silently.

Expected: /assets/ paths should be proxied or inlined (base64 or presigned R2 URL) when generating preview screenshots so images render correctly.

Steps to reproduce:
1. Run transcribe_site on any image-heavy site
2. Call preview_generated_page
3. Observe: hero background image absent, service card images absent despite valid assetRef objects in site definition