import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-30: transcribe_site writes a TranscriptionDigest to R2 (AC1, AC2)", () => {
  it("AC1: after a successful transcribe_site, sites/{siteId}/transcription/digest.json exists in ASSETS_BUCKET", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-r2-test" });
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-r2-test/transcription/digest.json",
    );
    expect(obj).not.toBeNull();
    const text = await obj!.text();
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(parsed.siteId).toBe("acct-r2-test");
    expect(parsed.sourceUrl).toBe("https://acme.test/");
    expect(typeof parsed.capturedAt).toBe("string");
    expect(Array.isArray(parsed.perPagePlan)).toBe(true);
    expect(Array.isArray(parsed.assetInventory)).toBe(true);
    expect(parsed.themeTokens).toBeDefined();
    expect(parsed.mirrorSummary).toBeDefined();
  });

  it("AC2: handler payload is {kind: 'transcribe_site_done', digestKey, summary} with no synthesized site fields", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-payload-test" });
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;

    expect(payload.kind).toBe("transcribe_site_done");
    expect(payload.digestKey).toBe(
      "sites/acct-payload-test/transcription/digest.json",
    );

    const summary = payload.summary as Record<string, unknown>;
    expect(summary).toBeDefined();
    expect(typeof summary.pageCount).toBe("number");
    expect(typeof summary.assetCount).toBe("number");
    expect(typeof summary.mirrored).toBe("number");
    expect(typeof summary.mirrorFailures).toBe("number");

    // None of the dropped synthesis fields are present.
    expect(payload.site).toBeUndefined();
    expect(payload.modules).toBeUndefined();
    expect(payload.themeTokens).toBeUndefined();
    expect(payload.narrative).toBeUndefined();
    expect(payload.fellBackToHero).toBeUndefined();
    expect(payload.assetMirrorSummary).toBeUndefined();
  });
});
