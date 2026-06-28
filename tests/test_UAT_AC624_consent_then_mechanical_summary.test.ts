import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-624: After consent, conversion proceeds and returns only a mechanical
 * completion summary (kind + digestKey + summary{four integer counts}); never a
 * synthesized site/module/theme/narrative payload.
 */
describe("UAT AC-624: after consent, conversion returns only the mechanical completion summary", () => {
  it("test_UAT_AC624_consent_then_conversion_returns_mechanical_summary", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-624" });
    const url = "https://acme.test/";
    await h.seedDigest(url);
    await h.invokeConfirm({ url });

    const result = await h.invokeTranscribe({ digestId: url });

    expect(result.status).toBe("ok");
    const payload = (result as { payload?: Record<string, unknown> }).payload ?? {};
    expect(payload.kind).toBe("transcribe_site_done");
    expect(typeof payload.digestKey).toBe("string");

    const summary = payload.summary as Record<string, unknown>;
    expect(summary).toBeDefined();
    for (const key of ["pageCount", "assetCount", "mirrored", "mirrorFailures"]) {
      expect(Number.isInteger(summary[key])).toBe(true);
    }

    // No synthesized-site payload of any form.
    for (const forbidden of ["site", "modules", "theme", "themeTokens", "narrative"]) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });
});
