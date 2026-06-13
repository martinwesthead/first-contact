export type FontCategory = "display" | "body";

export interface FontSpec {
  readonly id: string;
  readonly family: string;
  readonly googleFamily: string;
  readonly weights: readonly string[];
  readonly category: FontCategory;
}

export const VETTED_FONTS: readonly FontSpec[] = [
  {
    id: "inter",
    family: "Inter",
    googleFamily: "Inter",
    weights: ["400", "500", "600", "700"],
    category: "body",
  },
  {
    id: "manrope",
    family: "Manrope",
    googleFamily: "Manrope",
    weights: ["400", "500", "600", "700"],
    category: "display",
  },
  {
    id: "fraunces",
    family: "Fraunces",
    googleFamily: "Fraunces",
    weights: ["400", "500", "600", "700"],
    category: "display",
  },
  {
    id: "playfair-display",
    family: "Playfair Display",
    googleFamily: "Playfair+Display",
    weights: ["400", "600", "700"],
    category: "display",
  },
  {
    id: "space-grotesk",
    family: "Space Grotesk",
    googleFamily: "Space+Grotesk",
    weights: ["400", "500", "600", "700"],
    category: "display",
  },
  {
    id: "dm-serif-display",
    family: "DM Serif Display",
    googleFamily: "DM+Serif+Display",
    weights: ["400"],
    category: "display",
  },
  {
    id: "outfit",
    family: "Outfit",
    googleFamily: "Outfit",
    weights: ["400", "500", "600", "700"],
    category: "display",
  },
  {
    id: "sora",
    family: "Sora",
    googleFamily: "Sora",
    weights: ["400", "500", "600", "700"],
    category: "display",
  },
  {
    id: "source-sans-3",
    family: "Source Sans 3",
    googleFamily: "Source+Sans+3",
    weights: ["400", "500", "600", "700"],
    category: "body",
  },
  {
    id: "ibm-plex-sans",
    family: "IBM Plex Sans",
    googleFamily: "IBM+Plex+Sans",
    weights: ["400", "500", "600", "700"],
    category: "body",
  },
  {
    id: "lora",
    family: "Lora",
    googleFamily: "Lora",
    weights: ["400", "500", "600", "700"],
    category: "body",
  },
  {
    id: "merriweather",
    family: "Merriweather",
    googleFamily: "Merriweather",
    weights: ["400", "700"],
    category: "body",
  },
  {
    id: "work-sans",
    family: "Work Sans",
    googleFamily: "Work+Sans",
    weights: ["400", "500", "600", "700"],
    category: "body",
  },
];

export function findFontByFamilyDeclaration(declaration: string): FontSpec | undefined {
  const first = declaration.split(",")[0]?.trim();
  if (!first) return undefined;
  const normalised = first.replace(/^['"]/, "").replace(/['"]$/, "").trim().toLowerCase();
  return VETTED_FONTS.find((f) => f.family.toLowerCase() === normalised);
}

export function googleFontsHref(specs: readonly FontSpec[]): string | undefined {
  if (specs.length === 0) return undefined;
  const families = specs
    .map((spec) => `family=${spec.googleFamily}:wght@${spec.weights.join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
