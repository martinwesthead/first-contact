import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { unstable_dev, type UnstableDevWorker } from "wrangler";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// REQ-17 AC1 + AC2: the /app shell routes. `/app` redirects to the default
// builder tab; `/app/<site>/<tab>` serves the shell with the active site +
// tab stamped onto the root element so the SPA entry can read them.
describe("UAT FC REQ-17: control-app /app shell routes", () => {
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
    if (worker) await worker.stop();
  });

  it("redirects /app to the default builder tab", async () => {
    const resp = await worker.fetch("/app", { redirect: "manual" });
    expect(resp.status).toBe(302);
    expect(resp.headers.get("location") ?? "").toMatch(
      /\/app\/1stcontact\/builder$/,
    );
  });

  it("redirects /app/<site> (no tab) to that site's builder tab", async () => {
    const resp = await worker.fetch("/app/acme", { redirect: "manual" });
    expect(resp.status).toBe(302);
    expect(resp.headers.get("location") ?? "").toMatch(/\/app\/acme\/builder$/);
  });

  it("serves the shell with data-site/data-tab stamped on the root element", async () => {
    const resp = await worker.fetch("/app/acme/settings");
    expect(resp.status).toBe(200);
    const html = await resp.text();
    expect(html).toContain('id="fc-app-root"');
    expect(html).toContain('data-site="acme"');
    expect(html).toContain('data-tab="settings"');
  });
});
