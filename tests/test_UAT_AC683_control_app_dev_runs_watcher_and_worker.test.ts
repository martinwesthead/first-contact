import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// AC-683: The control-app `dev` script launches the builder bundle watcher
// (`build:bundle:watch`) concurrently with `wrangler dev` using a process
// runner that tears both down together, and a `build:bundle:watch` script
// exists that invokes the bundler with --watch.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

interface PackageJson {
  scripts?: Record<string, string>;
}

describe("UAT AC-683: control-app dev command runs the bundle watcher alongside the Worker dev server", () => {
  it("test_UAT_AC683_control_app_dev_runs_watcher_and_worker", () => {
    const pkg = JSON.parse(
      readFileSync(
        resolve(repoRoot, "apps/control-app/package.json"),
        "utf-8",
      ),
    ) as PackageJson;
    const scripts = pkg.scripts ?? {};

    // A `build:bundle:watch` script exists and invokes the bundler with --watch.
    const watchScript = scripts["build:bundle:watch"] ?? "";
    expect(watchScript, "build:bundle:watch script present").toBeTruthy();
    expect(watchScript).toContain("build-builder-bundle.mjs");
    expect(watchScript).toContain("--watch");

    // The `dev` script runs the watcher AND wrangler dev together, not the
    // Worker dev server alone, and uses a process runner (concurrently) that
    // tears both down together.
    const dev = scripts["dev"] ?? "";
    expect(dev, "dev script present").toBeTruthy();
    expect(dev).toContain("build:bundle:watch");
    expect(dev).toContain("wrangler dev");
    expect(dev).toContain("concurrently");
    // The process runner must tear both processes down together when either
    // exits — concurrently's `-k` (--kill-others) flag. Without it a crashed
    // bundler would leave wrangler running orphaned (and vice versa).
    expect(dev).toMatch(/(?:^|\s)(?:-k|--kill-others)(?:\s|$)/);
  });
});
