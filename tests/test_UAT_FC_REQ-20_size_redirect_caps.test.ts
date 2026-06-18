import { describe, expect, it } from "vitest";
import { safeFetch, MAX_BODY_BYTES, MAX_REDIRECTS } from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: size + redirect caps (AC 4–5)", () => {
  function makeEnv() {
    return { FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() };
  }

  it("AC4: a 10 MB response is aborted at the 5 MB boundary; no body returned", async () => {
    const tenMb = 10 * 1024 * 1024;
    const fetchImpl = async (): Promise<Response> => {
      const chunk = new Uint8Array(64 * 1024).fill(0x41);
      let remaining = tenMb;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (remaining <= 0) {
            controller.close();
            return;
          }
          const next = remaining >= chunk.byteLength ? chunk : chunk.slice(0, remaining);
          remaining -= next.byteLength;
          controller.enqueue(next);
        },
      });
      return new Response(stream, { status: 200, headers: { "content-type": "text/plain" } });
    };
    const res = await safeFetch("https://example.com/big", makeEnv(), {
      fetchImpl,
      cacheEnabled: false,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("body_too_large");
    expect(MAX_BODY_BYTES).toBe(5 * 1024 * 1024);
  });

  it("AC5: safeFetch follows up to 5 redirects; the 6th returns too_many_redirects", async () => {
    let hops = 0;
    const fetchImpl = async (input: any): Promise<Response> => {
      const u = new URL(typeof input === "string" ? input : input.url);
      hops += 1;
      const n = Number(u.searchParams.get("n") ?? "0");
      if (n >= MAX_REDIRECTS + 1) {
        return new Response("done", { status: 200 });
      }
      const next = new URL(u);
      next.searchParams.set("n", String(n + 1));
      return new Response(null, {
        status: 302,
        headers: { location: next.toString() },
      });
    };
    const res = await safeFetch("https://example.com/r?n=0", makeEnv(), {
      fetchImpl,
      cacheEnabled: false,
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("too_many_redirects");
    expect(hops).toBe(MAX_REDIRECTS + 1);
  });
});
