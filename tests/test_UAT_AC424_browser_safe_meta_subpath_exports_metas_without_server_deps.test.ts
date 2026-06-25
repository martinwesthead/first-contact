import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  footerMeta as footerMetaFromRegistry,
  getModule,
  headerMeta as headerMetaFromRegistry,
  heroMeta as heroMetaFromRegistry,
} from "@1stcontact/framework";
import {
  footerMeta,
  headerMeta,
  heroMeta,
} from "@1stcontact/framework/meta";

const HERE = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_SRC = resolve(HERE, "../packages/framework/src");
const META_ENTRY = resolve(FRAMEWORK_SRC, "modules/meta.ts");

interface ImportRef {
  typeOnly: boolean;
  spec: string;
}

function parseImports(source: string): ImportRef[] {
  const cleaned = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  // Collapse all whitespace into single spaces so multi-line imports parse uniformly
  const flat = cleaned.replace(/\s+/g, " ");
  const result: ImportRef[] = [];

  // import [type] <clause> from "spec"
  for (const m of flat.matchAll(
    /(?:^|[;{}\s])import\s+(type\s+)?(?:[^'"]+?\s+)?from\s+['"]([^'"]+)['"]/g,
  )) {
    result.push({ typeOnly: !!m[1], spec: m[2]! });
  }
  // export [type] <clause> from "spec"
  for (const m of flat.matchAll(
    /(?:^|[;{}\s])export\s+(type\s+)?(?:[^'"]+?\s+)?from\s+['"]([^'"]+)['"]/g,
  )) {
    result.push({ typeOnly: !!m[1], spec: m[2]! });
  }
  // import "side-effect"
  for (const m of flat.matchAll(/(?:^|[;{}\s])import\s+['"]([^'"]+)['"]/g)) {
    result.push({ typeOnly: false, spec: m[1]! });
  }
  return result;
}

function resolveLocal(fromFile: string, spec: string): string {
  // The framework source uses `.js` specifiers that resolve to `.ts` files on disk.
  let target = resolve(dirname(fromFile), spec);
  if (target.endsWith(".js")) target = target.replace(/\.js$/, ".ts");
  return target;
}

async function collectRuntimeImportGraph(entry: string): Promise<{
  files: Set<string>;
  externals: Set<string>;
}> {
  const files = new Set<string>();
  const externals = new Set<string>();
  const queue: string[] = [entry];
  while (queue.length > 0) {
    const next = queue.shift()!;
    if (files.has(next)) continue;
    files.add(next);
    const source = await readFile(next, "utf-8");
    for (const ref of parseImports(source)) {
      if (ref.typeOnly) continue;
      if (ref.spec.startsWith(".") || ref.spec.startsWith("/")) {
        queue.push(resolveLocal(next, ref.spec));
      } else {
        externals.add(ref.spec);
      }
    }
  }
  return { files, externals };
}

describe("UAT AC-424: browser-safe meta subpath exports every module meta without depending on server-only modules", () => {
  it("test_UAT_AC424_browser_safe_meta_subpath_exports_metas_without_server_deps", async () => {
    // The metas re-exported from the browser-safe subpath identify the same
    // module id and version as the registry exposes.
    const cases = [
      { browser: headerMeta, fromRegistry: headerMetaFromRegistry, id: "header" },
      { browser: heroMeta, fromRegistry: heroMetaFromRegistry, id: "hero" },
      { browser: footerMeta, fromRegistry: footerMetaFromRegistry, id: "footer" },
    ];
    for (const { browser, fromRegistry, id } of cases) {
      expect(browser.id).toBe(id);
      expect(browser.id).toBe(fromRegistry.id);
      expect(browser.version).toBe(fromRegistry.version);
      const entry = getModule(browser.id, browser.version);
      expect(entry.meta.id).toBe(browser.id);
      expect(entry.meta.version).toBe(browser.version);
    }

    // Static analysis: the runtime dependency graph reachable from the
    // browser-safe meta subpath contains no Astro components and no
    // server-only modules.
    const { files, externals } = await collectRuntimeImportGraph(META_ENTRY);

    // No .astro file is reachable through a runtime import — those carry
    // Astro server runtime which the browser builder cannot bundle.
    for (const file of files) {
      expect(
        file.endsWith(".astro"),
        `runtime graph must not contain Astro component file: ${file}`,
      ).toBe(false);
    }

    // No external runtime import targets Node-only modules or the Astro
    // server runtime. (Type-only imports of these are fine — they are
    // erased at build time — and are filtered out by parseImports.)
    const forbiddenExternalPatterns: RegExp[] = [
      /^node:/,
      /^(fs|path|url|os|crypto|child_process|util|stream|http|https|net|tls|zlib|buffer|process)(\/|$)/,
      /^astro\/runtime\//,
      /^astro\/container/,
    ];
    for (const ext of externals) {
      for (const pat of forbiddenExternalPatterns) {
        expect(
          pat.test(ext),
          `runtime external import "${ext}" reachable from meta subpath must not match ${pat}`,
        ).toBe(false);
      }
    }
  });
});
