---
uid: comment-33bdf7c1
id: COMMENT-284
type: comment
title: Comment on request REQ-17
created_by: xgd
created_at: '2026-06-29T23:33:17.042218+00:00'
updated_at: '2026-06-29T23:57:34.271217+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: request-7af3c503
  kind: chat_transcript
---

<!-- xgd-turn id="b857e07e-0107-475e-a854-dc07b8922ee4-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T23:33:10.557Z" -->
#### You
Please can you free code this ticket

<!-- xgd-turn id="b857e07e-0107-475e-a854-dc07b8922ee4-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-29T23:57:34.240Z" -->
#### Claude
I'll start by reading the ticket to understand the full scope and current state.

The ticket body is fully populated with clear scope and acceptance criteria. Let me explore the current codebase structure before implementing.

Neither package has tests yet. Let me find the test infrastructure at the repo root.

The test plan targets shell primitives (`createAppShell`) and the worker routes. Let me look at the chat-panel and preview-panel signatures to understand the builder-tab migration surface.

I now have a complete picture. Let me confirm the ticket is at `draft` and check HTMLRewriter availability, then implement. The scope and AC are already populated in the ticket body, so I'll proceed with implementation.

Let me create a task list and start building.

Now let me build the core `createAppShell` component.

Now export it from the builder-ui index:

Add an `./app-shell` export path to package.json (mirroring the `./layout` pattern used by tests):

Now the worker routes. Let me update `index.ts`:

Worker routes done. Now the bootBuilder refactor to support shell-provided hosts. Let me read the relevant section of main.ts:

Now create the app-entry SPA and app.html. First the entry:

Now the app.html shell page. It needs the shell layout styles plus the chat/preview styles (the builder mounts inside it):

Now wire `app.js` into the bundle build script:

Now let me run the bundle build and a typecheck to catch issues early:

Bundles build. Now typecheck both packages:

These control-app tsc errors reference untouched files (`preview.ts`, `store.ts`) — suggesting they're pre-existing (control-app's tsconfig lacks the DOM lib that builder-ui needs). Let me confirm by checking against the committed state:

Confirmed pre-existing — the clean tree fails identically on untouched `preview.ts`/`store.ts` (control-app's tsconfig lacks the DOM lib). The authoritative builder-ui `tsc` passes, and my worker code typechecks. Now the UATs.

Let me refine the test for proper isolation — stale `popstate`/document listeners across `it` blocks (the shell attaches window-level listeners) need teardown. I'll track and destroy shells in `afterEach`:

Now run the REQ-17 tests:

My memory note flagged this: node_modules is linked into a reconcile worktree. Let me verify an existing builder-ui test resolves, to isolate whether this is my export or a broken link:

This is the exact situation my memory note flagged — the existing REQ-8 test also fails to resolve, so node_modules is mis-linked into a reconcile worktree. The fix is to relink:

The first failure is a test bug (destructuring captures undefined before settings mounts). The second is jsdom's `history.back()` popstate behavior. Let me probe jsdom:

jsdom fires popstate correctly — my `tick` of 0ms is too short (the probe used 20ms), and the content-visibility assertion destructured a value before mount. Let me fix both:

All 6 shell tests pass. Now the worker route tests:

The worker route tests reveal redirect behavior I need to diagnose empirically (likely Static Assets `html_handling` redirecting `/app.html`→`/app`). Let me probe directly:

Root cause confirmed: Static Assets `html_handling` serves `/app` directly from app.html (bypassing my redirect) and redirects `/app.html`→`/app`. Setting `html_handling = "none"` makes the worker authoritative for these routes. Let me update wrangler.toml:

A background refactor split `builder-layout.ts` onto a generic `createSplitLayout` — my `main.ts` changes remain compatible (the `BuilderLayoutHandle` surface is unchanged). Let me add `html_handling` to the production assets block too, then rebuild and re-test:

All REQ-17 tests pass (3 route + 6 shell = 9). Now the regression scope — run the broader builder-ui and control-app test surface to confirm no breakage from the bootBuilder/main.ts refactor and wrangler change:

Parallel pools crashed (mixing wrangler workers + jsdom). Let me run them separately:

jsdom regression passes (including BUG-10 which exercises `bootBuilder`). The crash was just pool-mixing. Let me confirm the existing worker route test (REQ-1) still passes with my index.ts changes:

All green. Now bump version, commit, and promote the ticket:

The version bump script is a stub. Let me read it to understand the required interface:

The stub isn't implemented — CLAUDE.md flags this as a prerequisite for the free-coding gate. Let me check how the gate resolves the "current version" so I implement the bump against the right file:

The gate delegates version verification to `bin/project/xgd_version_bump --check`. The stub rubber-stamps (returns 0), but the honest path is to implement it against a real version anchor. For this Node monorepo the natural anchor is the root `package.json` (currently `0.0.39`). This is `bin/` project tooling (no separate ticket needed). Let me implement it:

Let me remove a leftover dead subprocess call in `_check`:

Version bumped to `0.0.40`. Now let me review the full diff and stage/commit. First, a quick look at everything that changed:

Generated bundles are gitignored (good). Note: `builder-layout.ts` and `split-layout.ts` appeared from a background refactor mid-session (flagged by the system) — they are **not** part of REQ-17, so I'll stage only my files and flag those to you in the handoff. My `main.ts` only uses the stable `BuilderLayoutHandle` surface, so it's compatible with either version.

Committed as `98c668cd`. Let me verify the gate's `--check` passes against this commit, then promote:

Gate passed — ticket moved to `free_coded`. Let me verify the recorded fields and confirm `story_points`:

Status `free_coded`, commits + version recorded, story_points 5. Now let me append an "as-built" notes section so the body stays faithful for reconcile (the existing body is preserved; I'm adding, not replacing):

Now a final confirmation run of both REQ-17 test files, and capture the residual working-tree state:

REQ-17 is free-coded and parked at `free_coded`. Summary:

## What I built

The per-site **app shell** that every tab (Builder, Settings, Assets, …) docks into:

- **`createAppShell`** (`packages/builder-ui/src/components/app-shell.ts`) — top bar (site name | tab bar | avatar dropdown), content area, docked chat panel, `registerTab(id, {label, defaultChatOpen, factory})`, `pushState`/`popstate` routing, and per-`(site,tab)` chat open/collapsed state in `localStorage` (`1stcontact_app_chat_state_v1`). Unknown tab ids no-op + warn (AC9). Exported via the package index and a new `./app-shell` subpath.
- **Worker routes** (`apps/control-app/src/index.ts`) — `/app` and `/app/<site>` 302-redirect to the default builder tab; `/app/<site>/<tab>` serves `app.html` with `data-site`/`data-tab` injected on `#fc-app-root` via `HTMLRewriter`.
- **`app.html` + `app-entry.ts`** — reads the data attrs, registers the Builder tab (docks the existing builder through new `bootBuilder` `previewHost`/`chatHost` hosts) plus placeholder Settings/Assets tabs. `/builder` is untouched.
- **`wrangler.toml`**: `html_handling = "none"` so the worker (not Static Assets clean-URL handling) owns `/app` routing — the key fix found via empirical probing (default handling was serving `/app` from `app.html` and 307-looping `/app.html`→`/app`).
- Implemented the previously-stubbed **`bin/project/xgd_version_bump`** against root `package.json` (the version anchor) — bumped `0.0.39 → 0.0.40`.

**Tests** (9, all green): `test_UAT_FC_REQ-17_app_shell.test.ts` (jsdom — tab switch+URL, back/forward, chat defaults, persistence, avatar menu, unknown-id) and `test_UAT_FC_REQ-17_app_routes.test.ts` (miniflare — both redirects + data-attr injection).

Ticket `REQ-17` is at `free_coded`, `commits=[98c668cd…]`, `version=0.0.40`, `story_points=5`, body updated with as-built notes.

## Two things to flag

1. **I chose `package.json` (root) as the version-bump anchor** when implementing `xgd_version_bump`. That's a project-wide decision baked into all future free-coding — if you'd prefer a different anchor (e.g. `control-app`), say so and I'll adjust `WRITTEN_PATHS`.
2. **Uncommitted files I did *not* touch** are in your working tree from a parallel session: the `builder-layout.ts`/`split-layout.ts` refactor and the **REQ-16 Assets tab** work (`assets-tab.ts`, three `test_UAT_FC_REQ-16_*` files). I deliberately left them out of the REQ-17 commit — they belong to REQ-16's owner and need committing under their own ticket.

I've left the ticket at `free_coded` — promotion to `ready_to_reconcile` is your call whenever you've validated the shell.

<!-- xgd-chat-end -->