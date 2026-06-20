import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-28: 3-stage orchestration emits SSE progress in order (REQ-30 reshape)", () => {
  it("AC3/AC4/AC5: emits stage 1 (screenshot) → stage 2 (theme tokens) → stage 5 (copy capture) → stage 3 (digest written)", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    const stageEvents = h.events
      .filter(
        (e) =>
          e.event === "action:notify" &&
          typeof e.data.stage === "number" &&
          e.data.status === "completed",
      )
      .map((e) => e.data.stage);

    // REQ-33 inserts stage 5 (per-page copy capture) between stage 2 and stage 3.
    expect(stageEvents).toEqual([1, 2, 5, 3]);
  });

  it("AC3: stage 1 carries a screenshot URL when digest has one", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const stage1 = h.events.find(
      (e) => e.data.stage === 1 && e.data.status === "completed",
    );
    expect(stage1).toBeDefined();
    expect(stage1!.data.screenshot).toBe("/assets/references/c/t/desktop.png");
  });

  it("AC4: stage 2 emits applied ThemeTokens with confidence band", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const stage2 = h.events.find(
      (e) => e.data.stage === 2 && e.data.status === "completed",
    );
    expect(stage2).toBeDefined();
    const tokens = stage2!.data.themeTokens as Record<string, Record<string, string>>;
    expect(tokens.palette.bg).toBe("#ffffff");
    expect(tokens.palette.primary).toBe("#2563eb");
    expect((stage2!.data.confidence as Record<string, string>).palette).toBe("high");
  });

  it("AC5 (REQ-30 relaxed): stage 3 carries digestKey and summary instead of module synthesis", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-stage3" });
    await h.seedDigest("https://acme.test/");

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const stage3 = h.events.find(
      (e) => e.data.stage === 3 && e.data.status === "completed",
    );
    expect(stage3).toBeDefined();
    expect(stage3!.data.digestKey).toBe(
      "sites/acct-stage3/transcription/digest.json",
    );
    expect(typeof (stage3!.data.pageCount)).toBe("number");
  });

  it("AC13: digest with NOT_DETECTED palette + typography still completes; theme tokens fall back to framework defaults", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: {
          background: "not_detected",
          body: "not_detected",
          accent: "not_detected",
          cta: "not_detected",
          supporting: [],
        },
        typography: {
          body: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h1: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          primaryPair: "not_detected",
        },
        layout: { maxContentWidth: "not_detected", bias: "not_detected", density: "not_detected" },
        imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: { headings: [{ level: 1, text: "Untitled" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 0 },
        assetInventory: [],
      },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    // REQ-30: themeTokens live in the digest, not the payload. Read them from R2.
    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-test/transcription/digest.json",
    );
    expect(obj).not.toBeNull();
    const digest = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const tokens = digest.themeTokens as Record<string, Record<string, string>>;
    // Default framework palette is preserved when nothing detected.
    expect(tokens.palette.bg).toBe("#ffffff");
    expect(tokens.palette.primary).toBe("#2563eb");
  });
});
