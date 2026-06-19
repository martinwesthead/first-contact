import { describe, expect, it } from "vitest";
import {
  makeTranscribeHarness,
  validLlmTranscription,
} from "./_helpers_REQ-28_transcribe_site.js";
import { extractSignals } from "../packages/extractor/src/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(
    join(__dirname, "fixtures", "convert-flow", name, "index.html"),
    "utf8",
  );
}

describe("UAT FC REQ-28: AC16 killer-demo end-to-end — assets-heavy fixture", () => {
  it("AC16: paste URL → confirm → 4-stage flow → converted site has /assets/{r2Key} sources for mirrored assets and external URLs for failed ones", async () => {
    const h = makeTranscribeHarness({ accountId: "site-acme-catering" });

    // Use the real extractor signals from the assets-heavy fixture so the
    // digest carries realistic asset inventory + palette + typography.
    const html = loadFixture("assets-heavy");
    const signals = extractSignals(html, "https://assets-heavy.test/");
    await h.seedDigest("https://assets-heavy.test/", {
      signals,
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });

    // LLM returns a transcription referencing 4 of the fixture's assets.
    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-image",
            dials: { size: "lg", align: "center", surface: "default" },
            content: {
              heading: "Acme Catering Co.",
              subhead: "Weddings, corporate events, intimate dinners.",
              image: {
                id: "img-hero",
                src: "https://assets-heavy.test/hero-product.jpg",
                alt: "A platter of small bites",
              },
            },
            confidence: "high",
            source_section: "hero",
          },
          {
            id: "services-1",
            type: "services-grid",
            version: 1,
            variant: "three-col",
            content: {
              heading: "What we cater",
              items: [
                {
                  icon: {
                    id: "ic-w",
                    src: "https://assets-heavy.test/icon-wedding.svg",
                    alt: "Wedding",
                  },
                  title: "Weddings",
                  body: "Wedding catering.",
                },
                {
                  icon: {
                    id: "ic-c",
                    src: "https://assets-heavy.test/icon-corporate.svg",
                    alt: "Corporate",
                  },
                  title: "Corporate",
                  body: "Corporate events.",
                },
                {
                  icon: {
                    id: "ic-p",
                    src: "https://assets-heavy.test/icon-private.svg",
                    alt: "Private",
                  },
                  title: "Private",
                  body: "Private dinners.",
                },
              ],
            },
            confidence: "medium",
            source_section: "services",
          },
          {
            id: "oversize-1",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Oversize",
              image: {
                id: "img-oversize",
                src: "https://assets-heavy.test/oversize-banner.png",
                alt: "Oversize banner",
              },
            },
            confidence: "low",
            source_section: "oversize",
          },
        ],
        narrative: "Three sections transcribed from the assets-heavy fixture.",
      }),
    );

    // Wire asset responses — 4 successful, 1 oversize.
    const okImg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    h.setAssetResponses({
      "https://assets-heavy.test/hero-product.jpg": {
        status: 200,
        contentType: "image/jpeg",
        body: okImg,
      },
      "https://assets-heavy.test/icon-wedding.svg": {
        status: 200,
        contentType: "image/svg+xml",
        body: new TextEncoder().encode("<svg/>"),
      },
      "https://assets-heavy.test/icon-corporate.svg": {
        status: 200,
        contentType: "image/svg+xml",
        body: new TextEncoder().encode("<svg/>"),
      },
      "https://assets-heavy.test/icon-private.svg": {
        status: 200,
        contentType: "image/svg+xml",
        body: new TextEncoder().encode("<svg/>"),
      },
    });
    h.setAssetFailures({
      "https://assets-heavy.test/oversize-banner.png": { reason: "body_too_large" },
    });

    // Stage 1: gate.
    const gated = await h.invokeTranscribe({ digestId: "https://assets-heavy.test/" });
    expect((gated.payload as Record<string, unknown>).kind).toBe(
      "convert_confirmation",
    );

    // Operator confirms.
    await h.invokeConfirm({
      url: "https://assets-heavy.test/",
      ownsSite: true,
    });

    // Stage 1–4 run.
    const result = await h.invokeTranscribe({ digestId: "https://assets-heavy.test/" });
    expect(result.status).toBe("ok");
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcribe_site_done");
    expect(payload.fellBackToHero).toBe(false);

    // Site is fully validated.
    expect(payload.site).toBeDefined();

    // Stages 1, 2, 3 fired before 4.
    const completedStages = h.events
      .filter((e) => e.data.stage !== undefined && e.data.status === "completed")
      .map((e) => e.data.stage);
    expect(completedStages.includes(1)).toBe(true);
    expect(completedStages.includes(2)).toBe(true);
    expect(completedStages.includes(3)).toBe(true);

    // Stage 1's screenshot URL.
    const stage1 = h.events.find(
      (e) => e.data.stage === 1 && e.data.status === "completed",
    );
    expect(stage1!.data.screenshot).toBe("/assets/references/c/t/desktop.png");

    // Stage 2's theme tokens reflect the fixture's palette.
    const stage2 = h.events.find(
      (e) => e.data.stage === 2 && e.data.status === "completed",
    );
    const tokens = stage2!.data.themeTokens as Record<string, Record<string, string>>;
    expect(tokens.palette.bg.toLowerCase()).toBe("#ffffff");
    expect(tokens.palette.primary.toLowerCase()).toBe("#2563eb");

    // Stage 4 summary: 4 mirrored, 1 failed (the oversize).
    const summary = payload.assetMirrorSummary as Record<string, unknown>;
    expect(summary.mirrored).toBe(4);
    expect(summary.failed).toBe(1);
    const failures = summary.failures as Array<{ url: string; reason: string }>;
    expect(failures[0].url).toBe("https://assets-heavy.test/oversize-banner.png");
    expect(failures[0].reason).toBe("body_too_large");

    // Module AssetRefs: mirrored sources are /assets/sites/site-acme-catering/imports/*,
    // failed source stays external.
    const modules = payload.modules as Array<{
      id: string;
      content: {
        image?: { src: string };
        items?: Array<{ icon: { src: string } }>;
      };
    }>;
    expect(modules[0].content.image!.src).toMatch(
      /^\/assets\/sites\/site-acme-catering\/imports\/[0-9a-f]{16}\.jpg$/,
    );
    expect(modules[1].content.items![0].icon.src).toMatch(
      /^\/assets\/sites\/site-acme-catering\/imports\/[0-9a-f]{16}\.svg$/,
    );
    expect(modules[2].content.image!.src).toBe(
      "https://assets-heavy.test/oversize-banner.png",
    );
  });
});

describe("UAT FC REQ-28: AC7 dedup end-to-end — duplicate-asset fixture", () => {
  it("a URL referenced from multiple modules collapses to ONE R2 object via dedup", async () => {
    const h = makeTranscribeHarness({ accountId: "site-dup" });
    const html = loadFixture("duplicate-asset");
    const signals = extractSignals(html, "https://duplicate-asset.test/");
    await h.seedDigest("https://duplicate-asset.test/", { signals });

    h.setAnthropicResponse(
      validLlmTranscription({
        modules: [
          {
            id: "hero-a",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Hero A",
              image: {
                id: "ha",
                src: "https://duplicate-asset.test/hero.jpg",
                alt: "Hero A",
              },
            },
            confidence: "high",
          },
          {
            id: "hero-b",
            type: "hero",
            version: 1,
            variant: "bg-image",
            content: {
              heading: "Hero B",
              image: {
                id: "hb",
                src: "https://duplicate-asset.test/hero.jpg",
                alt: "Hero B",
              },
            },
            confidence: "medium",
          },
        ],
        narrative: "Two heroes share the same image.",
      }),
    );
    h.setAssetResponses({
      "https://duplicate-asset.test/hero.jpg": {
        status: 200,
        contentType: "image/jpeg",
        body: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      },
    });
    await h.invokeConfirm({ url: "https://duplicate-asset.test/" });
    const result = await h.invokeTranscribe({ digestId: "https://duplicate-asset.test/" });
    const payload = result.payload as Record<string, unknown>;
    const summary = payload.assetMirrorSummary as Record<string, unknown>;
    expect(summary.mirrored).toBe(1);

    // Exactly one R2 object under the site's imports prefix.
    const list = await h.env.ASSETS_BUCKET.list({
      prefix: "sites/site-dup/imports/",
    });
    expect(list.objects.length).toBe(1);

    // Both module AssetRefs point at the same R2 key.
    const modules = payload.modules as Array<{
      content: { image: { src: string } };
    }>;
    expect(modules[0].content.image.src).toBe(modules[1].content.image.src);
  });
});
