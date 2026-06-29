---
uid: comment-f6d08bfa
id: COMMENT-274
type: comment
title: Comment on bug BUG-19
created_by: xgd
created_at: '2026-06-29T20:58:47.694537+00:00'
updated_at: '2026-06-29T21:05:35.948968+00:00'
completed_at: null
last_field_updated: body
status: null
fields:
  subject_uid: bug-314f01f2
  kind: chat_transcript
---

<!-- xgd-turn id="07bd06e5-8f47-4964-b9fc-04934b0205ea-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T20:58:21.223Z" -->
#### You
I am EXTREMELY frustrated with our system. Claude (without direction) has over-engineered the safety controls around the tools. I keep hitting "budget limits" while testing. I neverr asked for a budget and I am loosing hours and hours trying to find work arounds.

1) I NEED a session reset button at the top of the chat that resets the chat session - blank page new session
2) I NEED the "session" budget to be set to a HUGE number so I will NEVER hit it in testing.

PLEASE!

<!-- xgd-turn id="07bd06e5-8f47-4964-b9fc-04934b0205ea-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-29T21:03:20.759Z" -->
#### Claude
I hear you — this is exactly the kind of self-imposed safety scaffolding that shouldn't be getting in your way during testing. Let me do the legwork to find where this budget and the chat session UI live before I touch anything, so I scope this correctly to BUG-19.

Let me investigate in parallel.

While those searches run, let me read the existing BUG-19 ticket so I preserve anything already in it.

Ticket is blank — nothing to preserve. Now I'll wait for the two investigations to come back before I scope the ticket and touch any code. Both are running.

I want to make sure I fix the right "chat" — your description (operator hitting tool/budget limits while testing) points at the agentic dashboard chat rather than the product's website-builder chat, but I'll confirm from the code rather than guess. Back shortly once the searches land.

The budget agent came back. Key finding: the budgets live in the **1stcontact product chat builder**, not the XGD dashboard. But there's a wrinkle worth flagging — the main `sessionMaxSeconds` browser budget was *already* raised to effectively infinite (1e9) under BUG-17. So the limit you're hitting may be a different control. The candidates it surfaced:

1. **Browser-rendering session budget** — `packages/web-fetch-safety/src/browser-budget.ts` (already ~infinite by default, but a live KV/env override could still bite)
2. **`MAX_TOOL_TURNS = 8`** in `apps/control-app/src/chat.ts:130` — a hard cap on tool-use turns per message. This is the most "safety control around the tools" of the bunch and would stop the agent mid-task while testing.
3. **Rate limiting** — 20/hr, 100/day fetches (`rate-limit.ts`)

Waiting on the chat-UI agent for the reset-button location. One thing will save us both time: **what exactly does the "budget limit" message say when you hit it?** That single string tells me precisely which of the above is biting you, since the default for #1 is already huge. Paste it if you have it handy — meanwhile I'll keep digging so I'm ready to move the moment the second search lands.

Both searches confirm it: the chat you're testing is the **1stcontact builder chat** (`packages/builder-ui` + `apps/control-app`), vanilla-TS served from `builder.html`. The XGD dashboard is separate. So both your asks land squarely in this repo. Good.

Let me ground myself in the actual code before writing the ticket and editing. Reading the key files now.

The budget code tells a clear story: `DEFAULT_BROWSER_BUDGET` is already `1e9` seconds (BUG-17 already neutralized it). So either a *caller* is passing a low per-call `config` override, or the limit you're hitting is something else (most likely `MAX_TOOL_TURNS = 8` in `chat.ts:130`). Let me settle which one definitively instead of guessing — grepping for what actually surfaces to you and any low override.

Glob quoting issue — let me re-run properly.

Now I've got the full picture, and there's an important finding worth being straight with you about.

**On the budget:** the thing literally named a "session budget" — the browser-rendering `sessionMaxSeconds` — is *already* effectively infinite (`1e9` seconds, set under BUG-17), and **no caller lowers it**. So that one cannot actually be stopping you. The real "safety control around the tools" that stops a testing session mid-task is this:

- **`apps/control-app/src/chat.ts:130` → `const MAX_TOOL_TURNS = 8;`** — the agent is hard-capped at 8 tool-use turns per message. When you're testing a multi-step build (analyze → transcribe → several edits), it silently runs out of turns and stops. That's almost certainly what you're hitting. (There's also a stale comment in `wrangler.toml:57` claiming a "50s" budget that no longer exists — pure confusion.)

So my plan for **BUG-19**:

1. **Session reset button** — add a "New session" button to the top of the chat panel (`chat-panel.ts` header), wired to create a fresh server session + clear the view (`main.ts` / `chats-api.ts`). Blank page, new session.
2. **Kill the testing cap** — raise `MAX_TOOL_TURNS` to a huge value so the agent never stops mid-task, and fix the stale wrangler comment. The browser/rate budgets are already unlimited, so nothing else needs changing for you to "never hit it."

One thing only you can confirm, and it decides whether I'm aiming at the right control: **when you hit the limit, what does it say / what happens?** If it's the agent just stopping after a handful of steps with no error → it's `MAX_TOOL_TURNS`, and my plan nails it. If you actually see the words *"Browser Rendering budget exhausted"* → there's a live KV/override I need to chase instead.

I've drafted the scope into the ticket so you can see exactly what I'll do:

Scope is captured in **BUG-19**. Quick recap of what I'll do once you give the word:

| # | Change | File(s) |
|---|--------|---------|
| 1 | "New session" button at top of chat → blank page, fresh session | `chat-panel.ts`, `main.ts`, `chats-api.ts` |
| 2 | Raise `MAX_TOOL_TURNS` so testing never stops mid-task + fix stale wrangler comment | `chat.ts:130`, `wrangler.toml:57` |

Browser-render and rate-limit budgets are **already unlimited** — no change needed there, which is why bumping a "session budget" alone wouldn't have helped you.

Two quick things before I write code (this is the scope-confirm step, then I move fast):

1. **Confirm the blocker** — does the agent just *stop after a handful of steps with no error* (→ `MAX_TOOL_TURNS`, my plan fixes it), or do you literally see *"Browser Rendering budget exhausted"* (→ different chase)?
2. **How huge?** I'd set `MAX_TOOL_TURNS` to something like `1000` — effectively never-hit for interactive testing but still a runaway-cost backstop. Say the word if you'd rather it be larger or truly uncapped.

Give me a 👍 (and the answer to #1) and I'll implement, test, commit `[FREE-CODED]`, and land it on `bug-314f01f2`.

<!-- xgd-turn id="20575f99-84b5-4823-9150-ed8f74aa4d10-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T21:03:40.104Z" -->
#### You
[system] The previous turn produced 4 failed tool calls. Review the errors and retry where appropriate: - analyze_page({"url":"https://gigabytealchemy.ai"}) → unknown tool: analyze_page - transcribe_site({"digestId":"https://gigabytealchemy.ai/"}) → unknown tool: transcribe_site - read_transcription_digest({"siteId":"anonymous"}) → unknown tool: read_transcription_digest - add_module({"page_id":"home","type":"hero@v1","version":1,"variant":"bg-image","id":"hero-1","dials":{"size":"lg","align":"center","spacingTop":"16","spacingBottom":"16","surface":"inverse"},"content":{"heading":"Intentional Software","subhead":"Software crafted with presence, positivity, and genuine human connection.","image":{"id":"sites/anonymous/imports/c7d4fb9c8dee971b.png","src":"/assets/sites/anonymous/imports/c7d4fb9c8dee971b.png","alt":"Alchemist laboratory with technology"}}}) → module type hero@v1@v1 not in catalog

ok my first question: did you get/can you get screenshots of the site?

Let me check the analysis digest to see what was captured.Unfortunately no — here's the honest answer:

**What happened in the previous attempts:**

- `analyze_page` and `preview_generated_page` both require **browser rendering budget**, which is a **per-session cap**
- This session has exhausted that budget from earlier preview attempts
- Once the budget is gone, screenshot-based tools return structural data only — no actual rendered screenshots
  
  This is the webbuilder - it is not respecting the configured limit...

<!-- xgd-turn id="20575f99-84b5-4823-9150-ed8f74aa4d10-assistant" -->

<!-- xgd-chat role="assistant" ts="2026-06-29T21:04:24.311Z" -->
#### Claude
That's the key signal — "the webbuilder is not respecting the configured limit." That reframes the bug: the browser-rendering budget *is* tripping at runtime even though the source default is `1e9`. That's drift between the configured value and what's actually enforced. Let me chase it.

First, on your direct question: **no, I can't pull screenshots myself** — `analyze_page` / `transcribe_site` are the *product's* tools (running inside the builder worker), not tools I have here. Those "unknown tool" failures are exactly that: they aren't in my toolset. So I can't screenshot the site for you; what I *can* do is fix why the builder's budget is exhausting.

Prime suspect: a **stale compiled build**. The source says `1e9`, but if `dist/` wasn't rebuilt after BUG-17, the running worker still enforces the old `50s`. Let me verify.

<!-- xgd-turn id="ceacdda6-56f6-47d3-a04b-4866201c6af1-user" -->

<!-- xgd-chat role="user" ts="2026-06-29T21:05:09.511Z" -->
#### You
I'm not asking you to pull screen shots that is a cut and past of a chat session showing that the Claude is unable to do what I am asking because it is hitting budget constraints

<!-- xgd-chat-end -->