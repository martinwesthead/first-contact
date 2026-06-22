import { describe, expect, it } from "vitest";
import type { Site } from "@gendev/site-schema";
import { defaultThemeTokens } from "../packages/framework/src/tokens/defaults.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-699: The clear-to-scaffold step runs on every convert invocation
 * regardless of the prior draft's contents — including when the draft holds
 * modules, extra pages, or custom theme overrides, and including when the draft
 * is already empty. After the clear, no prior-draft modules, pages, or
 * theme-token overrides survive: the draft is the canonical empty scaffold only.
 * There is no "preserve existing edits" branch.
 */

/** A populated working draft with modules, an extra page, and theme overrides. */
function seededDraft(): Site {
  const overriddenTheme = structuredClone(defaultThemeTokens);
  (overriddenTheme as unknown as { palette: { primary: string } }).palette.primary =
    "#ff00aa";
  return {
    config: { businessName: "Previous Business" },
    theme: overriddenTheme,
    nav: { pattern: "in-page-anchors", entries: [] },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Previous Business",
        modules: [
          {
            id: "leftover-hero",
            type: "hero",
            version: 1,
            content: { heading: "Old heading" },
          },
        ],
      },
      {
        id: "about",
        slug: "/about",
        title: "About Us",
        modules: [],
      },
    ],
  } as unknown as Site;
}

function clearedOf(result: unknown): Site {
  return (
    (result as { payload?: Record<string, unknown> }).payload ?? {}
  ).clearedSiteDefinition as Site;
}

describe("UAT AC-699: clearing on convert is unconditional and leaves no prior-draft residue", () => {
  it("test_UAT_AC699_clear_is_unconditional_no_residue", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-699" });
    const url = "https://acme.test/"; // default digest H1 → "Acme Co"
    await h.seedDigest(url);

    // ── Convert with a populated prior draft. ─────────────────────────────
    (h.ctx as unknown as { siteDefinition: unknown }).siteDefinition = seededDraft();
    const result1 = await h.invokeTranscribe({ digestId: url });
    expect(result1.status).toBe("ok");
    const cleared1 = clearedOf(result1);

    // Canonical empty scaffold — none of the seeded content survives.
    expect(cleared1.pages).toHaveLength(1);
    expect(cleared1.pages[0].slug).toBe("/");
    expect(cleared1.pages[0].modules).toHaveLength(0);
    expect(cleared1.theme).toEqual(defaultThemeTokens);
    expect(cleared1.config.businessName).toBe("Acme Co");

    // Explicitly: no seeded module id, extra page slug, or theme override.
    const serialized = JSON.stringify(cleared1);
    expect(serialized).not.toContain("leftover-hero");
    expect(serialized).not.toContain("/about");
    expect(serialized).not.toContain("#ff00aa");
    expect(serialized).not.toContain("Previous Business");

    // A stage-0 cleared notification fired.
    expect(
      h.events.some((e) => e.data.status === "cleared"),
    ).toBe(true);

    // ── Convert again starting from an already-empty draft. ───────────────
    const h2 = makeTranscribeHarness({ accountId: "acct-699b" });
    await h2.seedDigest(url);
    (h2.ctx as unknown as { siteDefinition: unknown }).siteDefinition = {
      config: { businessName: "Empty Already" },
      theme: structuredClone(defaultThemeTokens),
      nav: { pattern: "in-page-anchors", entries: [] },
      pages: [{ id: "home", slug: "/", title: "Empty Already", modules: [] }],
    };
    const result2 = await h2.invokeTranscribe({ digestId: url });
    expect(result2.status).toBe("ok");

    // The clear still runs and yields the same canonical scaffold (business
    // name reseeded from the source, not preserved from the prior draft).
    expect(h2.events.some((e) => e.data.status === "cleared")).toBe(true);
    const cleared2 = clearedOf(result2);
    expect(cleared2.pages).toHaveLength(1);
    expect(cleared2.pages[0].modules).toHaveLength(0);
    expect(cleared2.theme).toEqual(defaultThemeTokens);
    expect(cleared2.config.businessName).toBe("Acme Co");
  });
});
