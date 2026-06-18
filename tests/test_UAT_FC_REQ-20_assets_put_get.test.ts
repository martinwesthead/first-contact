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

describe("UAT FC REQ-20: assets PUT then GET round-trip (AC 13)", () => {
  it("AC13: PUT a PNG body; GET returns the same bytes + correct content-type", async () => {
    const env = makeEnv();
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
    const putReq = new Request("https://app.1stcontact.io/api/assets/put/foo.png", {
      method: "PUT",
      headers: { "content-type": "image/png" },
      body: png,
    });
    const putRes = await worker.fetch(putReq, env);
    expect(putRes.status).toBe(200);

    const getReq = new Request("https://app.1stcontact.io/assets/foo.png");
    const getRes = await worker.fetch(getReq, env);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await getRes.arrayBuffer());
    expect(bytes.length).toBe(png.length);
    for (let i = 0; i < png.length; i++) expect(bytes[i]).toBe(png[i]);
  });
});
