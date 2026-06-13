import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "header",
  version: 1,
  variants: ["top-nav"] as const,
  dials: {
    spacingTop: ["0", "1", "2", "3", "4", "6", "8"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8"] as const,
    surface: ["default", "subtle", "inverse"] as const,
  },
  contentSchema: {
    logo: { type: "asset-ref-or-string", required: true },
    entries: { type: { kind: "list-of", of: "nav-entry" }, required: true },
  },
} as const satisfies ModuleMeta;
