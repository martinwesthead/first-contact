import { handleContactSubmission, type FormHandlerEnv } from "./forms.js";

interface Env extends FormHandlerEnv {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/forms/contact") {
      if (request.method !== "POST") {
        return new Response(
          JSON.stringify({ success: false, error: "Method not allowed" }),
          {
            status: 405,
            headers: { "content-type": "application/json; charset=utf-8" },
          },
        );
      }
      return handleContactSubmission(request, env);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      const assetResp = await env.ASSETS.fetch(request);
      if (assetResp.status !== 404) {
        return assetResp;
      }
    }

    return new Response("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
} satisfies ExportedHandler<Env>;
