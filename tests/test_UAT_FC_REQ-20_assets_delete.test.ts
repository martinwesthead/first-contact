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

describe("UAT FC REQ-20: DELETE removes the object (AC 16)", () => {
  it("AC16: DELETE then GET returns 404", async () => {
    const env = makeEnv();
    const put = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/gone.txt", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "bye",
      }),
      env,
    );
    expect(put.status).toBe(200);

    const del = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/delete/gone.txt", {
        method: "DELETE",
      }),
      env,
    );
    expect(del.status).toBe(204);

    const get = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/gone.txt"),
      env,
    );
    expect(get.status).toBe(404);
  });
});
