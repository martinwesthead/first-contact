import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runGenerate } from "@1stcontact/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT AC-458/AC-459/AC-460: public-site Worker serves the freshly-generated 1stcontact bundle", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    await runGenerate({
      site: resolve(repoRoot, "sites/1stcontact"),
      out: resolve(repoRoot, "apps/public-site/public"),
      clean: true,
    });
    worker = await unstable_dev(
      resolve(repoRoot, "apps/public-site/src/index.ts"),
      {
        config: resolve(repoRoot, "apps/public-site/wrangler.toml"),
        experimental: { disableExperimentalWarning: true },
      },
    );
  }, 60_000);

  afterAll(async () => {
    if (worker) await worker.stop();
  });

  it("test_UAT_AC458_get_root_returns_marketing_html_with_anchors", async () => {
    const resp = await worker.fetch("/");
    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text.trim().toLowerCase().startsWith("<!doctype html>")).toBe(true);
    expect(text).toContain("1st Contact");
    expect(text).toMatch(/id="hero"/);
  });

  it("test_UAT_AC459_get_theme_css_returns_token_declarations", async () => {
    const resp = await worker.fetch("/assets/theme.css");
    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toMatch(/--color-primary:\s*#2563eb/);
    expect(text).toMatch(/--space-4:/);
  });

  it("test_UAT_AC460_get_unknown_path_returns_404", async () => {
    const resp = await worker.fetch("/does-not-exist-anywhere");
    expect(resp.status).toBe(404);
  });
});
