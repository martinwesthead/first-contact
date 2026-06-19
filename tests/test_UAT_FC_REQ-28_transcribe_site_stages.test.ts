import { describe, expect, it } from "vitest";
import {
  makeTranscribeHarness,
  validLlmTranscription,
} from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-28: 4-stage orchestration emits SSE progress in order", () => {
  it("AC3/AC4/AC5: emits stage 1 (screenshot) → stage 2 (theme tokens) → stage 3 (modules)", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(validLlmTranscription({}));

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

    expect(stageEvents).toEqual([1, 2, 3]);
  });

  it("AC3: stage 1 carries a screenshot URL when digest has one", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(validLlmTranscription({}));

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
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(validLlmTranscription({}));

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

  it("AC5: stage 3 carries module count + narrative + low-confidence list", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "x" },
            confidence: "high",
            source_section: "hero",
          },
          {
            id: "tb-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: { body: "..." },
            confidence: "low",
            source_section: "an unusual section",
          },
        ],
        narrative: "Two sections transcribed; one low confidence.",
      }),
    );

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const stage3 = h.events.find(
      (e) => e.data.stage === 3 && e.data.status === "completed",
    );
    expect(stage3).toBeDefined();
    expect(stage3!.data.modules).toBe(2);
    expect(stage3!.data.narrative).toBe("Two sections transcribed; one low confidence.");
    const lowConf = stage3!.data.lowConfidenceItems as Array<Record<string, string>>;
    expect(lowConf.length).toBe(1);
    expect(lowConf[0].moduleId).toBe("tb-1");
    expect(lowConf[0].section).toBe("an unusual section");
  });

  it("AC11: invalid Opus output is retried once with validator feedback; second invalid output falls back to hero-only", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });
    // Both attempts produce an invalid module type.
    const invalid = JSON.stringify({
      modules: [
        {
          id: "x-1",
          type: "carousel",
          version: 1,
          confidence: "high",
        },
      ],
      narrative: "invalid",
    });
    h.setAnthropicSequence([invalid, invalid]);

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    const payload = result.payload as Record<string, unknown>;
    expect(payload.fellBackToHero).toBe(true);
    expect(payload.kind).toBe("transcribe_site_done");
    const narrative = payload.narrative as string;
    expect(narrative).toMatch(/couldn't transcribe this site automatically/i);
    expect(narrative).toMatch(/hero-only/i);

    // Stage 3 event also names the fallback so the FE can label it clearly.
    const stage3 = h.events.find(
      (e) => e.data.stage === 3 && e.data.status === "completed",
    );
    expect(stage3!.data.fellBackToHero).toBe(true);
  });

  it("AC10: first invalid output + valid second output succeeds without falling back", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });
    const invalid = JSON.stringify({
      modules: [{ id: "x-1", type: "carousel", version: 1, confidence: "high" }],
      narrative: "invalid",
    });
    h.setAnthropicSequence([invalid, validLlmTranscription({})]);

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    const payload = result.payload as Record<string, unknown>;
    expect(payload.fellBackToHero).toBe(false);
    expect((payload.modules as Array<unknown>).length).toBe(2);
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
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(validLlmTranscription({}));

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    const payload = result.payload as Record<string, unknown>;
    const tokens = payload.themeTokens as Record<string, Record<string, string>>;
    // Default framework palette is preserved when nothing detected.
    expect(tokens.palette.bg).toBe("#ffffff");
    expect(tokens.palette.primary).toBe("#2563eb");
  });
});
