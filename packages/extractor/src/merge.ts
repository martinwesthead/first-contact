import { resolveUrl } from "./dom.js";
import type {
  ComputedBackgroundAsset,
  ComputedStyles,
  ComputedTypeStyle,
} from "./rendered-fetch.js";
import {
  NOT_DETECTED,
  type AssetRecord,
  type PaletteSignals,
  type Signals,
  type TypeStyle,
} from "./schema.js";

/**
 * Refine Layer A signals with computed-style data from the rendered fetch.
 *
 *   - Typography: computed family/size/weight overrides declared values when
 *     present (computed always wins). Declared values are kept where the
 *     computed pass didn't produce one (rare — happens when a heading tag
 *     isn't on the page).
 *   - Palette: computed body background-color replaces a static `not_detected`
 *     background; the largest-above-the-fold background-color is preferred
 *     when the static layer couldn't resolve background-color from a body
 *     declaration.
 *   - Asset inventory: every computed background-image URL is merged in as a
 *     `kind: 'background'` AssetRecord. Existing entries (same absolute URL)
 *     are NOT duplicated; their `references` count increments instead. New
 *     URLs land at the end of the inventory with classification 'unknown' and
 *     references=1.
 */
export function mergeComputedSignals(
  signals: Signals,
  computed: ComputedStyles,
  computedBackgroundAssets: readonly ComputedBackgroundAsset[],
  baseUrl: string,
): Signals {
  const typography = mergeTypography(signals.typography, computed);
  const palette = mergePalette(signals.palette, computed);
  const assetInventory = mergeAssetInventory(
    signals.assetInventory,
    computedBackgroundAssets,
    baseUrl,
  );
  const backgroundCount = assetInventory.filter((a) => a.kind === "background").length;
  const imagery = { ...signals.imagery, backgroundCount };
  return {
    ...signals,
    palette,
    typography,
    imagery,
    assetInventory,
  };
}

function mergeTypography(
  declared: Signals["typography"],
  computed: ComputedStyles,
): Signals["typography"] {
  const body = mergeOneTypeStyle(declared.body, computed.body);
  const h1 = mergeOneTypeStyle(declared.h1, computed.h1);
  const h2 = mergeOneTypeStyle(declared.h2, computed.h2);
  const h3 = mergeOneTypeStyle(declared.h3, computed.h3);
  const headingFamily = pickFirstResolved([h1.family, h2.family, h3.family]);
  const primaryPair =
    body.family !== NOT_DETECTED && headingFamily !== null
      ? { heading: headingFamily, body: body.family }
      : declared.primaryPair;
  return { body, h1, h2, h3, primaryPair };
}

function mergeOneTypeStyle(
  declared: TypeStyle,
  computed: ComputedTypeStyle,
): TypeStyle {
  return {
    family: nonEmpty(computed.family) ?? declared.family,
    size: nonEmpty(computed.size) ?? declared.size,
    weight: nonEmpty(computed.weight) ?? declared.weight,
  };
}

function mergePalette(
  declared: PaletteSignals,
  computed: ComputedStyles,
): PaletteSignals {
  const bodyBg = nonEmpty(computed.body.backgroundColor);
  const primaryBg = nonEmpty(computed.primaryBackgroundColor);
  const background =
    bodyBg ?? primaryBg ?? declared.background;
  return { ...declared, background };
}

function mergeAssetInventory(
  declared: readonly AssetRecord[],
  computedBackgrounds: readonly ComputedBackgroundAsset[],
  baseUrl: string,
): AssetRecord[] {
  const out: AssetRecord[] = declared.map((r) => ({ ...r }));
  const byUrl = new Map<string, AssetRecord>();
  for (const r of out) byUrl.set(r.url, r);

  for (const asset of computedBackgrounds) {
    if (!asset.url) continue;
    const absolute = resolveUrl(asset.url, baseUrl);
    const existing = byUrl.get(absolute);
    if (existing) {
      existing.references += 1;
      continue;
    }
    const record: AssetRecord = {
      url: absolute,
      kind: "background",
      classification: "unknown",
      references: 1,
    };
    out.push(record);
    byUrl.set(absolute, record);
  }
  return out;
}

function nonEmpty(v: string | undefined | null): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  if (trimmed === "rgba(0, 0, 0, 0)") return null;
  if (trimmed === "transparent") return null;
  return trimmed;
}

function pickFirstResolved(values: readonly TypeStyle["family"][]): string | null {
  for (const v of values) {
    if (v !== NOT_DETECTED && v.length > 0) return v;
  }
  return null;
}
