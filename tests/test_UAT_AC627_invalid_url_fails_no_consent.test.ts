import { describe, expect, it } from "vitest";
import {
  hasRobotsOverride,
  isConvertConfirmed,
} from "../apps/control-app/src/operator/chat-metadata.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-627: Confirming an invalid URL fails validation and records no consent and
 * no robots override.
 */
describe("UAT AC-627: confirming a malformed URL fails validation and records nothing", () => {
  it("test_UAT_AC627_confirming_invalid_url_fails_and_records_no_consent", async () => {
    const h = makeTranscribeHarness({
      sessionId: "sess-627",
      accountId: "acct-627",
    });
    const bad = "not a valid url";

    const result = await h.invokeConfirm({ url: bad, ownsSite: true });

    expect(result.status).toBe("failed");
    const error = String((result as { error?: string }).error ?? "");
    expect(error).toMatch(/not a valid url|invalid/i);
    expect(error).toContain(bad);

    const key = { sessionId: "sess-627", accountId: "acct-627" };
    // No consent and no robots override recorded for the malformed URL.
    expect(isConvertConfirmed({ ...key, url: bad })).toBe(false);
    expect(hasRobotsOverride({ ...key, origin: bad })).toBe(false);
  });
});
