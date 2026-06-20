import { startServer } from "./server.js";
import { realSpawner } from "./spawner.js";

const DEFAULT_BIN =
  "/Users/martin/Projects/xgendev-main/.venv-working/bin/xgd";
const DEFAULT_CWD = "/Users/martin/Projects/first-contact";
const DEFAULT_PORT = 7878;

const xgdBin = process.env.XGD_BIN ?? DEFAULT_BIN;
const projectCwd = process.env.XGD_CWD ?? DEFAULT_CWD;
const allowedProjectRoot = process.env.XGD_PROJECT_ROOT ?? DEFAULT_CWD;
const port = Number(process.env.PORT ?? DEFAULT_PORT);

const handle = await startServer({
  xgdBin,
  projectCwd,
  allowedProjectRoot,
  spawn: realSpawner,
  port,
  host: "127.0.0.1",
});

process.stdout.write(
  `dev-tools-server listening on 127.0.0.1:${handle.port} ` +
    `(bin=${xgdBin}, cwd=${projectCwd})\n`,
);

const shutdown = async (signal: string): Promise<void> => {
  process.stdout.write(`received ${signal}, shutting down\n`);
  await handle.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
