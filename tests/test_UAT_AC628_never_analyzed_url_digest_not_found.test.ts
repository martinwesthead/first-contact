import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-628: Converting a never-analyzed URL (no Reference Digest cached) fails
 * cleanly with a digest_not_found error, performs no draft mutation and no asset
 * mirroring, and directs the operator to analyze the page first.
 */
describe("UAT AC-628: converting a never-analyzed URL fails cleanly with digest_not_found", () => {
  it("test_UAT_AC628_never_analyzed_url_fails_with_digest_not_found", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-628" });
    const url = "https://never-analyzed.test/";
    // Consent so the confirmation gate is not the blocker; still no digest seeded.
    await h.invokeConfirm({ url });

    const result = await h.invokeTranscribe({ digestId: url });

    expect(result.status).toBe("failed");
    const error = String((result as { error?: string }).error ?? "");
    expect(error).toContain("digest_not_found");
    expect(error).toMatch(/analyze_page|analyze/i);

    // No draft mutation: no digest artifact written.
    expect(
      await h.env.ASSETS_BUCKET.get("sites/acct-628/transcription/digest.json"),
    ).toBeNull();

    // No asset mirroring: no stage-4 / asset events were emitted.
    const mirrorEvents = h.events.filter(
      (e) => e.data.stage === 4 || e.data.status === "asset_mirrored",
    );
    expect(mirrorEvents).toHaveLength(0);
  });
});
