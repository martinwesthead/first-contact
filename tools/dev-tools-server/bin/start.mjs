#!/usr/bin/env node
// CLI shim for @gendev/dev-tools-server. Spawns the TypeScript entry
// point under vite-node so the implementation can stay in .ts files without
// a separate compile step (matches the @gendev/generate pattern).
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const entry = resolve(pkgRoot, "src/start.ts");

const require = createRequire(import.meta.url);
const viteNodeBin = require.resolve("vite-node/vite-node.mjs");

const child = spawn(
  process.execPath,
  [viteNodeBin, entry, "--", ...process.argv.slice(2)],
  { stdio: "inherit", cwd: process.cwd() },
);

child.on("exit", (code) => process.exit(code ?? 0));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
