import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "image-gallery",
  version: 1,
  variants: ["grid", "masonry"] as const,
  dials: {
    columns: ["2", "3", "4"] as const,
    gap: ["tight", "normal", "loose"] as const,
    imageSize: ["sm", "md", "lg"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
  },
  contentSchema: {
    heading: { type: "string", required: false },
    items: {
      type: {
        kind: "list-of",
        of: {
          kind: "object",
          fields: {
            image: { type: "asset-ref", required: true },
            caption: { type: "string", required: false },
          },
        },
        min: 2,
        max: 24,
      },
      required: true,
    },
  },
} as const satisfies ModuleMeta;
