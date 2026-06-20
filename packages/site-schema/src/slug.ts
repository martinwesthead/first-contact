import { RESERVED_SLUGS } from "./reserved-slugs.js";

const SLUG_MIN_LEN = 3;
const SLUG_MAX_LEN = 40;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/;

export function isValidSlug(s: string): boolean {
  if (typeof s !== "string") return false;
  if (s.length < SLUG_MIN_LEN || s.length > SLUG_MAX_LEN) return false;
  return SLUG_PATTERN.test(s);
}

export function isReservedSlug(s: string): boolean {
  if (typeof s !== "string") return false;
  return RESERVED_SLUGS.has(s.toLowerCase());
}

const COLLISION_SUFFIXES = ["co", "app", "site", "hq", "now"] as const;

export function suggestAlternativeSlug(taken: string): string[] {
  const base = sanitizeBase(taken);
  const suggestions: string[] = [];

  for (const suffix of COLLISION_SUFFIXES) {
    const candidate = clampSlug(`${base}-${suffix}`);
    if (
      isValidSlug(candidate) &&
      !isReservedSlug(candidate) &&
      candidate !== taken
    ) {
      suggestions.push(candidate);
    }
  }

  for (let i = 0; suggestions.length < 5 && i < 16; i++) {
    const candidate = clampSlug(`${base}-${shortHash(taken, i)}`);
    if (
      isValidSlug(candidate) &&
      !isReservedSlug(candidate) &&
      candidate !== taken &&
      !suggestions.includes(candidate)
    ) {
      suggestions.push(candidate);
    }
  }

  return suggestions;
}

function sanitizeBase(s: string): string {
  const lowered = s.toLowerCase();
  const stripped = lowered.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
  const trimmed = stripped.replace(/^-+|-+$/g, "");
  if (trimmed.length >= SLUG_MIN_LEN) {
    return trimmed.length > SLUG_MAX_LEN - 5
      ? trimmed.slice(0, SLUG_MAX_LEN - 5)
      : trimmed;
  }
  return (trimmed + "site").slice(0, SLUG_MAX_LEN - 5);
}

function clampSlug(s: string): string {
  let out = s.toLowerCase().replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (out.length > SLUG_MAX_LEN) out = out.slice(0, SLUG_MAX_LEN);
  out = out.replace(/-+$/g, "");
  return out;
}

function shortHash(input: string, salt: number): string {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < input.length; i++) {
    h = (h ^ input.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).slice(0, 6);
}
