import type { AstroComponentFactory } from "astro/runtime/server/index.js";
import Banner from "./banner/index.astro";
import ContactForm from "./contact-form/index.astro";
import Footer from "./footer/index.astro";
import Header from "./header/index.astro";
import Hero from "./hero/index.astro";
import ImageGallery from "./image-gallery/index.astro";
import LogoStrip from "./logo-strip/index.astro";
import { ALL_METAS } from "./meta.js";
import ServicesGrid from "./services-grid/index.astro";
import SplitSection from "./split-section/index.astro";
import Testimonials from "./testimonials/index.astro";
import TextBlock from "./text-block/index.astro";
import type { ModuleEntry } from "./types.js";

export class CatalogMissError extends Error {
  readonly moduleId: string;
  readonly version: number | undefined;

  constructor(moduleId: string, version: number | undefined, available: string) {
    const versionPart = version === undefined ? "" : ` v${version}`;
    super(
      `Module '${moduleId}'${versionPart} is not in the framework catalog. Available: ${available}`,
    );
    this.name = "CatalogMissError";
    this.moduleId = moduleId;
    this.version = version;
  }
}

// The Astro component for each module id. This is the one place components are
// listed; the metas come from `ALL_METAS` (the single source of truth). A
// mismatch in either direction — a meta with no component, or a component with
// no meta — is caught at module load by `buildRegistry`.
const COMPONENTS_BY_ID: Record<string, AstroComponentFactory> = {
  header: Header,
  hero: Hero,
  banner: Banner,
  footer: Footer,
  "text-block": TextBlock,
  "services-grid": ServicesGrid,
  "split-section": SplitSection,
  "image-gallery": ImageGallery,
  "logo-strip": LogoStrip,
  testimonials: Testimonials,
  "contact-form": ContactForm,
};

function buildRegistry(): Record<string, Record<number, ModuleEntry>> {
  const registry: Record<string, Record<number, ModuleEntry>> = {};
  const metaIds = new Set<string>();
  for (const meta of ALL_METAS) {
    metaIds.add(meta.id);
    const Component = COMPONENTS_BY_ID[meta.id];
    if (!Component) {
      throw new Error(
        `Module '${meta.id}' is declared in ALL_METAS but has no Astro component in COMPONENTS_BY_ID.`,
      );
    }
    if (!registry[meta.id]) registry[meta.id] = {};
    registry[meta.id][meta.version] = { meta, Component };
  }
  for (const id of Object.keys(COMPONENTS_BY_ID)) {
    if (!metaIds.has(id)) {
      throw new Error(
        `Component '${id}' is registered in COMPONENTS_BY_ID but has no meta in ALL_METAS.`,
      );
    }
  }
  return registry;
}

const REGISTRY: Record<string, Record<number, ModuleEntry>> = buildRegistry();

export function getModule(id: string, version: number): ModuleEntry {
  const byId = REGISTRY[id];
  if (!byId) {
    throw new CatalogMissError(id, version, describeRegistry());
  }
  const entry = byId[version];
  if (!entry) {
    const versions = Object.keys(byId).join(", ");
    throw new CatalogMissError(
      id,
      version,
      `'${id}' has versions [${versions}]`,
    );
  }
  return entry;
}

export function listRegisteredModules(): ReadonlyArray<{ id: string; version: number }> {
  const out: { id: string; version: number }[] = [];
  for (const [id, byVersion] of Object.entries(REGISTRY)) {
    for (const v of Object.keys(byVersion)) {
      out.push({ id, version: Number(v) });
    }
  }
  return out;
}

function describeRegistry(): string {
  return listRegisteredModules()
    .map((e) => `${e.id}@v${e.version}`)
    .join(", ");
}
