import { describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// ─────────────────────────────────────────────────────────────────────────
// AC-727: web-fetch-safety is consumable without declaring
// @cloudflare/workers-types. A downstream package that imports
// @1stcontact/web-fetch-safety must compile under `pnpm build` without
// listing @cloudflare/workers-types in its own tsconfig types[]. The library
// must NOT leak a `KVNamespace` ambient-global requirement onto consumers —
// building such a consumer produces zero `TS2304: Cannot find name
// 'KVNamespace'` errors.
//
// `packages/extractor` is exactly that consumer: it imports the package
// (src/mirror-asset.ts) and its tsconfig omits a `types[]` array entirely,
// so it cannot be relying on @cloudflare/workers-types being ambiently
// present. Building it is the concrete observable form of the AC's claim.
// ─────────────────────────────────────────────────────────────────────────
describe("Story story-a0482aed / AC-727: web-fetch-safety is consumable without @cloudflare/workers-types", () => {
  it("test_UAT_AC727_consumer_builds_without_declaring_workers_types", () => {
    // The consumer scenario precondition: the extractor's tsconfig must NOT
    // list @cloudflare/workers-types in compilerOptions.types. If it did, the
    // build would resolve KVNamespace via that ambient declaration and the
    // test would prove nothing about the library's self-containment.
    const extractorTsconfig = JSON.parse(
      readFileSync(resolve(repoRoot, "packages/extractor/tsconfig.json"), "utf-8"),
    ) as { compilerOptions?: { types?: string[] } };
    const declaredTypes = extractorTsconfig.compilerOptions?.types ?? [];
    expect(
      declaredTypes,
      "extractor tsconfig must NOT declare @cloudflare/workers-types — that is the consumer scenario this UAT exercises",
    ).not.toContain("@cloudflare/workers-types");

    // The consumer genuinely imports the library — otherwise its build would
    // not exercise the package's type surface at all.
    const consumerSource = readFileSync(
      resolve(repoRoot, "packages/extractor/src/mirror-asset.ts"),
      "utf-8",
    );
    expect(
      consumerSource,
      "extractor must import @1stcontact/web-fetch-safety for this build to exercise the consumption path",
    ).toContain("@1stcontact/web-fetch-safety");

    // Build the consumer. tsc (--noEmit) exits non-zero and prints the
    // diagnostics to stdout on any type error, so success == exit 0, and the
    // captured output must carry no KVNamespace TS2304 leak from the imported
    // web-fetch-safety sources.
    let exitCode = 0;
    let output = "";
    try {
      output = execSync("pnpm --filter @1stcontact/extractor build", {
        cwd: repoRoot,
        stdio: "pipe",
        encoding: "utf-8",
      });
    } catch (e) {
      const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
      exitCode = typeof err.status === "number" ? err.status : 1;
      output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    }

    expect(
      output,
      "consumer build must not emit 'TS2304: Cannot find name KVNamespace' — the library must not leak the workers-types ambient global",
    ).not.toMatch(/TS2304: Cannot find name 'KVNamespace'/);
    expect(exitCode, `consumer build failed (exit ${exitCode}):\n${output}`).toBe(0);
  }, 120_000);
});
