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
  SCHEMA_VERSION,
  renderDigestMarkdown,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

const sampleDigest = (): ReferenceDigest => ({
  schemaVersion: SCHEMA_VERSION,
  sourceUrl: "https://acme.test/",
  fetchedAt: "2026-06-18T00:00:00.000Z",
  fetchPath: "static",
  summary: "Bright landing page with a hero image and a contact form.",
  signals: {
    palette: {
      background: "#fff",
      body: "#222",
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
    imagery: { imgCount: 2, backgroundCount: 1, videoCount: 0, heroDetected: true },
    content: {
      headings: [{ level: 1, text: "Hello" }],
      navLinks: [],
      formFields: [],
      listGroupCount: 0,
      sectionCount: 2,
    },
    assetInventory: [
      {
        url: "https://acme.test/hero.jpg",
        kind: "img",
        classification: "hero",
        width: 1200,
        height: 600,
        references: 1,
      },
      {
        url: "https://acme.test/feature.png",
        kind: "img",
        classification: "unknown",
        width: 400,
        height: 400,
        references: 1,
      },
      {
        url: "https://acme.test/footer-bg.png",
        kind: "background",
        classification: "unknown",
        references: 1,
      },
    ],
  },
  commentary: { perSection: {}, whatsMissing: [] },
  screenshotKeys: {},
});

describe("UAT FC REQ-21: <DigestReport> renders from a structured tool_result (AC 9)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerDigestReport();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("AC9: dispatcher routes kind='reference_digest' to the digest report renderer; the card renders the markdown body and a structured asset inventory with per-kind counts — no re-fetching", () => {
    const digest = sampleDigest();
    const digestMarkdown = renderDigestMarkdown(digest);
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "analyze_page",
        args: { url: digest.sourceUrl },
        summary: `produced reference digest for ${digest.sourceUrl} (cache MISS)`,
        kind: "reference_digest",
        data: { kind: "reference_digest", digest, digestMarkdown, cache: "MISS" },
      },
    };

    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;

    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("info");
    const titleEl = node.querySelector("[data-fc-chat-card-title]")!;
    expect(titleEl.textContent).toContain(digest.sourceUrl);

    const reportRoot = node.querySelector(
      "[data-fc-digest-report]",
    ) as HTMLElement;
    expect(reportRoot).not.toBeNull();
    expect(reportRoot.getAttribute("data-fc-digest-source-url")).toBe(
      digest.sourceUrl,
    );
    expect(reportRoot.getAttribute("data-fc-digest-cache")).toBe("MISS");

    const counts = reportRoot.querySelector(
      "[data-fc-digest-counts]",
    ) as HTMLElement;
    expect(counts.getAttribute("data-fc-digest-count-img")).toBe("2");
    expect(counts.getAttribute("data-fc-digest-count-background")).toBe("1");
    expect(counts.getAttribute("data-fc-digest-count-video")).toBe("0");

    const imgThumbs = reportRoot.querySelectorAll(
      '[data-fc-digest-thumb-kind="img"]',
    );
    expect(imgThumbs.length).toBe(2);

    // Markdown body picks up palette swatches via the digest markdown
    expect(reportRoot.textContent).toContain("#2563eb");

    // Action buttons: "Convert this site" + "Discard"
    const convert = node.querySelector(
      '[data-fc-chat-card-action="Convert this site"]',
    );
    const discard = node.querySelector(
      '[data-fc-chat-card-action="Discard"]',
    );
    expect(convert).not.toBeNull();
    expect(discard).not.toBeNull();
  });

  it("clicking 'Convert this site' dispatches a fc:digest-convert-requested event carrying the digest", () => {
    const digest = sampleDigest();
    const digestMarkdown = renderDigestMarkdown(digest);
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "analyze_page",
        args: { url: digest.sourceUrl },
        summary: "ok",
        kind: "reference_digest",
        data: { kind: "reference_digest", digest, digestMarkdown },
      },
    };

    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    document.body.appendChild(node);

    let received: unknown = null;
    document.addEventListener("fc:digest-convert-requested", (e) => {
      received = (e as CustomEvent).detail;
    });
    const convert = node.querySelector(
      '[data-fc-chat-card-action="Convert this site"]',
    ) as HTMLButtonElement;
    convert.click();
    expect(received).toMatchObject({
      digest: { sourceUrl: digest.sourceUrl },
    });
  });
});
