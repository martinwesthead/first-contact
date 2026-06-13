interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/forms/contact") {
      if (request.method !== "POST") {
        return jsonResponse(
          { success: false, error: "Method not allowed" },
          405,
        );
      }
      return handleContactStub(request);
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

async function handleContactStub(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse(
      { success: false, error: "Content-Type must be application/json" },
      400,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
  }

  if (!isPlainObject(body)) {
    return jsonResponse(
      { success: false, error: "Body must be a JSON object" },
      400,
    );
  }

  if (typeof body.website === "string" && body.website.length > 0) {
    return jsonResponse({ success: true, dropped: true });
  }

  return jsonResponse({
    success: true,
    dropped: false,
    message: "Thanks — we'll be in touch.",
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && !Array.isArray(value)
  );
}
