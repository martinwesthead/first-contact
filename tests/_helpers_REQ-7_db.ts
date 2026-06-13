import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const MIGRATION_PATH = resolve(
  repoRoot,
  "db/migrations/0001_create_leads.sql",
);

export function readMigrationSql(): string {
  return readFileSync(MIGRATION_PATH, "utf-8");
}

export interface TestDb {
  // D1Database — typed loosely to avoid pulling @cloudflare/workers-types
  // into the helper signature; the handler imports its own typing.
  db: unknown;
  mf: Miniflare;
  cleanup: () => Promise<void>;
}

export async function createTestDb(): Promise<TestDb> {
  const mf = new Miniflare({
    modules: true,
    script: `export default { fetch: () => new Response('') }`,
    d1Databases: { LEADS_DB: "leads-test" },
  });
  const db = (await mf.getD1Database("LEADS_DB")) as unknown;
  await applyMigration(db);
  return {
    db,
    mf,
    cleanup: () => mf.dispose(),
  };
}

export async function applyMigration(db: unknown): Promise<void> {
  const sql = readMigrationSql();
  const statements = splitSqlStatements(sql);
  const d1 = db as {
    prepare: (sql: string) => { run: () => Promise<unknown> };
  };
  for (const stmt of statements) {
    await d1.prepare(stmt).run();
  }
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
