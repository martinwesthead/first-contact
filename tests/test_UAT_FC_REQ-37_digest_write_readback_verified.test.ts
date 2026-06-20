import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-37: transcribe_site verifies the digest write with a read-back before returning", () => {
  it("returns failed with digest_write_unverified when the digest object is not retrievable after put", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-readback-missing" });
    await h.seedDigest("https://acme.test/");

    const digestKey =
      "sites/acct-req37-readback-missing/transcription/digest.json";

    // After the handler calls put(digestKey), simulate eventual-consistency
    // drift by removing the object immediately. The handler's verification
    // get() must then fail and the handler must return a failed result.
    const realPut = h.env.ASSETS_BUCKET.put.bind(h.env.ASSETS_BUCKET);
    h.env.ASSETS_BUCKET.put = (async (...args: Parameters<R2Bucket["put"]>) => {
      const out = await realPut(...args);
      if (args[0] === digestKey) {
        await h.env.ASSETS_BUCKET.delete(digestKey);
      }
      return out;
    }) as typeof h.env.ASSETS_BUCKET.put;

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/digest_write_unverified/);
    }
  });

  it("returns failed with digest_write_unverified when the round-tripped capturedAt does not match what was written", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-readback-drift" });
    await h.seedDigest("https://acme.test/");

    const digestKey =
      "sites/acct-req37-readback-drift/transcription/digest.json";

    const realPut = h.env.ASSETS_BUCKET.put.bind(h.env.ASSETS_BUCKET);
    h.env.ASSETS_BUCKET.put = (async (...args: Parameters<R2Bucket["put"]>) => {
      const out = await realPut(...args);
      if (args[0] === digestKey) {
        // Overwrite with a different capturedAt — simulates a stale read or a
        // racing writer beating the handler to it.
        await realPut(
          digestKey,
          JSON.stringify({
            siteId: "acct-req37-readback-drift",
            capturedAt: "1999-01-01T00:00:00.000Z",
          }),
          { httpMetadata: { contentType: "application/json" } },
        );
      }
      return out;
    }) as typeof h.env.ASSETS_BUCKET.put;

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/digest_write_unverified/);
    }
  });

  it("a healthy write passes the verification step and the handler returns ok", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-readback-ok" });
    await h.seedDigest("https://acme.test/");
    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
  });
});
