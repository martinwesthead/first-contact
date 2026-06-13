import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runGenerate } from "@1stcontact/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT FC REQ-6: public-site returns 404 for unknown paths", () => {
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

  it("GET /does-not-exist returns 404", async () => {
    const resp = await worker.fetch("/does-not-exist-anywhere");
    expect(resp.status).toBe(404);
  });
});
