import type { PaletteTokens, ThemeTokens } from "@1stcontact/site-schema";
import { defaultThemeTokens } from "./defaults.js";

export type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export interface GenerateThemeCssOptions {
  dark?: Partial<PaletteTokens>;
}

export function generateThemeCss(
  tokens: DeepPartial<ThemeTokens> = {},
  options: GenerateThemeCssOptions = {},
): string {
  const merged = mergeTokens(defaultThemeTokens, tokens);
  const root = emitRoot(merged);
  const dark = options.dark ? emitDark(options.dark) : "";
  return [root, dark].filter(Boolean).join("\n\n") + "\n";
}

function emitRoot(t: ThemeTokens): string {
  const lines: string[] = [];
  for (const [role, value] of Object.entries(t.palette)) {
    lines.push(`  --color-${kebab(role)}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.typography.family)) {
    lines.push(`  --font-family-${kebab(name)}: ${value};`);
  }
  for (const [step, value] of Object.entries(t.typography.scale)) {
    lines.push(`  --font-size-${step}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.typography.weights)) {
    lines.push(`  --font-weight-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.typography.lineHeights)) {
    lines.push(`  --line-height-${kebab(name)}: ${value};`);
  }
  for (const [step, value] of Object.entries(t.spacing)) {
    lines.push(`  --space-${step}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.radius)) {
    lines.push(`  --radius-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.shadow)) {
    lines.push(`  --shadow-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.container)) {
    lines.push(`  --container-${kebab(name)}: ${value};`);
  }
  for (const [name, value] of Object.entries(t.breakpoints)) {
    lines.push(`  --breakpoint-${kebab(name)}: ${value};`);
  }
  return `:root {\n${lines.join("\n")}\n}`;
}

function emitDark(palette: Partial<PaletteTokens>): string {
  const lines: string[] = [];
  for (const [role, value] of Object.entries(palette)) {
    if (value !== undefined) {
      lines.push(`    --color-${kebab(role)}: ${value};`);
    }
  }
  return `@media (prefers-color-scheme: dark) {\n  :root {\n${lines.join("\n")}\n  }\n}`;
}

function kebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function mergeTokens<T>(base: T, override: DeepPartial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override as T) ?? base;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, val] of Object.entries(override)) {
    if (val === undefined) continue;
    const baseVal = (base as Record<string, unknown>)[key];
    out[key] =
      isPlainObject(baseVal) && isPlainObject(val)
        ? mergeTokens(baseVal, val as DeepPartial<typeof baseVal>)
        : val;
  }
  return out as T;
}
