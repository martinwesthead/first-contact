import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const MIGRATIONS_DIR = resolve(repoRoot, "db/migrations");
export const MIGRATIONS_DOWN_DIR = resolve(repoRoot, "db/migrations-down");
export const SITE_JSON_PATH = resolve(repoRoot, "sites/1stcontact/site.json");

const REQ_10_MIGRATIONS = [
  "0002_create_accounts.sql",
  "0003_create_sites.sql",
  "0004_create_revisions.sql",
  "0005_seed_1stcontact.sql",
];

const REQ_10_DOWN_MIGRATIONS = [
  "0005_seed_1stcontact.down.sql",
  "0004_create_revisions.down.sql",
  "0003_create_sites.down.sql",
  "0002_create_accounts.down.sql",
];

export interface TestDb {
  db: D1Like;
  mf: Miniflare;
  cleanup: () => Promise<void>;
}

interface D1Like {
  prepare: (sql: string) => D1Statement;
}

interface D1Statement {
  run: () => Promise<unknown>;
  all: <T = unknown>() => Promise<{ results: T[] }>;
  first: <T = unknown>() => Promise<T | null>;
  bind: (...args: unknown[]) => D1Statement;
}

export async function createTestDb(options: {
  includeSeed?: boolean;
} = {}): Promise<TestDb> {
  const includeSeed = options.includeSeed ?? true;
  const mf = new Miniflare({
    modules: true,
    script: `export default { fetch: () => new Response('') }`,
    d1Databases: { SITES_DB: "sites-test" },
  });
  const db = (await mf.getD1Database("SITES_DB")) as unknown as D1Like;

  const migrations = includeSeed
    ? REQ_10_MIGRATIONS
    : REQ_10_MIGRATIONS.filter((m) => !m.includes("seed"));

  for (const name of migrations) {
    await applySqlFile(db, resolve(MIGRATIONS_DIR, name));
  }

  return { db, mf, cleanup: () => mf.dispose() };
}

export async function applyDownMigrations(db: D1Like): Promise<void> {
  for (const name of REQ_10_DOWN_MIGRATIONS) {
    await applySqlFile(db, resolve(MIGRATIONS_DOWN_DIR, name));
  }
}

export async function applySqlFile(db: D1Like, path: string): Promise<void> {
  const sql = readFileSync(path, "utf-8");
  for (const stmt of splitSqlStatements(sql)) {
    await db.prepare(stmt).run();
  }
}

export function listForwardMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export function listDownMigrations(): string[] {
  return readdirSync(MIGRATIONS_DOWN_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export function readSiteJson(): string {
  return readFileSync(SITE_JSON_PATH, "utf-8");
}

function splitSqlStatements(sql: string): string[] {
  const noLineComments = sql.replace(/^\s*--.*$/gm, "");
  return noLineComments
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
