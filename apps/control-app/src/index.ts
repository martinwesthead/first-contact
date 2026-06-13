import { handleChatRequest, type ChatHandlerEnv } from "./chat.js";

export interface Env extends ChatHandlerEnv {
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") {
      return handleChatRequest(request, env);
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
