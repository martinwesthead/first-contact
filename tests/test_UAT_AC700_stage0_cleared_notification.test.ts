import { describe, expect, it } from "vitest";
import type { Site } from "@1stcontact/site-schema";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-700: A successful convert emits a stage 0 `cleared` progress notification
 * (carrying the seeded business name) before any digest is written or any
 * later-stage progress event, and includes the cleared scaffold definition in
 * the completion result. The builder applies that returned definition to its
 * working draft so subsequent AI structured edits land on the freshly-cleared
 * scaffold rather than the previous draft.
 */
describe("UAT AC-700: stage 0 'cleared' notification fires before any digest write and the cleared definition is returned", () => {
  it("test_UAT_AC700_stage0_cleared_precedes_digest_and_returns_definition", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-700" });
    const url = "https://acme.test/"; // default digest H1 → "Acme Co"
    await h.seedDigest(url);

    const result = await h.invokeTranscribe({ digestId: url });
    expect(result.status).toBe("ok");

    const notifies = h.events.filter((e) => e.event === "action:notify");

    // A stage 0 event with status "cleared" carrying the seeded business name.
    const clearedIdx = notifies.findIndex(
      (e) => e.data.stage === 0 && e.data.status === "cleared",
    );
    expect(clearedIdx).toBeGreaterThanOrEqual(0);
    expect(notifies[clearedIdx].data.businessName).toBe("Acme Co");

    // It precedes the digest-written stage (stage 3).
    const digestIdx = notifies.findIndex(
      (e) => e.data.stage === 3 && e.data.status === "completed",
    );
    expect(digestIdx).toBeGreaterThanOrEqual(0);
    expect(clearedIdx).toBeLessThan(digestIdx);

    // It precedes every other emitted progress event (it is stage 0, first).
    expect(clearedIdx).toBe(0);

    // The completion result carries the cleared scaffold definition the builder
    // applies to its working draft before subsequent structured edits.
    const cleared = (
      (result as { payload?: Record<string, unknown> }).payload ?? {}
    ).clearedSiteDefinition as Site;
    expect(cleared).toBeDefined();
    expect(cleared.pages).toHaveLength(1);
    expect(cleared.pages[0].slug).toBe("/");
    expect(cleared.pages[0].modules).toHaveLength(0);
    expect(cleared.config.businessName).toBe("Acme Co");
  });
});
