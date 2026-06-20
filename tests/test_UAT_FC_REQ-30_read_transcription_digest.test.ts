import { describe, expect, it } from "vitest";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-30: read_transcription_digest system_action (AC3)", () => {
  it("read_transcription_digest is registered as a system_action with a handler", () => {
    const action = findAction("read_transcription_digest");
    expect(action).toBeDefined();
    expect(action!.category).toBe("system_action");
    expect(typeof action!.handler).toBe("function");
    expect(action!.tool_spec.name).toBe("read_transcription_digest");
  });

  it("returns the digest JSON for a freshly written digest", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-read-test" });
    await h.seedDigest("https://acme.test/");
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const action = findAction("read_transcription_digest")!;
    const result = await action.handler!(
      { siteId: "acct-read-test" },
      h.ctx,
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcription_digest");
    const digest = payload.digest as Record<string, unknown>;
    expect(digest.siteId).toBe("acct-read-test");
    expect(digest.sourceUrl).toBe("https://acme.test/");
  });

  it("returns a digest_not_found failure when the key is missing", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-missing" });
    const action = findAction("read_transcription_digest")!;
    const result = await action.handler!(
      { siteId: "acct-missing" },
      h.ctx,
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/digest_not_found/);
    }
  });

  it("rejects an invalid input (missing siteId)", async () => {
    const h = makeTranscribeHarness();
    const action = findAction("read_transcription_digest")!;
    const result = await action.handler!({}, h.ctx);
    expect(result.status).toBe("failed");
  });
});
