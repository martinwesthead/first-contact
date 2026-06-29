import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

describe("UAT AC-718: forward migrations create accounts/sites/revisions with indexes", () => {
  let test: TestDb;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: false });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("test_UAT_AC718_forward_migrations_create_tables_and_indexes", async () => {
    const tables = await test.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all<{ name: string }>();
    const tableNames = tables.results.map((r) => r.name);
    for (const expected of ["accounts", "sites", "revisions"]) {
      expect(tableNames).toContain(expected);
    }

    const indexes = await test.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all<{ name: string }>();
    const indexNames = indexes.results.map((r) => r.name);
    for (const expected of [
      "idx_sites_account_id",
      "idx_sites_slug",
      "idx_revisions_site_id",
      "idx_revisions_site_id_published_at",
    ]) {
      expect(indexNames).toContain(expected);
    }

    // Expected columns per table.
    const accountsSql = (
      await test.db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='accounts'")
        .first<{ sql: string }>()
    )?.sql;
    expect(accountsSql).toBeTruthy();
    for (const col of ["id", "email", "display_name", "plan_tier", "created_at", "updated_at"]) {
      expect(accountsSql).toContain(col);
    }

    const sitesSql = (
      await test.db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='sites'")
        .first<{ sql: string }>()
    )?.sql;
    expect(sitesSql).toBeTruthy();
    for (const col of [
      "id",
      "account_id",
      "slug",
      "display_name",
      "draft_definition",
      "published_definition",
      "published_at",
      "published_revision_id",
      "created_at",
      "updated_at",
    ]) {
      expect(sitesSql).toContain(col);
    }

    const revisionsSql = (
      await test.db
        .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='revisions'")
        .first<{ sql: string }>()
    )?.sql;
    expect(revisionsSql).toBeTruthy();
    for (const col of [
      "id",
      "site_id",
      "definition",
      "published_at",
      "published_by",
      "description",
      "created_at",
    ]) {
      expect(revisionsSql).toContain(col);
    }

    // UNIQUE constraints on sites.slug and accounts.email.
    expect(sitesSql).toMatch(/slug[^,]*UNIQUE/i);
    expect(accountsSql).toMatch(/email[^,]*UNIQUE/i);
  });
});
