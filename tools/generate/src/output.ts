import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { LoadedSite } from "./load.js";
import type { RenderedSite } from "./render.js";

export interface WriteOutputOptions {
  outDir: string;
  loaded: LoadedSite;
  rendered: RenderedSite;
  clean?: boolean;
}

export interface WriteOutputResult {
  pagesWritten: string[];
  cssPath: string;
  assetsWritten: string[];
}

export async function writeOutput(
  opts: WriteOutputOptions,
): Promise<WriteOutputResult> {
  const { outDir, loaded, rendered } = opts;

  if (opts.clean) {
    await rm(outDir, { recursive: true, force: true });
  }

  await mkdir(outDir, { recursive: true });

  const pagesWritten: string[] = [];
  for (const page of rendered.pages) {
    const dest = join(outDir, page.outputPath);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, page.html, "utf-8");
    pagesWritten.push(dest);
  }

  const cssDest = join(outDir, stripLeadingSlash(rendered.themeCssPath));
  await mkdir(dirname(cssDest), { recursive: true });
  await writeFile(cssDest, rendered.themeCss, "utf-8");

  const assetsWritten: string[] = [];
  const assetDestDir = join(outDir, "assets", "site");
  for (const asset of loaded.assets) {
    const dest = join(assetDestDir, asset.relPath);
    await mkdir(dirname(dest), { recursive: true });
    await copyFile(asset.absPath, dest);
    assetsWritten.push(dest);
  }

  return { pagesWritten, cssPath: cssDest, assetsWritten };
}

function stripLeadingSlash(path: string): string {
  return path.startsWith("/") ? path.slice(1) : path;
}
