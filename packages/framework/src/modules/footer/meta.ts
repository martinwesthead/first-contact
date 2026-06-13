import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "footer",
  version: 1,
  variants: ["minimal"] as const,
  dials: {
    spacingTop: ["0", "1", "2", "3", "4", "6", "8"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8"] as const,
    surface: ["default", "subtle", "inverse"] as const,
  },
  contentSchema: {
    logo: { type: "asset-ref-or-string", required: false },
    tagline: { type: "string", required: false },
    copyrightHolder: { type: "string", required: true },
    copyrightYear: { type: "string", required: true },
    links: { type: { kind: "list-of", of: "nav-entry" }, required: false },
  },
} as const satisfies ModuleMeta;
