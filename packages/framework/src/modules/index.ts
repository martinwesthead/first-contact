export * from "./types.js";
export {
  CatalogMissError,
  getModule,
  listRegisteredModules,
} from "./registry.js";
export { meta as headerMeta } from "./header/meta.js";
export { meta as heroMeta } from "./hero/meta.js";
export { meta as footerMeta } from "./footer/meta.js";

export { default as Header } from "./header/index.astro";
export { default as Hero } from "./hero/index.astro";
export { default as Footer } from "./footer/index.astro";
