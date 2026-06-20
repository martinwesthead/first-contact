import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

describe("UAT FC REQ-10: sites.slug has a UNIQUE constraint", () => {
  let test: TestDb;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: false });
    await test.db
      .prepare(
        "INSERT INTO accounts (id, email, plan_tier, created_at, updated_at) VALUES (?, ?, 'trial', 0, 0)",
      )
      .bind("acct_a", "a@example.com")
      .run();
    await test.db
      .prepare(
        `INSERT INTO sites (id, account_id, slug, display_name, draft_definition, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 0)`,
      )
      .bind("site_one", "acct_a", "acme", "Acme", "{}")
      .run();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("rejects a second site with the same slug", async () => {
    await expect(
      test.db
        .prepare(
          `INSERT INTO sites (id, account_id, slug, display_name, draft_definition, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, 0)`,
        )
        .bind("site_two", "acct_a", "acme", "Acme Duplicate", "{}")
        .run(),
    ).rejects.toThrow(/UNIQUE/i);
  });

  it("permits a different slug under the same account", async () => {
    await expect(
      test.db
        .prepare(
          `INSERT INTO sites (id, account_id, slug, display_name, draft_definition, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, 0)`,
        )
        .bind("site_three", "acct_a", "acme-co", "Acme Co", "{}")
        .run(),
    ).resolves.toBeDefined();
  });
});
