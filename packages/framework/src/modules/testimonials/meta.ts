import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "testimonials",
  version: 1,
  variants: ["single", "grid"] as const,
  dials: {
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
    align: ["left", "center"] as const,
  },
  contentSchema: {
    heading: { type: "string", required: false },
    items: {
      type: {
        kind: "list-of",
        of: {
          kind: "object",
          fields: {
            quote: { type: "markdown", required: true },
            name: { type: "string", required: true },
            title: { type: "string", required: false },
            avatar: { type: "asset-ref", required: false },
          },
        },
        min: 1,
        max: 9,
      },
      required: true,
    },
  },
} as const satisfies ModuleMeta;
