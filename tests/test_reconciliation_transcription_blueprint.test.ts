import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  SCHEMA_VERSION,
  type ReferenceDigest,
} from "../packages/extractor/src/index.js";
import {
  buildTranscriptionDigest,
  deriveThemeTokens,
  type TranscriptionDigestMirrorSummary,
} from "../packages/extractor/src/transcribe.js";
import { defaultThemeTokens } from "../packages/framework/src/tokens/defaults.js";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";
import { AssetRef } from "@1stcontact/site-schema";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";

const HOWTO_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../docs/llm-context/reproducing-a-website.md",
);

// Story story-f45a5e61 — Reconstruction blueprint: deterministic transcription
// digest and read-back. These UATs prove the deterministic building blocks
// (theme-token derivation, per-page plan, asset inventory, module-type
// heuristic) and the read-back action against the existing implementation.

const EMPTY_MIRROR: TranscriptionDigestMirrorSummary = {
  mirrored: 0,
  failed: 0,
  failures: [],
};

const CAPTURED_AT = "2026-06-18T00:00:00.000Z";

/** Build a fully-typed, all-not-detected ReferenceDigest; override as needed. */
function refDigest(overrides: Partial<ReferenceDigest> = {}): ReferenceDigest {
  return {
    schemaVersion: SCHEMA_VERSION,
    sourceUrl: "https://acme.test/",
    fetchedAt: CAPTURED_AT,
    fetchPath: "static",
    summary: "test digest",
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
        headings: [],
        navLinks: [],
        formFields: [],
        listGroupCount: 0,
        sectionCount: 0,
      },
      assetInventory: [],
    },
    commentary: { perSection: {}, whatsMissing: [] },
    screenshotKeys: {},
    ...overrides,
  };
}

function buildBlueprint(
  homeDigest: ReferenceDigest,
  opts: {
    siteId?: string;
    additionalPageDigests?: ReadonlyArray<ReferenceDigest>;
    urlToR2Key?: ReadonlyMap<string, string>;
    mirrorSummary?: TranscriptionDigestMirrorSummary;
  } = {},
) {
  return buildTranscriptionDigest({
    siteId: opts.siteId ?? "site-1",
    homeDigest,
    additionalPageDigests: opts.additionalPageDigests ?? [],
    urlToR2Key: opts.urlToR2Key ?? new Map(),
    mirrorSummary: opts.mirrorSummary ?? EMPTY_MIRROR,
    capturedAt: CAPTURED_AT,
  });
}

// A 1x1 PNG — the harness asset stub serves these bytes for mirrored assets.
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
  0x02, 0x00, 0x01, 0xe5, 0x27, 0xde, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe("Story story-f45a5e61: transcription blueprint derivation + read-back", () => {
  // ── Theme tokens ────────────────────────────────────────────────────────

  it("test_UAT_AC635_theme_tokens_derived_from_source_palette_and_typography", () => {
    const digest = refDigest({
      signals: {
        ...refDigest().signals,
        palette: {
          background: "ABCDEF", // no leading # → normalised to #abcdef
          body: "#1A1A1A",
          accent: "#16A34A",
          cta: "#EF4444",
          supporting: [],
        },
        typography: {
          ...refDigest().signals.typography,
          primaryPair: { body: "Inter", heading: "Playfair Display" },
        },
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Acme Co" }],
        },
      },
    });

    const blueprint = buildBlueprint(digest);
    const tokens = blueprint.themeTokens;

    // Detected palette roles populate the matching slots, normalised.
    expect(tokens.palette.bg).toBe("#abcdef");
    expect(tokens.palette.text).toBe("#1a1a1a");
    expect(tokens.palette.accent).toBe("#16a34a");
    expect(tokens.palette.primary).toBe("#ef4444");
    // Detected font families populate typography families.
    expect(tokens.typography.family.body).toBe("Inter");
    expect(tokens.typography.family.heading).toBe("Playfair Display");
    // Slots the digest did not detect retain framework defaults.
    expect(tokens.palette.surface).toBe(defaultThemeTokens.palette.surface);
    expect(tokens.typography.scale).toEqual(defaultThemeTokens.typography.scale);

    // Deterministic: same digest always yields the same tokens.
    const again = buildBlueprint(digest);
    expect(again.themeTokens).toEqual(tokens);
  });

  it("test_UAT_AC636_undetected_palette_typography_fall_back_to_defaults", () => {
    const digest = refDigest({
      signals: {
        ...refDigest().signals,
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Untitled" }],
        },
      },
    });

    // Nothing detected → empty patch.
    const patch = deriveThemeTokens(digest);
    expect(patch.palette).toEqual({});
    expect(patch.typography.family).toEqual({});

    // The blueprint is still produced and its theme tokens equal the defaults.
    const blueprint = buildBlueprint(digest);
    expect(blueprint.perPagePlan).toHaveLength(1);
    expect(blueprint.themeTokens.palette).toEqual(defaultThemeTokens.palette);
    expect(blueprint.themeTokens.typography.family).toEqual(
      defaultThemeTokens.typography.family,
    );
  });

  // ── Per-page plan ───────────────────────────────────────────────────────

  it("test_UAT_AC637_single_page_plan_entry_shape_and_content", () => {
    const digest = refDigest({
      sourceUrl: "https://acme.test/",
      screenshotKeys: { desktop: "references/a/b/desktop.png" },
      signals: {
        ...refDigest().signals,
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Welcome to Acme" }],
          navLinks: [{ text: "Home", href: "https://acme.test/" }],
          formFields: [{ name: "email", kind: "email" }],
          sectionCount: 1,
        },
      },
    });

    const plan = buildBlueprint(digest).perPagePlan;
    expect(plan).toHaveLength(1);

    const entry = plan[0];
    expect(entry.url).toBe("https://acme.test/");
    expect(entry.slug).toBe("/");
    expect(typeof entry.title).toBe("string");
    expect(entry.title.length).toBeGreaterThan(0);
    expect(typeof entry.screenshotKey).toBe("string");
    expect(Array.isArray(entry.extractedContent)).toBe(true);
    expect(Array.isArray(entry.suggestedModuleTypes)).toBe(true);

    // Seeded heading / nav / form-field signals each surface as a content block.
    const kinds = entry.extractedContent.map((b) => b.kind);
    expect(kinds).toContain("heading");
    expect(kinds).toContain("nav-link");
    expect(kinds).toContain("form-field");
  });

  it("test_UAT_AC638_same_origin_cached_pages_distinct_slugs_cross_origin_excluded", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-ac638" });
    // Home links to two same-origin pages (both cached) and one cross-origin.
    await h.seedDigest("https://acme.test/", {
      signals: {
        ...refDigest().signals,
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Acme Co" }],
          navLinks: [
            { text: "Menu", href: "https://acme.test/menu" },
            { text: "Contact", href: "https://acme.test/contact" },
            { text: "External", href: "https://other.test/elsewhere" },
          ],
          sectionCount: 1,
        },
      },
    } as Partial<ReferenceDigest>);
    await h.seedDigest("https://acme.test/menu", {
      signals: {
        ...refDigest().signals,
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Menu" }],
        },
      },
    } as Partial<ReferenceDigest>);
    await h.seedDigest("https://acme.test/contact", {
      signals: {
        ...refDigest().signals,
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Contact" }],
        },
      },
    } as Partial<ReferenceDigest>);

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-ac638/transcription/digest.json",
    );
    expect(obj).not.toBeNull();
    const blueprint = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const plan = blueprint.perPagePlan as Array<Record<string, unknown>>;

    // Home + two discovered same-origin pages (unbounded — no hard cap).
    expect(plan.length).toBeGreaterThanOrEqual(3);
    const slugs = plan.map((p) => p.slug as string);
    expect(new Set(slugs).size).toBe(slugs.length); // all distinct
    expect(slugs).toContain("/");
    expect(slugs).toContain("/menu");
    expect(slugs).toContain("/contact");
    // Every entry shares the home origin; the cross-origin link is absent.
    expect(
      plan.every((p) => (p.url as string).startsWith("https://acme.test")),
    ).toBe(true);
  });

  // ── Module-type heuristic ───────────────────────────────────────────────

  it("test_UAT_AC639_suggested_module_types_deterministic_ordered_heuristic", () => {
    const digest = refDigest({
      signals: {
        ...refDigest().signals,
        imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: {
          ...refDigest().signals.content,
          headings: [
            { level: 1, text: "Acme" },
            { level: 2, text: "Our Services" },
          ],
          navLinks: [
            { text: "Home", href: "/" },
            { text: "Contact", href: "/contact" },
          ],
          formFields: [{ name: "email", kind: "email" }],
          listGroupCount: 1,
          sectionCount: 2,
        },
      },
    });

    const hints = buildBlueprint(digest).perPagePlan[0].suggestedModuleTypes;

    // Contact-form hint present (form fields detected); footer hint is last.
    expect(hints).toContain("contactForm");
    expect(hints[hints.length - 1]).toBe("footer");
    // Full ordered, deterministic heuristic.
    expect(hints).toEqual([
      "header",
      "hero",
      "text-block",
      "services-grid",
      "contactForm",
      "footer",
    ]);
    // Same input deterministically yields the same ordered list.
    expect(buildBlueprint(digest).perPagePlan[0].suggestedModuleTypes).toEqual(
      hints,
    );
  });

  // ── Asset inventory ─────────────────────────────────────────────────────

  it("test_UAT_AC640_asset_inventory_content_addressed_keys_deduped_across_pages", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-ac640" });
    const shared = "https://assets.test/shared.png";
    const logo = "https://assets.test/logo";
    h.setAssetResponses({
      [shared]: { status: 200, contentType: "image/png", body: pngBytes },
      [logo]: { status: 200, contentType: "image/jpeg", body: pngBytes },
    });
    // Home references `shared` + `logo`; child page also references `shared`.
    await h.seedDigest("https://acme.test/", {
      signals: {
        ...refDigest().signals,
        imagery: { imgCount: 2, backgroundCount: 1, videoCount: 0, heroDetected: true },
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Acme" }],
          navLinks: [{ text: "Page Two", href: "https://acme.test/page2" }],
          sectionCount: 1,
        },
        assetInventory: [
          { url: shared, kind: "img", classification: "hero", references: 1 },
          { url: logo, kind: "background", classification: "decorative", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);
    await h.seedDigest("https://acme.test/page2", {
      signals: {
        ...refDigest().signals,
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Page Two" }],
        },
        assetInventory: [
          { url: shared, kind: "img", classification: "hero", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-ac640/transcription/digest.json",
    );
    const blueprint = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const inv = blueprint.assetInventory as Array<Record<string, unknown>>;

    // shared.png referenced on two pages collapses to one inventory entry.
    expect(inv.filter((e) => e.sourceUrl === shared)).toHaveLength(1);
    expect(inv).toHaveLength(2);

    const keyPattern = /^sites\/acct-ac640\/imports\/[0-9a-f]+\.(png|jpg|jpeg|gif|webp|svg|avif|mp4|webm|mov)$/;
    for (const entry of inv) {
      expect(typeof entry.sourceUrl).toBe("string");
      expect(["img", "background", "video"]).toContain(entry.kind as string);
      expect(typeof entry.r2Key).toBe("string");
      expect((entry.r2Key as string).length).toBeGreaterThan(0);
      expect(entry.r2Key as string).toMatch(keyPattern);
    }
    // Extension reflects content type: png → .png, jpeg → .jpg.
    const sharedEntry = inv.find((e) => e.sourceUrl === shared)!;
    const logoEntry = inv.find((e) => e.sourceUrl === logo)!;
    expect(sharedEntry.r2Key as string).toMatch(/\.png$/);
    expect(logoEntry.r2Key as string).toMatch(/\.jpg$/);
  });

  it("test_UAT_AC641_unmirrored_assets_excluded_recorded_in_mirror_summary", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-ac641" });
    const good = "https://assets.test/good.png";
    const bad = "https://assets.test/bad.png";
    h.setAssetResponses({
      [good]: { status: 200, contentType: "image/png", body: pngBytes },
    });
    h.setAssetFailures({ [bad]: { reason: "fetch_failed" } });
    await h.seedDigest("https://acme.test/", {
      signals: {
        ...refDigest().signals,
        imagery: { imgCount: 2, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Acme" }],
          sectionCount: 1,
        },
        assetInventory: [
          { url: good, kind: "img", classification: "decorative", references: 1 },
          { url: bad, kind: "img", classification: "decorative", references: 1 },
        ],
      },
    } as Partial<ReferenceDigest>);

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-ac641/transcription/digest.json",
    );
    const blueprint = JSON.parse(await obj!.text()) as Record<string, unknown>;

    // Inventory lists only the successfully hosted asset.
    const inv = blueprint.assetInventory as Array<Record<string, unknown>>;
    expect(inv).toHaveLength(1);
    expect(inv[0].sourceUrl).toBe(good);

    // Mirror summary records mirrored=1 / failed=1 and one failure record.
    const mirror = blueprint.mirrorSummary as Record<string, unknown>;
    expect(mirror.mirrored).toBe(1);
    expect(mirror.failed).toBe(1);
    const failures = mirror.failures as Array<Record<string, unknown>>;
    expect(failures).toHaveLength(1);
    expect(failures[0].url).toBe(bad);
    expect(typeof failures[0].reason).toBe("string");
    expect((failures[0].reason as string).length).toBeGreaterThan(0);
  });

  it("test_UAT_AC703_asset_inventory_entries_carry_precomputed_image_assetref", () => {
    const digest = refDigest({
      signals: {
        ...refDigest().signals,
        imagery: { imgCount: 2, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: {
          ...refDigest().signals.content,
          headings: [{ level: 1, text: "Acme" }],
        },
        assetInventory: [
          // One with alt text, one without.
          { url: "https://assets.test/hero.png", kind: "img", classification: "hero", references: 1, alt: "Hero shot" },
          { url: "https://assets.test/decor.png", kind: "img", classification: "decorative", references: 1 },
        ],
      },
    });
    const urlToR2Key = new Map<string, string>([
      ["https://assets.test/hero.png", "sites/site-1/imports/aaaaaaaaaaaaaaaa.png"],
      ["https://assets.test/decor.png", "sites/site-1/imports/bbbbbbbbbbbbbbbb.png"],
    ]);

    const blueprint = buildBlueprint(digest, {
      urlToR2Key,
      mirrorSummary: { mirrored: 2, failed: 0, failures: [] },
    });

    expect(blueprint.assetInventory).toHaveLength(2);
    for (const entry of blueprint.assetInventory) {
      // assetRef present alongside source URL, kind, and hosted key.
      expect(entry.assetRef).toBeDefined();
      // id === hosted key; src === /assets/<hosted-key>.
      expect(entry.assetRef.id).toBe(entry.r2Key);
      expect(entry.assetRef.src).toBe(`/assets/${entry.r2Key}`);
      // id and src non-empty.
      expect(entry.assetRef.id.length).toBeGreaterThan(0);
      expect(entry.assetRef.src.length).toBeGreaterThan(0);
      // Validates against the framework's image AssetRef contract (id/src/alt).
      const parsed = AssetRef.safeParse(entry.assetRef);
      expect(parsed.success).toBe(true);
    }

    // alt is the captured alt text, or "" when none was captured.
    const hero = blueprint.assetInventory.find((e) => e.sourceUrl.endsWith("hero.png"))!;
    const decor = blueprint.assetInventory.find((e) => e.sourceUrl.endsWith("decor.png"))!;
    expect(hero.assetRef.alt).toBe("Hero shot");
    expect(decor.assetRef.alt).toBe("");
  });

  // ── Read-back ───────────────────────────────────────────────────────────

  it("test_UAT_AC642_read_back_returns_digest_for_existing_site", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-ac642" });
    await h.seedDigest("https://acme.test/");
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    // Registered as a system action the operator AI can invoke.
    const action = findAction("read_transcription_digest");
    expect(action).toBeDefined();
    expect(action!.category).toBe("system_action");
    expect(typeof action!.handler).toBe("function");

    const result = await action!.handler!({ siteId: "acct-ac642" }, h.ctx);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcription_digest");
    const digest = payload.digest as Record<string, unknown>;
    expect(digest.siteId).toBe("acct-ac642");
    expect(digest.sourceUrl).toBe("https://acme.test/");
  });

  it("test_UAT_AC643_read_back_reports_not_found_when_no_digest_exists", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-ac643" });
    const action = findAction("read_transcription_digest")!;

    const result = await action.handler!({ siteId: "acct-ac643" }, h.ctx);
    expect(result.status).toBe("failed");
    if (result.status !== "failed") return;
    expect(result.error).toMatch(/digest_not_found/);
    expect("payload" in result).toBe(false);
  });

  it("test_UAT_AC644_read_back_rejects_request_lacking_site_identifier", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-ac644" });
    const action = findAction("read_transcription_digest")!;

    const result = await action.handler!({}, h.ctx);
    expect(result.status).toBe("failed");
    // No blueprint contents are returned on a rejected request.
    expect("payload" in result).toBe(false);
  });

  // ── Reproduction how-to consumption contract (BUG-5) ─────────────────────

  it("test_UAT_AC704_reproduction_howto_instructs_precomputed_assetref_object", () => {
    const fromDisk = readFileSync(HOWTO_PATH, "utf-8");
    // Both guidance artifacts: the on-disk how-to and its inlined mirror.
    const artifacts: ReadonlyArray<readonly [string, string]> = [
      ["docs/llm-context/reproducing-a-website.md", fromDisk],
      [
        "apps/control-app/src/llm-context.ts (REPRODUCING_A_WEBSITE_DOC)",
        REPRODUCING_A_WEBSITE_DOC,
      ],
    ];

    for (const [name, src] of artifacts) {
      // Instructs the precomputed `assetRef` object for image fields.
      expect(src, name).toMatch(/assetRef/);
      expect(src, name).toMatch(/objects[, ]*not strings/i);
      // Worked example matching the { id, src, alt } AssetRef shape.
      expect(src, name).toContain("id:");
      expect(src, name).toContain("src:");
      expect(src, name).toContain("alt:");
      expect(src, name).toMatch(/\/assets\/<r2Key>/);
      // Explicitly warns that a bare path string is rejected by the validator.
      expect(src, name).toMatch(/bare string/i);
      expect(src, name).toMatch(/rejected/i);
      // Never instructs setting an image field to a bare /assets path string.
      expect(src, name).not.toMatch(/value:\s*["'`]?\/assets\//);
    }
  });
});
