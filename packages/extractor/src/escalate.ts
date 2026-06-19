import type { ReferenceDigest } from "./schema.js";

/**
 * shouldEscalateToRendered — REQ-22 will replace the body of this function
 * with the real heuristic (declared signal ratio low → escalate to Browser
 * Rendering). In REQ-21 it ALWAYS returns false so the static-only path is
 * the only path. A unit test asserts the integration point exists.
 */
export function shouldEscalateToRendered(_digest: ReferenceDigest): boolean {
  return false;
}
