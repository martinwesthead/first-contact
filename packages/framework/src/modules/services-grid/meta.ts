import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "services-grid",
  version: 2,
  variants: ["three-col", "two-col", "one-col"] as const,
  dials: {
    gap: ["tight", "normal", "loose"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
    imageStyle: ["icon", "cover", "thumb"] as const,
  },
  contentSchema: {
    heading: { type: "string", required: false },
    subhead: { type: "markdown", required: false },
    items: {
      type: {
        kind: "list-of",
        of: {
          kind: "object",
          fields: {
            image: { type: "asset-ref", required: false },
            heading: { type: "string", required: true },
            body: { type: "markdown", required: true },
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
        },
        min: 1,
        max: 6,
      },
      required: true,
    },
  },
} as const satisfies ModuleMeta;
