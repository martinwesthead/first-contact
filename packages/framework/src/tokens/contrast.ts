import type { PaletteTokens } from "@gendev/site-schema";

export type SurfaceVariant = "default" | "subtle" | "inverse" | "accent";

export interface ContrastPair {
  readonly surface: SurfaceVariant;
  readonly background: string;
  readonly foreground: string;
  readonly ratio: number;
  readonly threshold: number;
  readonly pass: boolean;
}

const BODY_TEXT_THRESHOLD = 4.5;
const LARGE_TEXT_THRESHOLD = 3.0;

const SURFACE_THRESHOLDS: Record<SurfaceVariant, number> = {
  default: BODY_TEXT_THRESHOLD,
  subtle: BODY_TEXT_THRESHOLD,
  inverse: BODY_TEXT_THRESHOLD,
  accent: LARGE_TEXT_THRESHOLD,
};

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const fg = relativeLuminance(foregroundHex);
  const bg = relativeLuminance(backgroundHex);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateSurfaceContrast(
  palette: PaletteTokens,
): ContrastPair[] {
  const pairs: Array<{ surface: SurfaceVariant; bg: string; fg: string }> = [
    { surface: "default", bg: palette.bg, fg: palette.text },
    { surface: "subtle", bg: palette.surfaceSubtle, fg: palette.text },
    { surface: "inverse", bg: palette.surfaceInverse, fg: palette.bg },
    { surface: "accent", bg: palette.accent, fg: palette.bg },
  ];
  return pairs.map(({ surface, bg, fg }) => {
    const ratio = contrastRatio(fg, bg);
    const threshold = SURFACE_THRESHOLDS[surface];
    return {
      surface,
      background: bg,
      foreground: fg,
      ratio,
      threshold,
      pass: ratio >= threshold,
    };
  });
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHexChannels(hex);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function parseHexChannels(hex: string): [number, number, number] {
  const m = hex.trim().replace(/^#/, "");
  let r: string, g: string, b: string;
  if (m.length === 3) {
    r = m[0] + m[0];
    g = m[1] + m[1];
    b = m[2] + m[2];
  } else if (m.length === 6 || m.length === 8) {
    r = m.slice(0, 2);
    g = m.slice(2, 4);
    b = m.slice(4, 6);
  } else {
    throw new Error(`contrast: invalid hex colour '${hex}'`);
  }
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}
