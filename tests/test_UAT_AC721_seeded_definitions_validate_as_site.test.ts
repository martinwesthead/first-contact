import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSite } from "../packages/site-schema/src/validate.js";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

interface SiteDefs {
  draft_definition: string;
  published_definition: string;
}

describe("UAT AC-721: seeded 1st Contact definitions validate as a well-formed Site", () => {
  let test: TestDb;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: true });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("test_UAT_AC721_seeded_definitions_validate_as_site", async () => {
    const site = await test.db
      .prepare(
        "SELECT draft_definition, published_definition FROM sites WHERE slug = '1stcontact'",
      )
      .first<SiteDefs>();
    expect(site).toBeTruthy();

    const draft = validateSite(JSON.parse(site!.draft_definition));
    expect(draft.ok).toBe(true);

    const published = validateSite(JSON.parse(site!.published_definition));
    expect(published.ok).toBe(true);
  });
});
