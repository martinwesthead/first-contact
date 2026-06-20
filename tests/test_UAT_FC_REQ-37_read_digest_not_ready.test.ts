import { describe, expect, it } from "vitest";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-37: read_transcription_digest returns a distinct not_ready status when no digest is present", () => {
  it("returns ok with payload.kind='transcription_digest_not_ready' instead of a failed result", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-empty" });
    const action = findAction("read_transcription_digest")!;
    const result = await action.handler!({ siteId: "acct-req37-empty" }, h.ctx);

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcription_digest_not_ready");
    expect(typeof payload.digestKey).toBe("string");
    expect(payload.digest).toBeUndefined();
  });

  it("after a fresh transcribe_site run, read_transcription_digest flips back to kind='transcription_digest'", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-req37-flip" });
    await h.seedDigest("https://acme.test/");
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const action = findAction("read_transcription_digest")!;
    const result = await action.handler!({ siteId: "acct-req37-flip" }, h.ctx);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcription_digest");
    expect(payload.digest).toBeDefined();
  });
});
