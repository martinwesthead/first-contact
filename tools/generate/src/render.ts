import { experimental_AstroContainer as AstroContainer } from "astro/container";
import {
  bakeModuleContentForRender,
  collectTextAssetSrcsForInstance,
  findFontByFamilyDeclaration,
  generateThemeCss,
  getModule,
  googleFontsHref,
  loadModuleStyles,
  type FontSpec,
  type ResolveAsset,
} from "@1stcontact/framework";
import type { AssetRef } from "@1stcontact/site-schema";
import type {
  ModuleInstance,
  Page,
  Site,
} from "@1stcontact/site-schema";

export interface RenderedPage {
  slug: string;
  outputPath: string;
  html: string;
}

export interface RenderedSite {
  pages: RenderedPage[];
  themeCss: string;
  themeCssPath: string;
  fonts: FontSpec[];
  fontsHref: string | undefined;
}

const THEME_CSS_PATH = "/assets/theme.css";

export interface RenderSiteOptions {
  /**
   * REQ-33 — async resolver for AssetRef-text body copy referenced by
   * markdown content fields. Called with the AssetRef; should return the
   * markdown body (as a string) or `undefined` if not found. The generator
   * prefetches all referenced text assets before invoking the Astro
   * container so the inner bake step stays sync.
   *
   * When omitted, text-kind AssetRefs fall back to their `alt` text in the
   * baked HTML. The 1stcontact baseline does not use text-kind AssetRefs,
   * so it works without a resolver.
   */
  resolveAsset?: (ref: AssetRef) => Promise<string | undefined> | string | undefined;
}

export async function renderSite(
  loaded: { site: Site },
  options: RenderSiteOptions = {},
): Promise<RenderedSite> {
  const container = await AstroContainer.create();
  const tokenCss = generateThemeCss(loaded.site.theme);
  const moduleCss = await loadModuleStyles();
  const themeCss = `${tokenCss}\n${moduleCss}`;
  const fonts = resolveFonts(loaded.site);
  const fontsHref = googleFontsHref(fonts);

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? "";

  // REQ-33 — Prefetch every text-AssetRef body referenced by markdown content
  // fields so the per-instance bake (synchronous) hits a populated cache.
  const textAssetCache = await prefetchTextAssets(loaded.site, options.resolveAsset);
  const syncResolver: ResolveAsset = (ref) =>
    isTextRef(ref) ? textAssetCache.get(ref.src) : undefined;

  const pages: RenderedPage[] = [];
  for (const page of loaded.site.pages) {
    const body = await renderPageBody(page, loaded.site, container, syncResolver);
    const head = renderHead(loaded.site, page, fontsHref, turnstileSiteKey);
    const html = renderHtml(head, body);
    pages.push({
      slug: page.slug,
      outputPath: slugToOutputPath(page.slug),
      html,
    });
  }

  return {
    pages,
    themeCss,
    themeCssPath: THEME_CSS_PATH,
    fonts,
    fontsHref,
  };
}

async function renderPageBody(
  page: Page,
  _site: Site,
  container: AstroContainer,
  resolveAsset: ResolveAsset,
): Promise<string> {
  const parts: string[] = [];
  for (const instance of page.modules) {
    const entry = getModule(instance.type, instance.version);
    const props = buildProps(instance, resolveAsset);
    const inner = await container.renderToString(entry.Component, { props });
    parts.push(
      `<div id="${escapeAttr(instance.id)}" data-module-instance="${escapeAttr(instance.id)}">${inner}</div>`,
    );
  }
  return parts.join("\n");
}

function buildProps(
  instance: ModuleInstance,
  resolveAsset: ResolveAsset,
): Record<string, unknown> {
  const baked = bakeModuleContentForRender(instance, resolveAsset) ?? {};
  const props: Record<string, unknown> = { ...baked };
  if (instance.variant !== undefined) props.variant = instance.variant;
  if (instance.dials !== undefined) props.dials = instance.dials;
  return props;
}

async function prefetchTextAssets(
  site: Site,
  resolveAsset: RenderSiteOptions["resolveAsset"],
): Promise<Map<string, string>> {
  const cache = new Map<string, string>();
  if (!resolveAsset) return cache;
  const srcs = new Set<string>();
  for (const page of site.pages) {
    for (const m of page.modules) {
      for (const s of collectTextAssetSrcsForInstance(m)) srcs.add(s);
    }
  }
  await Promise.all(
    [...srcs].map(async (src) => {
      try {
        const ref: AssetRef = { kind: "text", id: src, src };
        const result = await resolveAsset(ref);
        if (typeof result === "string") cache.set(src, result);
      } catch {
        // Swallow — sync resolver falls back to alt text for missing refs.
      }
    }),
  );
  return cache;
}

function isTextRef(ref: AssetRef): ref is AssetRef & { kind: "text" } {
  return (ref as { kind?: string }).kind === "text";
}

function renderHead(
  site: Site,
  page: Page,
  fontsHref: string | undefined,
  turnstileSiteKey: string,
): string {
  const seo = page.seoMeta ?? {};
  const title = seo.title ?? page.title ?? site.config.businessName;
  const description = seo.description ?? site.config.tagline;
  const ogImage = seo.ogImage;

  const lines: string[] = [
    `<meta charset="utf-8" />`,
    `<meta name="viewport" content="width=device-width, initial-scale=1" />`,
    `<title>${escapeHtml(title)}</title>`,
  ];
  if (description) {
    lines.push(`<meta name="description" content="${escapeAttr(description)}" />`);
    lines.push(`<meta property="og:description" content="${escapeAttr(description)}" />`);
  }
  lines.push(`<meta property="og:title" content="${escapeAttr(title)}" />`);
  if (ogImage) {
    lines.push(`<meta property="og:image" content="${escapeAttr(ogImage)}" />`);
  }

  if (fontsHref) {
    lines.push(`<link rel="preconnect" href="https://fonts.googleapis.com" />`);
    lines.push(
      `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />`,
    );
    lines.push(`<link rel="preload" as="style" href="${escapeAttr(fontsHref)}" />`);
    lines.push(`<link rel="stylesheet" href="${escapeAttr(fontsHref)}" />`);
  }

  lines.push(`<link rel="stylesheet" href="${THEME_CSS_PATH}" />`);

  const hasContactForm = page.modules.some(
    (m) => m.type === "contact-form",
  );
  if (hasContactForm && turnstileSiteKey) {
    lines.push(
      `<meta name="fc-turnstile-site-key" content="${escapeAttr(turnstileSiteKey)}" />`,
    );
    lines.push(
      `<script>window.fcTurnstileReady=function(){var m=document.querySelector('meta[name="fc-turnstile-site-key"]');var k=m?m.content:'';if(!k||!window.turnstile)return;document.querySelectorAll('[data-turnstile-target]').forEach(function(el){window.turnstile.render(el,{sitekey:k});});};</script>`,
    );
    lines.push(
      `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=fcTurnstileReady" async defer></script>`,
    );
  }

  return lines.join("\n");
}

function renderHtml(head: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
${head}
</head>
<body>
${body}
</body>
</html>
`;
}

function resolveFonts(site: Site): FontSpec[] {
  const declarations = [
    site.theme.typography.family.heading,
    site.theme.typography.family.body,
  ];
  const seen = new Set<string>();
  const out: FontSpec[] = [];
  for (const decl of declarations) {
    const spec = findFontByFamilyDeclaration(decl);
    if (spec && !seen.has(spec.id)) {
      seen.add(spec.id);
      out.push(spec);
    }
  }
  return out;
}

function slugToOutputPath(slug: string): string {
  if (slug === "/" || slug === "") return "index.html";
  const trimmed = slug.replace(/^\/+|\/+$/g, "");
  return `${trimmed}/index.html`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
