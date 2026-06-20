import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ALLOWED_COMMANDS, handleXgdTicket, type HandlerConfig } from "./handler.js";

export interface ServerConfig extends Omit<HandlerConfig, "allowedCommands"> {
  readonly host?: string;
  readonly port: number;
}

const MAX_REQUEST_BYTES = 64 * 1024;

export async function startServer(
  cfg: ServerConfig,
): Promise<{ port: number; close: () => Promise<void> }> {
  const handlerCfg: HandlerConfig = {
    xgdBin: cfg.xgdBin,
    projectCwd: cfg.projectCwd,
    allowedProjectRoot: cfg.allowedProjectRoot,
    allowedCommands: ALLOWED_COMMANDS,
    spawn: cfg.spawn,
  };
  const server = createServer((req, res) => {
    void handleRequest(req, res, handlerCfg);
  });
  return new Promise((resolveP, rejectP) => {
    server.once("error", rejectP);
    server.listen(cfg.port, cfg.host ?? "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : cfg.port;
      resolveP({
        port,
        close: () =>
          new Promise<void>((res2) => {
            server.close(() => res2());
          }),
      });
    });
  });
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  cfg: HandlerConfig,
): Promise<void> {
  try {
    if (req.method !== "POST") {
      writeJson(res, 405, { ok: false, error: "POST required" });
      return;
    }
    if (req.url !== "/xgd-ticket") {
      writeJson(res, 404, { ok: false, error: `no route ${req.url}` });
      return;
    }
    const raw = await readBody(req);
    if (raw === null) {
      writeJson(res, 413, {
        ok: false,
        error: `request body exceeds ${MAX_REQUEST_BYTES} bytes`,
      });
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      writeJson(res, 400, { ok: false, error: "invalid JSON body" });
      return;
    }
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      writeJson(res, 400, {
        ok: false,
        error: "body must be a JSON object {command, args?}",
      });
      return;
    }
    const result = await handleXgdTicket(parsed as Record<string, unknown>, cfg);
    writeJson(res, result.status, result.body);
  } catch (err) {
    writeJson(res, 500, {
      ok: false,
      error: `sidecar error: ${String(err)}`,
    });
  }
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((resolveP, rejectP) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        req.destroy();
        resolveP(null);
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolveP(Buffer.concat(chunks).toString("utf8")));
    req.on("error", rejectP);
  });
}

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}
