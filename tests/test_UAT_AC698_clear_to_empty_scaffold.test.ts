import { describe, expect, it } from "vitest";
import { validateSite } from "@gendev/site-schema";
import type { Site } from "@gendev/site-schema";
import { defaultThemeTokens } from "../packages/framework/src/tokens/defaults.js";
import {
  NOT_DETECTED,
  type ReferenceDigest,
} from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-698: Before any mirror or digest work, a convert clears the operator's
 * draft to a minimal empty scaffold — exactly one home page at slug `/`,
 * framework-default theme tokens, an `in-page-anchors` nav with no entries, no
 * modules, and `config.businessName` seeded from the source site title (its top
 * heading, else a URL-derived title, else "Untitled"). The scaffold is a valid
 * site definition and the home page title equals the seeded business name.
 */

/** Full signals object with the given level-1 headings (empty → no title). */
function signalsWith(
  headings: ReferenceDigest["signals"]["content"]["headings"],
): ReferenceDigest["signals"] {
  return {
    palette: {
      background: "#ffffff",
      body: "#222222",
      accent: "#16a34a",
      cta: "#2563eb",
      supporting: [],
    },
    typography: {
      body: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
      h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
      primaryPair: { body: "Inter", heading: "Inter" },
    },
    layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
    imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
    content: {
      headings,
      navLinks: [],
      formFields: [],
      listGroupCount: 0,
      sectionCount: 1,
    },
    assetInventory: [],
  };
}

describe("UAT AC-698: convert clears the draft to a 1-page empty scaffold before mirror/digest", () => {
  it("test_UAT_AC698_clear_to_empty_scaffold_seeds_business_name", async () => {
    // ── Recognizable source title → businessName seeded from the H1. ──────
    const h = makeTranscribeHarness({ accountId: "acct-698a" });
    const url = "https://acme.test/";
    await h.seedDigest(url, {
      signals: signalsWith([{ level: 1, text: "Acme Catering Co." }]),
    });

    const result = await h.invokeTranscribe({ digestId: url });
    expect(result.status).toBe("ok");
    const cleared = (
      (result as { payload?: Record<string, unknown> }).payload ?? {}
    ).clearedSiteDefinition as Site;
    expect(cleared).toBeDefined();

    // Exactly one home page at slug "/", no modules.
    expect(cleared.pages).toHaveLength(1);
    expect(cleared.pages[0].slug).toBe("/");
    expect(cleared.pages[0].modules).toHaveLength(0);

    // Framework-default theme tokens.
    expect(cleared.theme).toEqual(defaultThemeTokens);

    // in-page-anchors nav with no entries.
    expect(cleared.nav.pattern).toBe("in-page-anchors");
    expect(cleared.nav.entries).toHaveLength(0);

    // businessName seeded from the source title; home page title matches it.
    expect(cleared.config.businessName).toBe("Acme Catering Co.");
    expect(cleared.pages[0].title).toBe("Acme Catering Co.");

    // The cleared scaffold is a valid site definition.
    const validation = validateSite(cleared);
    if (!validation.ok) {
      console.error(JSON.stringify(validation.errors, null, 2));
    }
    expect(validation.ok).toBe(true);

    // The clear happens before the digest-written stage (stage 3).
    const notifies = h.events.filter((e) => e.event === "action:notify");
    const clearedIdx = notifies.findIndex((e) => e.data.status === "cleared");
    const digestIdx = notifies.findIndex(
      (e) => e.data.stage === 3 && e.data.status === "completed",
    );
    expect(clearedIdx).toBeGreaterThanOrEqual(0);
    expect(digestIdx).toBeGreaterThan(clearedIdx);

    // ── No derivable title → businessName falls back to "Untitled". ───────
    const h2 = makeTranscribeHarness({ accountId: "acct-698b" });
    // Invalid (unparseable) source URL + no level-1 heading ⇒ "Untitled".
    const untitledUrl = "not a valid url";
    await h2.seedDigest(untitledUrl, {
      sourceUrl: untitledUrl,
      signals: signalsWith([]),
    });
    const result2 = await h2.invokeTranscribe({ digestId: untitledUrl });
    expect(result2.status).toBe("ok");
    const cleared2 = (
      (result2 as { payload?: Record<string, unknown> }).payload ?? {}
    ).clearedSiteDefinition as Site;
    expect(cleared2.config.businessName).toBe("Untitled");
    expect(cleared2.pages[0].title).toBe("Untitled");
    expect(validateSite(cleared2).ok).toBe(true);
  });
});
