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
    sourceUrl: "preview://acct-1/draft-abc/home",
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

function renderCard(
  digest: PreviewDigest,
  extra: { inspirationDelta?: string } = {},
): HTMLElement {
  const data: Record<string, unknown> = {
    kind: "preview_digest",
    digest,
    digestMarkdown: renderDigestMarkdown(digest),
  };
  if (extra.inspirationDelta !== undefined) {
    data.inspirationDelta = extra.inspirationDelta;
  }
  const result: ChatToolResultRecord = {
    ok: true,
    applied: {
      tool: "preview_generated_page",
      args: {},
      summary: "rendered draft preview",
      kind: "preview_digest",
      data,
    },
  };
  return renderToolResult({
    doc: document,
    result,
    renderMarkdown: (md) => renderMarkdownToDom(document, md),
  }) as HTMLElement;
}

describe("Reconciliation UATs: <PreviewDigestReport> chat-card (story-bab9b773)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerPreviewDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("test_UAT_AC835_card_leads_with_screenshot_strip_and_draft_page_header", () => {
    const digest = makePreviewDigest();
    const node = renderCard(digest);

    // Header names the draft page (distinct from an external reference card).
    const title = node.querySelector("[data-fc-chat-card-title]");
    expect(title).not.toBeNull();
    expect(title!.textContent).toContain("Preview");
    expect(title!.textContent).toContain("home");

    const reportRoot = node.querySelector(
      "[data-fc-preview-digest-report]",
    ) as HTMLElement;
    expect(reportRoot).not.toBeNull();

    // Screenshot strip is the first element of the body.
    const firstChild = reportRoot.firstElementChild as HTMLElement | null;
    expect(firstChild).not.toBeNull();
    expect(firstChild!.getAttribute("data-fc-preview-digest-screenshots")).not.toBeNull();

    // One image per available viewport, each referencing its persisted key.
    const shots = reportRoot.querySelectorAll("[data-fc-preview-digest-screenshot]");
    expect(shots.length).toBe(3);
    const names = Array.from(shots).map((s) =>
      s.getAttribute("data-fc-preview-digest-screenshot"),
    );
    expect(names.sort()).toEqual(["desktop", "mobile", "tablet"]);

    const desktopImg = reportRoot.querySelector(
      '[data-fc-preview-digest-screenshot="desktop"] img',
    ) as HTMLImageElement;
    expect(desktopImg.getAttribute("src")).toBe(
      "/assets/previews/acct-1/draft-abc/home/desktop.png",
    );
  });

  it("test_UAT_AC836_vs_inspiration_section_only_when_inspirationDelta_present", () => {
    // Present: a "vs. inspiration" section appears below the screenshot strip.
    const withDelta = renderCard(makePreviewDigest(), {
      inspirationDelta:
        "Your hero is left-aligned; the inspiration is centered and denser.",
    });
    const strip = withDelta.querySelector("[data-fc-preview-digest-screenshots]");
    const deltaSection = withDelta.querySelector(
      "[data-fc-preview-digest-delta]",
    ) as HTMLElement | null;
    expect(strip).not.toBeNull();
    expect(deltaSection).not.toBeNull();
    // Positioned below (after) the screenshot strip in document order.
    expect(
      strip!.compareDocumentPosition(deltaSection!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    const heading = deltaSection!.querySelector(
      ".fc-preview-digest-report__delta-heading",
    );
    expect(heading?.textContent).toBe("vs. inspiration");
    expect(deltaSection!.textContent).toMatch(/left-aligned|centered/);

    // Absent: no "vs. inspiration" section is rendered.
    const withoutDelta = renderCard(makePreviewDigest());
    expect(withoutDelta.querySelector("[data-fc-preview-digest-delta]")).toBeNull();
  });

  it("test_UAT_AC837_degraded_digest_renders_signal_panels_only_without_screenshot_strip", () => {
    // Degraded/budget-exhausted shape: no screenshot keys.
    const digest = makePreviewDigest({ screenshotKeys: {} });

    let node!: HTMLElement;
    expect(() => {
      node = renderCard(digest);
    }).not.toThrow();

    // No screenshot strip is present.
    expect(node.querySelector("[data-fc-preview-digest-screenshots]")).toBeNull();

    // The structural signal content still renders (digest markdown panels).
    const reportRoot = node.querySelector(
      "[data-fc-preview-digest-report]",
    ) as HTMLElement;
    expect(reportRoot).not.toBeNull();
    expect(reportRoot.textContent).toMatch(/Palette/);
    expect(reportRoot.textContent).toMatch(/Typography/);
  });
});
