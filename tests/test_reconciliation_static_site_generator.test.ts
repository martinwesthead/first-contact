import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runGenerate, SiteLoadError } from "@1stcontact/generate";
import {
  FIXTURE_SITE_DIR,
  makeFixtureSite,
  writeFixtureSite,
} from "./_fixtures_REQ-6_site.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const CLI_ENTRY = resolve(REPO_ROOT, "tools/generate/bin/cli.mjs");

interface CliResult {
  stdout: string;
  stderr: string;
  code: number;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolveOut) => {
    const child = spawn("node", [CLI_ENTRY, ...args], {
      stdio: ["ignore", "pipe", "pipe"],
      // Strip TURNSTILE_SITE_KEY so head emission stays deterministic.
      env: { ...process.env, TURNSTILE_SITE_KEY: "" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout!.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr!.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      resolveOut({ stdout, stderr, code: code ?? -1 });
    });
  });
}

async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(resolve(tmpdir(), prefix));
}

describe("Story story-d111f966: static site generator (reconciliation)", () => {
  it("test_UAT_AC443_cli_accepts_site_out_clean_flags", async () => {
    const root = await makeTempDir("fc-gen-ac443-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");
    await writeFixtureSite(siteDir, makeFixtureSite());

    const ok = await runCli(["--site", siteDir, "--out", outDir, "--clean"]);
    expect(ok.code, `stderr was: ${ok.stderr}`).toBe(0);
    expect(ok.stdout).toMatch(/page\(s\)/);
    expect(ok.stdout).toMatch(/asset\(s\)/);
    expect(ok.stdout).toContain(outDir);
    // Output really got produced.
    const indexInfo = await stat(resolve(outDir, "index.html"));
    expect(indexInfo.isFile()).toBe(true);

    // Omitting --site: non-zero exit with usage on stderr.
    const missingSite = await runCli(["--out", outDir]);
    expect(missingSite.code).not.toBe(0);
    expect(missingSite.stderr).toMatch(/Usage:\s*fc-generate/);

    // Omitting --out: non-zero exit with usage on stderr.
    const missingOut = await runCli(["--site", siteDir]);
    expect(missingOut.code).not.toBe(0);
    expect(missingOut.stderr).toMatch(/Usage:\s*fc-generate/);
  }, 60_000);

  it("test_UAT_AC444_runGenerate_returns_result_describing_outputs", async () => {
    const outDir = await makeTempDir("fc-gen-ac444-");
    const result = await runGenerate({
      site: FIXTURE_SITE_DIR,
      out: outDir,
      clean: true,
    });

    // outDir round-trip.
    expect(result.outDir).toBe(outDir);

    // One pagesWritten entry per page in the site definition. The 1stcontact
    // fixture site has exactly one page.
    expect(result.pagesWritten).toHaveLength(1);
    for (const page of result.pagesWritten) {
      expect(page.startsWith(outDir + "/")).toBe(true);
      const info = await stat(page);
      expect(info.isFile()).toBe(true);
    }

    // cssPath points at the per-site theme stylesheet inside outDir.
    expect(result.cssPath.startsWith(outDir + "/")).toBe(true);
    expect(result.cssPath.endsWith("theme.css")).toBe(true);
    const cssInfo = await stat(result.cssPath);
    expect(cssInfo.isFile()).toBe(true);

    // assetsWritten lists every file under the site's assets/ tree
    // (sites/1stcontact/assets/ contains placeholder.png).
    expect(result.assetsWritten.length).toBeGreaterThanOrEqual(1);
    expect(
      result.assetsWritten.some((p) => p.endsWith("placeholder.png")),
    ).toBe(true);
    for (const asset of result.assetsWritten) {
      expect(asset.startsWith(outDir + "/")).toBe(true);
      const info = await stat(asset);
      expect(info.isFile()).toBe(true);
    }
  }, 30_000);

  it("test_UAT_AC445_pages_emitted_at_slug_derived_paths_as_html5_doc", async () => {
    const root = await makeTempDir("fc-gen-ac445-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    const site = makeFixtureSite() as Record<string, unknown>;
    // Replace pages: one root-slug page, one nested-slug page.
    (site as { pages: unknown[] }).pages = [
      {
        id: "home",
        slug: "/",
        title: "Home Page",
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "Home", subhead: "<p>Welcome.</p>" },
          },
        ],
      },
      {
        id: "about",
        slug: "/about",
        title: "About Page",
        modules: [
          {
            id: "block-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: { heading: "About", body: "<p>About us.</p>" },
          },
        ],
      },
    ];

    await writeFixtureSite(siteDir, site);
    const result = await runGenerate({ site: siteDir, out: outDir, clean: true });

    const rootPath = resolve(outDir, "index.html");
    const nestedPath = resolve(outDir, "about/index.html");
    expect(result.pagesWritten).toContain(rootPath);
    expect(result.pagesWritten).toContain(nestedPath);

    for (const p of [rootPath, nestedPath]) {
      const html = await readFile(p, "utf-8");
      // HTML5 doctype.
      expect(html.trim().toLowerCase().startsWith("<!doctype html>")).toBe(true);
      // Single <head> region followed by <body> region.
      const headOpens = html.match(/<head>/g) ?? [];
      const bodyOpens = html.match(/<body>/g) ?? [];
      expect(headOpens.length).toBe(1);
      expect(bodyOpens.length).toBe(1);
      expect(html.indexOf("<head>")).toBeLessThan(html.indexOf("<body>"));
      // Top-level <html> root.
      expect(html).toMatch(/<html[\s>]/);
    }
  }, 30_000);

  it("test_UAT_AC446_modules_wrapped_in_anchor_with_id_and_data_marker", async () => {
    const root = await makeTempDir("fc-gen-ac446-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    const site = makeFixtureSite() as Record<string, unknown>;
    const moduleIds = ["hero-zero", "block-one", "block-two"];
    (site as { pages: unknown[] }).pages = [
      {
        id: "home",
        slug: "/",
        title: "Home",
        modules: [
          {
            id: moduleIds[0],
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "Zero" },
          },
          {
            id: moduleIds[1],
            type: "text-block",
            version: 1,
            variant: "prose",
            content: { heading: "One", body: "<p>One.</p>" },
          },
          {
            id: moduleIds[2],
            type: "text-block",
            version: 1,
            variant: "landing",
            content: { heading: "Two", body: "<p>Two.</p>" },
          },
        ],
      },
    ];

    await writeFixtureSite(siteDir, site);
    await runGenerate({ site: siteDir, out: outDir, clean: true });
    const html = await readFile(resolve(outDir, "index.html"), "utf-8");
    const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
    expect(bodyMatch, "page has a body").not.toBeNull();
    const body = bodyMatch![1]!;

    for (const id of moduleIds) {
      // Exactly one element whose id attribute equals the module instance's id.
      const idMatches = body.match(new RegExp(`\\sid="${id}"`, "g")) ?? [];
      expect(idMatches, `id="${id}" appears exactly once`).toHaveLength(1);
      // And exactly one element whose data-module-instance attribute equals the id.
      const dataMatches =
        body.match(new RegExp(`\\sdata-module-instance="${id}"`, "g")) ?? [];
      expect(
        dataMatches,
        `data-module-instance="${id}" appears exactly once`,
      ).toHaveLength(1);
      // Both attributes appear on the SAME element (anchor wrapper) — assert
      // the two attributes co-occur in the same opening tag.
      expect(body).toMatch(
        new RegExp(`<[^<>]*\\sid="${id}"[^<>]*data-module-instance="${id}"`),
      );
    }
  }, 30_000);

  it("test_UAT_AC447_theme_css_concatenates_tokens_and_module_styles", async () => {
    const root = await makeTempDir("fc-gen-ac447-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    const recognizablePrimary = "#abcdef";
    const site = makeFixtureSite({
      theme: {
        ...(makeFixtureSite() as { theme: object }).theme,
        palette: {
          bg: "#ffffff",
          surface: "#f5f5f5",
          surfaceSubtle: "#fafafa",
          surfaceInverse: "#111111",
          text: "#111111",
          muted: "#666666",
          primary: recognizablePrimary,
          accent: "#f59e0b",
          border: "#dddddd",
        },
      },
    });

    await writeFixtureSite(siteDir, site);
    const result = await runGenerate({ site: siteDir, out: outDir, clean: true });
    // Stylesheet location is /assets/theme.css inside outDir.
    expect(result.cssPath).toBe(resolve(outDir, "assets/theme.css"));
    const css = await readFile(result.cssPath, "utf-8");

    // Theme token CSS variable carrying the recognizable primary value.
    expect(css).toMatch(
      new RegExp(`--color-primary:\\s*${recognizablePrimary}`),
    );
    // At least one selector defined by a framework module (e.g. .fc-hero or .fc-header).
    expect(css).toMatch(/\.fc-(hero|header|footer|text-block|services|contact)/);
    // Both portions coexist in the same file.
    expect(css).toContain("--color-primary");
    expect(css).toContain(".fc-");
  }, 30_000);

  it("test_UAT_AC448_every_page_links_to_assets_theme_css", async () => {
    const root = await makeTempDir("fc-gen-ac448-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    const site = makeFixtureSite() as Record<string, unknown>;
    (site as { pages: unknown[] }).pages = [
      {
        id: "home",
        slug: "/",
        title: "Home",
        modules: [
          {
            id: "hero-1",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "H" },
          },
        ],
      },
      {
        id: "about",
        slug: "/about",
        title: "About",
        modules: [
          {
            id: "block-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: { heading: "About", body: "<p>A.</p>" },
          },
        ],
      },
    ];

    await writeFixtureSite(siteDir, site);
    const result = await runGenerate({ site: siteDir, out: outDir, clean: true });

    for (const page of result.pagesWritten) {
      const html = await readFile(page, "utf-8");
      const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
      expect(headMatch, `page ${page} has a head`).not.toBeNull();
      const head = headMatch![1]!;
      expect(head).toMatch(
        /<link[^>]+rel="stylesheet"[^>]+href="\/assets\/theme\.css"/,
      );
    }
  }, 30_000);

  it("test_UAT_AC449_head_emits_viewport_title_description_og_metadata", async () => {
    const root = await makeTempDir("fc-gen-ac449-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    const site = makeFixtureSite() as Record<string, unknown>;
    (site as { config: { businessName: string; tagline?: string } }).config = {
      businessName: "Fallback Co",
      tagline: "Fallback tagline",
    };
    (site as { pages: unknown[] }).pages = [
      {
        // (a) Full seoMeta — title, description, ogImage all present.
        id: "full",
        slug: "/",
        title: "Plain Title A",
        seoMeta: {
          title: "SEO Title A",
          description: "SEO description A",
          ogImage: "https://example.com/og-a.png",
        },
        modules: [
          {
            id: "m1",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "A" },
          },
        ],
      },
      {
        // (b) No seoMeta but a page title and site tagline → fallback chain.
        id: "fallback-tagline",
        slug: "/b",
        title: "Plain Title B",
        modules: [
          {
            id: "m2",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "B" },
          },
        ],
      },
      {
        // (c) Only the page title — used directly as fallback.
        id: "no-seo",
        slug: "/c",
        title: "Plain Title C",
        modules: [
          {
            id: "m3",
            type: "hero",
            version: 1,
            variant: "bg-color",
            content: { heading: "C" },
          },
        ],
      },
    ];

    await writeFixtureSite(siteDir, site);
    await runGenerate({ site: siteDir, out: outDir, clean: true });

    const readHead = async (p: string): Promise<string> => {
      const html = await readFile(p, "utf-8");
      const m = html.match(/<head>([\s\S]*?)<\/head>/);
      expect(m, `head present in ${p}`).not.toBeNull();
      return m![1]!;
    };

    const headA = await readHead(resolve(outDir, "index.html"));
    const headB = await readHead(resolve(outDir, "b/index.html"));
    const headC = await readHead(resolve(outDir, "c/index.html"));

    // (a) Full seoMeta: viewport + seoMeta.title in title + og:title + meta
    // description + og:description + og:image.
    expect(headA).toMatch(
      /<meta\s+name="viewport"\s+content="width=device-width,\s*initial-scale=1"/,
    );
    expect(headA).toMatch(/<title>SEO Title A<\/title>/);
    expect(headA).toMatch(
      /<meta[^>]+property="og:title"[^>]+content="SEO Title A"/,
    );
    expect(headA).toMatch(
      /<meta[^>]+name="description"[^>]+content="SEO description A"/,
    );
    expect(headA).toMatch(
      /<meta[^>]+property="og:description"[^>]+content="SEO description A"/,
    );
    expect(headA).toMatch(
      /<meta[^>]+property="og:image"[^>]+content="https:\/\/example\.com\/og-a\.png"/,
    );

    // (b) No seoMeta but a page title and site tagline: title falls back to
    // page title; description falls back to site tagline.
    expect(headB).toMatch(/<title>Plain Title B<\/title>/);
    expect(headB).toMatch(
      /<meta[^>]+property="og:title"[^>]+content="Plain Title B"/,
    );
    expect(headB).toMatch(
      /<meta[^>]+name="description"[^>]+content="Fallback tagline"/,
    );
    expect(headB).toMatch(
      /<meta[^>]+property="og:description"[^>]+content="Fallback tagline"/,
    );
    // No og:image when not supplied.
    expect(headB).not.toMatch(/property="og:image"/);

    // (c) seoMeta absent, page title present, behaves like (b) for title.
    expect(headC).toMatch(/<title>Plain Title C<\/title>/);
    expect(headC).toMatch(
      /<meta[^>]+property="og:title"[^>]+content="Plain Title C"/,
    );
  }, 30_000);

  it("test_UAT_AC450_google_fonts_links_emitted_when_typography_resolves", async () => {
    // (a) Two vetted families (Manrope heading + Inter body) → all four
    // font-related link tags emitted with a Google Fonts URL covering both.
    const rootVetted = await makeTempDir("fc-gen-ac450-vetted-");
    const siteVettedDir = resolve(rootVetted, "site");
    const outVettedDir = resolve(rootVetted, "out");
    const siteVetted = makeFixtureSite() as Record<string, unknown>;
    (siteVetted as { theme: { typography: { family: { heading: string; body: string } } } })
      .theme.typography.family = {
      heading: "'Manrope', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif",
    };
    await writeFixtureSite(siteVettedDir, siteVetted);
    await runGenerate({
      site: siteVettedDir,
      out: outVettedDir,
      clean: true,
    });
    const vettedHtml = await readFile(
      resolve(outVettedDir, "index.html"),
      "utf-8",
    );

    expect(vettedHtml).toMatch(
      /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.googleapis\.com"/,
    );
    expect(vettedHtml).toMatch(
      /<link\s+rel="preconnect"\s+href="https:\/\/fonts\.gstatic\.com"\s+crossorigin/,
    );
    const preloadMatch = vettedHtml.match(
      /<link\s+rel="preload"\s+as="style"\s+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/,
    );
    expect(preloadMatch, "preload link present").not.toBeNull();
    const stylesheetMatch = vettedHtml.match(
      /<link\s+rel="stylesheet"\s+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/,
    );
    expect(stylesheetMatch, "stylesheet link present").not.toBeNull();
    // Preload and stylesheet point at the same Google Fonts URL.
    expect(stylesheetMatch![1]).toBe(preloadMatch![1]);
    const googleHref = preloadMatch![1]!;
    // family query covers BOTH vetted families (deduplicated).
    expect(googleHref).toMatch(/family=Manrope/);
    expect(googleHref).toMatch(/family=Inter/);

    // (b) Neither family resolves via the shortlist → no font-related link
    // tags emitted.
    const rootMissing = await makeTempDir("fc-gen-ac450-missing-");
    const siteMissingDir = resolve(rootMissing, "site");
    const outMissingDir = resolve(rootMissing, "out");
    const siteMissing = makeFixtureSite() as Record<string, unknown>;
    (siteMissing as { theme: { typography: { family: { heading: string; body: string } } } })
      .theme.typography.family = {
      heading: "'Comic Sans MS', cursive",
      body: "'Times New Roman', serif",
    };
    await writeFixtureSite(siteMissingDir, siteMissing);
    await runGenerate({
      site: siteMissingDir,
      out: outMissingDir,
      clean: true,
    });
    const missingHtml = await readFile(
      resolve(outMissingDir, "index.html"),
      "utf-8",
    );
    expect(missingHtml).not.toMatch(/fonts\.googleapis\.com\/css2/);
    expect(missingHtml).not.toMatch(/fonts\.gstatic\.com/);
    expect(missingHtml).not.toMatch(/rel="preload"\s+as="style"/);
  }, 60_000);

  it("test_UAT_AC451_assets_copied_preserving_relative_paths", async () => {
    // Case A: site with assets nested at multiple depths.
    const rootA = await makeTempDir("fc-gen-ac451-nested-");
    const siteDirA = resolve(rootA, "site");
    const outDirA = resolve(rootA, "out");
    await writeFixtureSite(siteDirA, makeFixtureSite());

    // Add asset files at root, one subdir, and two subdirs deep.
    const assetsDirA = resolve(siteDirA, "assets");
    await mkdir(resolve(assetsDirA, "images/photos"), { recursive: true });
    const fileRoot = resolve(assetsDirA, "top.txt");
    const fileSub = resolve(assetsDirA, "images/sub.txt");
    const fileDeep = resolve(assetsDirA, "images/photos/deep.txt");
    const bytesRoot = Buffer.from("ROOT_BYTES");
    const bytesSub = Buffer.from("SUB_BYTES_XYZ");
    const bytesDeep = Buffer.from("DEEP_BYTES_QWE");
    await writeFile(fileRoot, bytesRoot);
    await writeFile(fileSub, bytesSub);
    await writeFile(fileDeep, bytesDeep);

    const resultA = await runGenerate({
      site: siteDirA,
      out: outDirA,
      clean: true,
    });

    // Each source file appears at <out>/assets/site/<rel>.
    const destRoot = resolve(outDirA, "assets/site/top.txt");
    const destSub = resolve(outDirA, "assets/site/images/sub.txt");
    const destDeep = resolve(outDirA, "assets/site/images/photos/deep.txt");
    expect(resultA.assetsWritten).toContain(destRoot);
    expect(resultA.assetsWritten).toContain(destSub);
    expect(resultA.assetsWritten).toContain(destDeep);
    expect(await readFile(destRoot)).toEqual(bytesRoot);
    expect(await readFile(destSub)).toEqual(bytesSub);
    expect(await readFile(destDeep)).toEqual(bytesDeep);

    // Case B: site with no assets/ directory at all → tolerated.
    const rootB = await makeTempDir("fc-gen-ac451-noassets-");
    const siteDirB = resolve(rootB, "site");
    const outDirB = resolve(rootB, "out");
    // writeFixtureSite without assets parameter does NOT create assets/.
    await writeFixtureSite(siteDirB, makeFixtureSite());

    const resultB = await runGenerate({
      site: siteDirB,
      out: outDirB,
      clean: true,
    });
    expect(resultB.assetsWritten).toEqual([]);
  }, 60_000);

  it("test_UAT_AC452_schema_validation_failure_raises_siteloaderror_with_json_pointers", async () => {
    const root = await makeTempDir("fc-gen-ac452-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    // Construct a site with TWO distinct violations:
    //   1. theme.palette.primary set to a non-hex value
    //   2. pages[0].id set to empty string (violates .min(1))
    const site = makeFixtureSite() as Record<string, unknown>;
    const theme = (site as { theme: { palette: Record<string, string> } }).theme;
    theme.palette.primary = "not-a-hex";
    const pages = (site as { pages: Array<{ id: string }> }).pages;
    pages[0]!.id = "";

    await writeFixtureSite(siteDir, site);

    let caught: unknown;
    try {
      await runGenerate({ site: siteDir, out: outDir });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(SiteLoadError);
    const message = (caught as Error).message;
    // Identifies the validating file.
    expect(message).toMatch(/Site validation failed/);
    expect(message).toContain(resolve(siteDir, "site.json"));
    // JSON-pointer-style paths for each violation.
    expect(message).toContain("/theme/palette/primary");
    expect(message).toContain("/pages/0/id");

    // Generator did not write any files into outDir.
    let outExists = true;
    try {
      await stat(outDir);
    } catch {
      outExists = false;
    }
    expect(outExists, "outDir was not created").toBe(false);
  }, 30_000);

  it("test_UAT_AC453_missing_or_malformed_site_json_raises_siteloaderror", async () => {
    // (a) No site.json present.
    const rootMissing = await makeTempDir("fc-gen-ac453-missing-");
    const siteMissingDir = resolve(rootMissing, "site");
    const outMissingDir = resolve(rootMissing, "out");
    await mkdir(siteMissingDir, { recursive: true });

    let missingErr: unknown;
    try {
      await runGenerate({ site: siteMissingDir, out: outMissingDir });
    } catch (err) {
      missingErr = err;
    }
    expect(missingErr).toBeInstanceOf(SiteLoadError);
    expect((missingErr as Error).message).toContain(
      resolve(siteMissingDir, "site.json"),
    );
    expect((missingErr as Error).message).toMatch(/not found|ENOENT|no such/i);
    // No output written.
    let outMissingExists = true;
    try {
      await stat(outMissingDir);
    } catch {
      outMissingExists = false;
    }
    expect(outMissingExists).toBe(false);

    // (b) site.json present but malformed JSON.
    const rootBad = await makeTempDir("fc-gen-ac453-malformed-");
    const siteBadDir = resolve(rootBad, "site");
    const outBadDir = resolve(rootBad, "out");
    await mkdir(siteBadDir, { recursive: true });
    await writeFile(resolve(siteBadDir, "site.json"), "{ not: valid json", "utf-8");

    let badErr: unknown;
    try {
      await runGenerate({ site: siteBadDir, out: outBadDir });
    } catch (err) {
      badErr = err;
    }
    expect(badErr).toBeInstanceOf(SiteLoadError);
    const badMsg = (badErr as Error).message;
    expect(badMsg).toContain(resolve(siteBadDir, "site.json"));
    // Mentions JSON / parse failure.
    expect(badMsg).toMatch(/Invalid JSON|JSON/i);
    let outBadExists = true;
    try {
      await stat(outBadDir);
    } catch {
      outBadExists = false;
    }
    expect(outBadExists).toBe(false);
  }, 30_000);

  it("test_UAT_AC454_clean_flag_wipes_output_directory", async () => {
    // Case A: with clean: true → stale file is removed.
    const rootClean = await makeTempDir("fc-gen-ac454-clean-");
    const siteDir = resolve(rootClean, "site");
    const outCleanDir = resolve(rootClean, "out");
    await writeFixtureSite(siteDir, makeFixtureSite());

    // Pre-populate a stale file at a path the site definition will never produce.
    await mkdir(outCleanDir, { recursive: true });
    const stalePath = resolve(outCleanDir, "stale.txt");
    await writeFile(stalePath, "stale content", "utf-8");

    const cleanResult = await runGenerate({
      site: siteDir,
      out: outCleanDir,
      clean: true,
    });
    let cleanStaleExists = true;
    try {
      await stat(stalePath);
    } catch {
      cleanStaleExists = false;
    }
    expect(cleanStaleExists, "stale file removed by --clean").toBe(false);
    // Expected new files are present.
    expect(cleanResult.pagesWritten.length).toBeGreaterThanOrEqual(1);
    for (const page of cleanResult.pagesWritten) {
      const info = await stat(page);
      expect(info.isFile()).toBe(true);
    }
    const cleanCssInfo = await stat(cleanResult.cssPath);
    expect(cleanCssInfo.isFile()).toBe(true);

    // Case B: without clean → stale file preserved alongside new output.
    const rootKeep = await makeTempDir("fc-gen-ac454-keep-");
    const siteDirKeep = resolve(rootKeep, "site");
    const outKeepDir = resolve(rootKeep, "out");
    await writeFixtureSite(siteDirKeep, makeFixtureSite());
    await mkdir(outKeepDir, { recursive: true });
    const stalePathKeep = resolve(outKeepDir, "stale.txt");
    await writeFile(stalePathKeep, "stale content", "utf-8");

    const keepResult = await runGenerate({
      site: siteDirKeep,
      out: outKeepDir,
      // no clean
    });
    const keepInfo = await stat(stalePathKeep);
    expect(keepInfo.isFile(), "stale file preserved without --clean").toBe(true);
    expect(await readFile(stalePathKeep, "utf-8")).toBe("stale content");
    // New output also present.
    expect(keepResult.pagesWritten.length).toBeGreaterThanOrEqual(1);
  }, 60_000);

  it("test_UAT_AC455_cli_exits_nonzero_with_stderr_on_failure", async () => {
    // Construct a fixture site with a known validation failure.
    const root = await makeTempDir("fc-gen-ac455-");
    const siteDir = resolve(root, "site");
    const outDir = resolve(root, "out");

    const site = makeFixtureSite() as Record<string, unknown>;
    // Force a schema validation failure: invalid hex color.
    (site as { theme: { palette: Record<string, string> } }).theme.palette.primary =
      "not-a-hex";
    await writeFixtureSite(siteDir, site);

    const result = await runCli([
      "--site",
      siteDir,
      "--out",
      outDir,
      "--clean",
    ]);

    expect(result.code).not.toBe(0);
    // Exactly one line on stderr beginning with 'Generation failed:'.
    expect(result.stderr).toMatch(/^Generation failed:/m);
    // The underlying error message follows the prefix.
    expect(result.stderr).toMatch(/Generation failed:.+/);
    // No success summary line on stdout.
    expect(result.stdout).not.toMatch(/Generated\s+\d+\s+page\(s\)/);
  }, 60_000);
});
