// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearToolResultRenderers,
  registerDigestReport,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@gendev/builder-ui";
import {
  SCHEMA_VERSION,
  renderDigestMarkdown,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

function digestWithScreenshots(): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://acme.test/",
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "rendered",
    summary: "Centered hero landing page; the rendered fetch captured the visible hero composition.",
    signals: {
      palette: {
        background: "rgb(255, 255, 255)",
        body: "#222",
        accent: "#16a34a",
        cta: "#2563eb",
        supporting: [],
      },
      typography: {
        body: { family: "Inter, system-ui", size: "16px", weight: "400" },
        h1: { family: "Inter, system-ui", size: "48px", weight: "700" },
        h2: { family: "Inter, system-ui", size: "32px", weight: "700" },
        h3: { family: "Inter, system-ui", size: "24px", weight: "600" },
        primaryPair: { heading: "Inter, system-ui", body: "Inter, system-ui" },
      },
      layout: { maxContentWidth: 1200, bias: "centered", density: "balanced" },
      imagery: { imgCount: 0, backgroundCount: 1, videoCount: 0, heroDetected: false },
      content: { headings: [{ level: 1, text: "Hi" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 1 },
      assetInventory: [
        {
          url: "https://acme.test/hero-bg.jpg",
          kind: "background",
          classification: "unknown",
          references: 1,
        },
      ],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {
      mobile: "references/chat-1/turn-1/mobile.png",
      tablet: "references/chat-1/turn-1/tablet.png",
      desktop: "references/chat-1/turn-1/desktop.png",
    },
  };
}

describe("UAT FC REQ-22: <DigestReport> renders the screenshot strip first (AC 11)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("AC11: when digest.screenshotKeys has mobile+tablet+desktop, the card body's first child is the screenshot strip, each <img> points at /assets/{key}, and all three viewports are present", () => {
    const digest = digestWithScreenshots();
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "analyze_page",
        args: { url: digest.sourceUrl },
        summary: "produced reference digest (cache MISS)",
        kind: "reference_digest",
        data: {
          kind: "reference_digest",
          digest,
          digestMarkdown: renderDigestMarkdown(digest),
          cache: "MISS",
        },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    const reportRoot = node.querySelector("[data-fc-digest-report]") as HTMLElement;
    expect(reportRoot).not.toBeNull();
    const firstChild = reportRoot.firstElementChild as HTMLElement | null;
    expect(firstChild).not.toBeNull();
    expect(firstChild!.getAttribute("data-fc-digest-screenshots")).not.toBeNull();

    const screenshots = reportRoot.querySelectorAll("[data-fc-digest-screenshot]");
    expect(screenshots.length).toBe(3);
    const names = Array.from(screenshots).map((s) => s.getAttribute("data-fc-digest-screenshot"));
    expect(names.sort()).toEqual(["desktop", "mobile", "tablet"]);

    const desktopImg = reportRoot.querySelector(
      '[data-fc-digest-screenshot="desktop"] img',
    ) as HTMLImageElement;
    expect(desktopImg.getAttribute("src")).toBe(
      "/assets/references/chat-1/turn-1/desktop.png",
    );
  });

  it("when digest.screenshotKeys is empty, no screenshot strip is rendered (regression guard against AC11 inflating non-rendered cards)", () => {
    const digest = digestWithScreenshots();
    const noShots: ReferenceDigest = { ...digest, screenshotKeys: {}, fetchPath: "static" };
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "analyze_page",
        args: { url: digest.sourceUrl },
        summary: "x",
        kind: "reference_digest",
        data: { kind: "reference_digest", digest: noShots, digestMarkdown: renderDigestMarkdown(noShots) },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    const reportRoot = node.querySelector("[data-fc-digest-report]") as HTMLElement;
    expect(reportRoot.querySelector("[data-fc-digest-screenshots]")).toBeNull();
  });
});
