// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC REQ-8: site definition persists across reloads via localStorage", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("after a sequence of edits, instantiating a new store against the same storage restores the working site", async () => {
    const storage = new MemoryStorage();
    const catalog = buildFrameworkCatalog();

    // First session: load the bundled site, run two chat turns that mutate it.
    const initialSite = load1stContactSite();
    const first = new BuilderStore(
      { siteDefinition: initialSite, chatHistory: [] },
      { storage },
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: "Primary set to pink.",
            toolCalls: [
              {
                name: "set_theme_token",
                input: { name: "palette.primary", value: "#ff0099" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            text: "Business name updated.",
            toolCalls: [
              {
                name: "set_site_config",
                input: { field: "businessName", value: "Acme Caterers" },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );

    await runChatTurn("make primary pink", {
      store: first,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });
    await runChatTurn("rename it Acme Caterers", {
      store: first,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Confirm in-memory state has both edits.
    expect(first.getState().siteDefinition.theme.palette.primary).toBe("#ff0099");
    expect(first.getState().siteDefinition.config.businessName).toBe(
      "Acme Caterers",
    );

    // Confirm storage was populated.
    const persisted = storage.getItem("1stcontact_builder_site_v1");
    expect(persisted).toBeTruthy();

    // Simulate reload: a fresh store reading the same storage hydrates from it,
    // not from the initial bundled site.
    const reloaded = new BuilderStore(
      { siteDefinition: load1stContactSite(), chatHistory: [] },
      { storage },
    );

    expect(reloaded.getState().siteDefinition.theme.palette.primary).toBe(
      "#ff0099",
    );
    expect(reloaded.getState().siteDefinition.config.businessName).toBe(
      "Acme Caterers",
    );
  });

  it("warns but still persists when the serialised site exceeds the configured size threshold", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const storage = new MemoryStorage();
      const store = new BuilderStore(
        { siteDefinition: load1stContactSite(), chatHistory: [] },
        { storage, sizeWarningBytes: 10 }, // trip the warning on the very first persist
      );

      // Mutate via a valid setSiteDefinition — re-uses the existing site.
      const next = structuredClone(store.getState().siteDefinition);
      next.config.businessName = "Acme";
      store.setSiteDefinition(next);

      expect(warnSpy).toHaveBeenCalled();
      const persisted = storage.getItem("1stcontact_builder_site_v1");
      expect(persisted).toBeTruthy();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
