import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, statSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  isWatchableSourceFile,
  workspaceDepSrcDirs,
  touchEntry,
} from "../apps/control-app/scripts/dev-worker-rebuild.mjs";

/**
 * BUG-20: `pnpm dev` must rebuild the worker when a linked workspace package's
 * source changes. The watcher watches each workspace dep's src/ and touches the
 * worker entry to nudge wrangler's re-bundle. These UATs cover the pieces that
 * decide whether a change is picked up: which dirs are watched, which files
 * count as source, that touch bumps the mtime, and that `pnpm dev` wires it in.
 */
const APP_ROOT = resolve(process.cwd(), "apps/control-app");

describe("UAT FC BUG-20: dev worker rebuilds on workspace-dependency changes", () => {
  const tmpFiles: string[] = [];
  afterEach(() => {
    for (const f of tmpFiles.splice(0)) rmSync(f, { recursive: true, force: true });
  });

  it("watches the src/ of every workspace dependency the worker bundles", () => {
    const dirs = workspaceDepSrcDirs(APP_ROOT);
    // The worker imports all five @gendev/* workspace packages — each must be
    // watched so any of their source edits reach the running worker.
    const expected = [
      "builder-ui",
      "extractor",
      "framework",
      "site-schema",
      "web-fetch-safety",
    ];
    for (const name of expected) {
      const hit = dirs.find((d) => d.includes(`/${name}/`) && d.endsWith("/src"));
      expect(hit, `expected a watched src dir for packages/${name}`).toBeTruthy();
    }
    // Every returned path is a real src dir.
    for (const d of dirs) expect(d.endsWith("/src")).toBe(true);
  });

  it("treats source files as watchable and ignores non-source files", () => {
    expect(isWatchableSourceFile("browser-budget.ts")).toBe(true);
    expect(isWatchableSourceFile("nested/dir/index.mjs")).toBe(true);
    expect(isWatchableSourceFile("catalog.json")).toBe(true);
    expect(isWatchableSourceFile("README.md")).toBe(false);
    expect(isWatchableSourceFile("logo.png")).toBe(false);
    expect(isWatchableSourceFile(undefined as unknown as string)).toBe(false);
  });

  it("touchEntry bumps the entry's mtime so wrangler re-bundles", async () => {
    const dir = mkdtempSync(join(tmpdir(), "bug20-"));
    tmpFiles.push(dir);
    const entry = join(dir, "index.ts");
    writeFileSync(entry, "export const x = 1;\n");
    // Backdate the mtime so the touch is unambiguously newer.
    const past = new Date(Date.now() - 60_000);
    utimesSync(entry, past, past);
    const before = statSync(entry).mtimeMs;

    await touchEntry(entry);

    const after = statSync(entry).mtimeMs;
    expect(after).toBeGreaterThan(before);
  });

  it("`pnpm dev` wires in the rebuild watcher alongside wrangler dev", async () => {
    const pkg = JSON.parse(
      (await import("node:fs")).readFileSync(join(APP_ROOT, "package.json"), "utf8"),
    );
    const dev: string = pkg.scripts.dev;
    expect(dev).toContain("node scripts/dev-worker-rebuild.mjs");
    // The watcher complements — does not replace — the existing dev processes.
    expect(dev).toContain("wrangler dev --port 8788");
    expect(dev).toContain("build:bundle:watch");
  });
});
