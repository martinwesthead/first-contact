import type { AstroComponentFactory } from "astro/runtime/server/index.js";

export type ContentFieldType =
  | "string"
  | "markdown"
  | "asset-ref"
  | "url"
  | "asset-ref-or-string"
  | "nav-entry"
  | { kind: "enum"; values: readonly string[] }
  | { kind: "list-of"; of: ContentFieldType }
  | { kind: "object"; fields: ContentSchema };

export interface ContentFieldSpec {
  type: ContentFieldType;
  required: boolean;
}

export type ContentSchema = Record<string, ContentFieldSpec>;

export type DialEnumeration = readonly string[];

export interface ModuleMeta<
  Variants extends readonly string[] = readonly string[],
  Dials extends Record<string, DialEnumeration> = Record<string, DialEnumeration>,
  Content extends ContentSchema = ContentSchema,
> {
  readonly id: string;
  readonly version: number;
  readonly variants: Variants;
  readonly dials: Dials;
  readonly contentSchema: Content;
}

export interface ModuleEntry {
  readonly meta: ModuleMeta;
  readonly Component: AstroComponentFactory;
}
