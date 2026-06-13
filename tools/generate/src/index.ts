import { loadSite, SiteLoadError } from "./load.js";
import { renderSite } from "./render.js";
import { writeOutput, type WriteOutputResult } from "./output.js";

export interface RunGenerateOptions {
  site: string;
  out: string;
  clean?: boolean;
}

export interface RunGenerateResult extends WriteOutputResult {
  outDir: string;
}

export async function runGenerate(
  opts: RunGenerateOptions,
): Promise<RunGenerateResult> {
  const loaded = await loadSite(opts.site);
  const rendered = await renderSite(loaded);
  const result = await writeOutput({
    outDir: opts.out,
    loaded,
    rendered,
    clean: opts.clean,
  });
  return { ...result, outDir: opts.out };
}

export { SiteLoadError, loadSite } from "./load.js";
export { renderSite } from "./render.js";
export { writeOutput } from "./output.js";
