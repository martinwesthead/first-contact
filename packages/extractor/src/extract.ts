import { parseContent } from "./parse-content.js";
import { parseImagery } from "./parse-imagery.js";
import { parseLayout } from "./parse-layout.js";
import { parsePalette } from "./parse-palette.js";
import { parseTypography } from "./parse-typography.js";
import { NOT_DETECTED, type Signals } from "./schema.js";

/**
 * Run every Layer A extractor in a single pass and assemble the signals
 * payload that ends up under `digest.signals`. Each parser owns its own
 * HTML parse — linkedom is cheap enough that the duplication keeps each
 * parser independently testable. If profiling ever shows this is hot we
 * can pass a shared `ParsedHtml` through.
 */
export function extractSignals(html: string, baseUrl: string): Signals {
  const palette = parsePalette(html, baseUrl);
  const typography = parseTypography(html, baseUrl);
  const layout = parseLayout(html);
  const imagery = parseImagery(html, baseUrl);
  const content = parseContent(html);
  return {
    palette,
    typography,
    layout,
    imagery: imagery.signals,
    content,
    assetInventory: imagery.assetInventory,
  };
}

/**
 * Deterministic baseline for the "What's missing" list. The AI commentary
 * pass can replace or extend this; when no LLM is available (or the call
 * fails) this baseline still gives the operator a useful list.
 */
export function deriveWhatsMissing(signals: Signals): string[] {
  const out: string[] = [];
  const p = signals.palette;
  if (p.background === NOT_DETECTED) out.push("Palette: background color not declared.");
  if (p.body === NOT_DETECTED) out.push("Palette: body text color not declared.");
  if (p.accent === NOT_DETECTED) out.push("Palette: accent color not detected.");
  if (p.cta === NOT_DETECTED) out.push("Palette: CTA color not detected.");

  const t = signals.typography;
  if (t.body.family === NOT_DETECTED) {
    out.push("Typography: body font family not declared.");
  }
  if (t.h1.family === NOT_DETECTED && t.h2.family === NOT_DETECTED) {
    out.push("Typography: heading font family not declared.");
  }
  if (t.primaryPair === NOT_DETECTED) {
    out.push("Typography: no body+heading pair could be inferred.");
  }

  const l = signals.layout;
  if (l.maxContentWidth === NOT_DETECTED) {
    out.push("Layout: max content width not declared.");
  }
  if (l.bias === NOT_DETECTED) out.push("Layout: alignment bias not detected.");

  const i = signals.imagery;
  if (i.imgCount === 0 && i.backgroundCount === 0 && i.videoCount === 0) {
    out.push("Imagery: no visual assets detected.");
  } else if (!i.heroDetected && i.imgCount > 0) {
    out.push("Imagery: no hero image inferred from the inventory.");
  }

  const c = signals.content;
  if (c.headings.length === 0) out.push("Content: no headings detected.");
  if (c.navLinks.length === 0) out.push("Content: no nav links detected.");

  return out;
}
