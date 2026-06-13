// Browser-safe re-export of module metas only — no Astro components, no
// Node-only modules. Consumed by builder-ui's bundled SPA entry, which must
// stay browser-bundleable.
export * from "./types.js";
export { meta as headerMeta } from "./header/meta.js";
export { meta as heroMeta } from "./hero/meta.js";
export { meta as footerMeta } from "./footer/meta.js";
export { meta as textBlockMeta } from "./text-block/meta.js";
export { meta as servicesGridMeta } from "./services-grid/meta.js";
export { meta as contactFormMeta } from "./contact-form/meta.js";
