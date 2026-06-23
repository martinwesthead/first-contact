// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { bootBuilder } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

/**
 * REQ-25: when the chat backend is unreachable / the chat_sessions table is
 * missing / the site FK is invalid, the operator must SEE the failure in
 * the panel instead of finding the chat silently dead. The wiring layer
 * appends a system message describing the error and pointing at the fix.
 */
describe("UAT FC REQ-25: chat backend failures surface as in-panel system messages", () => {
  it("ensureActiveSession failure → system message in chatHistory naming the site and explaining the fix", async () => {
    const siteId = "site_does_not_exist";
    // Always return 500 for the chat endpoints — emulates the no-table or
    // FK-violation case the dev was hitting.
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "no such table: chat_sessions" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
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

    // Boot hydration is async — wait for the failing list+create.
    for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));

    expect(boot.store.getState().activeSessionId).toBeNull();
    const messages = boot.store.getState().chatHistory;
    const sysErr = messages.find((m) => m.role === "system");
    expect(sysErr).toBeDefined();
    expect(sysErr!.content).toMatch(/Chat backend unavailable/);
    expect(sysErr!.content).toContain(siteId);
    expect(sysErr!.content).toMatch(/wrangler d1 migrations apply/);

    boot.destroy();
  });
});
