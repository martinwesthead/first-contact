import { describe, expect, it, vi } from "vitest";
import workerHandler from "../apps/control-app/src/index.js";

const SHELL_HTML = `<!doctype html>
<html><head><title>1st Contact Builder</title></head>
<body><div id="fc-builder-root"></div>
<script type="module" src="/_assets/builder.js"></script></body></html>`;

function mockAssets(handler: (request: Request) => Promise<Response> | Response) {
  return { fetch: vi.fn(async (req: Request) => handler(req)) };
}

describe("UAT AC-477: GET /builder and /builder/ return the SPA shell via Workers Static Assets", () => {
  it("test_UAT_AC477_builder_route_serves_spa_shell_and_passes_other_assets", async () => {
    // GET /builder → asset binding rewritten to /builder.html
    const builderAssets = mockAssets(async (request) => {
      const url = new URL(request.url);
      expect(url.pathname).toBe("/builder.html");
      return new Response(SHELL_HTML, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });
    const builderRequest = new Request("https://app.1stcontact.io/builder");
    const builderResponse = await workerHandler.fetch!(
      builderRequest,
      { ASSETS: builderAssets } as never,
      {} as never,
    );
    expect(builderAssets.fetch).toHaveBeenCalledOnce();
    expect(builderResponse.status).toBe(200);
    const builderBody = await builderResponse.text();
    expect(builderBody).toContain('id="fc-builder-root"');
    expect(builderBody).toContain("/_assets/builder.js");

    // GET /builder/ → same rewrite
    const builderSlashAssets = mockAssets(async (request) => {
      expect(new URL(request.url).pathname).toBe("/builder.html");
      return new Response(SHELL_HTML, { status: 200 });
    });
    const builderSlashResponse = await workerHandler.fetch!(
      new Request("https://app.1stcontact.io/builder/"),
      { ASSETS: builderSlashAssets } as never,
      {} as never,
    );
    expect(builderSlashResponse.status).toBe(200);

    // Other static assets (e.g. /starter-sites/<name>.json) fall through without rewrite
    const starterAssets = mockAssets(async (request) => {
      const url = new URL(request.url);
      if (url.pathname === "/starter-sites/1stcontact.json") {
        return new Response('{"config":{"businessName":"1st Contact"}}', {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("not found", { status: 404 });
    });
    const starterResponse = await workerHandler.fetch!(
      new Request("https://app.1stcontact.io/starter-sites/1stcontact.json"),
      { ASSETS: starterAssets } as never,
      {} as never,
    );
    expect(starterResponse.status).toBe(200);
    const starterJson = (await starterResponse.json()) as {
      config: { businessName: string };
    };
    expect(starterJson.config.businessName).toBe("1st Contact");
  });
});
