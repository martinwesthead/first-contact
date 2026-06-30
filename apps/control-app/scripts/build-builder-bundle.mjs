// Bundle the builder-ui SPA entry into a single browser-ready ES module that
// the /builder page boots. Output is written to public/_assets/builder.js and
// served as a static asset by the control-app Worker.
//
// Pass --watch to keep esbuild running and rebuild on source change; used by
// `pnpm dev:control` so edits in packages/builder-ui or packages/framework
// reach the browser without a manual rebuild.
import { mkdirSync, copyFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const builderUiEntry = resolve(repoRoot, "packages/builder-ui/src/spa.ts");
// REQ-17: the app shell (app.html) boots its own SPA entry.
const appShellEntry = resolve(repoRoot, "packages/builder-ui/src/app-entry.ts");
const outDir = resolve(here, "..", "public", "_assets");
const siteSource = resolve(repoRoot, "sites/1stcontact/site.json");
const starterSitesDir = resolve(here, "..", "public", "starter-sites");
const starterSiteTarget = resolve(starterSitesDir, "1stcontact.json");

const watch = process.argv.includes("--watch");

mkdirSync(outDir, { recursive: true });
mkdirSync(starterSitesDir, { recursive: true });

// Keep the bundled starter site in lockstep with the source of truth.
copyFileSync(siteSource, starterSiteTarget);

// Two browser bundles: builder.js (/builder standalone) and app.js (/app shell).
const buildOptions = {
  entryPoints: [
    { in: builderUiEntry, out: "builder" },
    { in: appShellEntry, out: "app" },
  ],
  outdir: outDir,
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  minify: false,
  logLevel: "info",
};

// One log line per built bundle so each entry is independently greppable and
// adding future entries never breaks a `Built …/<name>.js` assertion.
const builtPaths = buildOptions.entryPoints.map(
  ({ out }) => `${outDir}/${out}.js`,
);

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  for (const path of builtPaths) {
    console.log(`Watching builder-ui entry → ${path}`);
  }
} else {
  await esbuild.build(buildOptions);
  for (const path of builtPaths) {
    console.log(`Built ${path}`);
  }
}
