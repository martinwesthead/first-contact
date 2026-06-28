import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

/**
 * Section-aware read of a TOML table body. Returns the lines that belong to the
 * exact `[<header>]` table — from just after its header line up to (but not
 * including) the next `[...]` header. The repo has no TOML parser dependency, so
 * we extract just the one block we care about rather than parse the whole file.
 */
function tomlSection(raw: string, header: string): string[] | null {
  const lines = raw.split("\n");
  const start = lines.findIndex((l) => l.trim() === `[${header}]`);
  if (start === -1) return null;
  const body: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*\[/.test(lines[i])) break;
    body.push(lines[i]);
  }
  return body;
}

function tomlString(sectionLines: string[], key: string): string | null {
  for (const line of sectionLines) {
    const m = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`).exec(line);
    if (m) return m[1];
  }
  return null;
}

describe("UAT AC-615: public-site wrangler.toml declares the production Static Assets binding", () => {
  const raw = readFileSync(
    resolve(repoRoot, "apps/public-site/wrangler.toml"),
    "utf-8",
  );

  it("test_UAT_AC615_top_level_assets_block_declares_public_dir_and_ASSETS_binding", () => {
    const top = tomlSection(raw, "assets");
    expect(top).not.toBeNull();
    expect(tomlString(top!, "directory")).toBe("./public");
    expect(tomlString(top!, "binding")).toBe("ASSETS");
  });

  it("test_UAT_AC615_production_assets_block_declares_public_dir_and_ASSETS_binding", () => {
    const prod = tomlSection(raw, "env.production.assets");
    expect(prod).not.toBeNull();
    expect(tomlString(prod!, "directory")).toBe("./public");
    expect(tomlString(prod!, "binding")).toBe("ASSETS");
  });

  it("test_UAT_AC615_production_assets_directory_matches_top_level", () => {
    const top = tomlSection(raw, "assets");
    const prod = tomlSection(raw, "env.production.assets");
    expect(top).not.toBeNull();
    expect(prod).not.toBeNull();
    expect(tomlString(prod!, "directory")).toBe(tomlString(top!, "directory"));
  });
});
