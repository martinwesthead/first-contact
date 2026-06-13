import { Site } from "./schema.js";

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; errors: E };

export interface ValidationError {
  path: string;
  message: string;
}

function toJsonPointer(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) return "";
  return (
    "/" +
    path
      .map((p) => String(p).replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  );
}

export function validateSite(input: unknown): Result<Site, ValidationError[]> {
  const result = Site.safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: toJsonPointer(issue.path),
    message: issue.message,
  }));
  return { ok: false, errors };
}
