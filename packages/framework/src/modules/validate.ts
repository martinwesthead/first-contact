import type {
  ContentFieldSpec,
  ContentFieldType,
  ContentSchema,
  ModuleMeta,
} from "./types.js";

export interface ContentValidationIssue {
  readonly path: ReadonlyArray<string | number>;
  readonly message: string;
}

export interface ContentValidationResult {
  readonly ok: boolean;
  readonly issues: ReadonlyArray<ContentValidationIssue>;
}

export function validateModuleContent(
  meta: ModuleMeta,
  content: Record<string, unknown>,
): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];
  validateSchema(meta.contentSchema, content, [], issues);
  return { ok: issues.length === 0, issues };
}

function validateSchema(
  schema: ContentSchema,
  value: unknown,
  path: ReadonlyArray<string | number>,
  issues: ContentValidationIssue[],
): void {
  if (!isPlainObject(value)) {
    issues.push({ path, message: `expected object, got ${typeName(value)}` });
    return;
  }
  for (const [name, spec] of Object.entries(schema)) {
    const fieldPath = [...path, name];
    const fieldValue = (value as Record<string, unknown>)[name];
    if (fieldValue === undefined) {
      if (spec.required) {
        issues.push({ path: fieldPath, message: "required field is missing" });
      }
      continue;
    }
    validateField(spec, fieldValue, fieldPath, issues);
  }
}

function validateField(
  spec: ContentFieldSpec,
  value: unknown,
  path: ReadonlyArray<string | number>,
  issues: ContentValidationIssue[],
): void {
  validateType(spec.type, value, path, issues);
}

function validateType(
  type: ContentFieldType,
  value: unknown,
  path: ReadonlyArray<string | number>,
  issues: ContentValidationIssue[],
): void {
  if (typeof type === "string") {
    validatePrimitive(type, value, path, issues);
    return;
  }
  switch (type.kind) {
    case "enum":
      if (typeof value !== "string" || !type.values.includes(value)) {
        issues.push({
          path,
          message: `expected one of [${type.values.join(", ")}], got ${typeName(value)}`,
        });
      }
      return;
    case "list-of": {
      if (!Array.isArray(value)) {
        issues.push({ path, message: `expected list, got ${typeName(value)}` });
        return;
      }
      if (type.min !== undefined && value.length < type.min) {
        issues.push({
          path,
          message: `list must have at least ${type.min} items (got ${value.length})`,
        });
      }
      if (type.max !== undefined && value.length > type.max) {
        issues.push({
          path,
          message: `list must have at most ${type.max} items (got ${value.length})`,
        });
      }
      value.forEach((item, idx) => {
        validateType(type.of, item, [...path, idx], issues);
      });
      return;
    }
    case "object":
      validateSchema(type.fields, value, path, issues);
      return;
  }
}

function validatePrimitive(
  kind:
    | "string"
    | "markdown"
    | "asset-ref"
    | "url"
    | "asset-ref-or-string"
    | "nav-entry"
    | "boolean",
  value: unknown,
  path: ReadonlyArray<string | number>,
  issues: ContentValidationIssue[],
): void {
  switch (kind) {
    case "string":
    case "markdown":
    case "url":
      if (typeof value !== "string") {
        issues.push({ path, message: `expected string, got ${typeName(value)}` });
      }
      return;
    case "boolean":
      if (typeof value !== "boolean") {
        issues.push({ path, message: `expected boolean, got ${typeName(value)}` });
      }
      return;
    case "asset-ref":
      if (!isAssetRefShape(value)) {
        issues.push({
          path,
          message: `expected asset-ref (object with src, alt, id), got ${typeName(value)}`,
        });
      }
      return;
    case "asset-ref-or-string":
      if (typeof value !== "string" && !isAssetRefShape(value)) {
        issues.push({
          path,
          message: `expected string or asset-ref, got ${typeName(value)}`,
        });
      }
      return;
    case "nav-entry":
      if (!isPlainObject(value)) {
        issues.push({ path, message: `expected nav-entry object, got ${typeName(value)}` });
      }
      return;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAssetRefShape(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return (
    typeof value.src === "string" &&
    typeof value.alt === "string" &&
    typeof value.id === "string"
  );
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}
