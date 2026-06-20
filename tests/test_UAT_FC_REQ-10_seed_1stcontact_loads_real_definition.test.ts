import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { validateSite } from "../packages/site-schema/src/validate.js";
import { createTestDb, type TestDb } from "./_helpers_REQ-10_db.js";

interface DefinitionRow {
  draft_definition: string;
  published_definition: string | null;
}

describe("UAT FC REQ-10: seeded 1stcontact definition validates against the site schema", () => {
  let test: TestDb;
  let row: DefinitionRow | null = null;

  beforeAll(async () => {
    test = await createTestDb({ includeSeed: true });
    row = await test.db
      .prepare(
        "SELECT draft_definition, published_definition FROM sites WHERE id = 'site_1stcontact'",
      )
      .first<DefinitionRow>();
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("seeds a non-empty draft_definition", () => {
    expect(row).not.toBeNull();
    expect(row?.draft_definition).toBeTruthy();
  });

  it("parses draft_definition as a valid Site", () => {
    const parsed = JSON.parse(row!.draft_definition);
    const result = validateSite(parsed);
    if (!result.ok) {
      throw new Error(
        `validateSite failed: ${result.errors.map((e) => `${e.path}: ${e.message}`).join("; ")}`,
      );
    }
    expect(result.ok).toBe(true);
  });

  it("seeds an identical published_definition", () => {
    expect(row!.published_definition).toBeTruthy();
    const draft = JSON.parse(row!.draft_definition);
    const published = JSON.parse(row!.published_definition!);
    expect(published).toEqual(draft);
  });
});
