import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runGenerate } from "@1stcontact/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT FC REQ-6: /api/forms/contact silently drops honeypot submissions", () => {
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

  it("returns 200 with dropped:true when the honeypot field is filled", async () => {
    const resp = await worker.fetch("/api/forms/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Bot",
        email: "bot@spam.example",
        website: "http://spammer.example",
      }),
    });
    expect(resp.status).toBe(200);
    const json = (await resp.json()) as {
      success: boolean;
      dropped: boolean;
    };
    expect(json.success).toBe(true);
    expect(json.dropped).toBe(true);
  });
});
