import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "banner",
  version: 1,
  variants: ["simple", "with-cta"] as const,
  dials: {
    size: ["sm", "md", "lg"] as const,
    align: ["left", "center"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
  },
  contentSchema: {
    eyebrow: { type: "string", required: false },
    heading: { type: "string", required: true },
    subhead: { type: "markdown", required: false },
    cta: {
      type: {
        kind: "object",
        fields: {
          label: { type: "string", required: true },
          href: { type: "url", required: true },
        },
      },
      required: false,
    },
  },
} as const satisfies ModuleMeta;
