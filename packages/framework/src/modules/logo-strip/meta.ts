import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "logo-strip",
  version: 1,
  variants: ["logos", "features"] as const,
  dials: {
    columns: ["3", "4", "5", "6"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse"] as const,
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
            label: { type: "string", required: false },
            href: { type: "url", required: false },
          },
        },
        min: 1,
        max: 12,
      },
      required: true,
    },
  },
} as const satisfies ModuleMeta;
