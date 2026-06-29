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

// REQ-17: the app shell lives at /app/<site>/<tab>. `/app` (and `/app/<site>`
// without a tab) redirect to the default builder tab. The default site mirrors
// the builder SPA's default (sites/1stcontact).
const DEFAULT_APP_SITE = "1stcontact";
const DEFAULT_APP_TAB = "builder";

/**
 * REQ-17: inject the active site + tab onto the shell root element so the SPA
 * entry can read them without re-parsing the URL. HTMLRewriter escapes the
 * attribute values, so URL-derived strings are safe to set directly.
 */
class AppRootAttrs {
  constructor(
    private readonly site: string,
    private readonly tab: string,
  ) {}
  element(el: { setAttribute: (name: string, value: string) => void }): void {
    el.setAttribute("data-site", this.site);
    el.setAttribute("data-tab", this.tab);
  }
}

/**
 * REQ-17: match the /app shell routes. Returns a redirect target (no tab) or
 * the resolved {site, tab}, or null when the path is not an /app route.
 */
function matchAppRoute(
  pathname: string,
): { redirectTo: string } | { site: string; tab: string } | null {
  if (pathname === "/app" || pathname === "/app/") {
    return { redirectTo: `/app/${DEFAULT_APP_SITE}/${DEFAULT_APP_TAB}` };
  }
  const full = pathname.match(/^\/app\/([^/]+)\/([^/]+)\/?$/);
  if (full) {
    return {
      site: decodeURIComponent(full[1]!),
      tab: decodeURIComponent(full[2]!),
    };
  }
  const siteOnly = pathname.match(/^\/app\/([^/]+)\/?$/);
  if (siteOnly) {
    return { redirectTo: `/app/${siteOnly[1]!}/${DEFAULT_APP_TAB}` };
  }
  return null;
}

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
    // REQ-17: the /app shell. `/app` and `/app/<site>` redirect to the default
    // builder tab; `/app/<site>/<tab>` serves app.html with the site + tab
    // stamped onto the shell root element via HTMLRewriter.
    const appRoute = matchAppRoute(url.pathname);
    if (appRoute) {
      if ("redirectTo" in appRoute) {
        return Response.redirect(
          new URL(appRoute.redirectTo, url.origin).toString(),
          302,
        );
      }
      if (env.ASSETS) {
        const rewritten = new Request(
          new URL("/app.html", url.origin).toString(),
          request,
        );
        const assetResponse = await env.ASSETS.fetch(rewritten);
        return new HTMLRewriter()
          .on("#fc-app-root", new AppRootAttrs(appRoute.site, appRoute.tab))
          .transform(assetResponse);
      }
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
