import { describe, expect, it, vi } from "vitest";
import workerHandler from "../apps/control-app/src/index.js";

const SHELL_HTML = `<!doctype html>
<html><head><title>1st Contact Builder</title></head>
<body><div id="fc-builder-root"></div>
<script type="module" src="/_assets/builder.js"></script></body></html>`;

function mockAssets(handler: (request: Request) => Promise<Response> | Response) {
  return { fetch: vi.fn(async (req: Request) => handler(req)) };
}

describe("UAT FC REQ-8: control-app serves the /builder SPA shell via static assets", () => {
  it("rewrites GET /builder to /builder.html and returns the shell HTML", async () => {
    const assets = mockAssets(async (request) => {
      const url = new URL(request.url);
      expect(url.pathname).toBe("/builder.html");
      return new Response(SHELL_HTML, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });

    const request = new Request("https://app.1stcontact.io/builder");
    const response = await workerHandler.fetch!(request, { ASSETS: assets } as never, {} as never);

    expect(assets.fetch).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain('id="fc-builder-root"');
    expect(body).toContain('/_assets/builder.js');
  });

  it("serves /builder/ (trailing slash) via the same rewrite", async () => {
    const assets = mockAssets(async (request) => {
      expect(new URL(request.url).pathname).toBe("/builder.html");
      return new Response(SHELL_HTML, { status: 200 });
    });
    const response = await workerHandler.fetch!(
      new Request("https://app.1stcontact.io/builder/"),
      { ASSETS: assets } as never,
      {} as never,
    );
    expect(response.status).toBe(200);
  });

  it("falls through to other static assets (e.g. /starter-sites/1stcontact.json) without rewriting", async () => {
    const assets = mockAssets(async (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/starter-sites/1stcontact.json") {
        return new Response('{"config":{"businessName":"1st Contact"}}', {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    });

    const response = await workerHandler.fetch!(
      new Request("https://app.1stcontact.io/starter-sites/1stcontact.json"),
      { ASSETS: assets } as never,
      {} as never,
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as { config: { businessName: string } };
    expect(json.config.businessName).toBe("1st Contact");
  });
});
