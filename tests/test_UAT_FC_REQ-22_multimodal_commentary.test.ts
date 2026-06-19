import { describe, expect, it } from "vitest";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";

describe("UAT FC REQ-22: multimodal AI commentary includes a visual observation (AC 9)", () => {
  it("AC9: when a desktop screenshot is in R2, the Haiku call includes an image content block and the system prompt asks for visual observations; the response can carry a visual sentence", async () => {
    const h = makeHarness({ claudeApiKey: "fake-key" });
    h.setHtmlBody(loadFixture("js-spa"));
    // The fake driver returns a desktop screenshot that uploadScreenshots
    // persists to ASSETS_BUCKET. The commentary call then re-reads the bytes
    // and attaches them as an image block.
    h.installDriver(
      makeFakeDriver({
        html: "<!doctype html><html><body><h1>Acme</h1><p>" + "A".repeat(1100) + "</p></body></html>",
        computedStyles: {
          body: { family: "Inter", size: "16px", weight: "400", backgroundColor: "rgb(255,255,255)" },
          h1: { family: "Inter", size: "48px", weight: "700" },
          h2: { family: "Inter", size: "32px", weight: "700" },
          h3: { family: "Inter", size: "24px", weight: "600" },
          primaryBackgroundColor: "rgb(255,255,255)",
        },
        computedBackgroundAssets: [],
        screenshotPngs: { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
      }),
    );
    h.setAnthropicCommentary({
      summary:
        "Center-aligned landing page; the hero dominates the viewport with a confident headline above generous whitespace.",
      perSection: {
        layout: "Centered hero block with substantial vertical breathing room.",
        imagery: "No hero photograph; relies on typography and color contrast.",
      },
      whatsMissing: [],
    });

    const result = await h.invoke({ url: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    // The call recorder should have one entry; its body must include an
    // image content block.
    expect(h.anthropicCalls.length).toBe(1);
    const body = h.anthropicCalls[0].body as {
      system: string;
      messages: Array<{ role: string; content: Array<{ type: string; source?: { type: string; media_type?: string; data?: string } }> }>;
    };
    expect(body.system).toMatch(/visual properties|alignment|density/);
    const userContent = body.messages[0].content;
    const imageBlock = userContent.find((b) => b.type === "image");
    expect(imageBlock).toBeDefined();
    expect(imageBlock?.source?.type).toBe("base64");
    expect(imageBlock?.source?.media_type).toBe("image/png");

    // And the resulting summary contains visual-language vocabulary, not just
    // signal-counting.
    const digest = (result.payload as { digest: { summary: string } }).digest;
    expect(digest.summary).toMatch(
      /alignment|density|treatment|layout|hero|viewport|breathing|whitespace|centered/i,
    );
  });
});
