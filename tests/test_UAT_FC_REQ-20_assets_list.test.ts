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

async function putObject(env: ReturnType<typeof makeEnv>, key: string, contentType: string, body: string) {
  const req = new Request(`https://app.1stcontact.io/api/assets/put/${key}`, {
    method: "PUT",
    headers: { "content-type": contentType },
    body,
  });
  const res = await worker.fetch(req, env);
  expect(res.status).toBe(200);
}

describe("UAT FC REQ-20: assets list reports each stored object (AC 14)", () => {
  it("AC14: list returns key/size/etag/uploaded/contentType for every PUT object", async () => {
    const env = makeEnv();
    await putObject(env, "a.txt", "text/plain", "alpha");
    await putObject(env, "b.json", "application/json", "{}");
    await putObject(env, "c.html", "text/html", "<p>hi</p>");

    const listRes = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/list"),
      env,
    );
    expect(listRes.status).toBe(200);
    const body = (await listRes.json()) as {
      items: { key: string; size: number; etag: string; uploaded: string; contentType: string }[];
    };
    const items = body.items.sort((x, y) => x.key.localeCompare(y.key));
    expect(items.map((i) => i.key)).toEqual(["a.txt", "b.json", "c.html"]);
    for (const i of items) {
      expect(i.size).toBeGreaterThan(0);
      expect(i.etag.length).toBeGreaterThan(0);
      expect(typeof i.uploaded).toBe("string");
      expect(i.uploaded.length).toBeGreaterThan(0);
    }
    expect(items.find((i) => i.key === "a.txt")?.contentType).toBe("text/plain");
    expect(items.find((i) => i.key === "b.json")?.contentType).toBe("application/json");
    expect(items.find((i) => i.key === "c.html")?.contentType).toBe("text/html");
  });
});
