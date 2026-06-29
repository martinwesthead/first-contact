---
uid: bundle-4e8020d6
id: BUNDLE-6
type: bundle
title: BUG-11 + REQ-10 + REQ-37 + REQ-36 + REQ-38 + 1 more
created_by: xgd
created_at: '2026-06-29T00:55:03.360302+00:00'
updated_at: '2026-06-29T21:01:41.152359+00:00'
completed_at: null
last_field_updated: status
status: ready_to_reconcile
fields:
  commits:
  - a59e985971b5e1af30128b83ad8e2a88f368c3a7
  - 8ea7a829a93a5fa1918e5f692f873dbcde0be90d
  - e5cec1a8782609483c46747956de1b8eb3b3a5f8
  - a1ed6998efaae1601b8611e960723b6f8d5bc069
  - be19e5f1408165a2323bc3d8e63b2b9d4077b2a6
  - 9121fdddf9307de1f08a6a48d469a063206f788d
  - 3a476353141abfd84e00af4c3f0ea94f57bfe5a0
  - 395e2bc249b1d81b6a63ef329f8552915088b0a7
  - 6f3fa5a8bf752c6f358d6bef58ef641fa7f78b01
  - ff2c55d58257914ccbbe7202831029018835456c
  - 0dcaa39a6d7c90dfc03606a80d8df290a4c07816
  auto_merge_back: true
  priority: medium
---

# Bundle

This ticket bundles the following source tickets:


---

## BUG-11: pnpm build fails: TS2304 'KVNamespace' in extractor → web-fetch-safety

## Symptom

`pnpm build` (which runs `pnpm -r build` → `tsc --noEmit` inside `packages/extractor`) fails:

```
packages/extractor build: ../web-fetch-safety/src/browser-budget.ts(12,22): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/browser-budget.ts(32,7): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/browser-budget.ts(45,7): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/intent-token.ts(2,18): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/rate-limit.ts(16,18): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/rate-limit.ts(34,7): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/rate-limit.ts(47,7): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/types.ts(56,19): error TS2304: Cannot find name 'KVNamespace'.
packages/extractor build: ../web-fetch-safety/src/types.ts(57,20): error TS2304: Cannot find name 'KVNamespace'.
```

Reproduces under both old (`@cloudflare/workers-types ^4.20250601.0`) and new (`^4.20260617.1`) versions, so it is **not** caused by the wrangler 4 bump (CHAT-18 / `40d7ded`). Pre-existing.

## Root cause

`packages/extractor/tsconfig.json` does **not** declare `@cloudflare/workers-types` in its `types` array:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "lib": ["ES2022", "WebWorker"]
  },
  "include": ["src/**/*.ts"]
}
```

When extractor compiles, it pulls in `web-fetch-safety` sources (via the workspace `import`s). Those sources use `KVNamespace` as a bare global type rather than importing it. Without `@cloudflare/workers-types` in extractor's `types`, TS can't resolve the global.

By contrast, `packages/web-fetch-safety/tsconfig.json` *does* declare it (`"types": ["@cloudflare/workers-types"]`), so the package builds fine standalone — the failure only manifests in consumers that don't replicate that types entry.

Why this didn't fire earlier: probably because `pnpm build` wasn't routinely run end-to-end in CI on this branch, or because extractor was previously the only entry path and ran in isolation. Worth confirming.

## Proposed fix (one of)

1. **Cleanest**: add `import type { KVNamespace } from '@cloudflare/workers-types'` in the four `web-fetch-safety` source files (`browser-budget.ts`, `intent-token.ts`, `rate-limit.ts`, `types.ts`). Stops leaking the global requirement onto consumers.
2. **Minimal**: add `"types": ["@cloudflare/workers-types"]` to `packages/extractor/tsconfig.json` (and any other consumer tsconfig). Each consumer keeps repeating the dep; brittle if more consumers land.

Recommend option 1.

## Repro

```bash
pnpm install
pnpm build
# → fails in packages/extractor with the 9 TS2304 errors above
```

## Scope

Touches `packages/web-fetch-safety/src/{browser-budget,intent-token,rate-limit,types}.ts` (add `import type { KVNamespace } from '@cloudflare/workers-types'`). No runtime change. Should be a small UAT-light fix (build passes = success).


---

## REQ-10: D1 schema: accounts, sites (draft + published), revisions, slug validation, 1stcontact seed

## Scope

D1 schema for the multi-site, draft/published, revision-tracked data model. Accounts, sites, revisions, and the foreign-key bones to support per-account multi-site even though v1 UX exposes only the single-site path.

After this REQ: `sites` table holds one row per site with separate `draft_definition` and `published_definition` JSON columns; `revisions` table holds a snapshot per publish event; `accounts` table carries the operator identity + plan_tier needed to gate system actions. Migrations are reversible and locally testable.

Design discussion: see [[DOC-5]] (forthcoming amendment: site-definition lifecycle, accounts/sites/revisions schema) and CHAT-9 — draft/publish lifecycle leans confirmed (per-publish revisions; published is what the build renders; draft is what the builder edits).

## Why free-coded

Schema-only REQ — single cohesive intent. The shape is settled by the lifecycle decisions in CHAT-9. No algorithmic design; just translating decisions into SQL migrations + types.

## Dependencies

None. Foundational for [[REQ-11]] (API lifecycle) and [[REQ-12]] (UI lifecycle). Concurrent with [[REQ-9]] (API foundation); no ordering required between them.

## Deliverables

### D1 migrations (`db/migrations/`)

Sequential numbered migrations:

**`002_accounts.sql`**

```sql
CREATE TABLE accounts (
  id            TEXT PRIMARY KEY,           -- UUID
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  plan_tier     TEXT NOT NULL DEFAULT 'trial', -- 'trial' | 'paid'
  created_at    INTEGER NOT NULL,           -- unix millis
  updated_at    INTEGER NOT NULL
);
```

**`003_sites.sql`**

```sql
CREATE TABLE sites (
  id                     TEXT PRIMARY KEY,    -- UUID
  account_id             TEXT NOT NULL REFERENCES accounts(id),
  slug                   TEXT NOT NULL UNIQUE, -- global namespace within *.1stcontact.io
  display_name           TEXT NOT NULL,
  draft_definition       TEXT NOT NULL,        -- JSON site definition (working state)
  published_definition   TEXT,                  -- JSON site definition (live), NULL if never published
  published_at           INTEGER,               -- unix millis of most recent publish
  published_revision_id  TEXT,                  -- FK to revisions.id of currently-live snapshot
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL
);

CREATE INDEX idx_sites_account_id ON sites(account_id);
CREATE INDEX idx_sites_slug ON sites(slug);
```

**`004_revisions.sql`**

```sql
CREATE TABLE revisions (
  id              TEXT PRIMARY KEY,           -- UUID
  site_id         TEXT NOT NULL REFERENCES sites(id),
  definition      TEXT NOT NULL,              -- JSON snapshot of the published definition
  published_at    INTEGER NOT NULL,
  published_by    TEXT,                       -- account_id of the publisher
  description     TEXT,                       -- optional operator-supplied note
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_revisions_site_id ON revisions(site_id);
CREATE INDEX idx_revisions_site_id_published_at ON revisions(site_id, published_at DESC);
```

### Reserved slug list

A static list in code (`packages/site-schema/src/reserved-slugs.ts`) of slugs that cannot be claimed by operators:

```
api, app, www, admin, preview, ftp, mail, blog,
status, dashboard, control, docs, help, support,
1stcontact, gendev, gendevlabs
```

The `INSERT` for the 1st Contact marketing site (existing `sites/1stcontact/site.json`) uses slug `1stcontact` from this reserved list — operator-owned, not user-allocatable.

### Slug validation

`packages/site-schema/src/slug.ts`:

```typescript
function isValidSlug(s: string): boolean
function isReservedSlug(s: string): boolean
function suggestAlternativeSlug(taken: string): string[]
```

- Valid slug: 3–40 chars, lowercase ASCII + digits + hyphens, no leading/trailing hyphen, no consecutive hyphens.
- Suggestions on collision: `<slug>-<short-hash>`, `<slug>-co`, `<slug>-app`, etc.

### Seed data

A one-time seed migration `005_seed_1stcontact.sql` that inserts the platform-owned account and the 1st Contact site row, pointing `draft_definition` and `published_definition` at the contents of `sites/1stcontact/site.json` from the repo. This makes `1stcontact.io` D1-backed in the same way customer sites will be — closing the gap between file-backed and D1-backed paths over time.

### Types

`packages/site-schema/src/db-types.ts` — TypeScript types matching each table row, plus `SiteRecord`, `AccountRecord`, `RevisionRecord` with parsed-JSON variants.

## UATs (`test_UAT_FC_<REQ-ID>_*`)

- `migrations_apply_clean` — fresh D1, apply all migrations including seed; tables exist, indexes exist, seed row present.
- `migrations_reversible` — each migration has a `DROP` counterpart that leaves the schema empty.
- `slug_validation_accepts_valid` — `acme`, `my-bakery`, `a-1-b` accepted.
- `slug_validation_rejects_invalid` — empty, too short, too long, uppercase, special chars, consecutive hyphens, leading/trailing hyphen, all rejected.
- `slug_validation_rejects_reserved` — `api`, `www`, `admin`, `preview`, `1stcontact` rejected as reserved.
- `slug_collision_suggestions_non_empty` — `suggestAlternativeSlug('taken')` returns at least three candidates not equal to the input.
- `unique_constraint_on_slug` — inserting two sites with the same slug fails with a unique-constraint violation.
- `seed_1stcontact_loads_real_definition` — the seeded `1stcontact` site's `draft_definition` parses to a valid Site per the `@1stcontact/site-schema` validator from REQ-3.

## Out of scope

- Magic-link / sessions tables — separate auth REQ.
- Custom-domain mappings — later REQ (paid feature).
- Asset records (R2 refs) — already partly covered in REQ-3's `AssetRef` type; binary storage and full asset CRUD comes with a later REQ.
- Audit log table — later, alongside system-action audit.
- Soft-delete columns — later if needed; v1 sites are not deletable.

## Risks / open items

- **JSON column size** — D1 SQLite TEXT columns hold large JSON fine; site definitions are typically well under 1MB. Add a guard in API REQs that rejects definitions exceeding 5MB pre-persist.
- **Slug-uniqueness race** — `INSERT` race on slug uniqueness is handled by the UNIQUE constraint at the DB level. API REQs catch the constraint violation and return a 409 with suggestions.
- **Bootstrap path** — the 1st Contact site is currently file-backed (`sites/1stcontact/site.json` per REQ-6). Post-this-REQ it's also in D1 via seed. Both paths coexist briefly; `tools/generate` should be updated by a later REQ to read from D1 when available.


## Coordination note from REQ-20 (added 2026-06-18)

REQ-20 (web fetch safety + R2 assets) is landing **before** this REQ and needs an `account_id` for its per-account rate-limit and Browser Rendering budget counters. Because the `accounts` table does not yet exist, REQ-20 extracts `account_id` from the `x-account-id` request header with a `"default"` fallback, behind a single function (`extractAccountId(request, env)`) in `apps/control-app/src/safety/account.ts`.

**Action for REQ-10:** when implementing the accounts schema and the auth path that issues `account_id`, update `extractAccountId` (or replace the call site) to resolve `account_id` from the authenticated session / magic-link cookie instead of the header. The function signature is the only contract REQ-20 depends on — replacing the body is sufficient; no shape change in the KV counter keys is required.

KV counters in `FETCH_RATE_KV` and `BROWSER_BUDGET_KV` are keyed by `account_id`. Switching from `"default"` to real account IDs migrates cleanly (existing default-keyed counters become orphaned and age out via TTL).



## Implementation note (2026-06-20, commit 8ea7a82)

Landed as specified above. Notes for downstream REQs:

- **Migration numbering follows the existing 4-digit convention** (`0002_*`–`0005_*`) rather than the 3-digit numbering shown in the original ticket, to match `0001_create_leads.sql`. Lexicographic ordering is preserved.
- **Down migrations live in `db/migrations-down/`** (sibling directory), one `.down.sql` per forward migration. They are NOT in `db/migrations/` because `wrangler d1 migrations` scans that directory and would treat down files as forward migrations. The `migrations_reversible` UAT applies them via the test helper.
- **Seed IDs are deterministic, not UUIDs**: `acct_1stcontact_platform`, `site_1stcontact`, `rev_1stcontact_seed`. Recognisable as platform-owned and stable across rebuilds. Customer accounts will use UUIDs.
- **Seed JSON embedded inline** in `0005_seed_1stcontact.sql` as a SQL string literal (single quotes doubled per SQLite). The seed is a frozen snapshot of `sites/1stcontact/site.json` at commit time; future drift is expected (a later REQ should update `tools/generate` to read from D1).
- **`extractAccountId` left header-driven**: per the coordination note, the swap to session-cookie resolution belongs to the auth REQ. This REQ is schema-only.
- **`SITES_DB` binding name** used in the test helper; wrangler.toml currently binds `LEADS_DB`. The API REQ (REQ-11) will add the new D1 binding to wrangler.toml — this REQ does not modify wrangler config.

UATs (8 files, 53 tests) all pass. The two failing tests in the broader suite (REQ-30 and BUG-5 doc-drift guards) are pre-existing on `main` and unrelated.


---

## REQ-37: Robust transcription pipeline with error reporting

The `transcribe_site` + `read_transcription_digest` flow needs to surface failures at each stage rather than silently continuing. Specifically:

- Each asset mirror should report success/failure individually

- The digest write should confirm before the tool returns

- `read_transcription_digest` should never return a stale or partial digest

- Tool call failures during the module-building phase should be collected and reported back to me as a summary so I can retry failed steps rather than silently missing them

## Decisions (2026-06-20)

1. **Asset mirror reporting** — per-asset SSE events already fire. Add the failed URLs + reasons to the final tool-return `summary` payload (currently only aggregate counts). Shape: `summary.assetFailures: Array<{ url, reason }>`.

2. **Digest write confirmation** — after `bucket.put(digestKey, ...)`, do a read-back (`bucket.get`) and verify the round-tripped JSON parses and matches a sentinel (e.g., `capturedAt`). If verification fails, return `failed` with `digest_write_unverified`.

3. **Stale/partial digest** — at Stage 0 of `transcribe_site`, delete the previous digest from R2 before anything else runs. `read_transcription_digest` returns a distinct `not_ready` status (not the generic `digest_not_found` error) when nothing is present, so the AI can poll without it looking like a hard failure.

4. **Module-building failure summary** — client-side panel + AI context reinjection:

- `chat-driver` accumulates `action:failed` events (and any `action:notify` events carrying `status === "failed"`) for actions invoked after `transcribe_site` returns.

- Failures are surfaced in a builder-UI panel the user can dismiss/retry.

- On the next AI turn, the accumulated failures are appended to the chat context as a system note ("Previous turn had N failed module-building tool calls: …") so the AI can retry without the user manually prompting.


---

## REQ-36: Builder chat: audit and align with XGD chat capability (look, feel, markdown, tool pane)

## Status

**FREE-CODED 2026-06-20.** All G1-G9 gaps closed in one bundle (operator: keep together). 17 UAT tests in `tests/test_UAT_FC_REQ-36_*.test.ts`.

## Scope

Audit and rework the builder chat panel (`packages/builder-ui/src/components/chat-panel.ts` + CSS in `apps/control-app/public/builder.html`) so it matches the look, feel, and functional patterns of the XGD dashboard chat widget at `../xgendev-main/xgd_source/dashboard/static/index.html`. The current implementation was written from scratch and ignored design lessons already encoded in XGD.

Operator's framing: "we spent time honing a beautiful chat window with the right aesthetics and functionality and instead I have an ugly window … please review the xgendev chat capability and audit the look and feel and functionality."

## Reference implementations

- **XGD (the target)** — `../xgendev-main/xgd_source/dashboard/static/index.html`
  - CSS: lines 3902-4500 (`.chat-widget-*`, `.chat-input-wrapper`, `.chat-widget-send-btn`, `.chat-tool-header`, `.chat-tool-pane`, `.chat-message.*`)
  - HTML: lines 5197-5231, 5629-5635
  - Tool-pane toggle logic: lines 17840-17911
  - Enter-to-send: line 16439 — `if Enter && !shift && !alt && !meta && !ctrl → send`
  - Streaming: `../xgendev-main/xgd_source/dashboard/chat_api.py` — `generate_chat_sse()` streams Claude tokens via SSE; client appends incrementally.

- **first-contact (now reworked)**
  - `packages/builder-ui/src/components/chat-panel.ts` — DOM + TipTap + Send/Stop buttons + tool-pane + Enter handler
  - `packages/builder-ui/src/components/chat-card.ts` — inline tool-result card primitive (retained alongside the new tool-pane per operator decision)
  - `apps/control-app/public/builder.html` — CSS overhaul lines 74-407
  - `apps/control-app/src/chat.ts` — streaming SSE handler (was non-streaming JSON)
  - `packages/builder-ui/src/chat-driver.ts` — streaming SSE reader (was single-fetch JSON)

## Gap closures

### G1. Font size too big — CLOSED
`.fc-chat` now declares `font-size: 13px; line-height: 1.6;` (XGD parity). Messages and editor content inherit.

### G2. Text-entry now a rounded pill — CLOSED
`.fc-chat__editor` is `border-radius: 24px`, single `1px` border, accent `#2563eb` on focus, `min-height: 44px`, `max-height: 232px`. `.fc-chat__editor-content` uses `padding: 10px 62px 10px 14px` to clear the inline button (XGD's 62px right-pad).

### G3 + G7. Round Send/Stop inside the input — CLOSED
- `.fc-chat__send` — 36×36 `border-radius: 50%`, absolute-positioned `right: 8px; bottom: 8px`, accent background, glyph `▶`.
- `.fc-chat__stop` — same shape, red `#dc2626`, glyph `■`, hidden by default.
- Busy state: `data-fc-chat-send-busy` hides Send, `data-fc-chat-stop-visible` shows Stop. The spinner overlay was removed entirely.
- The `ChatPanelHandle` now exposes `stopButton`; the chat-driver wires its abort to a per-turn `AbortController`.

### G4. Input markdown typography — CLOSED
`.fc-chat__editor-content` now styles `h1/h2/h3`, `ul/ol`, `blockquote`, `pre`, `code`, `table`, `th/td`. Pasted markdown renders formatted in the input. Placeholder text "Type a message... (Enter to send, Shift+Enter for newline)" added via `@tiptap/extension-placeholder` (new dep on `@tiptap/extension-placeholder@^2.6.0`).

### G5. User-message markdown rendering — CLOSED
`chat-panel.ts` `renderMessage` now calls `renderMarkdownToDom` for both `user` and `assistant` roles (system stays plaintext). User-bubble CSS adds h1-h3, p, ul/ol, blockquote, pre, code, strong rules with bubble-appropriate colours. Test: `test_UAT_FC_REQ-36_user_message_markdown_renders.test.ts`.

### G6. Tool-use pane (collapsible) — CLOSED
- New DOM: `.fc-chat__tool-header` (chevron + label), `.fc-chat__tool-pane` (collapsed by default), `.fc-chat__tool-pane-body` (event rows).
- Header click toggles pane; chevron flips `▶` ↔ `▼`.
- ChatPanel exposes `appendToolEvent(detail)`, `clearToolEvents()`, `expandToolPane()`.
- Chat-driver fires `onToolCallStart` (tool_use block completed) and `onToolCallResolved` (server-side result) callbacks. `main.ts` wires them to `appendToolEvent` and `expandToolPane`.
- Inline `ChatCard` tool-result renderers in the message list are **kept** (operator decision: both, not alternatives). Tool-pane is the live "what is the AI doing right now" view; inline cards are durable result artefacts.
- Test: `test_UAT_FC_REQ-36_tool_pane_collapsible.test.ts`.

### G8. Enter-to-send keyboard contract — CLOSED
`chat-panel.ts` TipTap mount uses `editorProps.handleKeyDown`: bare Enter → submit; any modifier (Shift/Alt/Meta/Ctrl) → fall through to TipTap's default newline behaviour. Placeholder advertises the contract. Tests: `test_UAT_FC_REQ-36_enter_sends_modifier_inserts_newline.test.ts` (4 tests covering bare/shift/meta/alt).
**Legacy REQ-32 Cmd+Enter test updated** to drive submission via the Send button click (modality-agnostic) so the existing "no double-submit while busy" invariant is preserved.

### G9. End-to-end streaming — CLOSED
- **Server** (`apps/control-app/src/chat.ts`): now returns `Response(stream, content-type: text/event-stream)`. The multi-turn loop emits these SSE events:
  - `token { delta }` — text delta from Anthropic forwarded as it arrives
  - `tool_call { name, input, toolUseId }` — fired the moment a `tool_use` block's input JSON has been reassembled from `input_json_delta` chunks
  - `tool_result { name, input, result, toolUseId }` — server-side execution result
  - `done { text, toolCalls, systemActions, intentToken }` — final aggregate for the FE to commit
  - `error { error }` — fatal error before/during stream
- The server consumes Anthropic's native streaming SSE (`stream: true` upstream) — see `consumeAnthropicStream()` in `chat.ts` which parses `content_block_start/delta/stop` and accumulates `partial_json` per tool_use.
- **Client** (`chat-driver.ts`): replaces single-fetch JSON with `response.body.getReader()` + SSE frame parser. Appends an empty in-flight assistant bubble at turn start; grows it on each `token`; fires `onToolCallStart`/`onToolCallResolved` callbacks for the panel's tool-pane; commits final text + structured `toolCalls` on `done`. New `store.updateLastChatMessage()` lets the driver mutate the in-flight bubble in place without rebuilding history each token.
- **Stop button** (G3/G7) ties to the streaming `AbortController` so clicking Stop aborts the SSE reader and the upstream Anthropic request.
- **Legacy REQ-32 spinner CSS test** updated to assert the new Send/Stop swap pattern instead.
- Test: `test_UAT_FC_REQ-36_streaming_assistant_bubble.test.ts` proves the bubble grows progressively across `token` events (not a single block on completion) and that `error` events surface a sorry-message bubble.

## Files touched

- `apps/control-app/public/builder.html` — CSS overhaul (G1-G7)
- `apps/control-app/src/chat.ts` — streaming SSE handler (G9 server)
- `packages/builder-ui/package.json` — add `@tiptap/extension-placeholder`
- `packages/builder-ui/src/components/chat-panel.ts` — DOM + buttons + tool-pane + Enter handler + markdown (G3, G5, G6, G8)
- `packages/builder-ui/src/chat-driver.ts` — streaming SSE reader + tool-event callbacks (G9 client)
- `packages/builder-ui/src/store.ts` — `updateLastChatMessage` for in-flight bubble (G9)
- `packages/builder-ui/src/main.ts` — wire chat-panel tool callbacks + abort signal
- `packages/builder-ui/src/index.ts` — re-export `ChatToolEvent`; remove obsolete `ChatApiResponse`
- `tests/_helpers_REQ-36_chat_sse.ts` — new: `consumeChatSSE`, `makeChatSSEResponse`, `encodeAnthropicSSE`, `makeAnthropicStreamingFetch`
- `tests/_helpers_REQ-13_anthropic.ts` — emit SSE (transparent for callers)

## Tests

- `test_UAT_FC_REQ-36_chat_ui_xgd_parity.test.ts` — G1-G4 + G3/G7 CSS contract (6 tests)
- `test_UAT_FC_REQ-36_user_message_markdown_renders.test.ts` — G5 (2 tests)
- `test_UAT_FC_REQ-36_tool_pane_collapsible.test.ts` — G6 toggle + appendToolEvent + DOM order (3 tests)
- `test_UAT_FC_REQ-36_enter_sends_modifier_inserts_newline.test.ts` — G8 keyboard contract (4 tests)
- `test_UAT_FC_REQ-36_streaming_assistant_bubble.test.ts` — G9 progressive bubble + error handling (2 tests)

Existing tests updated to consume the new SSE shape: REQ-8 (×3), REQ-9, REQ-13 (×3), REQ-21, REQ-30 (×2), REQ-32 (×2 — spinner→Send/Stop, Cmd+Enter→Send click), REQ-34, REQ-9. Pre-existing failures (BUG-5 / REQ-30 doc drift) are unrelated to this REQ.

Total UAT suite: 475/477 passing; the 2 failures are pre-existing doc-drift in `REPRODUCING_A_WEBSITE_DOC` from concurrent REQ-37 work.


---

## REQ-38: Chat loop: per-call results survive when one handler throws

When I (the AI) fire multiple tool calls in a batch, if one fails or drops I currently have no reliable way to know. I need per-call success/failure results that are guaranteed to be returned before the next batch fires. This is partly a framework constraint and partly how the chat loop handles parallel calls.

## Status: free-coded on 2026-06-20

Landed in commits `3a47635` (fix + UAT) and `395e2bc` (version bump 0.0.17 → 0.0.18) on top of REQ-36's SSE refactor (which is the structure this fix attaches to).

## Diagnosis

`apps/control-app/src/chat.ts` (in the REQ-36 SSE handler) called `applyToolCall(...)` for every `state_edit` tool_use block but did NOT wrap the call in `try/catch`. The sibling `system_action` path WAS wrapped. If `applyToolCall` threw (e.g. an unexpected input shape that escaped its internal `ok:false` returns), the exception escaped the for-loop, was caught by the outer stream-level `try/catch`, and collapsed the whole turn to a single `error` SSE event — the AI lost every result for the batch, including the calls that already succeeded before the throw and the ones that would have succeeded after.

From the AI's perspective the symptom was: results looked fine (or absent entirely) but the actual site state didn't match what the results said happened. The AI couldn't tell the difference between "this call succeeded" and "this call threw and took the whole batch with it."

## Fix

In `apps/control-app/src/chat.ts`:

1. Wrap the `state_edit` call to `applyToolCall` in `try/catch`. On throw, synthesise an `ok:false` `ChatToolResult` with a `validation.message` of the form `tool '<name>' threw: <error>`, push it to `allToolCalls`, emit a `tool_result` SSE event for the FE, and emit a `tool_result` block with `is_error: true` exactly as the existing failure path does. The other calls in the same batch keep executing.
2. Inject `applyToolCall` through `ChatHandlerDeps` (new optional `applyToolCall?: typeof applyToolCall` field) so a UAT can deterministically force one call in a batch to throw without monkey-patching the module. Production uses the imported default.
3. Log the throw via the existing `log` hook (`apply_tool_call_threw`) so a real production occurrence shows up in observability.

OUT: refactoring `applyToolCall` itself to be exception-proof, or changing the wire shape of `ChatToolResult`. Existing consumers (FE chat-driver, tool_result_renderers) keep working unchanged.

## UAT

`tests/test_UAT_FC_REQ-38_one_throw_does_not_drop_batch.test.ts`:

- Stubs Anthropic's streaming Messages API to return a batch of 3 `tool_use` blocks (two well-formed `set_module_dial` calls plus one `set_module_content` whose injected `applyToolCall` throws), followed by a final text turn.
- Injects `deps.applyToolCall` that throws for the targeted call and delegates to the real implementation for the others.
- Consumes the chat handler's SSE response via `consumeChatSSE` (from `_helpers_REQ-36_chat_sse.ts`).
- Asserts: no whole-stream `error` event fires, the `done` payload contains 3 `toolCalls` (thrower marked `ok:false`, others `ok:true`), 3 `tool_result` SSE events fired in order, and the next Anthropic call's last user message contains 3 `tool_result` blocks with `is_error: true` only on the thrower. Also asserts the `apply_tool_call_threw` log hook fired with the tool name.

Confirmed green on 2026-06-20.


---

## REQ-41: Module: image-gallery@v1

A grid of photos. Used for food photography, portfolio, before/after etc.

- **Variants:** `grid`, `masonry`

- **Dials:**

- `columns`: `2`, `3`, `4`

- `gap`: `tight`, `normal`, `loose`

- `spacingTop`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `spacingBottom`: `0, 1, 2, 3, 4, 6, 8, 12, 16, 24`

- `surface`: `default, subtle, inverse, accent`

- **Content fields:**

- `heading` — string (optional)

- `items[]` — array of:

- `image` — asset-ref

- `caption` — string (optional)

## Converged scope (2026-06-20)

Decisions made before implementation:

- **Surface dial:** widened to `default, subtle, inverse, accent` to match the existing 4-value pattern used by other modules (services-grid, text-block).
- **Masonry implementation:** pure CSS via `column-count` — SSR-friendly, no JS hydration.
- **Item count bounds:** `items[]` enforces `min: 2, max: 24`.
- **Responsive columns:** `columns` is the desktop count; mobile collapses (`2`→`1`, `3`→`2`, `4`→`2`) at the `md` breakpoint (768px).
- **Caption rendering:** below the image, small muted text. Optional.
- **No lightbox:** plain `<img>` tags with `loading="lazy"` and `decoding="async"`. Click-to-zoom is out of scope for v1.
- **Aspect ratio:**
  - `grid` variant locks tiles to `1:1` (square) for visual consistency.
  - `masonry` variant lets natural image aspect ratios flow.

## Implementation plan

1. `packages/framework/src/modules/image-gallery/meta.ts` — exports `meta` with `id: "image-gallery"`, `version: 1`, the variants/dials/contentSchema above.
2. `packages/framework/src/modules/image-gallery/index.astro` — Astro component that renders the section with proper class hooks, supports both variants, optional heading, and per-item optional caption.
3. Register in `packages/framework/src/modules/registry.ts`.
4. Export from `packages/framework/src/modules/index.ts` (named `ImageGallery` + `imageGalleryMeta`).
5. UAT tests (named `test_UAT_FC_REQ-41_*`):
   - `grid` variant emits one tile per item and tags `data-variant="grid"`.
   - `masonry` variant uses CSS columns layout (asserts `--variant-masonry` class).
   - Optional `heading` renders when present, omitted when absent.
   - `caption` renders only when provided.
   - `columns` dial maps to the corresponding modifier class.
   - Validates rejection when `items[]` length is outside `2..24`.



## Follow-up (2026-06-20): LLM context doc

Updated the AI's convert-flow how-to (`docs/llm-context/reproducing-a-website.md` and its byte-for-byte mirror `apps/control-app/src/llm-context.ts`) to:

- Name `image-gallery` explicitly as the catalog target for "sequential images" during visual-proximity matching.
- Note that image-gallery's `items[]` is populated one entry per asset, each with `image` (asset-ref) and optional `caption`.

UAT added: `test_UAT_FC_REQ-41_llm_context_doc_mentions_image_gallery` asserts the doc names the module so future drift removes the hint deliberately rather than silently.

Pre-existing drift on the doc/mirror pair (sections 1a / section 6 fallback paragraph) is out of scope for this ticket.