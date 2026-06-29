---
uid: comment-9abf475b
id: COMMENT-285
type: comment
title: Comment on request REQ-16
created_by: xgd
created_at: '2026-06-29T23:39:14.372099+00:00'
updated_at: '2026-06-29T23:39:52.529856+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-82f571d1
  kind: chat_transcript
---

<!-- xgd-turn id="a8f903e8-369e-4098-ad59-302d9ae9b3c9-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T23:38:58.643Z" -->
#### You
REQ-17 is underway, can this ticket be free coded in parallel

<!-- xgd-turn id="a8f903e8-369e-4098-ad59-302d9ae9b3c9-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-29T23:39:52.498Z" -->
#### Claude
I'll investigate both tickets to answer this properly.

Yes — REQ-16 can be free-coded in parallel with REQ-17. This is anticipated by design, not a workaround. Here's the dependency picture:

**REQ-16's two blocking prerequisites:**

| Prerequisite | What it provides | Status |
|---|---|---|
| **REQ-20** (R2 plumbing) | `ASSETS_BUCKET` binding + the 4 CRUD routes REQ-16 consumes | ✅ `free_and_reconciled` — landed |
| **REQ-17** = "REQ-UI-APP-SHELL" | tab bar, parent content area, per-tab chat slot | 🔄 `draft`, underway (the `app-shell.ts` in your working tree) |

The data dependency (REQ-20) is **already done and reconciled**, so the routes the Assets tab calls exist today. The only overlap is the shell (REQ-17), and REQ-16's scope was written explicitly to decouple from it:

> "Until the shell lands, mount it via a stub host route `/assets` in control-app (delete the stub host when REQ-UI-APP-SHELL lands)."

So REQ-16 builds `createAssetsTab(parent, options)` against a stub `/assets` route now; when REQ-17 lands, the stub is deleted and the tab registers into the real shell. Parallel is the intended path.

**Coordination caveats** (worth flagging before you start, since both REQs touch the same package):

1. **`packages/builder-ui/src/index.ts`** — already modified by REQ-17. REQ-16 will also export from here. Likely a clean additive merge, but a conflict surface.
2. **`builder-layout.ts` → `createSplitLayout` refactor** — REQ-16's scope generalizes the splitter (`chatPanel`/`previewPanel` → `leftPanel`/`rightPanel`) and has `builder-layout` consume it. REQ-17 migrates `/builder` into the tab shell, which sits right on top of that same layout code. This is the real overlap to watch — if both edit the splitter, the reconcile cherry-pick can conflict.
3. **Routing** — REQ-16's stub `/assets` vs REQ-17's `/app/<site>/<tab>` are disjoint, so no conflict there; the stub is designed to be thrown away.

Since both are free-coded and reconciled sequentially (the sequential-bundle model), any overlap is resolved at reconcile time, not now. To minimize friction, the cleanest split is: let REQ-17 own the `index.ts` shell wiring, and have REQ-16 do its `createSplitLayout` extraction as a small, self-contained commit so the refactor is easy to cherry-pick independently.

Want me to start scoping the REQ-16 implementation (the `createSplitLayout` extraction + `createAssetsTab` + stub route), or were you just checking the dependency situation before deciding?

<!-- xgd-chat-end -->