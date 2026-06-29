import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyDownMigrations,
  createTestDb,
  type TestDb,
} from "./_helpers_REQ-10_db.js";

describe("UAT AC-719: down migrations reverse each forward migration", () => {
  let test: TestDb;

  beforeAll(async () => {
    // Apply all forward migrations (including the seed) ...
    test = await createTestDb({ includeSeed: true });
    // ... then apply the down migrations in reverse order.
    await applyDownMigrations(test.db);
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("test_UAT_AC719_down_migrations_reverse_schema", async () => {
    const objects = await test.db
      .prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'index')")
      .all<{ name: string }>();
    const names = objects.results.map((r) => r.name);

    for (const table of ["accounts", "sites", "revisions"]) {
      expect(names).not.toContain(table);
    }
    for (const index of [
      "idx_sites_account_id",
      "idx_sites_slug",
      "idx_revisions_site_id",
      "idx_revisions_site_id_published_at",
    ]) {
      expect(names).not.toContain(index);
    }
  });
});
