import { describe, expect, it } from "vitest";
import { applyToolCall, type ToolName } from "@gendev/builder-ui/tools";
import { buildFrameworkCatalog } from "@gendev/builder-ui";
import { renderSiteToHtml } from "@gendev/framework/render";
import {
  buildTranscriptionDigest,
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import type { Site } from "@gendev/site-schema";

const catalog = buildFrameworkCatalog();

function call(site: Site, name: string, input: Record<string, unknown>): ReturnType<typeof applyToolCall> {
  return applyToolCall(site, catalog, { name: name as ToolName, input });
}

function heroFixtureDigest(url: string): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: url,
    fetchedAt: "2026-06-19T00:00:00.000Z",
    fetchPath: "rendered",
    summary: "fixture",
    signals: {
      palette: {
        background: "#ffffff",
        body: "#111111",
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
      imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
      content: {
        headings: [{ level: 1, text: "Acme" }],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 1,
      },
      assetInventory: [
        {
          url: "https://acme.test/hero.png",
          kind: "img",
          classification: "hero",
          references: 1,
          alt: "Acme hero",
        },
      ],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
  };
}

/**
 * BUG-5 end-to-end: the AI picks the precomputed `assetRef` straight out of
 * the digest, hands it to `set_module_content`, and the renderer emits a real
 * <img src="/assets/sites/.../...png"> tag.
 *
 * Before the fix the AI was instructed to pass `/assets/<r2Key>` as a string;
 * the renderer reads `.src` off the value, got `undefined` for a string, and
 * either omitted the tag or emitted `<img src="">`. This test fails on the
 * pre-fix state by either having no `<img>` for the hero's bg-image variant
 * or by having an empty `src` attribute.
 */
describe("UAT FC BUG-5: end-to-end — hero image renders with /assets/ src after applying assetRef", () => {
  it("set_module_content with digest.assetInventory[i].assetRef yields a hero <img> whose src points at /assets/<r2Key>", () => {
    // Step 1: build a transcription digest that mirrors a single hero image.
    const r2Key = "sites/acct-bug5/imports/deadbeefdeadbeef.png";
    const digest = buildTranscriptionDigest({
      siteId: "acct-bug5",
      homeDigest: heroFixtureDigest("https://acme.test/"),
      additionalPageDigests: [],
      urlToR2Key: new Map([["https://acme.test/hero.png", r2Key]]),
      mirrorSummary: { mirrored: 1, failed: 0, failures: [] },
      capturedAt: "2026-06-19T00:00:00.000Z",
    });
    expect(digest.assetInventory).toHaveLength(1);
    const inv = digest.assetInventory[0]!;
    expect(inv.assetRef).toBeDefined();

    // Step 2: drive the tool layer the same way the chat loop does.
    let site = load1stContactSite();
    const heroId = site.pages[0].modules.find((m) => m.type === "hero")?.id;
    expect(heroId, "1stcontact starter site must include a hero module").toBeDefined();

    // The hero only renders an <img> when its variant is bg-image.
    const variantResult = call(site, "set_module_variant", {
      instance_id: heroId!,
      variant: "bg-image",
    });
    expect(variantResult.ok, JSON.stringify(variantResult)).toBe(true);
    if (!variantResult.ok) return;
    site = variantResult.next;

    // This is the call the AI's how-to doc now describes: pass the assetRef object.
    const imgResult = call(site, "set_module_content", {
      instance_id: heroId!,
      field: "image",
      value: inv.assetRef,
    });
    expect(imgResult.ok, JSON.stringify(imgResult)).toBe(true);
    if (!imgResult.ok) return;
    site = imgResult.next;

    // Step 3: render and assert the <img> shows up with the right src.
    const html = renderSiteToHtml(site);
    const heroBlock = extractHero(html);
    expect(heroBlock, "renderer must emit a hero <section>").not.toBeNull();
    expect(heroBlock!).toMatch(/<img[^>]*class="fc-hero__bg-image"/);
    expect(heroBlock!).toContain(`src="/assets/${r2Key}"`);
    expect(heroBlock!).toContain('alt="Acme hero"');
    // Sanity: src is non-empty (catches the bare-string regression where src=""
    // would render even though it points nowhere).
    expect(heroBlock!).not.toMatch(/<img[^>]*src=""/);
  });

  it("regression guard: passing a bare string (the pre-fix shape) does NOT render an <img> with a usable src", () => {
    // Document the failure mode. Validation may or may not reject — the key
    // observable is that the renderer cannot extract `.src` off a string and
    // either omits the tag or emits src="" / src="undefined".
    let site = load1stContactSite();
    const heroId = site.pages[0].modules.find((m) => m.type === "hero")!.id;

    const variantResult = call(site, "set_module_variant", {
      instance_id: heroId,
      variant: "bg-image",
    });
    if (!variantResult.ok) throw new Error("variant change failed");
    site = variantResult.next;

    const stringResult = call(site, "set_module_content", {
      instance_id: heroId,
      field: "image",
      // Pre-fix: how-to doc told the AI to pass this string.
      value: "/assets/sites/acct-bug5/imports/deadbeef.png",
    });

    // Two outcomes are acceptable here — both prove the bare-string path is bad:
    //   1. The tool rejects the call (good — validator caught it).
    //   2. The tool accepts it, but the renderer fails to produce a usable <img>.
    if (!stringResult.ok) {
      // Validator caught it — the bare string never lands. That's a valid
      // protection; we're done.
      return;
    }
    const html = renderSiteToHtml(stringResult.next);
    const heroBlock = extractHero(html);
    if (!heroBlock) return; // no hero output at all — that's "no image rendered" too.
    // Must NOT contain a working src attribute pointing at the string we passed.
    expect(heroBlock).not.toContain('src="/assets/sites/acct-bug5/imports/deadbeef.png"');
  });
});

function extractHero(html: string): string | null {
  const m = /<section[^>]*class="fc-hero[^"]*"[\s\S]*?<\/section>/.exec(html);
  return m ? m[0] : null;
}
