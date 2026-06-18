import { describe, expect, it } from "vitest";
import { validateTarget, safeFetch } from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: SSRF + scheme blocklist (AC 1–3)", () => {
  const BLOCKED_HOSTS = [
    "https://192.168.0.1/x",
    "https://127.0.0.1/x",
    "https://169.254.169.254/x",
    "https://localhost/x",
    "https://[::1]/x",
    "https://[fe80::1]/x",
    "https://10.0.0.1/x",
    "https://172.16.0.1/x",
  ];

  it.each(BLOCKED_HOSTS)("AC1: validateTarget(%s) rejects with reason: private_ip", (url) => {
    const out = validateTarget(url);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe("private_ip");
  });

  it.each([
    "file:///etc/passwd",
    "gopher://example.com/_x",
    "data:text/plain,hello",
    "ftp://example.com/x",
  ])("AC2: validateTarget(%s) rejects with reason: disallowed_scheme", (url) => {
    const out = validateTarget(url);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toBe("disallowed_scheme");
  });

  it("AC3: safeFetch follows a 301 to a private IP and rejects on the SECOND hop", async () => {
    const env = { FETCH_CACHE_KV: makeMemKv(), FETCH_ROBOTS_KV: makeMemKv() };
    const fetchImpl = async (input: any): Promise<Response> => {
      const u = typeof input === "string" ? input : input.url;
      if (u === "https://safe.example.com/redirect") {
        return new Response(null, {
          status: 301,
          headers: { location: "http://127.0.0.1/x" },
        });
      }
      return new Response("should never reach here", { status: 200 });
    };
    const res = await safeFetch("https://safe.example.com/redirect", env, { fetchImpl });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe("private_ip");
  });
});
