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

describe("UAT AC-577: overwrite with stale If-Match etag is rejected and leaves object unchanged", () => {
  it("test_UAT_AC577_stale_if_match_returns_412_and_object_bytes_unchanged", async () => {
    const env = makeEnv();

    const firstPut = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/locked.txt", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "original",
      }),
      env,
    );
    expect(firstPut.status).toBe(200);
    const originalEtag = firstPut.headers.get("etag");
    expect(originalEtag).toBeTruthy();

    const stale = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/locked.txt", {
        method: "PUT",
        headers: {
          "content-type": "text/plain",
          "if-match": '"deadbeefdeadbeefdeadbeefdeadbeef"',
        },
        body: "should-not-land",
      }),
      env,
    );
    expect(stale.status).toBe(412);

    const getRes = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/locked.txt"),
      env,
    );
    expect(getRes.status).toBe(200);
    expect(await getRes.text()).toBe("original");
    // Etag must still match the original write.
    expect(getRes.headers.get("etag")).toBe(originalEtag);
  });
});
