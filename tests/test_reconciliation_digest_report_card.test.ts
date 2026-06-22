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
  renderDigestMarkdown,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

const SOURCE_URL = "https://acme.test/";

function sampleDigest(): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: SOURCE_URL,
    fetchedAt: "2026-06-18T00:00:00.000Z",
    fetchPath: "static",
    summary: "Bright landing page with a hero image, a video, and a contact form.",
    signals: {
      palette: {
        background: "#ffffff",
        body: "#222222",
        accent: "#16a34a",
        cta: "#2563eb",
        supporting: [],
      },
      typography: {
        body: { family: "Inter", size: "16px", weight: "400" },
        h1: { family: "Inter", size: "48px", weight: "700" },
        h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
        h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
        primaryPair: { heading: "Inter", body: "Inter" },
      },
      layout: { maxContentWidth: 1100, bias: "centered", density: "balanced" },
      imagery: { imgCount: 2, backgroundCount: 1, videoCount: 1, heroDetected: true },
      content: {
        headings: [{ level: 1, text: "Hello" }],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 2,
      },
      assetInventory: [
        { url: "https://acme.test/hero.jpg", kind: "img", classification: "hero", width: 1200, height: 600, references: 1 },
        { url: "https://acme.test/feature.png", kind: "img", classification: "unknown", width: 400, height: 400, references: 1 },
        { url: "https://acme.test/footer-bg.png", kind: "background", classification: "unknown", references: 1 },
        { url: "https://acme.test/promo.mp4", kind: "video", classification: "unknown", references: 1 },
      ],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
  };
}

function successResult(): ChatToolResultRecord {
  const digest = sampleDigest();
  const digestMarkdown = renderDigestMarkdown(digest);
  return {
    ok: true,
    applied: {
      tool: "analyze_page",
      args: { url: digest.sourceUrl },
      summary: `produced reference digest for ${digest.sourceUrl} (cache MISS)`,
      kind: "reference_digest",
      data: { kind: "reference_digest", digest, digestMarkdown, cache: "MISS" },
    },
  };
}

function dispatch(result: ChatToolResultRecord): HTMLElement {
  return renderToolResult({
    doc: document,
    result,
    renderMarkdown: (md) => renderMarkdownToDom(document, md),
  }) as HTMLElement;
}

describe("UAT AC-607 / AC-608 / AC-609: Digest Report card rendering", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  // --- AC-607 ---------------------------------------------------------------

  it("test_UAT_AC607_renders_source_url_markdown_and_per_kind_asset_inventory", () => {
    const node = dispatch(successResult());

    // Info-toned card headed by the source URL.
    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("info");
    const title = node.querySelector("[data-fc-chat-card-title]")!;
    expect(title.textContent).toContain(SOURCE_URL);

    const report = node.querySelector("[data-fc-digest-report]") as HTMLElement;
    expect(report).not.toBeNull();
    expect(report.getAttribute("data-fc-digest-source-url")).toBe(SOURCE_URL);

    // Body contains the rendered digest markdown (a palette hex from the body).
    expect(report.textContent).toContain("#2563eb");

    // Per-kind counts reflect the inventory (2 images / 1 background / 1 video).
    const counts = report.querySelector("[data-fc-digest-counts]") as HTMLElement;
    expect(counts.getAttribute("data-fc-digest-count-img")).toBe("2");
    expect(counts.getAttribute("data-fc-digest-count-background")).toBe("1");
    expect(counts.getAttribute("data-fc-digest-count-video")).toBe("1");

    // A thumbnail exists for each inventoried asset under its kind group.
    expect(report.querySelectorAll('[data-fc-digest-thumb-kind="img"]')).toHaveLength(2);
    expect(report.querySelectorAll('[data-fc-digest-thumb-kind="background"]')).toHaveLength(1);
    const videoThumbs = report.querySelectorAll('[data-fc-digest-thumb-kind="video"]');
    expect(videoThumbs).toHaveLength(1);
    // image/background render as <img>; video renders as a labelled entry.
    expect(report.querySelectorAll('[data-fc-digest-thumb-kind="img"] img')).toHaveLength(2);
    expect(videoThumbs[0]!.textContent).toContain("acme.test/promo.mp4");
  });

  // --- AC-608 ---------------------------------------------------------------

  it("test_UAT_AC608_convert_emits_event_discard_collapses_card", () => {
    // Convert this site → emits fc:digest-convert-requested carrying the digest.
    const convertNode = dispatch(successResult());
    document.body.appendChild(convertNode);
    let detail: { digest?: { sourceUrl?: string } } | null = null;
    document.addEventListener("fc:digest-convert-requested", (e) => {
      detail = (e as CustomEvent).detail;
    });
    const convertBtn = convertNode.querySelector(
      '[data-fc-chat-card-action="Convert this site"]',
    ) as HTMLButtonElement;
    convertBtn.click();
    expect(detail).not.toBeNull();
    expect(detail!.digest!.sourceUrl).toBe(SOURCE_URL);

    // Discard → collapses the card body, emits no convert event.
    const discardNode = dispatch(successResult());
    document.body.appendChild(discardNode);
    let convertFired = false;
    document.addEventListener("fc:digest-convert-requested", () => {
      convertFired = true;
    });
    expect(discardNode.getAttribute("data-fc-chat-card-collapsed")).toBe("false");
    const discardBtn = discardNode.querySelector(
      '[data-fc-chat-card-action="Discard"]',
    ) as HTMLButtonElement;
    convertFired = false;
    discardBtn.click();
    expect(discardNode.getAttribute("data-fc-chat-card-collapsed")).toBe("true");
    expect(convertFired).toBe(false);
  });

  // --- AC-609 ---------------------------------------------------------------

  it("test_UAT_AC609_failed_or_malformed_payload_renders_non_info_card", () => {
    // (1) Failed tool_result → danger-toned card, failure message, no digest body.
    const failed: ChatToolResultRecord = {
      ok: false,
      error: {
        tool: "analyze_page",
        validation: { message: "analyze_page returned an error" },
      },
    };
    const failNode = dispatch(failed);
    expect(failNode.getAttribute("data-fc-chat-card-tone")).toBe("danger");
    expect(failNode.textContent).toContain("analyze_page returned an error");
    expect(failNode.querySelector("[data-fc-digest-report]")).toBeNull();

    // (2) Successful result missing digest/digestMarkdown → warning-toned card,
    // no digest body.
    const malformed: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "analyze_page",
        args: { url: SOURCE_URL },
        summary: "produced reference digest",
        kind: "reference_digest",
        data: { kind: "reference_digest" }, // no digest / digestMarkdown
      },
    };
    const warnNode = dispatch(malformed);
    expect(warnNode.getAttribute("data-fc-chat-card-tone")).toBe("warning");
    expect(warnNode.querySelector("[data-fc-digest-report]")).toBeNull();
  });
});
