---
uid: report-d511d881
id: REPORT-851
type: report
title: Claude reconciliation_story_generation report
created_by: xgd
created_at: '2026-06-30T01:27:21.536968+00:00'
updated_at: '2026-06-30T01:27:21.536968+00:00'
completed_at: null
last_field_updated: created_at
fields:
  report_kind: reconciliation_story_generation
  subject_uid: bundle-30021526
  plan_item_index: '4'
---

All mutations applied and verified. The story now carries 19 ACs (was 17), with the two new REQ-49 rendered-path ACs and the sharpened schema AC all linked to STORY-55.

```
Upgrade mutations applied for plan item 4 of 5

Target Stories: story-3f73931a
Primary Story UID: story-3f73931a (STORY-55)
Stories Modified: 1
ACs Modified: 1
ACs Added: 2
ACs Removed: 0

tickets_modified:
  stories:
    - "story-3f73931a"
  acceptance_criteria:
    modified: ["AC-594"]   # schema validator: kind now img|background|video|font; optional layout.boundingBoxes
    added: ["AC-789", "AC-790"]
    removed: []

Progress: 4 of 5 plan items complete
```

**What I aligned (code → matrix), grounded in the bundle intent (REQ-49) and the actual code:**

- **Story body (STORY-55)** — extended the "I want" clause and the in-scope/Technical-Context sections to document that the rendered path now also captures `@font-face` web-font files (`kind: 'font'` records) and records hero/nav/section/card bounding boxes on `layout.boundingBoxes`. Added a REQ-49 reconciliation note that explicitly fences these two signals off from REQ-49's *render-by-default escalation amendment* (not in this bundle) and its `transcribe_site` force-rendered/`screenshotUrl` changes (item 5, other stories) — keeping the existing escalation-heuristic ground-truth note intact.

- **AC-789 (new)** — `@font-face` URLs from `document.styleSheets` + `document.fonts` fold into the inventory as `kind: 'font'` records, absolute-URL resolved, family on the record, dedup-by-URL (`references++`, original kind retained), `data:` excluded. Mirrors the merge/dedup pattern of AC-613.

- **AC-790 (new)** — `layout.boundingBoxes` exposes hero/nav (optional) + sections/cards (arrays) rects in CSS px with scroll offset; zero-area elements omitted; existing layout fields preserved; static-only digest leaves it unset.

- **AC-594 (modified)** — schema contract sharpened: valid asset `kind ∈ {img, background, video, font}` and the layout signal may carry an optional `boundingBoxes` structure; verification now validates a font record + boundingBoxes object.

All ACs are phrased as observable digest-contract outcomes (no internal function names). No runtime code, UATs, or new story tickets were touched. AC-590/AC-591 (static imagery extraction) were deliberately left alone — fonts are a rendered-path-only signal, not part of imagery extraction, so widening them would have overreached.
