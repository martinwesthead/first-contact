import { describe, expect, it } from "vitest";
import {
  mintIntentToken,
  verifyIntentToken,
  operatorMessageImpliesIntent,
  INTENT_TOKEN_TTL_SECONDS,
} from "../packages/web-fetch-safety/src/index.js";
import { makeMemKv } from "./_helpers_REQ-20_kv.js";

describe("UAT FC REQ-20: operator-intent token mint + verify (AC 11–12)", () => {
  it("AC11: a fetch-marked tool with no token returns missing_intent", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    const result = await verifyIntentToken(env, { token: null, sessionId: "sess-A" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("missing_intent");
    expect(result.detail).toBe("no_token");
  });

  it("AC11: a fresh, scope-matched token verifies and is then consumed", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    const { token } = await mintIntentToken(env, {
      sessionId: "sess-A",
      accountId: "acct-A",
    });
    const ok = await verifyIntentToken(env, { token, sessionId: "sess-A" });
    expect(ok.ok).toBe(true);
    // Second verify of same token (after consume) is missing_intent.
    const reuse = await verifyIntentToken(env, { token, sessionId: "sess-A" });
    expect(reuse.ok).toBe(false);
    if (reuse.ok) return;
    expect(reuse.reason).toBe("missing_intent");
  });

  it("AC12: a token from a previous turn is rejected once it has expired", async () => {
    const env = { FETCH_RATE_KV: makeMemKv() };
    let t = 1_700_000_000_000;
    const clock = () => t;
    const { token } = await mintIntentToken(env, {
      sessionId: "sess-B",
      accountId: "acct-B",
      clock,
    });
    // Jump past TTL on both the KV and the verifier.
    t += (INTENT_TOKEN_TTL_SECONDS + 5) * 1000;
    (env.FETCH_RATE_KV as ReturnType<typeof makeMemKv>).__advance(
      (INTENT_TOKEN_TTL_SECONDS + 5) * 1000,
    );
    const expired = await verifyIntentToken(env, {
      token,
      sessionId: "sess-B",
      clock,
    });
    expect(expired.ok).toBe(false);
    if (expired.ok) return;
    expect(expired.reason).toBe("missing_intent");
  });

  it("operatorMessageImpliesIntent: URL or fetch keyword → true; plain prose → false", () => {
    expect(operatorMessageImpliesIntent("see https://example.com please")).toBe(true);
    expect(operatorMessageImpliesIntent("can you grab the colors from acme.com?")).toBe(true);
    expect(operatorMessageImpliesIntent("make the hero bigger")).toBe(false);
  });
});
