import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT FC REQ-1: public-site Worker placeholder", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev(
      resolve(repoRoot, "apps/public-site/src/index.ts"),
      {
        config: resolve(repoRoot, "apps/public-site/wrangler.toml"),
        experimental: { disableExperimentalWarning: true },
      },
    );
  });

  afterAll(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  it("returns the 1stcontact.io placeholder body on GET /", async () => {
    const resp = await worker.fetch("/");
    expect(resp.status).toBe(200);
    const text = await resp.text();
    expect(text).toBe("Hello from 1stcontact.io");
    expect(resp.headers.get("content-type") ?? "").toContain("text/plain");
  });
});
