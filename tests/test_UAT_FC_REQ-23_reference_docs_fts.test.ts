import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createReq23TestDb,
  insertReferenceDoc,
  type D1Like,
} from "./_helpers_REQ-23_db.js";
import type { TestDb } from "./_helpers_REQ-10_db.js";

interface SlugRow {
  slug: string;
}

interface CountRow {
  c: number;
}

describe("UAT FC REQ-23: reference_docs FTS indexes title, summary, and body", () => {
  let test: TestDb;
  const db = (): D1Like => test.db as unknown as D1Like;

  beforeAll(async () => {
    test = await createReq23TestDb();
    await insertReferenceDoc(db(), {
      slug: "modules/hero-split",
      title: "Hero Split Module",
      summary: "Two-column hero with image-left / image-right variants",
      toc_json: JSON.stringify([
        { section_slug: "variants", description: "Allowed variant names" },
        { section_slug: "dials", description: "Per-instance dials" },
      ]),
      body: "## variants\nimage-left, image-right.\n\n## dials\nspacingTop, spacingBottom, align.",
      kind: "module",
    });
    await insertReferenceDoc(db(), {
      slug: "framework-principles",
      title: "Framework Principles",
      summary: "Module-based composition, structured edits, theme tokens",
      body: "Tokens flow through CSS custom properties. Dials are finite enums.",
      kind: "architecture",
    });
  });

  afterAll(async () => {
    await test.cleanup();
  });

  it("matches against the title field", async () => {
    const rows = await db()
      .prepare(
        "SELECT slug FROM reference_docs_fts WHERE reference_docs_fts MATCH ?",
      )
      .bind("hero")
      .all<SlugRow>();
    expect(rows.results.map((r) => r.slug)).toContain("modules/hero-split");
  });

  it("matches against the summary field", async () => {
    const rows = await db()
      .prepare(
        "SELECT slug FROM reference_docs_fts WHERE reference_docs_fts MATCH ?",
      )
      .bind("structured")
      .all<SlugRow>();
    expect(rows.results.map((r) => r.slug)).toContain("framework-principles");
  });

  it("matches against the body field", async () => {
    const rows = await db()
      .prepare(
        "SELECT slug FROM reference_docs_fts WHERE reference_docs_fts MATCH ?",
      )
      .bind("spacingTop")
      .all<SlugRow>();
    expect(rows.results.map((r) => r.slug)).toContain("modules/hero-split");
  });

  it("removes a doc from the FTS index when its row is deleted", async () => {
    await db()
      .prepare("DELETE FROM reference_docs WHERE slug = ?")
      .bind("framework-principles")
      .run();
    const after = await db()
      .prepare(
        "SELECT count(*) AS c FROM reference_docs_fts WHERE reference_docs_fts MATCH ?",
      )
      .bind("structured")
      .first<CountRow>();
    expect(after?.c).toBe(0);
  });

  it("updates the FTS index when a doc's body changes", async () => {
    await db()
      .prepare("UPDATE reference_docs SET body = ? WHERE slug = ?")
      .bind(
        "## variants\nimage-left, image-right.\n\n## dials\nphotographic, illustrated.",
        "modules/hero-split",
      )
      .run();
    const stale = await db()
      .prepare(
        "SELECT count(*) AS c FROM reference_docs_fts WHERE reference_docs_fts MATCH ?",
      )
      .bind("spacingTop")
      .first<CountRow>();
    expect(stale?.c).toBe(0);
    const fresh = await db()
      .prepare(
        "SELECT count(*) AS c FROM reference_docs_fts WHERE reference_docs_fts MATCH ?",
      )
      .bind("photographic")
      .first<CountRow>();
    expect(fresh?.c).toBe(1);
  });
});
