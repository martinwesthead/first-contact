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

describe("UAT AC-578: deleted asset is no longer retrievable", () => {
  it("test_UAT_AC578_delete_followed_by_get_returns_404", async () => {
    const env = makeEnv();

    const put = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/put/ephemeral.txt", {
        method: "PUT",
        headers: { "content-type": "text/plain" },
        body: "goodbye",
      }),
      env,
    );
    expect(put.status).toBe(200);

    // Confirm it was actually there before we delete it — otherwise the
    // 404-after-delete observation would be vacuous.
    const before = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/ephemeral.txt"),
      env,
    );
    expect(before.status).toBe(200);

    const del = await worker.fetch(
      new Request("https://app.1stcontact.io/api/assets/delete/ephemeral.txt", {
        method: "DELETE",
      }),
      env,
    );
    expect(del.status).toBeGreaterThanOrEqual(200);
    expect(del.status).toBeLessThan(300);

    const after = await worker.fetch(
      new Request("https://app.1stcontact.io/assets/ephemeral.txt"),
      env,
    );
    expect(after.status).toBe(404);
  });
});
