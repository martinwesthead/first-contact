#!/usr/bin/env node
// CLI shim for @1stcontact/generate. Spawns the TypeScript entry point under
// vite-node so framework .astro imports resolve through Astro's vite plugin.
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const entry = resolve(pkgRoot, "src/cli.ts");
const config = resolve(pkgRoot, "vite.config.mjs");

const require = createRequire(import.meta.url);
const viteNodeBin = require.resolve("vite-node/vite-node.mjs");

const child = spawn(
  process.execPath,
  [viteNodeBin, "--config", config, entry, "--", ...process.argv.slice(2)],
  { stdio: "inherit", cwd: process.cwd() },
);

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
