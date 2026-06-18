import { describe, expect, it } from "vitest";
import { RobotsTxtCache } from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: robots.txt cache + per-chat override (AC 10)", () => {
  function robotsServer(body: string): typeof fetch {
    return async (input: any): Promise<Response> => {
      const u = typeof input === "string" ? input : input.url;
      if (u.endsWith("/robots.txt")) {
        return new Response(body, { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };
  }

  it("AC10: disallow * blocks; per-chat override unblocks; sibling chat still blocked", async () => {
    const env = { FETCH_ROBOTS_KV: makeMemKv() };
    const fetchImpl = robotsServer("User-agent: *\nDisallow: /\n");
    const cache = new RobotsTxtCache(env, { fetchImpl });

    const blocked = await cache.check("https://example.com/x");
    expect(blocked.allowed).toBe(false);
    if (blocked.allowed) return;
    expect(blocked.origin).toBe("example.com");

    // Same chat applies override → allowed.
    const allowedInChatA = await cache.check("https://example.com/x", {
      overrides: ["example.com"],
    });
    expect(allowedInChatA.allowed).toBe(true);

    // Sibling chat without the override → still blocked.
    const stillBlocked = await cache.check("https://example.com/y");
    expect(stillBlocked.allowed).toBe(false);
  });
});
