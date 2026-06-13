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

describe("UAT FC REQ-7: leads migration produces the expected table + indexes", () => {
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

  it("creates a leads table with the expected columns and constraints", async () => {
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
  });

  it("defaults status='new' and turnstile_pass=0", async () => {
    const info = await prepare("PRAGMA table_info('leads')").all();
    const columns = info.results as ColumnInfo[];
    const status = columns.find((c) => c.name === "status");
    const turnstile = columns.find((c) => c.name === "turnstile_pass");
    expect(status?.dflt_value).toMatch(/'new'/);
    expect(turnstile?.dflt_value).toBe("0");
  });

  it("creates indexes leads_site_created and leads_status", async () => {
    const info = await prepare("PRAGMA index_list('leads')").all();
    const indexes = (info.results as IndexInfo[]).map((r) => r.name);
    expect(indexes).toContain("leads_site_created");
    expect(indexes).toContain("leads_status");
  });
});
