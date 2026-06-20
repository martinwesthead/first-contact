import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  applyDownMigrations,
  createTestDb,
  listDownMigrations,
  listForwardMigrations,
  type TestDb,
} from "./_helpers_REQ-10_db.js";

interface NameRow {
  name: string;
}

describe("UAT FC REQ-10: down migrations leave the REQ-10 schema empty", () => {
  let test: TestDb;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: true });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("ships a down counterpart for every REQ-10 forward migration", () => {
    const forward = listForwardMigrations()
      .filter((f) => /^000[2345]_/.test(f))
      .map((f) => f.replace(/\.sql$/, ""));
    const down = listDownMigrations().map((f) =>
      f.replace(/\.down\.sql$/, ""),
    );
    for (const stem of forward) {
      expect(down).toContain(stem);
    }
  });

  it("drops the accounts/sites/revisions tables and their indexes", async () => {
    await applyDownMigrations(test.db);

    const tables = await test.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('accounts','sites','revisions')",
      )
      .all<NameRow>();
    expect(tables.results).toEqual([]);

    const indexes = await test.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name IN ('idx_sites_account_id','idx_sites_slug','idx_revisions_site_id','idx_revisions_site_id_published_at')",
      )
      .all<NameRow>();
    expect(indexes.results).toEqual([]);
  });
});
