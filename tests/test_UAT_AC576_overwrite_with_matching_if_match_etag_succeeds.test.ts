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

describe("UAT AC-576: overwrite with matching If-Match etag succeeds and yields a new etag", () => {
  it("test_UAT_AC576_matching_if_match_overwrite_returns_2xx_with_new_etag_and_new_bytes", async () => {
    const env = makeEnv();

    const firstPut = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/note.txt", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "version-1",
      }),
      env,
    );
    expect(firstPut.status).toBe(200);
    const firstEtag = firstPut.headers.get("etag");
    expect(firstEtag).toBeTruthy();

    const overwrite = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/note.txt", {
        method: "PUT",
        headers: {
          "content-type": "text/plain",
          "if-match": firstEtag as string,
        },
        body: "version-2",
      }),
      env,
    );
    expect(overwrite.status).toBeGreaterThanOrEqual(200);
    expect(overwrite.status).toBeLessThan(300);

    const secondEtag = overwrite.headers.get("etag");
    expect(secondEtag).toBeTruthy();
    expect(secondEtag).not.toBe(firstEtag);

    const getRes = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/note.txt"),
      env,
    );
    expect(getRes.status).toBe(200);
    expect(await getRes.text()).toBe("version-2");
  });
});
