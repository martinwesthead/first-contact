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

describe("UAT FC REQ-20: PUT If-Match etag concurrency (AC 15)", () => {
  it("AC15: stale If-Match → 412 and no overwrite; matching If-Match → success + new etag", async () => {
    const env = makeEnv();
    const firstPut = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/x.txt", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "v1",
      }),
      env,
    );
    expect(firstPut.status).toBe(200);
    const firstEtag = firstPut.headers.get("etag");
    expect(firstEtag).toBeTruthy();

    // Stale If-Match → 412.
    const stale = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/x.txt", {
        method: "PUT",
        headers: {
          "content-type": "text/plain",
          "if-match": '"deadbeefdeadbeefdeadbeefdeadbeef"',
        },
        body: "v2-stale",
      }),
      env,
    );
    expect(stale.status).toBe(412);

    // Body must NOT have been overwritten.
    const get1 = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/x.txt"),
      env,
    );
    expect(await get1.text()).toBe("v1");

    // Matching If-Match → 200; etag bumps.
    const matching = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/x.txt", {
        method: "PUT",
        headers: { "content-type": "text/plain", "if-match": firstEtag as string },
        body: "v2",
      }),
      env,
    );
    expect(matching.status).toBe(200);
    const secondEtag = matching.headers.get("etag");
    expect(secondEtag).toBeTruthy();
    expect(secondEtag).not.toBe(firstEtag);

    const get2 = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/x.txt"),
      env,
    );
    expect(await get2.text()).toBe("v2");
  });
});
