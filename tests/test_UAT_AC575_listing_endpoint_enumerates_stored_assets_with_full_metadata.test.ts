import { describe, expect, it } from "vitest";
import worker from "../apps/control-app/src/index.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

function makeEnv() {
  return {
    ASSETS_BUCKET: makeMemR2(),
    FETCH_RATE_KV: makeMemKv(),
    FETCH_CACHE_KV: makeMemKv(),
    FETCH_ROBOTS_KV: makeMemKv(),
    BROWSER_BUDGET_KV: makeMemKv(),
  };
}

type Listed = {
  key: string;
  size: number;
  etag: string;
  uploaded: string;
  contentType: string;
};

async function put(
  env: ReturnType<typeof makeEnv>,
  key: string,
  contentType: string,
  body: string,
): Promise<void> {
  const res = await worker.fetch(
    new Request(`https://app.1stcontact.io/api/assets/put/${key}`, {
      method: "PUT",
      headers: { "content-type": contentType },
      body,
    }),
    env,
  );
  expect(res.status).toBe(200);
}

describe("UAT AC-575: listing endpoint enumerates stored assets with full metadata", () => {
  it("test_UAT_AC575_list_returns_entry_per_asset_with_key_size_etag_uploaded_contenttype", async () => {
    const env = makeEnv();
    await put(env, "alpha.txt", "text/plain", "alpha-body");
    await put(env, "beta.json", "application/json", "{\"k\":1}");
    await put(env, "gamma.html", "text/html", "<p>hi</p>");

    const listRes = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/list"),
      env,
    );
    expect(listRes.status).toBe(200);

    const body = (await listRes.json()) as { items: Listed[] };
    const items = body.items.slice().sort((a, b) => a.key.localeCompare(b.key));
    expect(items.map((i) => i.key)).toEqual(["alpha.txt", "beta.json", "gamma.html"]);

    const expectedSize: Record<string, number> = {
      "alpha.txt": new TextEncoder().encode("alpha-body").length,
      "beta.json": new TextEncoder().encode("{\"k\":1}").length,
      "gamma.html": new TextEncoder().encode("<p>hi</p>").length,
    };
    const expectedType: Record<string, string> = {
      "alpha.txt": "text/plain",
      "beta.json": "application/json",
      "gamma.html": "text/html",
    };

    for (const item of items) {
      expect(item.key.length).toBeGreaterThan(0);
      expect(item.size).toBe(expectedSize[item.key]);
      expect(Number.isInteger(item.size)).toBe(true);
      expect(item.etag.length).toBeGreaterThan(0);
      expect(typeof item.uploaded).toBe("string");
      // ISO-8601: must parse to a valid Date.
      expect(Number.isNaN(Date.parse(item.uploaded))).toBe(false);
      expect(item.contentType).toBe(expectedType[item.key]);
    }
  });
});
