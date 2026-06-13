export * from "./types.js";
export {
  CatalogMissError,
  getModule,
  listRegisteredModules,
} from "./registry.js";
export {
  validateModuleContent,
  type ContentValidationIssue,
  type ContentValidationResult,
} from "./validate.js";
export { loadModuleStyles } from "./styles.js";
export { meta as headerMeta } from "./header/meta.js";
export { meta as heroMeta } from "./hero/meta.js";
export { meta as footerMeta } from "./footer/meta.js";
export { meta as textBlockMeta } from "./text-block/meta.js";
export { meta as servicesGridMeta } from "./services-grid/meta.js";
export { meta as contactFormMeta } from "./contact-form/meta.js";

export { default as Header } from "./header/index.astro";
export { default as Hero } from "./hero/index.astro";
export { default as Footer } from "./footer/index.astro";
export { default as TextBlock } from "./text-block/index.astro";
export { default as ServicesGrid } from "./services-grid/index.astro";
export { default as ContactForm } from "./contact-form/index.astro";

export {
  enhanceContactForm,
  wireContactForms,
  type EnhanceOptions,
} from "./contact-form/client.js";
