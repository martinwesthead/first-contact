import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

describe("UAT AC-722: site slugs are globally unique", () => {
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

  it("test_UAT_AC722_duplicate_slug_insert_rejected", async () => {
    await expect(
      test.db
        .prepare(
          `INSERT INTO sites (id, account_id, slug, display_name, draft_definition, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, 0)`,
        )
        .bind("site_two", "acct_a", "acme", "Acme Duplicate", "{}")
        .run(),
    ).rejects.toThrow(/UNIQUE/i);

    // The duplicate row was not persisted: exactly one site holds the slug.
    const count = await test.db
      .prepare("SELECT COUNT(*) AS c FROM sites WHERE slug = 'acme'")
      .first<{ c: number }>();
    expect(count?.c).toBe(1);
  });
});
