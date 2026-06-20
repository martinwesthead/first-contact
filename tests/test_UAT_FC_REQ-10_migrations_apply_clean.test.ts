import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

interface TableRow {
  name: string;
}

describe("UAT FC REQ-10: forward migrations apply cleanly on a fresh D1", () => {
  let test: TestDb;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: true });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("creates accounts, sites, and revisions tables", async () => {
    const result = await test.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all<TableRow>();
    const names = result.results.map((r) => r.name);
    expect(names).toContain("accounts");
    expect(names).toContain("sites");
    expect(names).toContain("revisions");
  });

  it("creates expected indexes on sites and revisions", async () => {
    const result = await test.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all<TableRow>();
    const names = result.results.map((r) => r.name);
    expect(names).toContain("idx_sites_account_id");
    expect(names).toContain("idx_sites_slug");
    expect(names).toContain("idx_revisions_site_id");
    expect(names).toContain("idx_revisions_site_id_published_at");
  });

  it("seeds the platform account row", async () => {
    const row = await test.db
      .prepare("SELECT id, email, plan_tier FROM accounts WHERE id = 'acct_1stcontact_platform'")
      .first<{ id: string; email: string; plan_tier: string }>();
    expect(row).not.toBeNull();
    expect(row?.email).toBe("hello@1stcontact.io");
    expect(row?.plan_tier).toBe("paid");
  });

  it("seeds the 1stcontact site row with the reserved slug", async () => {
    const row = await test.db
      .prepare(
        "SELECT id, account_id, slug, display_name, published_revision_id FROM sites WHERE id = 'site_1stcontact'",
      )
      .first<{
        id: string;
        account_id: string;
        slug: string;
        display_name: string;
        published_revision_id: string | null;
      }>();
    expect(row).not.toBeNull();
    expect(row?.slug).toBe("1stcontact");
    expect(row?.account_id).toBe("acct_1stcontact_platform");
    expect(row?.published_revision_id).toBe("rev_1stcontact_seed");
  });

  it("seeds the initial revision row pointing at the seeded site", async () => {
    const row = await test.db
      .prepare(
        "SELECT id, site_id, published_by FROM revisions WHERE id = 'rev_1stcontact_seed'",
      )
      .first<{ id: string; site_id: string; published_by: string }>();
    expect(row).not.toBeNull();
    expect(row?.site_id).toBe("site_1stcontact");
    expect(row?.published_by).toBe("acct_1stcontact_platform");
  });
});
