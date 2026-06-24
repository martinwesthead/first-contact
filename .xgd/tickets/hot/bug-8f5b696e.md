---
uid: bug-8f5b696e
id: BUG-8
type: bug
title: 'Builder chat boot fails: ''fetch'' called on object that does not implement
  Window'
created_by: xgd
created_at: '2026-06-20T18:13:46.097961+00:00'
updated_at: '2026-06-24T20:08:09.978964+00:00'
completed_at: null
last_field_updated: title
status: draft
fields:
  auto_merge_back: true
  needs_review: false
  priority: medium
---

## Symptom

On loading the builder, the chat panel shows the in-panel system message:

> Chat backend unavailable.
> Could not establish a chat session for site 'site_1stcontact'.
> Error: 'fetch' called on an object that does not implement interface Window.

No requests reach the backend. Triggering a send produces the same error and the input clears with no message rendered.

## Root cause

Three call sites in \`packages/builder-ui/src\` default to \`globalThis.fetch\` without rebinding \`this\`:

- \`main.ts:157\` — \`const fetchImpl = options.fetch ?? globalThis.fetch;\`
- \`chat-driver.ts:95\` — same pattern
- \`chats-api.ts:39\` — \`this.fetchImpl = options.fetch ?? globalThis.fetch;\`

The browser's \`fetch\` is a method of \`Window\` and the spec requires \`this === Window\` at call time. Calling the bare reference (\`fetchImpl(...)\` as a free function, or \`this.fetchImpl(...)\` where \`this\` is the ChatsApi instance) violates that and throws TypeError. Test paths that pass an explicit \`fetch\` mock did not hit this; production / real-browser use does.

This was introduced when REQ-25 wiring centralised the fetch defaulting — earlier code paths called \`fetch(...)\` directly as a global, which the browser permits.

## Fix

At each of the three sites, default to \`globalThis.fetch.bind(globalThis)\` so the receiver is always \`Window\`. No behaviour change when the caller passes their own \`fetch\`.

## Acceptance criteria

- AC1: \`new ChatsApi()\` (no options) can call its endpoints without raising "fetch called on an object that does not implement interface Window".
- AC2: \`runChatTurn(text, { store, catalog })\` (no \`fetch\` override) does not raise the same error.
- AC3: \`bootBuilder({ root, initialSite, siteId })\` (no \`fetch\` override) does not surface the unbound-fetch TypeError in its in-panel error message.

## UAT

\`tests/test_UAT_FC_BUG-8_default_fetch_is_callable_without_this_binding.test.ts\` — install a \`globalThis.fetch\` that throws TypeError when \`this !== globalThis\` (mimicking browser spec enforcement), then exercise each of the three sites with no explicit fetch override. Expect no TypeError; chat-history system message (if any) must not mention "does not implement interface Window".