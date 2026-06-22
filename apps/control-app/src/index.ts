import { handleAssetsRequest, matchAssetsRoute, type AssetsEnv } from "./assets/routes.js";
import { handleChatRequest, type ChatHandlerEnv } from "./chat.js";
import {
  handleChatRoute,
  matchChatRoute,
  type ChatRoutesEnv,
} from "./chat-routes.js";
import { handleSseEndpoint } from "./operator/events.js";
import { handleOperatorActionRequest } from "./operator/router.js";
import { handleSafetyHealth, type SafetyHealthEnv } from "./safety/health.js";

export interface Env
  extends ChatHandlerEnv,
    AssetsEnv,
    SafetyHealthEnv,
    ChatRoutesEnv {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  FETCH_RATE_KV: KVNamespace;
  BROWSER_BUDGET_KV?: KVNamespace;
  BROWSER?: unknown;
}

const OPERATOR_ACTION_PREFIX = "/api/operator/";
const SAFETY_HEALTH_PATH = "/api/_safety/health";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") {
      return handleChatRequest(request, env);
    }
    if (matchChatRoute(url)) {
      return handleChatRoute(request, env);
    }
    if (url.pathname === SAFETY_HEALTH_PATH) {
      return handleSafetyHealth(request, env);
    }
    if (matchAssetsRoute(url)) {
      return handleAssetsRequest(request, env);
    }
    if (url.pathname === "/api/operator/events") {
      return handleSseEndpoint(request);
    }
    if (url.pathname.startsWith(OPERATOR_ACTION_PREFIX)) {
      const actionName = url.pathname.slice(OPERATOR_ACTION_PREFIX.length);
      if (actionName.length === 0 || actionName.includes("/")) {
        return new Response(
          JSON.stringify({ error: "operator action name must be a single segment" }),
          {
            status: 404,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return handleOperatorActionRequest(request, env, actionName);
    }
    // /builder (and /builder/) renders the SPA shell. Backed by Workers Static
    // Assets — we rewrite to /builder.html so the Asset binding serves it.
    if (url.pathname === "/builder" || url.pathname === "/builder/") {
      if (env.ASSETS) {
        const rewritten = new Request(
          new URL("/builder.html", url.origin).toString(),
          request,
        );
        return env.ASSETS.fetch(rewritten);
      }
    }
    if (env.ASSETS) {
      // All other paths: try static assets first; fall through to placeholder.
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }
    }
    return new Response("Hello from app.1stcontact.io", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
} satisfies ExportedHandler<Env>;
