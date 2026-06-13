import type {
  ModuleInstance,
  Page,
  Site,
} from "@1stcontact/site-schema";
import { generateThemeCss } from "../tokens/css.js";

const ESC_HTML: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};
const ESC_ATTR: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>]/g, (c) => ESC_HTML[c] ?? c);
}

export function escapeAttr(value: unknown): string {
  return String(value ?? "").replace(/[&<>"]/g, (c) => ESC_ATTR[c] ?? c);
}

export interface RenderSiteOptions {
  pageId?: string;
}

export function renderSiteToHtml(
  site: Site,
  options: RenderSiteOptions = {},
): string {
  const themeCss = generateThemeCss(site.theme);
  const moduleCss = MODULE_CSS;
  const page = pickPage(site, options.pageId);
  const body = renderPageBody(page);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(page.title || site.config.businessName)}</title>
<style>${themeCss}\n${moduleCss}</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderPageBody(page: Page): string {
  return page.modules.map(renderModuleInstance).join("\n");
}

export function renderModuleInstance(instance: ModuleInstance): string {
  const inner = dispatchRenderer(instance);
  return `<div id="${escapeAttr(instance.id)}" data-module-instance="${escapeAttr(
    instance.id,
  )}">${inner}</div>`;
}

function pickPage(site: Site, pageId?: string): Page {
  if (pageId) {
    const found = site.pages.find((p) => p.id === pageId);
    if (found) return found;
  }
  return site.pages[0]!;
}

function dispatchRenderer(instance: ModuleInstance): string {
  switch (instance.type) {
    case "header":
      return renderHeader(instance);
    case "hero":
      return renderHero(instance);
    case "footer":
      return renderFooter(instance);
    case "text-block":
      return renderTextBlock(instance);
    case "services-grid":
      return renderServicesGrid(instance);
    case "contact-form":
      return renderContactForm(instance);
    default:
      return `<!-- unknown module type: ${escapeHtml(instance.type)} -->`;
  }
}

function dialClasses(prefix: string, dials: Record<string, string> | undefined): string {
  if (!dials) return "";
  return Object.entries(dials)
    .map(([k, v]) => `${prefix}--${kebab(k)}-${v}`)
    .join(" ");
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function content<T = unknown>(instance: ModuleInstance, key: string): T | undefined {
  return instance.content?.[key] as T | undefined;
}

function renderHeader(instance: ModuleInstance): string {
  const variant = instance.variant ?? "top-nav";
  const dials = dialClasses("fc-header", instance.dials);
  const logo = content<unknown>(instance, "logo");
  const entries = (content<unknown[]>(instance, "entries") ?? []) as Array<{
    label: string;
    target: { kind: string; href?: string; pageId?: string; moduleId?: string };
  }>;
  const logoHtml = renderLogo(logo);
  const entriesHtml = entries
    .map(
      (e) =>
        `<li class="fc-header__entry"><a href="${escapeAttr(
          navHref(e.target),
        )}">${escapeHtml(e.label)}</a></li>`,
    )
    .join("");
  return `<header class="fc-header fc-header--variant-${escapeAttr(variant)} ${dials}" data-module="header">
  <div class="fc-header__inner">
    <div class="fc-header__logo">${logoHtml}</div>
    <nav class="fc-header__nav"><ul class="fc-header__entries">${entriesHtml}</ul></nav>
  </div>
</header>`;
}

function renderLogo(logo: unknown): string {
  if (typeof logo === "string") return escapeHtml(logo);
  if (
    logo &&
    typeof logo === "object" &&
    "src" in logo &&
    typeof (logo as { src: unknown }).src === "string"
  ) {
    const src = (logo as { src: string; alt?: string }).src;
    const alt = (logo as { src: string; alt?: string }).alt ?? "";
    return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" />`;
  }
  return "";
}

function navHref(target: { kind: string; href?: string; pageId?: string; moduleId?: string }): string {
  if (target.kind === "url") return target.href ?? "#";
  if (target.kind === "anchor") return `#${target.moduleId ?? ""}`;
  if (target.kind === "page") return `/${target.pageId ?? ""}`;
  return "#";
}

function renderHero(instance: ModuleInstance): string {
  const variant = instance.variant ?? "bg-color";
  const dials = dialClasses("fc-hero", instance.dials);
  const eyebrow = content<string>(instance, "eyebrow");
  const heading = content<string>(instance, "heading") ?? "";
  const subhead = content<string>(instance, "subhead");
  const cta = content<{ label: string; href: string }>(instance, "cta");
  const image = content<{ src: string; alt: string }>(instance, "image");
  const showImage = variant === "bg-image" && image !== undefined;
  return `<section class="fc-hero fc-hero--variant-${escapeAttr(variant)} ${dials}" data-module="hero" data-variant="${escapeAttr(variant)}">
  ${
    showImage
      ? `<img class="fc-hero__bg-image" src="${escapeAttr(image!.src)}" alt="${escapeAttr(image!.alt)}" />`
      : ""
  }
  <div class="fc-hero__inner">
    ${eyebrow ? `<p class="fc-hero__eyebrow">${escapeHtml(eyebrow)}</p>` : ""}
    <h1 class="fc-hero__heading">${escapeHtml(heading)}</h1>
    ${subhead ? `<div class="fc-hero__subhead">${subhead}</div>` : ""}
    ${cta ? `<a class="fc-hero__cta" href="${escapeAttr(cta.href)}">${escapeHtml(cta.label)}</a>` : ""}
  </div>
</section>`;
}

function renderFooter(instance: ModuleInstance): string {
  const variant = instance.variant ?? "minimal";
  const dials = dialClasses("fc-footer", instance.dials);
  const logo = content<unknown>(instance, "logo");
  const copyrightHolder = content<string>(instance, "copyrightHolder") ?? "";
  const copyrightYear =
    content<string>(instance, "copyrightYear") ?? String(new Date().getFullYear());
  const tagline = content<string>(instance, "tagline");
  return `<footer class="fc-footer fc-footer--variant-${escapeAttr(variant)} ${dials}" data-module="footer">
  <div class="fc-footer__inner">
    ${logo ? `<div class="fc-footer__logo">${renderLogo(logo)}</div>` : ""}
    ${tagline ? `<p class="fc-footer__tagline">${escapeHtml(tagline)}</p>` : ""}
    <p class="fc-footer__copyright">© ${escapeHtml(copyrightYear)} ${escapeHtml(copyrightHolder)}</p>
  </div>
</footer>`;
}

function renderTextBlock(instance: ModuleInstance): string {
  const variant = instance.variant ?? "landing";
  const dials = dialClasses("fc-text-block", instance.dials);
  const heading = content<string>(instance, "heading");
  const body = content<string>(instance, "body") ?? "";
  return `<section class="fc-text-block fc-text-block--variant-${escapeAttr(variant)} ${dials}" data-module="text-block">
  <div class="fc-text-block__inner">
    ${heading ? `<h2 class="fc-text-block__heading">${escapeHtml(heading)}</h2>` : ""}
    <div class="fc-text-block__body">${body}</div>
  </div>
</section>`;
}

function renderServicesGrid(instance: ModuleInstance): string {
  const variant = instance.variant ?? "three-col";
  const dials = dialClasses("fc-services-grid", instance.dials);
  const heading = content<string>(instance, "heading");
  const subhead = content<string>(instance, "subhead");
  const items = (content<unknown[]>(instance, "items") ?? []) as Array<{
    title: string;
    body: string;
    cta?: { label: string; href: string };
  }>;
  const itemsHtml = items
    .map(
      (item) => `
    <div class="fc-services-grid__item">
      <h3 class="fc-services-grid__item-title">${escapeHtml(item.title)}</h3>
      <div class="fc-services-grid__item-body">${item.body ?? ""}</div>
      ${
        item.cta
          ? `<a class="fc-services-grid__item-cta" href="${escapeAttr(item.cta.href)}">${escapeHtml(item.cta.label)}</a>`
          : ""
      }
    </div>`,
    )
    .join("");
  return `<section class="fc-services-grid fc-services-grid--variant-${escapeAttr(variant)} ${dials}" data-module="services-grid">
  <div class="fc-services-grid__inner">
    ${heading ? `<h2 class="fc-services-grid__heading">${escapeHtml(heading)}</h2>` : ""}
    ${subhead ? `<div class="fc-services-grid__subhead">${subhead}</div>` : ""}
    <div class="fc-services-grid__items">${itemsHtml}</div>
  </div>
</section>`;
}

function renderContactForm(instance: ModuleInstance): string {
  const variant = instance.variant ?? "inline";
  const dials = dialClasses("fc-contact-form", instance.dials);
  const heading = content<string>(instance, "heading");
  const subhead = content<string>(instance, "subhead");
  const action = content<string>(instance, "action") ?? "#";
  const submitLabel = content<string>(instance, "submitLabel") ?? "Send";
  const fields = (content<unknown[]>(instance, "fields") ?? []) as Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  const fieldsHtml = fields
    .map((f) => {
      const tag = f.type === "textarea" ? "textarea" : "input";
      const typeAttr = f.type === "textarea" ? "" : ` type="${escapeAttr(f.type)}"`;
      const requiredAttr = f.required ? " required" : "";
      const close = f.type === "textarea" ? `></textarea>` : ` />`;
      return `<label class="fc-contact-form__field">
      <span class="fc-contact-form__field-label">${escapeHtml(f.label)}</span>
      <${tag} name="${escapeAttr(f.name)}"${typeAttr}${requiredAttr}${close}
    </label>`;
    })
    .join("");
  return `<section class="fc-contact-form fc-contact-form--variant-${escapeAttr(variant)} ${dials}" data-module="contact-form">
  <div class="fc-contact-form__inner">
    ${heading ? `<h2 class="fc-contact-form__heading">${escapeHtml(heading)}</h2>` : ""}
    ${subhead ? `<div class="fc-contact-form__subhead">${subhead}</div>` : ""}
    <form action="${escapeAttr(action)}" method="post">
      ${fieldsHtml}
      <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-10000px" />
      <button type="submit">${escapeHtml(submitLabel)}</button>
    </form>
  </div>
</section>`;
}

/**
 * Minimal module CSS for the in-browser preview. Production rendering uses the
 * Astro components' scoped styles via tools/generate; this is the browser-only
 * fallback for the builder preview iframe. Visually faithful enough to verify
 * theme-token and dial changes; not byte-identical to production output.
 */
export const MODULE_CSS = `
body { margin: 0; font-family: var(--font-family-body); color: var(--color-text); background: var(--color-bg); }
* { box-sizing: border-box; }

.fc-header { padding: var(--space-3) var(--space-4); background: var(--color-bg); border-bottom: 1px solid var(--color-border); }
.fc-header__inner { max-width: var(--container-default); margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); }
.fc-header__logo { font-family: var(--font-family-heading); font-weight: var(--font-weight-bold); }
.fc-header__entries { display: flex; gap: var(--space-4); list-style: none; margin: 0; padding: 0; }
.fc-header__entry a { color: var(--color-text); text-decoration: none; }

.fc-hero { position: relative; color: var(--color-text); background: var(--color-bg); padding: var(--space-12) var(--space-4); }
.fc-hero--surface-subtle { background: var(--color-surface-subtle); }
.fc-hero--surface-inverse { background: var(--color-surface-inverse); color: var(--color-bg); }
.fc-hero--surface-accent { background: var(--color-accent); color: var(--color-bg); }
.fc-hero__inner { max-width: var(--container-default); margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-4); }
.fc-hero--align-center .fc-hero__inner { text-align: center; align-items: center; }
.fc-hero__eyebrow { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary); }
.fc-hero__heading { margin: 0; font-family: var(--font-family-heading); font-weight: var(--font-weight-bold); line-height: var(--line-height-tight); font-size: var(--font-size-4xl); }
.fc-hero--size-lg .fc-hero__heading { font-size: var(--font-size-5xl); }
.fc-hero--size-sm .fc-hero__heading { font-size: var(--font-size-3xl); }
.fc-hero__subhead { font-size: var(--font-size-lg); line-height: var(--line-height-relaxed); max-width: var(--container-narrow); }
.fc-hero__cta { display: inline-block; background: var(--color-primary); color: var(--color-bg); padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); text-decoration: none; font-weight: var(--font-weight-semibold); }

.fc-text-block { padding: var(--space-8) var(--space-4); }
.fc-text-block--surface-subtle { background: var(--color-surface-subtle); }
.fc-text-block__inner { max-width: var(--container-default); margin: 0 auto; }
.fc-text-block--variant-prose .fc-text-block__inner { max-width: var(--container-narrow); }
.fc-text-block__heading { font-family: var(--font-family-heading); font-weight: var(--font-weight-bold); font-size: var(--font-size-3xl); margin: 0 0 var(--space-4); }
.fc-text-block--text-align-center .fc-text-block__inner { text-align: center; }

.fc-services-grid { padding: var(--space-8) var(--space-4); }
.fc-services-grid__inner { max-width: var(--container-default); margin: 0 auto; }
.fc-services-grid__heading { font-family: var(--font-family-heading); font-weight: var(--font-weight-bold); font-size: var(--font-size-3xl); margin: 0 0 var(--space-6); text-align: center; }
.fc-services-grid__items { display: grid; gap: var(--space-6); }
.fc-services-grid--variant-three-col .fc-services-grid__items { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fc-services-grid--variant-two-col .fc-services-grid__items { grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (max-width: 767px) {
  .fc-services-grid__items { grid-template-columns: 1fr !important; }
}
.fc-services-grid__item { background: var(--color-surface); padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border); }
.fc-services-grid__item-title { margin: 0 0 var(--space-2); font-family: var(--font-family-heading); font-weight: var(--font-weight-semibold); font-size: var(--font-size-xl); }

.fc-footer { padding: var(--space-6) var(--space-4); border-top: 1px solid var(--color-border); background: var(--color-surface); }
.fc-footer__inner { max-width: var(--container-default); margin: 0 auto; display: flex; flex-direction: column; gap: var(--space-2); align-items: center; }
.fc-footer__copyright { margin: 0; color: var(--color-muted); font-size: var(--font-size-sm); }

.fc-contact-form { padding: var(--space-8) var(--space-4); }
.fc-contact-form--surface-subtle { background: var(--color-surface-subtle); }
.fc-contact-form__inner { max-width: var(--container-narrow); margin: 0 auto; }
.fc-contact-form__heading { font-family: var(--font-family-heading); font-weight: var(--font-weight-bold); font-size: var(--font-size-3xl); margin: 0 0 var(--space-4); text-align: center; }
.fc-contact-form form { display: flex; flex-direction: column; gap: var(--space-3); }
.fc-contact-form__field { display: flex; flex-direction: column; gap: var(--space-1); }
.fc-contact-form__field-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.fc-contact-form input, .fc-contact-form textarea { padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: inherit; font-size: var(--font-size-base); }
.fc-contact-form button { background: var(--color-primary); color: var(--color-bg); padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); border: 0; font-weight: var(--font-weight-semibold); cursor: pointer; }
`;
