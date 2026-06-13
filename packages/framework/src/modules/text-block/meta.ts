import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "text-block",
  version: 1,
  variants: ["prose", "landing"] as const,
  dials: {
    size: ["sm", "md", "lg"] as const,
    textAlign: ["left", "center"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
  },
  contentSchema: {
    heading: { type: "string", required: false },
    body: { type: "markdown", required: true },
  },
} as const satisfies ModuleMeta;
