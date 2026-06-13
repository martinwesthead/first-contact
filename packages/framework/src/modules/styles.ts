import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listRegisteredModules } from "./registry.js";

const STYLE_BLOCK = /<style>([\s\S]*?)<\/style>/g;

let cached: string | undefined;

export async function loadModuleStyles(): Promise<string> {
  if (cached !== undefined) return cached;
  const modulesDir = resolveModulesDir();
  const ids = Array.from(new Set(listRegisteredModules().map((m) => m.id)));
  const parts: string[] = [];
  for (const id of ids) {
    const source = await readFile(join(modulesDir, id, "index.astro"), "utf-8");
    for (const match of source.matchAll(STYLE_BLOCK)) {
      const css = match[1]?.trim();
      if (!css) continue;
      parts.push(`/* ${id} */\n${unscopeGlobal(css)}`);
    }
  }
  cached = parts.join("\n\n") + "\n";
  return cached;
}

function unscopeGlobal(css: string): string {
  // Astro's `:global(selector)` form is a no-op in our pre-extracted output —
  // the surrounding scope rules are not applied here, so we strip the wrapper.
  return css.replace(/:global\(([^)]+)\)/g, "$1");
}

function resolveModulesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here);
}
