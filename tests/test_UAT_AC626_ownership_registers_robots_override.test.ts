import { describe, expect, it } from "vitest";
import {
  hasRobotsOverride,
  isConvertConfirmed,
} from "../apps/control-app/src/operator/chat-metadata.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-626: Asserting "I own this site" at confirmation registers a per-origin
 * robots override scoped to the session, in addition to recording consent.
 * Recording consent without the ownership assertion registers no override.
 */
describe("UAT AC-626: ownership assertion at confirmation registers a per-origin robots override", () => {
  it("test_UAT_AC626_ownership_assertion_registers_per_origin_robots_override", async () => {
    const h = makeTranscribeHarness({
      sessionId: "sess-626",
      accountId: "acct-626",
    });
    const owned = "https://owned.test/landing";
    const notOwned = "https://notowned.test/page";

    const r1 = await h.invokeConfirm({ url: owned, ownsSite: true });
    expect(r1.status).toBe("ok");
    const r2 = await h.invokeConfirm({ url: notOwned });
    expect(r2.status).toBe("ok");

    const key = { sessionId: "sess-626", accountId: "acct-626" };

    // Owned URL: robots override registered for its origin, consent recorded.
    expect(hasRobotsOverride({ ...key, origin: "https://owned.test" })).toBe(true);
    expect(isConvertConfirmed({ ...key, url: owned })).toBe(true);

    // Not-owned URL: consent recorded but NO robots override for its origin.
    expect(hasRobotsOverride({ ...key, origin: "https://notowned.test" })).toBe(
      false,
    );
    expect(isConvertConfirmed({ ...key, url: notOwned })).toBe(true);
  });
});
