import { execFile } from "node:child_process";
import type { Spawner } from "./handler.js";

export const realSpawner: Spawner = (bin, args, opts) =>
  new Promise((resolveP) => {
    execFile(
      bin,
      [...args],
      { cwd: opts.cwd, maxBuffer: 16 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const exitCode =
          err && typeof (err as NodeJS.ErrnoException).code === "number"
            ? Number((err as NodeJS.ErrnoException).code)
            : err
              ? 1
              : 0;
        resolveP({
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          exitCode,
        });
      },
    );
  });
