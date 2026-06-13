import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runGenerate } from "@1stcontact/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT FC REQ-6: /api/forms/contact rejects non-JSON content-types", () => {
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

  it("POST with form-encoded body returns 400 and success:false", async () => {
    const resp = await worker.fetch("/api/forms/contact", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "name=alex&email=alex%40example.com",
    });
    expect(resp.status).toBe(400);
    const json = (await resp.json()) as { success: boolean };
    expect(json.success).toBe(false);
  });
});
