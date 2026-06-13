import type { ModuleMeta } from "../types.js";

export const meta = {
  id: "contact-form",
  version: 1,
  variants: ["inline"] as const,
  dials: {
    align: ["left", "center"] as const,
    spacingTop: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    spacingBottom: ["0", "1", "2", "3", "4", "6", "8", "12", "16", "24"] as const,
    surface: ["default", "subtle", "inverse", "accent"] as const,
  },
  contentSchema: {
    heading: { type: "string", required: false },
    subhead: { type: "markdown", required: false },
    action: { type: "url", required: true },
    submitLabel: { type: "string", required: false },
    successMessage: { type: "markdown", required: false },
    fields: {
      type: {
        kind: "list-of",
        of: {
          kind: "object",
          fields: {
            name: { type: "string", required: true },
            label: { type: "string", required: true },
            type: {
              type: { kind: "enum", values: ["text", "email", "tel", "textarea"] as const },
              required: true,
            },
            required: { type: "boolean", required: true },
          },
        },
        min: 1,
        max: 8,
      },
      required: true,
    },
  },
} as const satisfies ModuleMeta;
