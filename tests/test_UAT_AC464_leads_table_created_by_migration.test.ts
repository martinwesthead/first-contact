import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "./_helpers_REQ-7_db.js";

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  pk: number;
  dflt_value: string | null;
}

interface IndexInfo {
  name: string;
}

describe("UAT AC-464: leads table is created by migration 0001 with the CRM Lite schema and indexes", () => {
  let test: TestDb;
  const prepare = (sql: string) =>
    (test.db as { prepare: (s: string) => { all: () => Promise<{ results: unknown[] }> } })
      .prepare(sql);

  beforeAll(async () => {
    test = await createTestDb();
  });
  afterAll(async () => {
    await test.cleanup();
  });

  it("test_UAT_AC464_leads_migration_creates_table_and_indexes", async () => {
    // (a) Column set and constraints.
    const info = await prepare("PRAGMA table_info('leads')").all();
    const columns = info.results as ColumnInfo[];
    const byName = new Map(columns.map((c) => [c.name, c]));

    const expected: Record<string, { type: string; notnull: number; pk: number }> = {
      id: { type: "TEXT", notnull: 0, pk: 1 },
      site_id: { type: "TEXT", notnull: 1, pk: 0 },
      form_id: { type: "TEXT", notnull: 1, pk: 0 },
      created_at: { type: "INTEGER", notnull: 1, pk: 0 },
      name: { type: "TEXT", notnull: 0, pk: 0 },
      email: { type: "TEXT", notnull: 1, pk: 0 },
      phone: { type: "TEXT", notnull: 0, pk: 0 },
      message: { type: "TEXT", notnull: 0, pk: 0 },
      extra_fields: { type: "TEXT", notnull: 0, pk: 0 },
      page_path: { type: "TEXT", notnull: 0, pk: 0 },
      user_agent: { type: "TEXT", notnull: 0, pk: 0 },
      ip_country: { type: "TEXT", notnull: 0, pk: 0 },
      turnstile_pass: { type: "INTEGER", notnull: 1, pk: 0 },
      status: { type: "TEXT", notnull: 1, pk: 0 },
      notes: { type: "TEXT", notnull: 0, pk: 0 },
    };

    for (const [name, expectedCol] of Object.entries(expected)) {
      const col = byName.get(name);
      expect(col, `missing column: ${name}`).toBeDefined();
      expect(col!.type.toUpperCase()).toBe(expectedCol.type);
      expect(col!.notnull).toBe(expectedCol.notnull);
      expect(col!.pk).toBe(expectedCol.pk);
    }
    expect(byName.size).toBe(Object.keys(expected).length);

    // (b) Defaults: status='new', turnstile_pass=0.
    const status = byName.get("status");
    const turnstile = byName.get("turnstile_pass");
    expect(status?.dflt_value).toMatch(/'new'/);
    expect(turnstile?.dflt_value).toBe("0");

    // (c) Required indexes exist.
    const idxInfo = await prepare("PRAGMA index_list('leads')").all();
    const indexNames = (idxInfo.results as IndexInfo[]).map((r) => r.name);
    expect(indexNames).toContain("leads_site_created");
    expect(indexNames).toContain("leads_status");
  });
});
