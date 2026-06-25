import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readJson<T = unknown>(rel: string): T {
  return JSON.parse(readFileSync(resolve(repoRoot, rel), "utf-8")) as T;
}

function readToml(rel: string): Record<string, unknown> {
  // wrangler.toml uses a TOML subset; for our checks (name field at top
  // and section names) reading raw and parsing the top-level `name = "..."`
  // is sufficient and avoids adding a TOML dependency.
  return { raw: readFileSync(resolve(repoRoot, rel), "utf-8") };
}

function tomlTopName(raw: string): string | null {
  // Match a top-level `name = "..."` before any section header.
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    if (/^\s*\[/.test(line)) break;
    const m = /^\s*name\s*=\s*"([^"]+)"/.exec(line);
    if (m) return m[1];
  }
  return null;
}

describe("UAT AC-389: every identifier uses the 1stcontact slug, no first-contact remains", () => {
  it("test_UAT_AC389_identifiers_aligned_to_1stcontact_slug", () => {
    const rootPkg = readJson<{ name?: string }>("package.json");
    expect(rootPkg.name).toBe("1stcontact");

    const publicToml = readToml("apps/public-site/wrangler.toml").raw as string;
    expect(tomlTopName(publicToml)).toBe("1stcontact-public-site");

    const controlToml = readToml("apps/control-app/wrangler.toml").raw as string;
    expect(tomlTopName(controlToml)).toBe("1stcontact-control-app");

    const sitesDir = resolve(repoRoot, "sites/1stcontact");
    expect(existsSync(sitesDir), "sites/1stcontact/ directory exists").toBe(true);
    expect(statSync(sitesDir).isDirectory(), "sites/1stcontact/ is a directory").toBe(true);

    const claudeMd = readFileSync(resolve(repoRoot, "CLAUDE.md"), "utf-8");
    const firstNonEmptyLine = claudeMd
      .split(/\r?\n/)
      .find((l) => l.trim().length > 0) ?? "";
    expect(firstNonEmptyLine).toMatch(/^#\s*Claude Instructions for 1stcontact\b/);

    const surfaces: Array<{ rel: string; text: string }> = [
      { rel: "package.json", text: JSON.stringify(rootPkg) },
      { rel: "apps/public-site/wrangler.toml", text: publicToml },
      { rel: "apps/control-app/wrangler.toml", text: controlToml },
      { rel: "CLAUDE.md", text: claudeMd },
    ];
    for (const { rel, text } of surfaces) {
      expect(
        text.includes("first-contact"),
        `${rel} must not contain the legacy 'first-contact' slug`,
      ).toBe(false);
    }
  });
});
