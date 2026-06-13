import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "services-grid",
  version: 1,
  variants: ["three-col", "two-col"] as const,
  dials: {
    gap: ["tight", "normal", "loose"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
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
            icon: { type: "asset-ref-or-string", required: false },
            title: { type: "string", required: true },
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
        min: 2,
        max: 6,
      },
      required: true,
    },
  },
} as const satisfies ModuleMeta;
