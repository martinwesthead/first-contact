import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handleChatRoute } from "../apps/control-app/src/chat-routes.js";
import {
  createReq23TestDb,
  insertMessage,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

class FakeR2 {
  store = new Map<string, Uint8Array>();
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe("UAT FC REQ-24: DELETE /api/chats/:sessionId sweeps R2 attachment keys referenced from tool_calls_json", () => {
  let test: TestDb;
  let bucket: FakeR2;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
    bucket = new FakeR2();
    await insertSite(db(), {
      id: "site_sweep",
      account_id: "acct_1stcontact_platform",
      slug: "sweep",
    });
    await insertSession(db(), { id: "sess_sweep", site_id: "site_sweep" });
    // The attachment that should be swept.
    bucket.store.set("assets/sites/site_sweep/hero.png", new Uint8Array([1, 2, 3]));
    // An unrelated key that must NOT be swept.
    bucket.store.set(
      "assets/sites/other_site/keep.png",
      new Uint8Array([4, 5, 6]),
    );
    await insertMessage(db(), {
      id: "msg_sweep_1",
      session_id: "sess_sweep",
      ord: 0,
      role: "assistant",
      content: "uploaded a hero image",
      tool_calls_json: JSON.stringify([
        {
          name: "upload_asset",
          input: { key: "assets/sites/site_sweep/hero.png", bytes: 12345 },
        },
      ]),
    });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("AC11: deleting the session removes the R2 attachment key referenced from its tool_calls_json, but leaves keys outside the session untouched", async () => {
    const res = await handleChatRoute(
      new Request("https://app/api/chats/sess_sweep", { method: "DELETE" }),
      { SITES_DB: db(), ASSETS_BUCKET: bucket },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deleted: boolean; sweptKeys: string[] };
    expect(body.deleted).toBe(true);
    expect(body.sweptKeys).toContain("assets/sites/site_sweep/hero.png");
    expect(bucket.store.has("assets/sites/site_sweep/hero.png")).toBe(false);
    expect(bucket.store.has("assets/sites/other_site/keep.png")).toBe(true);
  });
});
