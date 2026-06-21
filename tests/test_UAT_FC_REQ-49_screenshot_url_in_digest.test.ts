import { describe, expect, it } from "vitest";
import {
  buildTranscriptionDigest,
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";

/**
 * REQ-49 AC4 — every TranscriptionDigest perPagePlan entry surfaces a
 * `screenshotUrl` derived from the page's desktop screenshotKey. The chat
 * AI uses this URL to load the screenshot into its vision context when
 * reasoning about the page; previously it had only the bare R2 key and had
 * to guess the `/assets/` routing. When no screenshot exists, screenshotUrl
 * is an empty string (parallel to screenshotKey).
 */
describe("UAT FC REQ-49: TranscriptionDigest perPagePlan carries screenshotUrl", () => {
  function makeDigest(
    url: string,
    desktopKey: string | undefined,
  ): ReferenceDigest {
    return {
      schemaVersion: SCHEMA_VERSION,
      sourceUrl: url,
      fetchedAt: "2026-06-21T00:00:00.000Z",
      fetchPath: "rendered",
      summary: "x",
      signals: {
        palette: {
          background: NOT_DETECTED,
          body: NOT_DETECTED,
          accent: NOT_DETECTED,
          cta: NOT_DETECTED,
          supporting: [],
        },
        typography: {
          body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
        layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
        imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: {
          headings: [{ level: 1, text: url }],
          navLinks: [],
          formFields: [],
          listGroupCount: 0,
          sectionCount: 0,
        },
        assetInventory: [],
      },
      commentary: { perSection: {}, whatsMissing: [] },
      screenshotKeys: desktopKey ? { desktop: desktopKey } : {},
    };
  }

  it("AC4: pages with a desktop screenshotKey expose screenshotUrl = '/assets/' + screenshotKey; pages without one expose '' for both fields", () => {
    const home = makeDigest("https://acme.test/", "references/sess/turn/desktop.png");
    const about = makeDigest("https://acme.test/about", undefined);
    const built = buildTranscriptionDigest({
      siteId: "acct",
      homeDigest: home,
      additionalPageDigests: [about],
      urlToR2Key: new Map(),
      mirrorSummary: { mirrored: 0, failed: 0, failures: [] },
      capturedAt: "2026-06-21T00:00:00.000Z",
    });

    expect(built.perPagePlan).toHaveLength(2);

    const homePlan = built.perPagePlan.find((p) => p.url === "https://acme.test/");
    const aboutPlan = built.perPagePlan.find((p) => p.url === "https://acme.test/about");
    expect(homePlan).toBeTruthy();
    expect(aboutPlan).toBeTruthy();

    expect(homePlan!.screenshotKey).toBe("references/sess/turn/desktop.png");
    expect(homePlan!.screenshotUrl).toBe("/assets/references/sess/turn/desktop.png");

    expect(aboutPlan!.screenshotKey).toBe("");
    expect(aboutPlan!.screenshotUrl).toBe("");
  });
});
