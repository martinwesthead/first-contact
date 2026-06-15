---
uid: chat-adc46b5b
id: CHAT-12
type: chat
title: Free Coding validation
created_by: xgd
created_at: '2026-06-15T18:28:46.319713+00:00'
updated_at: '2026-06-15T18:59:02.787713+00:00'
completed_at: null
last_field_updated: body
status: open
fields: {}
---

<!-- xgd-turn id="e06aafe1-6280-40f8-b16b-c235e37407b9" -->

<!-- xgd-chat role="user" ts="2026-06-15T18:33:27.919Z" -->
#### You
Can you validate that the free coded tickets correctly followed the FREE CODING protocol? Critically were the commit SHAs added to the tickets?

<!-- xgd-chat role="assistant" ts="2026-06-15T18:33:27.919Z" -->
#### Claude
I'll investigate the free-coded tickets and check their compliance with the protocol.

Let me check each REQ ticket's status and commits to validate the protocol.

Now let me verify the commit SHAs exist and check for the `[FREE-CODED]` marker in commit messages.

Now let me find all `[FREE-CODED]` commits to verify they're all attributed correctly.

I have enough information. Let me put together the validation report.

## Free-Coding Protocol Validation Report

**8 free-coded tickets audited.** All have `status=ready_to_reconcile` (post-`free_coded`), `[FREE-CODED]` markers in commit subjects, and structured ticket bodies. But there are real `fields.commits` problems on several tickets.

### Compliance summary

| Ticket | Status | `[FREE-CODED]` tag | UATs | `fields.commits` | Verdict |
|---|---|---|---|---|---|
| REQ-1 | ready_to_reconcile | ✅ | 3 | ❌ stale SHA | **STALE** |
| REQ-2 | ready_to_reconcile | ✅ | 0 (legit — pure rename) | ❌ stale SHA + bogus ticket-auto-commit | **CORRUPT** |
| REQ-3 | bundled | ✅ | 8 | ✅ correct | OK |
| REQ-4 | bundled | ✅ | 13 | ✅ correct | OK |
| REQ-5 | ready_to_reconcile | ✅ | 17 | ✅ correct | OK |
| REQ-6 | ready_to_reconcile | ✅ | 9 | ✅ correct | OK |
| REQ-7 | ready_to_reconcile | ✅ | 14 | ✅ correct | OK |
| REQ-8 | ready_to_reconcile | ✅ | 8 | ⚠️ short SHA (`0b1ba59`) | MINOR |

### Critical findings

**1. REQ-1 commit SHA is orphaned.** Stored `13723afc5a3dac29366db91bb667d51bb8312e40` does **not exist on any branch**. The actual scaffold commit on `xgd-working` is `ac174d821cee8ef8dd6af126e9c2ca2db53b2ddc`. Patch-ids match — the commit was re-authored by rebase/resync but `fields.commits` was never remapped.

**2. REQ-2 commit SHA is orphaned + has a bogus entry.** Stored `a746b3b54878ea921c2109a9dc546704064e18bc` is orphaned (actual is `f53c97229b5b6a1c01a644e990bf079aefa4b422`, identical patch-id). Additionally `a7cb585` is `xgd(ticket): update doc doc-ab7508c1` — a pure `.xgd/tickets/` auto-commit, not a code commit. Auto-commits reach main via `sync_working_to_main`; putting them in `fields.commits` is wrong.

**3. REQ-8 stored as short SHA.** `0b1ba59` should be the full 40-char `0b1ba59f9b630b6616526cdc42cd0904a41f5221`. The dispatcher's SHA validators expect full SHAs.

**4. No `resync_remap` audit report found.** Per `BRANCHING-STRATEGY.md` §4.5, resync is supposed to remap `fields.commits` via patch-id alignment and file a `resync_remap` report. The fact that REQ-1/REQ-2 still hold orphan SHAs suggests resync either ran before the SHA-remap feature existed, or the remap failed silently for these two.

### What's working

- `[FREE-CODED]` marker present on every code commit (8/8).
- UAT files use `test_UAT_FC_<TICKET-ID>_*` naming convention correctly.
- Test count is healthy (REQ-2's zero is legitimate — it's a slug rename with no behavioral surface).
- Ticket bodies describe scope clearly and are kept current.

### Recommended fixes

```bash
# Remap REQ-1 stale SHA
xgd ticket update REQ-1 --fields '{"commits": ["ac174d821cee8ef8dd6af126e9c2ca2db53b2ddc"]}'

# Remap REQ-2 stale SHA and drop the ticket-auto-commit
xgd ticket update REQ-2 --fields '{"commits": ["f53c97229b5b6a1c01a644e990bf079aefa4b422"]}'

# Promote REQ-8 to full SHA
xgd ticket update REQ-8 --fields '{"commits": ["0b1ba59f9b630b6616526cdc42cd0904a41f5221"]}'
```

Want me to apply these?


<!-- xgd-turn id="9f804b1f-2d15-4fa2-8a42-887421264e26" -->

<!-- xgd-chat role="user" ts="2026-06-15T18:59:02.730Z" -->
#### You
`[FREE-CODED]` marker present on every code commit (8/8). <-- key question: did all of those code commits get added two tickets?

<!-- xgd-chat role="assistant" ts="2026-06-15T18:59:02.730Z" -->
#### Claude
Good — let me cross-reference the 8 `[FREE-CODED]` commits on xgd-working against ticket `fields.commits`.

| `[FREE-CODED]` commit on xgd-working | Subject | Ticket claim | Resolvable? |
|---|---|---|---|
| `ac174d82…` | scaffold | REQ-1 → `13723afc…` | ❌ orphan (same patch-id) |
| `f53c9722…` | rename | REQ-2 → `a746b3b5…` | ❌ orphan (same patch-id) |
| `e34f13e2…` | site-schema | REQ-3 → `e34f13e2…` | ✅ exact match |
| `d4f8e4d5…` | framework chrome | REQ-4 → `d4f8e4d5…` | ✅ exact match |
| `1befb476…` | content modules | REQ-5 → `1befb476…` | ✅ exact match |
| `bce23fdc…` | generator + marketing site | REQ-6 → `bce23fdc…` | ✅ exact match |
| `fa419444…` | lead-capture | REQ-7 → `fa419444…` | ✅ exact match |
| `0b1ba59f…` | builder | REQ-8 → `0b1ba59` (short) | ⚠️ resolves but short |

### Answer

**Conceptually yes — every one of the 8 `[FREE-CODED]` commits on `xgd-working` has a ticket that claims it.** No orphan commits with no ticket home.

**Mechanically, 3 of 8 are broken bookkeeping:**

- **REQ-1, REQ-2** — the SHAs they store are *orphans*. Patch-ids match the real commits, so the *intent* is preserved, but `git cat-file -e 13723af` / `a746b3b` both fail. The dispatcher's reconcile cherry-pick will not find these commits. The original commits were re-authored by a rebase/resync, and `fields.commits` was never remapped.
- **REQ-8** — stores the 7-char short SHA `0b1ba59`. Git can resolve it today (only one match), but it's brittle: any future collision or a strict SHA validator (e.g. `len == 40`) will reject it.

So the rigorous answer to your question: **all 8 code commits were added to tickets, but 3 of those records are stale/non-canonical and would fail a strict dispatcher check.** The three fixes I proposed earlier (remap REQ-1 and REQ-2 to the live SHAs, promote REQ-8 to full SHA) are what's needed to make the bookkeeping match the protocol.


<!-- xgd-chat-end -->