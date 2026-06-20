import Banner from "./banner/index.astro";
import { meta as bannerMeta } from "./banner/meta.js";
import ContactForm from "./contact-form/index.astro";
import { meta as contactFormMeta } from "./contact-form/meta.js";
import Footer from "./footer/index.astro";
import { meta as footerMeta } from "./footer/meta.js";
import Header from "./header/index.astro";
import { meta as headerMeta } from "./header/meta.js";
import Hero from "./hero/index.astro";
import { meta as heroMeta } from "./hero/meta.js";
import ImageGallery from "./image-gallery/index.astro";
import { meta as imageGalleryMeta } from "./image-gallery/meta.js";
import LogoStrip from "./logo-strip/index.astro";
import { meta as logoStripMeta } from "./logo-strip/meta.js";
import ServicesGrid from "./services-grid/index.astro";
import { meta as servicesGridMeta } from "./services-grid/meta.js";
import SplitSection from "./split-section/index.astro";
import { meta as splitSectionMeta } from "./split-section/meta.js";
import Testimonials from "./testimonials/index.astro";
import { meta as testimonialsMeta } from "./testimonials/meta.js";
import TextBlock from "./text-block/index.astro";
import { meta as textBlockMeta } from "./text-block/meta.js";
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

const REGISTRY: Record<string, Record<number, ModuleEntry>> = {
  [headerMeta.id]: { [headerMeta.version]: { meta: headerMeta, Component: Header } },
  [heroMeta.id]: { [heroMeta.version]: { meta: heroMeta, Component: Hero } },
  [bannerMeta.id]: { [bannerMeta.version]: { meta: bannerMeta, Component: Banner } },
  [footerMeta.id]: { [footerMeta.version]: { meta: footerMeta, Component: Footer } },
  [textBlockMeta.id]: {
    [textBlockMeta.version]: { meta: textBlockMeta, Component: TextBlock },
  },
  [servicesGridMeta.id]: {
    [servicesGridMeta.version]: { meta: servicesGridMeta, Component: ServicesGrid },
  },
  [splitSectionMeta.id]: {
    [splitSectionMeta.version]: { meta: splitSectionMeta, Component: SplitSection },
  },
  [imageGalleryMeta.id]: {
    [imageGalleryMeta.version]: { meta: imageGalleryMeta, Component: ImageGallery },
  },
  [logoStripMeta.id]: {
    [logoStripMeta.version]: { meta: logoStripMeta, Component: LogoStrip },
  },
  [testimonialsMeta.id]: {
    [testimonialsMeta.version]: { meta: testimonialsMeta, Component: Testimonials },
  },
  [contactFormMeta.id]: {
    [contactFormMeta.version]: { meta: contactFormMeta, Component: ContactForm },
  },
};

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
