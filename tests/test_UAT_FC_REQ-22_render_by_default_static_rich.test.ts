import { describe, expect, it } from "vitest";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";
import { ReferenceDigest } from "../packages/extractor/src/index.js";

const RENDERED_HTML = `<!doctype html><html><body><main><h1>Plain Site</h1><p>Body copy as it appears post-hydration.</p></main></body></html>`;

describe("UAT FC REQ-22: render-by-default for a static-rich page (AC 13)", () => {
  it("AC13: the plain-html-site fixture — previously sufficient for static-only — now returns fetchPath='rendered' with all three viewport screenshots populated", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("plain-html-site"));
    h.setAnthropicCommentary({
      summary: "A plain marketing page with the standard hero/features rhythm.",
      perSection: { typography: "Inter body, Inter headings." },
      whatsMissing: [],
    });
    h.installDriver(
      makeFakeDriver({
        html: RENDERED_HTML,
        computedStyles: {
          body: {
            family: "Inter, system-ui, sans-serif",
            size: "16px",
            weight: "400",
            backgroundColor: "rgb(255, 255, 255)",
          },
          h1: { family: "Inter, system-ui, sans-serif", size: "48px", weight: "700" },
          h2: { family: "Inter, system-ui, sans-serif", size: "32px", weight: "700" },
          h3: { family: "Inter, system-ui, sans-serif", size: "24px", weight: "600" },
          primaryBackgroundColor: "rgb(255, 255, 255)",
        },
        computedBackgroundAssets: [],
        screenshotPngs: { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
      }),
    );

    const result = await h.invoke({ url: "https://plain.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    const digest = ReferenceDigest.parse((result.payload as { digest: unknown }).digest);
    expect(digest.fetchPath).toBe("rendered");
    expect(digest.screenshotKeys.mobile).toBeTruthy();
    expect(digest.screenshotKeys.tablet).toBeTruthy();
    expect(digest.screenshotKeys.desktop).toBeTruthy();
  });
});
