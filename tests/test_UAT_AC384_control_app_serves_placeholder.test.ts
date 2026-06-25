import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT AC-384: control-app Worker serves placeholder at root", () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev(
      resolve(repoRoot, "apps/control-app/src/index.ts"),
      {
        config: resolve(repoRoot, "apps/control-app/wrangler.toml"),
        experimental: { disableExperimentalWarning: true },
      },
    );
  });

  afterAll(async () => {
    if (worker) {
      await worker.stop();
    }
  });

  it("test_UAT_AC384_control_app_returns_placeholder_at_root", async () => {
    const resp = await worker.fetch("/");
    expect(resp.status).toBe(200);
    const body = await resp.text();
    expect(body).toBe("Hello from app.1stcontact.io");
    const contentType = resp.headers.get("content-type") ?? "";
    expect(contentType.toLowerCase()).toMatch(/^text\/plain/);
  });
});
