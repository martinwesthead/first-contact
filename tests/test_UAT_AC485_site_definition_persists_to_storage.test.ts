// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BuilderStore,
  buildFrameworkCatalog,
  runChatTurn,
} from "@1stcontact/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT AC-485: working site definition is persisted to browser storage and survives builder re-mount", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC485_site_definition_persisted_survives_remount_and_warns_when_too_large", async () => {
    const storage = new MemoryStorage();
    const catalog = buildFrameworkCatalog();

    // First builder: load starter, run two accepted tool calls.
    const first = new BuilderStore(
      { siteDefinition: load1stContactSite(), chatHistory: [] },
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

    await runChatTurn("primary pink", {
      store: first,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });
    await runChatTurn("rename to Acme Caterers", {
      store: first,
      catalog,
      fetch: fetchMock as unknown as typeof fetch,
    });

    // Both edits visible in working state.
    expect(first.getState().siteDefinition.theme.palette.primary).toBe("#ff0099");
    expect(first.getState().siteDefinition.config.businessName).toBe(
      "Acme Caterers",
    );

    // Storage now holds a serialised site reflecting cumulative edits.
    const persisted = storage.getItem("1stcontact_builder_site_v1");
    expect(persisted).toBeTruthy();
    const parsed = JSON.parse(persisted!) as {
      theme: { palette: { primary: string } };
      config: { businessName: string };
    };
    expect(parsed.theme.palette.primary).toBe("#ff0099");
    expect(parsed.config.businessName).toBe("Acme Caterers");

    // Discard the builder and instantiate a fresh one against the same storage:
    // it hydrates from the persisted site, not the fresh starter.
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

    // Size threshold: with the warning size set very low, the next persist
    // emits a console warning AND still writes the entry to storage.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const storageSmall = new MemoryStorage();
      const tinyStore = new BuilderStore(
        { siteDefinition: load1stContactSite(), chatHistory: [] },
        { storage: storageSmall, sizeWarningBytes: 10 },
      );
      // Trigger persist via a valid setSiteDefinition.
      const next = structuredClone(tinyStore.getState().siteDefinition);
      next.config.businessName = "Acme";
      tinyStore.setSiteDefinition(next);

      expect(warnSpy).toHaveBeenCalled();
      const persistedSmall = storageSmall.getItem("1stcontact_builder_site_v1");
      expect(persistedSmall).toBeTruthy();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
