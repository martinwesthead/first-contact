import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-629: A successful conversion streams ordered progressive-reveal progress:
 * a screenshot-preview stage (carrying the desktop screenshot ref), a
 * theme-token stage (carrying derived tokens + confidence band), and a
 * digest-written stage (carrying digest location + counts). Screenshot and theme
 * stages precede the digest-written stage.
 */
describe("UAT AC-629: successful conversion streams ordered progressive-reveal progress", () => {
  it("test_UAT_AC629_streams_ordered_progressive_reveal_progress", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-629" });
    const url = "https://acme.test/";
    await h.seedDigest(url, {
      screenshotKeys: { desktop: "references/a/b/desktop.png" },
    });

    const result = await h.invokeTranscribe({ digestId: url });
    expect(result.status).toBe("ok");

    const notifies = h.events.filter((e) => e.event === "action:notify");
    const idxOf = (stage: number): number =>
      notifies.findIndex(
        (e) => e.data.stage === stage && e.data.status === "completed",
      );
    const screenshotIdx = idxOf(1);
    const themeIdx = idxOf(2);
    const digestIdx = idxOf(3);

    // All three reveal stages were emitted.
    expect(screenshotIdx).toBeGreaterThanOrEqual(0);
    expect(themeIdx).toBeGreaterThanOrEqual(0);
    expect(digestIdx).toBeGreaterThanOrEqual(0);

    // Screenshot and theme precede the digest-written stage.
    expect(screenshotIdx).toBeLessThan(digestIdx);
    expect(themeIdx).toBeLessThan(digestIdx);

    // Screenshot stage carries the desktop screenshot reference.
    expect(notifies[screenshotIdx].data.screenshot).toBe(
      "/assets/references/a/b/desktop.png",
    );

    // Theme stage carries applied tokens + a confidence band.
    expect(notifies[themeIdx].data.themeTokens).toBeDefined();
    expect(notifies[themeIdx].data.confidence).toBeDefined();

    // Digest-written stage carries the digest key and counts.
    expect(typeof notifies[digestIdx].data.digestKey).toBe("string");
    expect(typeof notifies[digestIdx].data.pageCount).toBe("number");
    expect(typeof notifies[digestIdx].data.assetCount).toBe("number");
  });
});
