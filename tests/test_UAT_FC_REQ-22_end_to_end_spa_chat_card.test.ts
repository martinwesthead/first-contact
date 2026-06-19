// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearToolResultRenderers,
  registerDigestReport,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@1stcontact/builder-ui";
import {
  ReferenceDigest,
  renderDigestMarkdown,
} from "../packages/extractor/src/index.js";
import {
  loadFixture,
  makeFakeDriver,
  makeHarness,
  TINY_PNG,
} from "./_helpers_REQ-22_rendered.js";

describe("UAT FC REQ-22: end-to-end SPA → digest chat-card with screenshots, typography, background-image inventory (AC 12)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("AC12: operator pastes a SPA URL → analyze_page escalates → digest chat-card renders all three screenshots, computed typography, AND the computed-only hero background-image lands in the inventory", async () => {
    const h = makeHarness();
    h.setHtmlBody(loadFixture("js-spa"));
    h.setAnthropicCommentary({
      summary: "A centered SPA landing page; the hero block reads as a single decisive composition.",
      perSection: { typography: "Inter throughout; restrained weight contrast." },
      whatsMissing: [],
    });
    h.installDriver(
      makeFakeDriver({
        html: `<!doctype html><html><body><h1>Build with Acme</h1><p>${"A".repeat(1100)}</p></body></html>`,
        computedStyles: {
          body: { family: "Inter, system-ui", size: "16px", weight: "400", backgroundColor: "rgb(255, 255, 255)" },
          h1: { family: "Inter, system-ui", size: "48px", weight: "700" },
          h2: { family: "Inter, system-ui", size: "32px", weight: "700" },
          h3: { family: "Inter, system-ui", size: "24px", weight: "600" },
          primaryBackgroundColor: "rgb(255, 255, 255)",
        },
        // Only-discovered-by-computed-styles hero background.
        computedBackgroundAssets: [
          { url: "/hero-bg.jpg", selector: ".hero" },
        ],
        screenshotPngs: { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
      }),
    );

    const handlerResult = await h.invoke({ url: "https://acme.test/" });
    expect(handlerResult.status).toBe("ok");
    if (handlerResult.status !== "ok") return;

    const payload = handlerResult.payload as {
      digest: unknown;
      digestMarkdown: string;
      kind: string;
    };
    const digest = ReferenceDigest.parse(payload.digest);
    expect(digest.fetchPath).toBe("rendered");
    expect(digest.screenshotKeys.mobile).toMatch(/\/mobile\.png$/);
    expect(digest.screenshotKeys.tablet).toMatch(/\/tablet\.png$/);
    expect(digest.screenshotKeys.desktop).toMatch(/\/desktop\.png$/);
    expect(digest.signals.typography.body.family).toBe("Inter, system-ui");
    const heroBg = digest.signals.assetInventory.find((a) => a.url.endsWith("/hero-bg.jpg"));
    expect(heroBg).toBeDefined();
    expect(heroBg?.kind).toBe("background");

    // Now render the chat-card from the tool_result.
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "analyze_page",
        args: { url: digest.sourceUrl },
        summary: "produced reference digest",
        kind: "reference_digest",
        data: { kind: "reference_digest", digest, digestMarkdown: payload.digestMarkdown, cache: "MISS" },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;

    const screenshots = node.querySelectorAll("[data-fc-digest-screenshot]");
    expect(screenshots.length).toBe(3);
    // Hero bg-image lives in the inventory strip via the background group.
    const bgThumbs = node.querySelectorAll('[data-fc-digest-thumb-kind="background"]');
    expect(bgThumbs.length).toBeGreaterThanOrEqual(1);
  });
});
