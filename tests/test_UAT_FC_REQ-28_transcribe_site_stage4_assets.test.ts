import { describe, expect, it } from "vitest";
import {
  makeTranscribeHarness,
  validLlmTranscription,
} from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-28: Stage 4 asset-mirror to R2", () => {
  it("AC6/AC9: stage 4 starts after stage 3 and mirrors http(s) image URLs to R2", async () => {
    const h = makeTranscribeHarness({ accountId: "site-acme" });
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: { background: "#fff", body: "#222", accent: "#0a0", cta: "#00f", supporting: [] },
        typography: {
          body: { family: "Inter", size: "not_detected", weight: "not_detected" },
          h1: { family: "Inter", size: "not_detected", weight: "not_detected" },
          h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          primaryPair: { body: "Inter", heading: "Inter" },
        },
        layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
        imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: { headings: [{ level: 1, text: "Acme" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 1 },
        assetInventory: [
          {
            url: "https://acme.test/hero.jpg",
            kind: "img",
            classification: "hero",
            references: 1,
          },
        ],
      },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Welcome",
              image: { id: "img-1", src: "https://acme.test/hero.jpg", alt: "Hero" },
            },
            confidence: "high",
          },
        ],
      }),
    );
    h.setAssetResponses({
      "https://acme.test/hero.jpg": {
        status: 200,
        contentType: "image/jpeg",
        body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    const payload = result.payload as Record<string, unknown>;
    const summary = payload.assetMirrorSummary as Record<string, unknown>;
    expect(summary.mirrored).toBe(1);
    expect(summary.failed).toBe(0);
    // Module AssetRef has been rewritten to /assets/{r2Key}.
    const modules = payload.modules as Array<{ content: { image: { src: string } } }>;
    expect(modules[0].content.image.src).toMatch(/^\/assets\/sites\/site-acme\/imports\/[0-9a-f]{16}\.jpg$/);

    // Stage 4 SSE events emitted.
    const started = h.events.find(
      (e) => e.data.stage === 4 && e.data.status === "started",
    );
    expect(started).toBeDefined();
    const mirrored = h.events.find(
      (e) => e.data.stage === 4 && e.data.status === "asset_mirrored",
    );
    expect(mirrored).toBeDefined();
    expect(mirrored!.data.url).toBe("https://acme.test/hero.jpg");
  });

  it("AC7: dedup — two module AssetRefs to the same URL produce ONE R2 object and rewrite both refs", async () => {
    const h = makeTranscribeHarness({ accountId: "site-1" });
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: { background: "#fff", body: "#222", accent: "#0a0", cta: "#00f", supporting: [] },
        typography: {
          body: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h1: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          primaryPair: "not_detected",
        },
        layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
        imagery: { imgCount: 1, backgroundCount: 1, videoCount: 0, heroDetected: true },
        content: { headings: [{ level: 1, text: "Acme" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 2 },
        assetInventory: [
          { url: "https://acme.test/hero.jpg", kind: "img", classification: "hero", references: 1 },
          { url: "https://acme.test/hero.jpg", kind: "background", classification: "decorative", references: 1 },
        ],
      },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Welcome",
              image: { id: "img-1", src: "https://acme.test/hero.jpg", alt: "Hero 1" },
            },
            confidence: "high",
          },
          {
            id: "services-1",
            type: "services-grid",
            version: 1,
            variant: "two-col",
            content: {
              items: [
                {
                  icon: { id: "ic-1", src: "https://acme.test/hero.jpg", alt: "Hero 2" },
                  title: "A",
                  body: "x",
                },
                {
                  icon: { id: "ic-2", src: "https://acme.test/hero.jpg", alt: "Hero 3" },
                  title: "B",
                  body: "y",
                },
              ],
            },
            confidence: "medium",
          },
        ],
      }),
    );
    h.setAssetResponses({
      "https://acme.test/hero.jpg": {
        status: 200,
        contentType: "image/jpeg",
        body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    const payload = result.payload as Record<string, unknown>;
    const summary = payload.assetMirrorSummary as Record<string, unknown>;
    // Exactly one mirrored asset despite 3 references — dedup at work.
    expect(summary.mirrored).toBe(1);
    // R2 bucket only has one imports/ object.
    const list = await h.env.ASSETS_BUCKET.list({ prefix: "sites/site-1/imports/" });
    expect(list.objects.length).toBe(1);

    // All three AssetRefs point at the same R2 key.
    const modules = payload.modules as Array<{
      id: string;
      content: { image?: { src: string }; items?: Array<{ icon: { src: string } }> };
    }>;
    const heroSrc = modules[0].content.image!.src;
    const ic1Src = modules[1].content.items![0].icon.src;
    const ic2Src = modules[1].content.items![1].icon.src;
    expect(heroSrc).toBe(ic1Src);
    expect(ic1Src).toBe(ic2Src);
    expect(heroSrc).toMatch(/^\/assets\/sites\/site-1\/imports\/[0-9a-f]{16}\.jpg$/);
  });

  it("AC8: an oversize asset stays at its external URL and the summary names the failure reason", async () => {
    const h = makeTranscribeHarness({ accountId: "site-1" });
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: { background: "#fff", body: "#222", accent: "#0a0", cta: "#00f", supporting: [] },
        typography: {
          body: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h1: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          primaryPair: "not_detected",
        },
        layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
        imagery: { imgCount: 2, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: { headings: [{ level: 1, text: "x" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 0 },
        assetInventory: [
          { url: "https://acme.test/ok.jpg", kind: "img", classification: "hero", references: 1 },
          { url: "https://acme.test/giant.png", kind: "img", classification: "product", references: 1 },
        ],
      },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "x",
              image: { id: "img-1", src: "https://acme.test/ok.jpg", alt: "OK" },
            },
            confidence: "high",
          },
          {
            id: "hero-2",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "y",
              image: { id: "img-2", src: "https://acme.test/giant.png", alt: "Giant" },
            },
            confidence: "medium",
          },
        ],
      }),
    );
    h.setAssetResponses({
      "https://acme.test/ok.jpg": {
        status: 200,
        contentType: "image/jpeg",
        body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      },
    });
    h.setAssetFailures({
      "https://acme.test/giant.png": { reason: "body_too_large" },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    const payload = result.payload as Record<string, unknown>;
    const summary = payload.assetMirrorSummary as Record<string, unknown>;
    expect(summary.mirrored).toBe(1);
    expect(summary.failed).toBe(1);
    const failures = summary.failures as Array<{ url: string; reason: string }>;
    expect(failures[0].url).toBe("https://acme.test/giant.png");
    expect(failures[0].reason).toBe("body_too_large");

    // The OK asset is rewritten; the giant asset keeps its external URL.
    const modules = payload.modules as Array<{ content: { image: { src: string } } }>;
    expect(modules[0].content.image.src).toMatch(/^\/assets\/sites\/site-1\/imports\//);
    expect(modules[1].content.image.src).toBe("https://acme.test/giant.png");
  });

  it("handles a transcription with zero asset references (Stage 4 no-op)", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "tb-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: { body: "Plain text only." },
            confidence: "high",
          },
        ],
      }),
    );

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    const payload = result.payload as Record<string, unknown>;
    const summary = payload.assetMirrorSummary as Record<string, unknown>;
    expect(summary.mirrored).toBe(0);
    expect(summary.failed).toBe(0);
  });
});
