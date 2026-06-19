import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-28: transcribe_site gate (AC1/AC2/AC15)", () => {
  it("AC1: first invocation without confirmation returns requires_confirmation and does not mutate state", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("convert_confirmation");
    expect(payload.url).toBe("https://acme.test/");
    expect(typeof payload.prompt).toBe("string");
    expect((payload.prompt as string)).toMatch(/Convert will replace your current draft/);
    expect((payload.prompt as string)).toMatch(/cannot be automatically undone/);
    // No site/modules in payload (REQ-30: also no digestKey before confirm).
    expect(payload.site).toBeUndefined();
    expect(payload.modules).toBeUndefined();
    expect(payload.digestKey).toBeUndefined();
    // SSE event emitted so the FE can render the chat card.
    const confirmEvent = h.events.find(
      (e) =>
        e.event === "action:notify" &&
        e.data.kind === "convert_confirmation_required",
    );
    expect(confirmEvent).toBeDefined();
  });

  it("AC2: confirm_convert + re-invocation proceeds through transcription (REQ-30: payload is digestKey + summary, not site)", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");

    // First call gates.
    const gated = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(gated.status).toBe("ok");
    expect((gated.payload as Record<string, unknown>).kind).toBe(
      "convert_confirmation",
    );

    // Operator clicks Confirm — FE invokes confirm_convert.
    const confirm = await h.invokeConfirm({ url: "https://acme.test/" });
    expect(confirm.status).toBe("ok");
    expect((confirm.payload as Record<string, unknown>).confirmed).toBe(true);

    // Re-invoke transcribe_site — now it goes through.
    const done = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(done.status).toBe("ok");
    const payload = done.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcribe_site_done");
    expect(typeof payload.digestKey).toBe("string");
    expect(payload.summary).toBeDefined();
  });

  it("AC15: re-invoking transcribe_site on the same URL without a destructive-confirmation reset requires confirmation again only when not yet confirmed", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");

    const first = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect((first.payload as Record<string, unknown>).kind).toBe(
      "convert_confirmation",
    );

    // Without a confirmation, calling again also requires confirmation —
    // one-shot confirmation does not blanket-authorize repeats.
    const stillGated = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect((stillGated.payload as Record<string, unknown>).kind).toBe(
      "convert_confirmation",
    );
  });

  it("fails cleanly when the digest hasn't been analyzed (no FETCH_CACHE_KV entry)", async () => {
    const h = makeTranscribeHarness();
    // No seedDigest call.
    const result = await h.invokeTranscribe({ digestId: "https://never-fetched.test/" });
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/digest_not_found/);
    }
  });

  it("AC14: confirm_convert with ownsSite=true registers a per-origin robots override", async () => {
    const h = makeTranscribeHarness();
    const confirm = await h.invokeConfirm({
      url: "https://acme.test/page",
      ownsSite: true,
    });
    expect(confirm.status).toBe("ok");
    const payload = confirm.payload as Record<string, unknown>;
    expect(payload.confirmed).toBe(true);
    expect(payload.origin).toBe("https://acme.test");
    expect(payload.ownsSite).toBe(true);
  });

  it("confirm_convert rejects an invalid URL", async () => {
    const h = makeTranscribeHarness();
    const confirm = await h.invokeConfirm({ url: "not-a-url" });
    expect(confirm.status).toBe("failed");
  });
});
