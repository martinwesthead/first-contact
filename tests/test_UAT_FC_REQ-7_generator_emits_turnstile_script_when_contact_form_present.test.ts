import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runGenerate } from "@1stcontact/generate";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT FC REQ-7: generator emits Turnstile script + meta tag when a contact-form is on the page", () => {
  let outDir: string;
  const prevKey = process.env.TURNSTILE_SITE_KEY;

  beforeAll(async () => {
    process.env.TURNSTILE_SITE_KEY = "0x4AAAAAAAtest-key";
    outDir = await mkdtemp(join(tmpdir(), "req7-gen-"));
    await runGenerate({
      site: resolve(repoRoot, "sites/1stcontact"),
      out: outDir,
      clean: true,
    });
  }, 30_000);

  afterAll(async () => {
    if (prevKey === undefined) delete process.env.TURNSTILE_SITE_KEY;
    else process.env.TURNSTILE_SITE_KEY = prevKey;
    await rm(outDir, { recursive: true, force: true });
  });

  it("includes the Turnstile script tag and the site-key meta", async () => {
    const html = await readFile(join(outDir, "index.html"), "utf-8");
    expect(html).toMatch(
      /<meta name="fc-turnstile-site-key" content="0x4AAAAAAAtest-key"/,
    );
    expect(html).toMatch(/challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/);
    expect(html).toMatch(/onload=fcTurnstileReady/);
  });
});
