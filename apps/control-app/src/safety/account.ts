import { extractSession } from "../operator/types.js";

/**
 * Single contract for resolving the per-request account_id used by:
 *   - rate-limit middleware (FETCH_RATE_KV counters)
 *   - browser-rendering budget middleware (BROWSER_BUDGET_KV counters)
 *   - operator-intent-token minting
 *
 * v1: pulls from `x-account-id` header via the existing extractSession; defaults
 * to "anonymous" when absent. REQ-10 (accounts schema + auth) replaces the
 * body here to resolve account_id from the authenticated session cookie. KV
 * counter keys remain `<window>:<accountId>` — switching from "anonymous" to
 * real account IDs leaves the existing default-keyed counters to age out via TTL.
 */
export function extractAccountId(request: Request): string {
  return extractSession(request).account_id;
}

export function extractSessionId(request: Request): string | null {
  return extractSession(request).session_id;
}
