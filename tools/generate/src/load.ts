import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { validateSite, type Site } from "@gendev/site-schema";

export interface LoadedAsset {
  relPath: string;
  absPath: string;
}

export interface LoadedSite {
  site: Site;
  siteDir: string;
  assets: LoadedAsset[];
}

export class SiteLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteLoadError";
  }
}

export async function loadSite(siteDir: string): Promise<LoadedSite> {
  const absSiteDir = resolve(siteDir);
  const sitePath = join(absSiteDir, "site.json");

  let raw: string;
  try {
    raw = await readFile(sitePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new SiteLoadError(`site.json not found at ${sitePath}`);
    }
    throw err;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new SiteLoadError(
      `Invalid JSON in ${sitePath}: ${(err as Error).message}`,
    );
  }

  const result = validateSite(parsed);
  if (!result.ok) {
    const detail = result.errors
      .map((e) => `  ${e.path || "<root>"}: ${e.message}`)
      .join("\n");
    throw new SiteLoadError(
      `Site validation failed for ${sitePath}:\n${detail}`,
    );
  }

  const assets = await collectAssets(join(absSiteDir, "assets"));

  return { site: result.value, siteDir: absSiteDir, assets };
}

async function collectAssets(assetsDir: string): Promise<LoadedAsset[]> {
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(assetsDir, { withFileTypes: true, recursive: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const out: LoadedAsset[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const parentPath = (entry as unknown as { parentPath?: string; path?: string })
      .parentPath
      ?? (entry as unknown as { path?: string }).path
      ?? assetsDir;
    const absPath = join(parentPath, entry.name);
    out.push({ relPath: relative(assetsDir, absPath), absPath });
  }
  return out;
}
