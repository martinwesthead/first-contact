import { describe, expect, it } from "vitest";
import { safeFetch } from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: KV-backed URL response cache (AC 6)", () => {
  it("AC6: second fetch within 1h hits the cache; x-fetch-cache header reads HIT", async () => {
    const env = { FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() };
    let upstreamCalls = 0;
    const fetchImpl = async (): Promise<Response> => {
      upstreamCalls += 1;
      return new Response("hello world", {
        status: 200,
        headers: { "content-type": "text/plain" },
      });
    };
    const first = await safeFetch("https://example.com/x", env, { fetchImpl });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.cacheStatus).toBe("MISS");
    expect(first.headers.get("x-fetch-cache")).toBe("MISS");

    const second = await safeFetch("https://example.com/x", env, { fetchImpl });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.cacheStatus).toBe("HIT");
    expect(second.headers.get("x-fetch-cache")).toBe("HIT");
    expect(upstreamCalls).toBe(1);
    expect(new TextDecoder().decode(second.body)).toBe("hello world");
  });
});
