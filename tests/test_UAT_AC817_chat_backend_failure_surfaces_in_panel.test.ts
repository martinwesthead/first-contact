// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { bootBuilder } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

/**
 * AC-817 (REQ-25): when the builder cannot establish or load the active chat
 * session — during boot, or mid-send when no session can be established — the
 * failure must surface as a `system` message inside the chat panel that names
 * the affected site and includes the underlying error text, instead of leaving
 * the panel silently broken or only logging to the console. The message is
 * rendered as plain text.
 *
 * Boot and the onSend mid-send fallback funnel through the same wiring
 * (`ensureActiveSession` → `appendBootErrorMessage`), so a failing backend at
 * boot exercises the surfaced-error contract; the mid-send precondition — no
 * active session after a failed boot, so the next send re-runs the same
 * fallback — is asserted alongside it.
 */
describe("UAT AC-817: chat-session boot or mid-send failures surface as an in-panel system message naming the site", () => {
  it("test_UAT_AC817_chat_backend_failure_appends_in_panel_system_message_naming_site", async () => {
    const siteId = "site_does_not_exist";
    // Every chat endpoint 500s — emulates the missing chat_sessions table /
    // FK-violation the operator hit locally before this fix.
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: "no such table: chat_sessions" }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
    );

    const root = document.createElement("div");
    document.body.appendChild(root);
    const boot = bootBuilder({
      root,
      initialSite: load1stContactSite(),
      siteId,
      storage: new MemoryStorage(),
      sessionStorageFacility: null,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Boot hydration is async — wait for the failing list/create round-trips.
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

    // No session could be established → the panel is NOT silently broken: a
    // system message is appended in the chat log.
    const messages = boot.store.getState().chatHistory;
    const sysErr = messages.find((m) => m.role === "system");
    expect(sysErr).toBeDefined();

    // It names the affected site and carries the underlying error detail.
    expect(sysErr!.content).toMatch(/Chat backend unavailable/);
    expect(sysErr!.content).toContain(siteId);
    expect(sysErr!.content).toContain("no such table: chat_sessions");
    // Local-dev migration hint is included.
    expect(sysErr!.content).toMatch(/wrangler d1 migrations apply/);

    // Surfaced as a `system` (plain-text) message, not an assistant/user bubble.
    expect(sysErr!.role).toBe("system");

    // The backend really was reached (not a swallowed no-op) and the panel is
    // left WITHOUT an active session — so a mid-send before a session exists
    // hits the same fallback and surfaces the same in-panel error.
    expect(fetchMock).toHaveBeenCalled();
    expect(boot.store.getState().activeSessionId).toBeNull();

    boot.destroy();
    document.body.innerHTML = "";
  });
});
