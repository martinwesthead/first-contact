// Browser-safe re-export of module metas only — no Astro components, no
// Node-only modules. Consumed by builder-ui's bundled SPA entry, which must
// stay browser-bundleable.
//
// This module is the single source of truth for the set of module metas.
// Both the component registry (registry.ts) and the render-time markdown bake
// (render/markdown.ts) derive from `ALL_METAS`, so the module set can never
// drift between them — adding a module here (and its component in registry.ts)
// is the only edit required.
export * from "./types.js";
import type { ModuleMeta } from "./types.js";
import { meta as headerMeta } from "./header/meta.js";
import { meta as heroMeta } from "./hero/meta.js";
import { meta as bannerMeta } from "./banner/meta.js";
import { meta as footerMeta } from "./footer/meta.js";
import { meta as textBlockMeta } from "./text-block/meta.js";
import { meta as servicesGridMeta } from "./services-grid/meta.js";
import { meta as splitSectionMeta } from "./split-section/meta.js";
import { meta as imageGalleryMeta } from "./image-gallery/meta.js";
import { meta as logoStripMeta } from "./logo-strip/meta.js";
import { meta as testimonialsMeta } from "./testimonials/meta.js";
import { meta as contactFormMeta } from "./contact-form/meta.js";

export {
  headerMeta,
  heroMeta,
  bannerMeta,
  footerMeta,
  textBlockMeta,
  servicesGridMeta,
  splitSectionMeta,
  imageGalleryMeta,
  logoStripMeta,
  testimonialsMeta,
  contactFormMeta,
};

/**
 * Every module meta, in registry order. Single source of truth for the module
 * set: `registry.ts` pairs each meta with its Astro component, and the render
 * layer derives its markdown-bake metadata map (`METAS_BY_ID`) from this same
 * array — neither maintains its own hand-synced list.
 */
export const ALL_METAS: readonly ModuleMeta[] = [
  headerMeta,
  heroMeta,
  bannerMeta,
  footerMeta,
  textBlockMeta,
  servicesGridMeta,
  splitSectionMeta,
  imageGalleryMeta,
  logoStripMeta,
  testimonialsMeta,
  contactFormMeta,
];

/** Module metas keyed by id. Derived from `ALL_METAS` — never hand-synced. */
export const METAS_BY_ID: Readonly<Record<string, ModuleMeta>> =
  Object.fromEntries(ALL_METAS.map((m) => [m.id, m]));
