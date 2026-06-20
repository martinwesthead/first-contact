import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "split-section",
  version: 1,
  variants: ["image-left", "image-right"] as const,
  dials: {
    size: ["sm", "md", "lg"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
    imageRatio: ["square", "portrait", "landscape"] as const,
  },
  contentSchema: {
    image: { type: "asset-ref", required: true },
    eyebrow: { type: "string", required: false },
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
} as const satisfies ModuleMeta;
