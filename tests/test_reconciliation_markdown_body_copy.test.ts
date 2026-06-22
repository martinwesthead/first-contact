import { describe, expect, it, vi } from "vitest";
import { AssetRef } from "@gendev/site-schema";
import type { ModuleInstance, Site } from "@gendev/site-schema";
import {
  textBlockMeta,
  validateModuleContent,
} from "@gendev/framework";
import {
  renderModuleInstance,
  type ResolveAsset,
} from "@gendev/framework/render";
import { htmlToMarkdown } from "../packages/extractor/src/index.js";
import { renderSite } from "@gendev/generate";
import { REPRODUCING_A_WEBSITE_DOC } from "../apps/control-app/src/llm-context.js";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import type { ActionContext } from "../apps/control-app/src/operator/registry.js";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";

/**
 * Reconciliation UATs for story-ddc928fd —
 * "Markdown body copy: inline-or-file content with verbatim convert capture".
 *
 * Each test verifies one acceptance criterion (AC-684 … AC-697) against the
 * existing REQ-33 implementation. Tests document current behaviour and must
 * pass — no runtime code is modified here.
 */

function textBlock(body: unknown): ModuleInstance {
  return {
    id: "text-1",
    type: "text-block",
    version: 1,
    variant: "prose",
    content: { body },
  };
}

function makeOperatorCtx(env: { ASSETS_BUCKET?: R2Bucket }): {
  ctx: ActionContext;
  events: Array<{ event: string; data: Record<string, unknown> }>;
} {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  const ctx: ActionContext = {
    session: { session_id: "s1", account_id: "acct-rec", plan_tier: "trial" },
    env: env as unknown as ActionContext["env"],
    emit: vi.fn((e: { event: string; data: Record<string, unknown> }) => {
      events.push(e);
    }),
    siteDefinition: null,
    operatorLastMessage: null,
  };
  return { ctx, events };
}

describe("Story story-ddc928fd: markdown body copy (reconciliation)", () => {
  // ── AC-684 — Asset reference carries an image/text kind, defaulting to image ─
  it("test_UAT_AC684_asset_ref_kind_image_text_default_image", () => {
    // (a) no kind + image source → validates as an image reference (kind absent).
    const imageRef = AssetRef.safeParse({
      id: "img-1",
      src: "/assets/hero.png",
      alt: "Hero",
    });
    expect(imageRef.success).toBe(true);
    if (imageRef.success) {
      // "Treated as image": no text discriminator present on the parsed value.
      expect((imageRef.data as { kind?: string }).kind).toBeUndefined();
    }

    // (b) explicit text kind with a non-empty source → validates. Image-specific
    // positioning (focalPoint) is not required on a text reference.
    const textRef = AssetRef.safeParse({
      kind: "text",
      id: "sites/x/copy/about.md",
      src: "sites/x/copy/about.md",
    });
    expect(textRef.success).toBe(true);

    // (c) the discriminator rejects an unknown kind value.
    const unknownKind = AssetRef.safeParse({
      id: "a-1",
      src: "/assets/clip.mp4",
      alt: "clip",
      kind: "video",
    });
    expect(unknownKind.success).toBe(false);
  });

  // ── AC-685 — markdown field accepts an inline string OR a text asset ref ────
  it("test_UAT_AC685_markdown_field_accepts_string_or_text_assetref", () => {
    // The markdown-aware content validator (validator of record for module
    // content) accepts both forms for the same `body` markdown field.
    const inline = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: "# About\n\nWe build websites.",
    });
    expect(inline.ok).toBe(true);
    expect(inline.issues).toEqual([]);

    const ref = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: {
        kind: "text",
        id: "sites/acct-1/copy/about.md",
        src: "sites/acct-1/copy/about.md",
        alt: "first line fallback",
      },
    });
    expect(ref.ok).toBe(true);
    expect(ref.issues).toEqual([]);
  });

  // ── AC-686 — a text asset reference with an empty source is rejected ────────
  it("test_UAT_AC686_text_assetref_empty_source_rejected", () => {
    const result = validateModuleContent(textBlockMeta, {
      heading: "About",
      body: { kind: "text", id: "sites/x/copy/about.md", src: "" },
    });
    expect(result.ok).toBe(false);
    // The failure identifies the offending field.
    expect(result.issues.some((i) => i.path.join("/") === "body")).toBe(true);
  });

  // ── AC-687 — inline content beginning with `<` renders as trusted HTML ──────
  it("test_UAT_AC687_inline_angle_bracket_html_passthrough", () => {
    const html = renderModuleInstance(
      textBlock("<p>Hello <strong>world</strong></p>"),
    );
    // Byte-for-byte passthrough: not escaped, not re-wrapped.
    expect(html).toContain("<p>Hello <strong>world</strong></p>");
    expect(html).not.toContain("&lt;p&gt;");
    expect(html.match(/<p>/g)?.length).toBe(1);
  });

  // ── AC-688 — inline markdown is converted to HTML before emission ──────────
  it("test_UAT_AC688_inline_markdown_converted_to_html", () => {
    const html = renderModuleInstance(textBlock("# Heading\n\nA paragraph."));
    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<p>A paragraph.</p>");
    // The literal markdown source must NOT survive into the output.
    expect(html).not.toContain("# Heading");
  });

  // ── AC-689 — a text-asset-ref markdown field is resolved and converted ──────
  it("test_UAT_AC689_text_assetref_resolved_and_converted", () => {
    const resolveAsset: ResolveAsset = (ref) =>
      (ref as { kind?: string }).kind === "text"
        ? "## Resolved heading\n\nFrom storage."
        : undefined;
    const html = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
        alt: "About — fallback",
      }),
      { target: "production", resolveAsset },
    );
    expect(html).toContain("<h2>Resolved heading</h2>");
    expect(html).toContain("<p>From storage.</p>");
    // Fallback alt text must NOT appear when the resolver returns content.
    expect(html).not.toContain("About — fallback");
  });

  // ── AC-690 — no/failed resolution falls back to alt text (no throw) ─────────
  it("test_UAT_AC690_text_assetref_unresolved_falls_back_to_alt", () => {
    // (a) no resolver + known alt → alt text emitted.
    const withAlt = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
        alt: "About — fallback text",
      }),
    );
    expect(withAlt).toContain("About — fallback text");

    // (b) no resolver + no alt → empty body, render completes without error.
    const noAlt = renderModuleInstance(
      textBlock({
        kind: "text",
        id: "sites/x/copy/about.md",
        src: "sites/x/copy/about.md",
      }),
    );
    expect(noAlt).toContain('<div class="fc-text-block__body"></div>');
  });

  // ── AC-691 — source HTML mechanically converted to verbatim markdown ───────
  it("test_UAT_AC691_html_mechanically_converted_to_markdown_subset", () => {
    // The representative fragment from the AC.
    const simple = htmlToMarkdown(
      "<h1>Hi</h1><p>Body <strong>bold</strong></p>",
    );
    expect(simple).toContain("# Hi");
    expect(simple).toContain("Body **bold**");

    // The standard content subset survives conversion.
    const subset = htmlToMarkdown(
      '<h2>Menu</h2><ul><li>Soup</li><li>Bread</li></ul>' +
        "<blockquote>Fresh daily</blockquote>" +
        '<p>See <a href="/menu">menu</a>, <code>code</code>, <em>em</em>.</p>' +
        '<p><img src="/logo.png" alt="Logo" /></p>',
    );
    expect(subset).toContain("## Menu");
    expect(subset).toContain("- Soup");
    expect(subset).toContain("- Bread");
    expect(subset).toContain("> Fresh daily");
    expect(subset).toContain("[menu](/menu)");
    expect(subset).toContain("`code`");
    expect(subset).toContain("*em*");
    expect(subset).toContain("![Logo](/logo.png)");

    // Scripts, styles, custom classes, and inline style attributes are dropped
    // silently while the content subset survives.
    const noisy = htmlToMarkdown(
      '<style>.x{color:red}</style>' +
        '<p class="lead" style="color:red">Keep ' +
        "<script>alert('x')</script><strong>this</strong></p>",
    );
    expect(noisy).toContain("Keep");
    expect(noisy).toContain("**this**");
    expect(noisy).not.toContain("class");
    expect(noisy).not.toContain("style");
    expect(noisy).not.toContain("color:red");
    expect(noisy).not.toContain("alert");
  });

  // ── AC-692 — convert capture writes per-section markdown + digest copy ref ──
  it("test_UAT_AC692_convert_capture_writes_copy_file_and_digest_ref", async () => {
    const sourceHtml = [
      "<!doctype html><html><head><title>Acme</title></head><body><main>",
      "<h1>Acme Catering</h1>",
      "<p>We bring the feast to you — bespoke menus, white-glove service, no hassle.</p>",
      "<h2>Services</h2>",
      "<ul><li>Weddings — bespoke tasting menus.</li><li>Corporate — event catering.</li></ul>",
      "<p>Get in touch for a quote.</p>",
      "</main></body></html>",
    ].join("");

    const h = makeTranscribeHarness({ accountId: "acct-cap" });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(sourceHtml),
      },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    // A per-section `.md` body-copy file exists under the site's copy/ prefix.
    const copyObj = await h.env.ASSETS_BUCKET.get("sites/acct-cap/copy/home.md");
    expect(copyObj).not.toBeNull();
    expect(copyObj!.httpMetadata!.contentType).toBe("text/markdown");
    const md = await copyObj!.text();
    expect(md).toContain("# Acme Catering");
    expect(md).toContain("- Weddings");

    // The matching digest content entry carries a populated, schema-valid text
    // asset reference for it.
    const digestObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-cap/transcription/digest.json",
    );
    const digest = JSON.parse(await digestObj!.text()) as {
      perPagePlan: Array<Record<string, unknown>>;
    };
    const copy = digest.perPagePlan[0].copy as Record<string, unknown>;
    expect(copy).toBeDefined();
    expect(copy.kind).toBe("text");
    expect(copy.id).toBe("sites/acct-cap/copy/home.md");
    expect(copy.src).toBe("/assets/sites/acct-cap/copy/home.md");
    // Validates against the framework asset-reference schema.
    expect(AssetRef.safeParse(copy).success).toBe(true);
  });

  // ── AC-693 — short single-paragraph captures are inlined, not written ───────
  it("test_UAT_AC693_short_single_paragraph_inlined", async () => {
    const shortHtml =
      "<!doctype html><html><body><main><p>Tiny page.</p></main></body></html>";

    const h = makeTranscribeHarness({ accountId: "acct-inline" });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(shortHtml),
      },
    });

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    // No separate body-copy file was written for the short single paragraph.
    const copyObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-inline/copy/home.md",
    );
    expect(copyObj).toBeNull();

    // The digest entry carries an inline markdown value instead.
    const digestObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-inline/transcription/digest.json",
    );
    const digest = JSON.parse(await digestObj!.text()) as {
      perPagePlan: Array<Record<string, unknown>>;
    };
    expect(digest.perPagePlan[0].inlineMarkdown).toBe("Tiny page.");
    expect(digest.perPagePlan[0].copy).toBeUndefined();
  });

  // ── AC-694 — guarded body-copy write reports success / rejects bad keys ─────
  it("test_UAT_AC694_guarded_body_copy_write_accepts_and_rejects", async () => {
    const action = findAction("write_text_asset");
    expect(action?.handler).toBeDefined();

    // Valid key → persists as text/markdown, returns success with key + bytes.
    const goodBucket = makeMemR2();
    const { ctx: goodCtx } = makeOperatorCtx({ ASSETS_BUCKET: goodBucket });
    const content = "# Updated heading\n\nFresh body copy.";
    const ok = await action!.handler!(
      { key: "sites/acct-rec/copy/about.md", content },
      goodCtx,
    );
    expect(ok.status).toBe("ok");
    if (ok.status === "ok") {
      expect(ok.payload?.ok).toBe(true);
      expect(ok.payload?.key).toBe("sites/acct-rec/copy/about.md");
      expect(typeof ok.payload?.bytes).toBe("number");
      expect(ok.payload?.bytes as number).toBeGreaterThan(0);
    }
    const stored = await goodBucket.get("sites/acct-rec/copy/about.md");
    expect(stored).not.toBeNull();
    expect(await stored!.text()).toBe(content);
    expect(stored!.httpMetadata!.contentType).toBe("text/markdown");

    // Out-of-pattern key → failure, and nothing is written.
    const badBucket = makeMemR2();
    const { ctx: badCtx } = makeOperatorCtx({ ASSETS_BUCKET: badBucket });
    const rejected = await action!.handler!(
      { key: "uploads/abc/cat.png", content: "anything" },
      badCtx,
    );
    expect(rejected.status).toBe("failed");
    expect(await badBucket.get("uploads/abc/cat.png")).toBeNull();
  });

  // ── AC-695 — the reproduce-a-website how-to instructs setting pre-built copy ─
  it("test_UAT_AC695_howto_instructs_prebuilt_copy_not_authoring", () => {
    const doc = REPRODUCING_A_WEBSITE_DOC;

    // References the digest's pre-built copy reference and inline-markdown values
    // for body fields.
    expect(doc).toContain("inlineMarkdown");
    expect(doc).toMatch(/digest\.perPagePlan/);
    expect(doc).toContain("copy AssetRefs and inlineMarkdown");

    // Worked example for the inline-markdown form (a set_module_content call
    // passing the captured string directly).
    expect(doc).toContain('value: "Family run since 1972."');
    // Worked example for the copy AssetRef form (a set_module_content call
    // passing the precomputed text-kind reference object).
    expect(doc).toMatch(/value:\s*\{\s*[\s\S]*kind:\s*["']text["']/);
    expect(doc).toContain("/assets/sites/acct-123/copy/home.md");

    // Instructs passing the pre-built copy verbatim and NOT authoring it.
    expect(doc).toMatch(/verbatim/i);
    expect(doc).toMatch(/do not author or paraphrase body copy/i);
    expect(doc).toMatch(/do not rewrite, paraphrase, or .?improve.? the source copy/i);

    // Must NOT instruct the model to write / compose body copy.
    expect(doc).not.toMatch(/write the body copy/i);
    expect(doc).not.toMatch(/compose (the )?body (copy|text)/i);
  });

  // ── AC-696 — end-to-end convert reproduces source body text verbatim ───────
  it("test_UAT_AC696_end_to_end_convert_reproduces_body_verbatim", async () => {
    const sourceParagraph =
      "Most small businesses don't need an agency. They need a website that " +
      "quietly does its job — looks right, answers questions, captures leads, " +
      "never breaks.";
    const sourceHtml = [
      "<!doctype html><html><head><title>Acme</title></head><body><main>",
      "<h1>Acme Co</h1>",
      `<p>${sourceParagraph}</p>`,
      "<h2>Services</h2>",
      "<ul><li>Building.</li><li>Caretaking.</li></ul>",
      "<p>Tell us about your business.</p>",
      "</main></body></html>",
    ].join("");

    const accountId = "acct-e2e-rec";
    const h = makeTranscribeHarness({ accountId });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(sourceHtml),
      },
    });
    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    const copyKey = `sites/${accountId}/copy/home.md`;
    const copyObj = await h.env.ASSETS_BUCKET.get(copyKey);
    expect(copyObj).not.toBeNull();
    // Captured markdown holds the source paragraph verbatim (no paraphrase).
    expect(await copyObj!.text()).toContain(sourceParagraph);

    // A full reconstruction references the captured copy and bakes it to HTML.
    const draft: Site = {
      config: { businessName: "Acme" },
      theme: makeThemeTokens(),
      nav: { pattern: "footer-only", entries: [] },
      pages: [
        {
          id: "home",
          slug: "/",
          title: "Home",
          modules: [
            {
              id: "body-1",
              type: "text-block",
              version: 1,
              variant: "prose",
              content: { body: { kind: "text", id: copyKey, src: copyKey } },
            },
          ],
        },
      ],
    };
    const rendered = await renderSite(
      { site: draft },
      {
        resolveAsset: async (ref) => {
          const o = await h.env.ASSETS_BUCKET.get((ref as { src: string }).src);
          return o ? await o.text() : undefined;
        },
      },
    );
    const html = rendered.pages[0].html;
    // Character equality (whitespace-normalized) between rendered body and the
    // source paragraph — the model referenced captured copy, did not rewrite it.
    const norm = (s: string) => s.replace(/\s+/g, " ").trim();
    expect(norm(html)).toContain(norm(sourceParagraph));
  });

  // ── AC-697 — static generation bakes resolved content, no runtime fetch ─────
  it("test_UAT_AC697_static_generation_bakes_no_runtime_fetch", async () => {
    const homeKey = "sites/acct-bake/copy/home.md";
    const aboutKey = "sites/acct-bake/copy/about.md";
    const markdownBySrc: Record<string, string> = {
      [homeKey]: "# Home heading\n\nHome body paragraph.",
      [aboutKey]: "## About us\n\nAbout body paragraph.",
    };

    const site: Site = {
      config: { businessName: "Acme" },
      theme: makeThemeTokens(),
      nav: { pattern: "footer-only", entries: [] },
      pages: [
        {
          id: "home",
          slug: "/",
          title: "Home",
          modules: [
            {
              id: "home-body",
              type: "text-block",
              version: 1,
              variant: "prose",
              content: { body: { kind: "text", id: homeKey, src: homeKey } },
            },
          ],
        },
        {
          id: "about",
          slug: "/about",
          title: "About",
          modules: [
            {
              id: "about-body",
              type: "text-block",
              version: 1,
              variant: "prose",
              content: { body: { kind: "text", id: aboutKey, src: aboutKey } },
            },
          ],
        },
      ],
    };

    // The resolver models the build-time content fetch. Track when it runs.
    const resolveCalls: string[] = [];
    const rendered = await renderSite(
      { site },
      {
        resolveAsset: async (ref) => {
          const src = (ref as { src: string }).src;
          resolveCalls.push(src);
          return markdownBySrc[src];
        },
      },
    );

    // Resolution happened at build time, once per referenced text asset.
    expect(resolveCalls).toContain(homeKey);
    expect(resolveCalls).toContain(aboutKey);

    const pageBySlug = new Map(rendered.pages.map((p) => [p.slug, p.html]));
    const homeHtml = pageBySlug.get("/")!;
    const aboutHtml = pageBySlug.get("/about")!;

    // Converted body content is inlined into the published static output.
    expect(homeHtml).toContain("<h1>Home heading</h1>");
    expect(homeHtml).toContain("<p>Home body paragraph.</p>");
    expect(aboutHtml).toContain("<h2>About us</h2>");
    expect(aboutHtml).toContain("<p>About body paragraph.</p>");

    // The served output carries no body-copy reference — nothing to fetch or
    // convert at request time (the .md key never appears in the static HTML).
    expect(homeHtml).not.toContain(homeKey);
    expect(homeHtml).not.toContain("copy/home.md");
    expect(aboutHtml).not.toContain(aboutKey);
    expect(aboutHtml).not.toContain("copy/about.md");
  });
});
