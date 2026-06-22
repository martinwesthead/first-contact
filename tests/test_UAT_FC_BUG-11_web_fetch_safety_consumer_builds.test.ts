import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

describe("UAT FC BUG-11: web-fetch-safety does not leak KVNamespace global onto consumers", () => {
  it("every source file referencing KVNamespace imports it as a type", () => {
    const sources = [
      "packages/web-fetch-safety/src/browser-budget.ts",
      "packages/web-fetch-safety/src/intent-token.ts",
      "packages/web-fetch-safety/src/rate-limit.ts",
      "packages/web-fetch-safety/src/types.ts",
    ];
    for (const rel of sources) {
      const content = readFileSync(resolve(repoRoot, rel), "utf-8");
      expect(content, `${rel} references KVNamespace`).toContain("KVNamespace");
      expect(
        content,
        `${rel} must import KVNamespace as a type so consumers without @cloudflare/workers-types in their tsconfig types[] still resolve it`,
      ).toMatch(
        /import\s+type\s*\{[^}]*\bKVNamespace\b[^}]*\}\s*from\s*["']@cloudflare\/workers-types["']/,
      );
    }
  });

  it("packages/extractor — a consumer whose tsconfig does NOT list @cloudflare/workers-types — builds cleanly", () => {
    const extractorTsconfig = JSON.parse(
      readFileSync(resolve(repoRoot, "packages/extractor/tsconfig.json"), "utf-8"),
    ) as { compilerOptions?: { types?: string[] } };
    expect(
      extractorTsconfig.compilerOptions?.types,
      "extractor tsconfig must NOT declare @cloudflare/workers-types — that's the consumer scenario this UAT exercises",
    ).toBeUndefined();

    expect(() => {
      execSync("pnpm --filter @gendev/extractor build", {
        cwd: repoRoot,
        stdio: "pipe",
      });
    }).not.toThrow();
  }, 120_000);
});
