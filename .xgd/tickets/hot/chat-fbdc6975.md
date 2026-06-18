---
uid: chat-fbdc6975
id: CHAT-16
type: chat
title: REQ ordering
created_by: xgd
created_at: '2026-06-18T21:52:00.117856+00:00'
updated_at: '2026-06-18T22:07:48.180421+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="b0612689-fa40-4eef-af0b-a5ab1fcee7b2" -->

<!-- xgd-chat role="user" ts="2026-06-18T21:59:11.229Z" -->
#### You
Please can you quickly review the REQ's that we have in draft state and they're related design documents.

I want to have a discussion about the correct ordering of these requirements. My immediate concern is to validate that the choices of framework restriction that we have made give us the flexibility that we require to build beautiful websites. I believe the best way to validate this is to implement the on boarding use case we discussed, where the AI is charged with reproducing roughly and existing website.

To do this, we would need the web browsing/access tools and basic asset and content management capability (not necessarily editors). 

We have around 20 REQs can you help me define an ordering for them and possible scoping to help me get to this test?

<!-- xgd-chat role="assistant" ts="2026-06-18T21:59:11.229Z" -->
#### Claude
Let me verify what foundation REQs (REQ-1 through REQ-9) are already done, so I can ground the recommendation in current state.

Here's where I landed. Foundation REQ-1..REQ-8 are already bundled (chat builder + framework + in-browser preview exist), and REQ-9 (operator API foundation) is mid-reconcile. So the substrate for the demo is already in place — we just need the fetch/transcribe path.

## The demo's irreducible critical path

To get "paste URL → AI reproduces site as editable draft" working:

| # | REQ | Pts | Why it's required |
|---|---|---|---|
| 1 | **REQ-20** Web-fetch safety | 5 | Every fetch must go through it; can't ship REQ-21/22 without it |
| 2 | **REQ-21** Reference Digest + static fetch + Layer A | 7 | Produces the artifact AI consumes |
| 3 | **REQ-22** Browser Rendering + screenshots | 6 | Without this, most real sites give an empty digest |
| 4 | **REQ-28** Site Transcription (Layer B) | 9 | The actual "make this a 1stContact site" step |

That's **27 points**. Plus a sliver to land: R2 bucket binding (currently bundled inside REQ-16's assets-tab REQ; you'd want it pulled out).

## Things I'd defer outright

| REQ | Reason to defer |
|---|---|
| REQ-10/11/12/18 | Publish/revision/draft-published lifecycle — irrelevant until the demo proves the framework |
| REQ-14, REQ-15 | Nav/page tools and responsive dials — nice editing polish, not validation-blocking |
| REQ-16 (UI), REQ-19, REQ-17 | Assets tab UI, image manipulation, app shell — operator workflow, not framework-flexibility validation |
| REQ-25, REQ-26 | Chat session list UI + reference-docs seed — polish on top of persistence |
| REQ-29 | Search-based inspiration is the *other* killer demo; reproduce-from-URL doesn't need it |

## The judgment calls — where I want your input

**Q1. Chat persistence (REQ-23/24) — align now or defer?**
REQ-21/22/28 each say "tool calls run through REQ-24's dispatcher and persist via REQ-23." Strictly we can implement the digest/transcribe tools directly against the current chat handler and refactor when REQ-23/24 land. Saves ~8 pts but creates known rework. My lean: **defer**, because the demo doesn't need cross-session memory and the rework is mechanical.

**Q2. Design Brief (REQ-27) — drop for the demo?**
REQ-28 nudges the AI to call `propose_brief_update` post-transcription, but it's a polish hook, not a flow blocker. My lean: **drop it from the demo slice** (saves 7 pts). The Brief is a separate validation question; doesn't belong on the framework-flexibility path.

**Q3. REQ-13 (structured tool_results + chat markdown) — needed?**
The digest is a markdown report. Without REQ-13, it renders as a raw blob in chat. My lean: **include the digest-rendering half of REQ-13** (structured tool_results + marked output), defer the TipTap input + get_site_definition tool. That's maybe 2 pts of the 4.

**Q4. R2 binding split.**
REQ-22 needs R2 to store screenshots. REQ-16 currently bundles the R2 binding with the full assets UI. Cleanest move: pull the binding out as a tiny standalone change (or fold into REQ-20). I'd recommend splitting REQ-16 into 16a (binding, ~1 pt) and 16b (UI, the rest).

## Suggested ordering (assuming you defer REQ-23/24 and REQ-27)

```
REQ-16a (R2 binding, split)   ~1 pt   prerequisite plumbing
REQ-20 (safety)                5 pts   foundation
REQ-13a (tool_results half)   ~2 pts   so the digest renders
REQ-21 (Layer A)               7 pts   parallel-able with REQ-13a after REQ-20
REQ-22 (Browser Rendering)     6 pts   depends on REQ-21
REQ-28 (Layer B transcribe)    9 pts   the demo goal
                              ────
                              ~30 pts
```

REQ-21 and REQ-13a can run in parallel once REQ-20 lands.

**What I'd like to decide before scoping any tickets:** Q1, Q2, Q3 above, and whether you're comfortable splitting REQ-16. Once those are settled I can help re-scope the affected REQs with a fresh body and we're ready to start.


<!-- xgd-turn id="641af948-862b-4fb9-b389-63430f1aa1a7" -->

<!-- xgd-chat role="user" ts="2026-06-18T22:07:48.117Z" -->
#### You
Lets defer 1 and 2, lets do all of 3. Please take the R2 content out of 16 and add it to 20

<!-- xgd-chat role="assistant" ts="2026-06-18T22:07:48.117Z" -->
#### Claude
Good — to make those edits I need to read REQ-16 and REQ-20 in full so I can identify the R2 plumbing to move, then use the ticket CLI to update bodies.

Now let me check the xgd ticket CLI for the update interface.

Now I'll write the updated bodies. I'll keep them tight and surgical — moving only the R2 plumbing.

Now I'll apply the body updates and adjust title + story points on both tickets.

Both updates applied. Here's the recap of where the planning landed:

**Decided**
- **Defer REQ-23 / REQ-24** (chat persistence) — implement digest/transcribe tools against current chat handler; refactor later
- **Defer REQ-27** (Design Brief) — separate validation concern
- **Include all of REQ-13** (structured tool_results + chat markdown + get_site_definition + TipTap input)
- **REQ-20 absorbs R2 plumbing** — `ASSETS_BUCKET` binding + 4 CRUD routes; bumped 5→7 pts
- **REQ-16 becomes UI-only** — depends on REQ-20 for storage; dropped 5→3 pts

**Demo critical path (now)**

| # | REQ | Pts |
|---|---|---|
| 1 | REQ-20 (safety + R2 binding/routes) | 7 |
| 2 | REQ-13 (full — structured tool_results, marked rendering, TipTap input, get_site_definition) | 4 |
| 3 | REQ-21 (Reference Digest + static fetch + Layer A) — parallel-able with REQ-13 once REQ-20 lands | 7 |
| 4 | REQ-22 (Browser Rendering + screenshots) — depends on REQ-21 | 6 |
| 5 | REQ-28 (Layer B transcribe) — the demo goal | 9 |
| | **Total** | **33** |

**Deferred until the demo validates the framework:** REQ-10, 11, 12, 14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 27, 29.

Want me to do anything else with the tickets (e.g. add explicit `blocks` / `blocked_by` field links between REQ-20→21, 21→22, 22→28, or annotate the deferred ones with a note about the demo ordering)? Or are we ready to move into scoping the first slice?


<!-- xgd-chat-end -->