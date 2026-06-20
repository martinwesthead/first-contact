import type { ActionHandler, ActionResult } from "./registry.js";

export interface WriteTextAssetEnv {
  readonly ASSETS_BUCKET?: R2Bucket;
}

const KEY_PATTERN = /^sites\/[a-z0-9-]+\/copy\/[a-z0-9-]+\.md$/i;

/**
 * REQ-33 — write a markdown text asset to R2. Used by the AI when the
 * operator asks for a body-copy rewrite ("rephrase this paragraph"). The
 * existing `set_module_content` tool covers swapping between inline-string
 * and AssetRef-text values; this tool covers updating the bytes a
 * referenced `.md` file points at.
 *
 * Validates the key matches `sites/{siteId}/copy/{slug}.md` so the action
 * can't be used to overwrite arbitrary R2 paths.
 */
export const writeTextAssetHandler: ActionHandler = async (input, ctx) => {
  const env = ctx.env as WriteTextAssetEnv;
  const key = typeof input.key === "string" ? input.key : "";
  const content = typeof input.content === "string" ? input.content : null;
  if (!key) {
    return fail("'key' must be a non-empty string");
  }
  if (!KEY_PATTERN.test(key)) {
    return fail(
      `'key' must match sites/{siteId}/copy/{slug}.md — got '${key}'`,
    );
  }
  if (content === null) {
    return fail("'content' must be a string (markdown body)");
  }
  if (!env.ASSETS_BUCKET) {
    return fail("ASSETS_BUCKET binding not configured");
  }
  const bytes = new TextEncoder().encode(content).byteLength;
  await env.ASSETS_BUCKET.put(key, content, {
    httpMetadata: { contentType: "text/markdown" },
  });
  ctx.emit({
    event: "action:notify",
    data: {
      tool: "write_text_asset",
      status: "ok",
      key,
      bytes,
    },
  });
  return ok({ ok: true, key, bytes });
};

function fail(error: string): ActionResult {
  return { status: "failed", error };
}

function ok(payload: Record<string, unknown>): ActionResult {
  return { status: "ok", payload };
}
