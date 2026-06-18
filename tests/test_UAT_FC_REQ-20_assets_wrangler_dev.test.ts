import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { handleAssetsRequest } from "../apps/control-app/src/assets/routes.js";

/**
 * AC17: the assets PUT / GET / LIST / DELETE round-trip works against the
 * same R2 emulator that `wrangler dev` uses (Miniflare local R2). We boot
 * the platform proxy directly from `apps/control-app/wrangler.toml` and run
 * the route handlers against its real-shape ASSETS_BUCKET binding.
 *
 * If wrangler can't construct the proxy (CI without local cache, etc.) the
 * test surfaces the cause; it does NOT silently skip — AC17 must hold.
 */
describe("UAT FC REQ-20: wrangler dev R2 emulator round-trip (AC 17)", () => {
  const configPath = path.join(
    process.cwd(),
    "apps",
    "control-app",
    "wrangler.toml",
  );
  let dispose: (() => Promise<void>) | null = null;
  afterAll(async () => {
    if (dispose) {
      try {
        await dispose();
      } catch {
        // ignore
      }
    }
  });

  it("AC17: PUT then LIST then GET then DELETE all pass against ASSETS_BUCKET from wrangler.toml", async () => {
    const proxy = await getPlatformProxy<{
      ASSETS_BUCKET: R2Bucket;
    }>({ configPath, persist: false });
    dispose = () => proxy.dispose();
    const env = { ASSETS_BUCKET: proxy.env.ASSETS_BUCKET };

    const key = `wdev-${Date.now()}.txt`;
    const body = "hello-wrangler-dev";

    const put = await handleAssetsRequest(
      new Request(`https://example.com/api/assets/put/${key}`, {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body,
      }),
      env,
    );
    expect(put.status).toBe(200);

    const list = await handleAssetsRequest(
      new Request("https://example.com/api/assets/list"),
      env,
    );
    expect(list.status).toBe(200);
    const lb = (await list.json()) as { items: { key: string }[] };
    expect(lb.items.map((i) => i.key)).toContain(key);

    const get = await handleAssetsRequest(
      new Request(`https://example.com/assets/${key}`),
      env,
    );
    expect(get.status).toBe(200);
    expect(await get.text()).toBe(body);

    const del = await handleAssetsRequest(
      new Request(`https://example.com/api/assets/delete/${key}`, { method: "DELETE" }),
      env,
    );
    expect(del.status).toBe(204);

    const after = await handleAssetsRequest(
      new Request(`https://example.com/assets/${key}`),
      env,
    );
    expect(after.status).toBe(404);
  }, 60_000);
});
