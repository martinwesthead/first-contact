import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { handleAssetsRequest } from "../apps/control-app/src/assets/routes.js";

/**
 * AC-579: the full PUT / LIST / GET / If-Match overwrite / DELETE flow operates
 * against the same R2 emulator that `wrangler dev` uses (Miniflare local R2).
 * We boot the platform proxy directly from `apps/control-app/wrangler.toml`
 * so the test exercises the real ASSETS_BUCKET binding shape — no real cloud
 * bucket required.
 */
describe("UAT AC-579: full CRUD flow operates against locally-emulated asset storage", () => {
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

  it("test_UAT_AC579_put_list_get_ifmatch_delete_round_trip_on_wrangler_emulated_r2", async () => {
    const proxy = await getPlatformProxy<{ ASSETS_BUCKET: R2Bucket }>({
      configPath,
      persist: false,
    });
    dispose = () => proxy.dispose();
    const env = { ASSETS_BUCKET: proxy.env.ASSETS_BUCKET };

    const key = `crud-${Date.now()}.txt`;
    const origin = "https://example.com";

    // 1. PUT initial bytes.
    const put1 = await handleAssetsRequest(
      new Request(`${origin}/api/assets/put/${key}`, {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "v1-body",
      }),
      env,
    );
    expect(put1.status).toBe(200);
    const etag1 = put1.headers.get("etag");
    expect(etag1).toBeTruthy();

    // 2. LIST includes the new key.
    const list = await handleAssetsRequest(
      new Request(`${origin}/api/assets/list`),
      env,
    );
    expect(list.status).toBe(200);
    const listed = (await list.json()) as { items: { key: string }[] };
    expect(listed.items.map((i) => i.key)).toContain(key);

    // 3. GET returns the original bytes.
    const get1 = await handleAssetsRequest(
      new Request(`${origin}/assets/${key}`),
      env,
    );
    expect(get1.status).toBe(200);
    expect(await get1.text()).toBe("v1-body");

    // 4. If-Match overwrite with the captured etag succeeds and rotates etag.
    const overwrite = await handleAssetsRequest(
      new Request(`${origin}/api/assets/put/${key}`, {
        method: "PUT",
        headers: {
          "content-type": "text/plain",
          "if-match": etag1 as string,
        },
        body: "v2-body",
      }),
      env,
    );
    expect(overwrite.status).toBeGreaterThanOrEqual(200);
    expect(overwrite.status).toBeLessThan(300);
    const etag2 = overwrite.headers.get("etag");
    expect(etag2).toBeTruthy();
    expect(etag2).not.toBe(etag1);

    const get2 = await handleAssetsRequest(
      new Request(`${origin}/assets/${key}`),
      env,
    );
    expect(get2.status).toBe(200);
    expect(await get2.text()).toBe("v2-body");

    // 5. DELETE then GET returns 404.
    const del = await handleAssetsRequest(
      new Request(`${origin}/api/assets/delete/${key}`, { method: "DELETE" }),
      env,
    );
    expect(del.status).toBeGreaterThanOrEqual(200);
    expect(del.status).toBeLessThan(300);

    const after = await handleAssetsRequest(
      new Request(`${origin}/assets/${key}`),
      env,
    );
    expect(after.status).toBe(404);
  }, 60_000);
});
