// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearToolResultRenderers,
  registerPreviewDigestReport,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@gendev/builder-ui";
import {
  renderDigestMarkdown,
  SCHEMA_VERSION,
  type PreviewDigest,
} from "../packages/extractor/src/index.js";

function makePreviewDigest(overrides: Partial<PreviewDigest> = {}): PreviewDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://app.test/assets/previews/acct-1/draft-abc/home/page.html",
    fetchedAt: "2026-06-24T12:00:00.000Z",
    fetchPath: "rendered",
    summary: "Generated preview: left-aligned hero on a white background.",
    signals: {
      palette: {
        background: "rgb(255, 255, 255)",
        body: "#222",
        accent: "#16a34a",
        cta: "#2563eb",
        supporting: [],
      },
      typography: {
        body: { family: "Inter", size: "16px", weight: "400" },
        h1: { family: "Inter", size: "48px", weight: "700" },
        h2: { family: "Inter", size: "32px", weight: "700" },
        h3: { family: "Inter", size: "24px", weight: "600" },
        primaryPair: { heading: "Inter", body: "Inter" },
      },
      layout: { maxContentWidth: 1200, bias: "left", density: "sparse" },
      imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
      content: {
        headings: [{ level: 1, text: "Acme Co" }],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 1,
      },
      assetInventory: [],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {
      mobile: "previews/acct-1/draft-abc/home/mobile.png",
      tablet: "previews/acct-1/draft-abc/home/tablet.png",
      desktop: "previews/acct-1/draft-abc/home/desktop.png",
    },
    previewSource: {
      accountId: "acct-1",
      draftId: "draft-abc",
      pageId: "home",
      capturedAt: "2026-06-24T12:00:00.000Z",
    },
    ...overrides,
  };
}

describe("UAT FC REQ-51: <PreviewDigestReport> chat-card", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerPreviewDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("AC6: screenshot strip is the first child of the body; each <img> points at /assets/{key}; all three viewports present", () => {
    const digest = makePreviewDigest();
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "preview_generated_page",
        args: {},
        summary: "rendered draft preview",
        kind: "preview_digest",
        data: {
          kind: "preview_digest",
          digest,
          digestMarkdown: renderDigestMarkdown(digest),
        },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    const reportRoot = node.querySelector(
      "[data-fc-preview-digest-report]",
    ) as HTMLElement;
    expect(reportRoot).not.toBeNull();

    const firstChild = reportRoot.firstElementChild as HTMLElement | null;
    expect(firstChild).not.toBeNull();
    expect(firstChild!.getAttribute("data-fc-preview-digest-screenshots")).not.toBeNull();

    const shots = reportRoot.querySelectorAll("[data-fc-preview-digest-screenshot]");
    expect(shots.length).toBe(3);
    const names = Array.from(shots).map((s) => s.getAttribute("data-fc-preview-digest-screenshot"));
    expect(names.sort()).toEqual(["desktop", "mobile", "tablet"]);

    const desktopImg = reportRoot.querySelector(
      '[data-fc-preview-digest-screenshot="desktop"] img',
    ) as HTMLImageElement;
    expect(desktopImg.getAttribute("src")).toBe(
      "/assets/previews/acct-1/draft-abc/home/desktop.png",
    );

    // Provenance data attributes carry the previewSource.
    expect(reportRoot.getAttribute("data-fc-preview-digest-account-id")).toBe("acct-1");
    expect(reportRoot.getAttribute("data-fc-preview-digest-draft-id")).toBe("draft-abc");
    expect(reportRoot.getAttribute("data-fc-preview-digest-page-id")).toBe("home");
  });

  it("AC6: when inspirationDelta is present, a 'vs. inspiration' section appears below the screenshot strip with the delta paragraph", () => {
    const digest = makePreviewDigest();
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "preview_generated_page",
        args: {},
        summary: "rendered draft preview",
        kind: "preview_digest",
        data: {
          kind: "preview_digest",
          digest,
          digestMarkdown: renderDigestMarkdown(digest),
          inspirationDelta:
            "Your hero is left-aligned; the inspiration is centered. The inspiration uses a denser, warmer palette while your preview reads lighter.",
        },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    const deltaSection = node.querySelector(
      "[data-fc-preview-digest-delta]",
    ) as HTMLElement;
    expect(deltaSection).not.toBeNull();
    const heading = deltaSection.querySelector(".fc-preview-digest-report__delta-heading");
    expect(heading?.textContent).toBe("vs. inspiration");
    expect(deltaSection.textContent).toMatch(/left-aligned|centered/);
  });

  it("AC8: when inspirationDelta is absent, no 'vs. inspiration' section is rendered (regression guard)", () => {
    const digest = makePreviewDigest();
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "preview_generated_page",
        args: {},
        summary: "rendered draft preview",
        kind: "preview_digest",
        data: {
          kind: "preview_digest",
          digest,
          digestMarkdown: renderDigestMarkdown(digest),
        },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    expect(node.querySelector("[data-fc-preview-digest-delta]")).toBeNull();
    // Screenshot strip should still be present.
    expect(node.querySelector("[data-fc-preview-digest-screenshots]")).not.toBeNull();
  });

  it("when digest.screenshotKeys is empty (budget-exhausted shape), no screenshot strip is rendered", () => {
    const digest = makePreviewDigest({ screenshotKeys: {} });
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "preview_generated_page",
        args: {},
        summary: "budget exhausted",
        kind: "preview_digest",
        data: {
          kind: "preview_digest",
          digest,
          digestMarkdown: renderDigestMarkdown(digest),
        },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    expect(node.querySelector("[data-fc-preview-digest-screenshots]")).toBeNull();
  });
});
