import { experimental_AstroContainer as AstroContainer } from "astro/container";
import {
  findFontByFamilyDeclaration,
  generateThemeCss,
  getModule,
  googleFontsHref,
  loadModuleStyles,
  type FontSpec,
} from "@1stcontact/framework";
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

export async function renderSite(loaded: { site: Site }): Promise<RenderedSite> {
  const container = await AstroContainer.create();
  const tokenCss = generateThemeCss(loaded.site.theme);
  const moduleCss = await loadModuleStyles();
  const themeCss = `${tokenCss}\n${moduleCss}`;
  const fonts = resolveFonts(loaded.site);
  const fontsHref = googleFontsHref(fonts);

  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? "";

  const pages: RenderedPage[] = [];
  for (const page of loaded.site.pages) {
    const body = await renderPageBody(page, loaded.site, container);
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
): Promise<string> {
  const parts: string[] = [];
  for (const instance of page.modules) {
    const entry = getModule(instance.type, instance.version);
    const props = buildProps(instance);
    const inner = await container.renderToString(entry.Component, { props });
    parts.push(
      `<div id="${escapeAttr(instance.id)}" data-module-instance="${escapeAttr(instance.id)}">${inner}</div>`,
    );
  }
  return parts.join("\n");
}

function buildProps(instance: ModuleInstance): Record<string, unknown> {
  const props: Record<string, unknown> = { ...(instance.content ?? {}) };
  if (instance.variant !== undefined) props.variant = instance.variant;
  if (instance.dials !== undefined) props.dials = instance.dials;
  return props;
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
