import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-623: First convert attempt on an unconfirmed URL requests confirmation and
 * does not mutate the draft.
 */
describe("UAT AC-623: first convert on an unconfirmed URL requests confirmation, no draft mutation", () => {
  it("test_UAT_AC623_first_convert_requests_confirmation_no_mutation", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-623" });
    const url = "https://acme.test/";
    await h.seedDigest(url);

    const result = await h.invokeTranscribe({ digestId: url });

    // The result is the convert-confirmation request, not a conversion.
    expect(result.status).toBe("ok");
    const payload = (result as { payload?: Record<string, unknown> }).payload ?? {};
    expect(payload.kind).toBe("convert_confirmation");
    expect(payload.url).toBe(url);
    expect(String(payload.prompt)).toContain(url);
    expect(String(payload.prompt)).toMatch(/replace|cannot be|undo/i);

    // No mutation: no transcription digest artifact was written for the site.
    const written = await h.env.ASSETS_BUCKET.get(
      "sites/acct-623/transcription/digest.json",
    );
    expect(written).toBeNull();

    // A confirmation-required notice was emitted; no staged progress fired.
    const confirmEvent = h.events.find(
      (e) => e.data.kind === "convert_confirmation_required",
    );
    expect(confirmEvent).toBeDefined();
    expect(confirmEvent!.data.url).toBe(url);
    const stageEvents = h.events.filter((e) => typeof e.data.stage === "number");
    expect(stageEvents).toHaveLength(0);
  });
});
