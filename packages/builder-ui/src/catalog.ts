import {
  bannerMeta,
  contactFormMeta,
  footerMeta,
  headerMeta,
  heroMeta,
  servicesGridMeta,
  textBlockMeta,
} from "@1stcontact/framework/meta";
import type { ModuleMeta } from "@1stcontact/framework/meta";

export interface CatalogEntry {
  readonly id: string;
  readonly version: number;
  readonly variants: readonly string[];
  readonly dials: Record<string, readonly string[]>;
}

export interface FrameworkCatalog {
  readonly modules: ReadonlyArray<CatalogEntry>;
  readonly themeTokenNames: ReadonlyArray<string>;
}

const ALL: readonly ModuleMeta[] = [
  headerMeta,
  heroMeta,
  bannerMeta,
  footerMeta,
  textBlockMeta,
  servicesGridMeta,
  contactFormMeta,
];

const THEME_TOKEN_NAMES: readonly string[] = [
  // palette
  "palette.bg",
  "palette.surface",
  "palette.surfaceSubtle",
  "palette.surfaceInverse",
  "palette.text",
  "palette.muted",
  "palette.primary",
  "palette.accent",
  "palette.border",
  // typography
  "typography.family.heading",
  "typography.family.body",
];

export function buildFrameworkCatalog(): FrameworkCatalog {
  return {
    modules: ALL.map((m) => ({
      id: m.id,
      version: m.version,
      variants: m.variants,
      dials: Object.fromEntries(Object.entries(m.dials)) as Record<
        string,
        readonly string[]
      >,
    })),
    themeTokenNames: THEME_TOKEN_NAMES,
  };
}

export function findCatalogEntry(
  catalog: FrameworkCatalog,
  type: string,
  version: number,
): CatalogEntry | undefined {
  return catalog.modules.find((m) => m.id === type && m.version === version);
}
