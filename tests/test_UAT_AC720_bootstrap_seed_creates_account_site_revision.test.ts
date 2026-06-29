import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

interface AccountRow {
  id: string;
}
interface SiteRow {
  id: string;
  account_id: string;
  slug: string;
  draft_definition: string | null;
  published_definition: string | null;
  published_revision_id: string | null;
}
interface RevisionRow {
  id: string;
  site_id: string;
}

describe("UAT AC-720: bootstrap seed creates platform account, 1st Contact site, initial revision", () => {
  let test: TestDb;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: true });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("test_UAT_AC720_bootstrap_seed_creates_account_site_revision", async () => {
    // Exactly one account.
    const accounts = await test.db
      .prepare("SELECT id FROM accounts")
      .all<AccountRow>();
    expect(accounts.results.length).toBe(1);
    const accountId = accounts.results[0].id;

    // Exactly one site, slug=1stcontact, owned by the platform account.
    const sites = await test.db.prepare("SELECT * FROM sites").all<SiteRow>();
    expect(sites.results.length).toBe(1);
    const site = sites.results[0];
    expect(site.slug).toBe("1stcontact");
    expect(site.account_id).toBe(accountId);
    expect(site.draft_definition).toBeTruthy();
    expect(site.published_definition).toBeTruthy();

    // Exactly one revision, for that site.
    const revisions = await test.db
      .prepare("SELECT * FROM revisions")
      .all<RevisionRow>();
    expect(revisions.results.length).toBe(1);
    const revision = revisions.results[0];
    expect(revision.site_id).toBe(site.id);

    // The site's published pointer references the initial revision.
    expect(site.published_revision_id).toBe(revision.id);
  });
});
