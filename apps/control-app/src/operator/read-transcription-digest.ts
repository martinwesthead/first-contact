import type { ActionHandler, ActionResult } from "./registry.js";

export interface ReadTranscriptionDigestEnv {
  readonly ASSETS_BUCKET?: R2Bucket;
}

export const readTranscriptionDigestHandler: ActionHandler = async (input, ctx) => {
  const siteId = input.siteId;
  if (typeof siteId !== "string" || siteId.length === 0) {
    return fail("'siteId' must be a non-empty string");
  }
  const env = ctx.env as ReadTranscriptionDigestEnv;
  if (!env.ASSETS_BUCKET) {
    return fail("ASSETS_BUCKET binding required to read transcription digest");
  }
  const key = `sites/${siteId}/transcription/digest.json`;
  const obj = await env.ASSETS_BUCKET.get(key);
  if (!obj) {
    return fail(`digest_not_found: no transcription digest at ${key}`);
  }
  let parsed: unknown;
  try {
    parsed = await obj.json();
  } catch (err) {
    return fail(`digest_parse_failed: ${String(err)}`);
  }
  return ok({
    kind: "transcription_digest",
    digestKey: key,
    digest: parsed,
  });
};

function fail(error: string): ActionResult {
  return { status: "failed", error };
}

function ok(payload: Record<string, unknown>): ActionResult {
  return { status: "ok", payload };
}
