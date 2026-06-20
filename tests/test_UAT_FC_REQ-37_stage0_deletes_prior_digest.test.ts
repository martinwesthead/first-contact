import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-37: transcribe_site deletes any prior digest at Stage 0", () => {
  it("a stale digest sitting at sites/{siteId}/transcription/digest.json is removed before the new convert writes its own", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-stale" });
    const digestKey = "sites/acct-req37-stale/transcription/digest.json";

    // Seed a prior digest with a distinct sourceUrl so we can tell whether
    // we're looking at the old or the new one after the run.
    await h.env.ASSETS_BUCKET.put(
      digestKey,
      JSON.stringify({
        siteId: "acct-req37-stale",
        sourceUrl: "https://stale.example/",
        capturedAt: "1999-01-01T00:00:00.000Z",
        perPagePlan: [],
        assetInventory: [],
        themeTokens: {},
        mirrorSummary: { mirrored: 0, failed: 0, failures: [] },
      }),
      { httpMetadata: { contentType: "application/json" } },
    );

    await h.seedDigest("https://acme.test/");
    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    const obj = await h.env.ASSETS_BUCKET.get(digestKey);
    expect(obj).not.toBeNull();
    const parsed = JSON.parse(await obj!.text()) as Record<string, unknown>;
    expect(parsed.sourceUrl).toBe("https://acme.test/");
    expect(parsed.capturedAt).not.toBe("1999-01-01T00:00:00.000Z");
  });

  it("the prior-digest delete fires before the first stage-3 'started' or 'completed' SSE event", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-order" });
    const digestKey = "sites/acct-req37-order/transcription/digest.json";

    let observedDeleteIndex = -1;
    const realDelete = h.env.ASSETS_BUCKET.delete.bind(h.env.ASSETS_BUCKET);
    h.env.ASSETS_BUCKET.delete = (async (key: string) => {
      if (key === digestKey) {
        observedDeleteIndex = h.events.length;
      }
      return realDelete(key);
    }) as typeof h.env.ASSETS_BUCKET.delete;

    await h.env.ASSETS_BUCKET.put(digestKey, JSON.stringify({ siteId: "acct-req37-order" }), {
      httpMetadata: { contentType: "application/json" },
    });
    await h.seedDigest("https://acme.test/");

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    expect(observedDeleteIndex).toBeGreaterThanOrEqual(0);
    const stage3CompletedIndex = h.events.findIndex(
      (e) =>
        e.data.tool === "transcribe_site" &&
        e.data.stage === 3 &&
        e.data.status === "completed",
    );
    expect(stage3CompletedIndex).toBeGreaterThan(observedDeleteIndex);
  });
});
