import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-625: Confirmation is per-URL and does not blanket-authorize future
 * conversions. Confirming URL A never authorizes converting URL B in the same
 * session; an unconfirmed URL always re-prompts.
 */
describe("UAT AC-625: confirmation is per-URL and never blanket-authorizes other URLs", () => {
  it("test_UAT_AC625_confirmation_is_per_url_no_blanket_authorization", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-625" });
    const a = "https://acme.test/";
    const b = "https://other.test/";
    await h.seedDigest(a);
    await h.seedDigest(b);

    // Confirm and convert A successfully.
    await h.invokeConfirm({ url: a });
    const ra = await h.invokeTranscribe({ digestId: a });
    const pa = (ra as { payload?: Record<string, unknown> }).payload ?? {};
    expect(pa.kind).toBe("transcribe_site_done");

    // B has no consent → confirmation requested even though A was confirmed.
    const rb = await h.invokeTranscribe({ digestId: b });
    expect(rb.status).toBe("ok");
    const pb = (rb as { payload?: Record<string, unknown> }).payload ?? {};
    expect(pb.kind).toBe("convert_confirmation");
    expect(pb.url).toBe(b);

    // An unconfirmed URL re-prompts on every retry — never auto-proceeds.
    const rb2 = await h.invokeTranscribe({ digestId: b });
    const pb2 = (rb2 as { payload?: Record<string, unknown> }).payload ?? {};
    expect(pb2.kind).toBe("convert_confirmation");

    // siteId == accountId, so both share one digest key. The persisted digest is
    // still A's — B's conversion never proceeded to overwrite it.
    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-625/transcription/digest.json",
    );
    expect(obj).not.toBeNull();
    const digest = JSON.parse(await obj!.text()) as { sourceUrl: string };
    expect(digest.sourceUrl).toBe(a);
  });
});
