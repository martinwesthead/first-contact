import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runGenerate } from "@1stcontact/generate";
import { makeFixtureSite, writeFixtureSite } from "./_fixtures_REQ-6_site.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const ONE_STC_SITE = resolve(repoRoot, "sites/1stcontact");

const TURNSTILE_SCRIPT_RE = /challenges\.cloudflare\.com\/turnstile\/v0\/api\.js/;
const TURNSTILE_META_RE = /<meta\s+name="fc-turnstile-site-key"/;

async function generateAndReadIndex(
  sitePath: string,
  key: string,
  prefix: string,
): Promise<string> {
  const out = await mkdtemp(join(tmpdir(), prefix));
  const prev = process.env.TURNSTILE_SITE_KEY;
  process.env.TURNSTILE_SITE_KEY = key;
  try {
    await runGenerate({ site: sitePath, out, clean: true });
    const html = await readFile(join(out, "index.html"), "utf-8");
    await rm(out, { recursive: true, force: true });
    return html;
  } finally {
    if (prev === undefined) delete process.env.TURNSTILE_SITE_KEY;
    else process.env.TURNSTILE_SITE_KEY = prev;
  }
}

describe("UAT AC-475: Generated pages containing a contact-form module include the Turnstile script and site-key meta when a Turnstile site key is configured", () => {
  let noFormSiteDir: string;

  beforeAll(async () => {
    noFormSiteDir = await mkdtemp(join(tmpdir(), "ac475-no-form-"));
    await writeFixtureSite(noFormSiteDir, makeFixtureSite());
  });

  afterAll(async () => {
    await rm(noFormSiteDir, { recursive: true, force: true });
  });

  it("test_UAT_AC475_turnstile_emitted_only_when_form_and_key_present", async () => {
    // (a) contact-form present + non-empty site key → script + meta emitted.
    const htmlWith = await generateAndReadIndex(
      ONE_STC_SITE,
      "test-site-key",
      "ac475-with-",
    );
    expect(htmlWith).toMatch(TURNSTILE_META_RE);
    expect(htmlWith).toMatch(
      /<meta\s+name="fc-turnstile-site-key"\s+content="test-site-key"/,
    );
    expect(htmlWith).toMatch(TURNSTILE_SCRIPT_RE);

    // (b) contact-form present + empty site key → neither element present.
    const htmlNoKey = await generateAndReadIndex(
      ONE_STC_SITE,
      "",
      "ac475-no-key-",
    );
    expect(htmlNoKey).not.toMatch(TURNSTILE_META_RE);
    expect(htmlNoKey).not.toMatch(TURNSTILE_SCRIPT_RE);

    // (c) No contact-form module + key set → neither element present.
    const htmlNoForm = await generateAndReadIndex(
      noFormSiteDir,
      "test-site-key",
      "ac475-no-form-out-",
    );
    expect(htmlNoForm).not.toMatch(TURNSTILE_META_RE);
    expect(htmlNoForm).not.toMatch(TURNSTILE_SCRIPT_RE);
  }, 60_000);
});
