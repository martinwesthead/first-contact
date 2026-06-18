import { getRateLimitState } from "@1stcontact/web-fetch-safety";
import type { RateLimitEnv } from "@1stcontact/web-fetch-safety";
import { extractAccountId } from "./account.js";

export interface SafetyHealthEnv extends RateLimitEnv {}

export async function handleSafetyHealth(
  request: Request,
  env: SafetyHealthEnv,
): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "GET required" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  const accountId = extractAccountId(request);
  const state = await getRateLimitState(env, accountId);
  return new Response(
    JSON.stringify({
      account_id: accountId,
      windows: {
        hour: { count: state.hour.count, resets_at: state.hour.resetsAt },
        day: { count: state.day.count, resets_at: state.day.resetsAt },
        burst: { count: state.burst.count, resets_at: state.burst.resetsAt },
      },
    }),
    { status: 200, headers: { "content-type": "application/json; charset=utf-8" } },
  );
}
