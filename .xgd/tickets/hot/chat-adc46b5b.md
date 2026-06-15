---
uid: chat-adc46b5b
id: CHAT-12
type: chat
title: Free Coding validation
created_by: xgd
created_at: '2026-06-15T18:28:46.319713+00:00'
updated_at: '2026-06-15T18:33:28.960783+00:00'
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


<!-- xgd-chat-end -->