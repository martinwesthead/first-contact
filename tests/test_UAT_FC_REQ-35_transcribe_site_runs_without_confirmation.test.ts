import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";
import { OPERATOR_ACTIONS } from "../apps/control-app/src/operator/registry.js";

describe("UAT FC REQ-35: transcribe_site runs without a confirmation gate", () => {
  it("AC1: first invocation proceeds straight to Stage 1 — no requires_confirmation payload, no convert_confirmation kind", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const payload = result.payload as Record<string, unknown>;
    expect(payload.kind).toBe("transcribe_site_done");
    expect(typeof payload.digestKey).toBe("string");

    // No convert-confirmation event was emitted at any point.
    const confirmationEvent = h.events.find(
      (e) =>
        e.event === "action:notify" &&
        e.data.kind === "convert_confirmation_required",
    );
    expect(confirmationEvent).toBeUndefined();

    // Stage 1 (screenshot) is emitted — the run progressed past any gate.
    const stage1Event = h.events.find(
      (e) =>
        e.event === "action:notify" &&
        e.data.stage === 1 &&
        e.data.status === "completed",
    );
    expect(stage1Event).toBeDefined();
  });

  it("AC4: confirm_convert is not in the operator-action registry", () => {
    const names = OPERATOR_ACTIONS.map((a) => a.name);
    expect(names).not.toContain("confirm_convert");
  });

  it("transcribe_site's tool description no longer mentions a confirmation step", () => {
    const transcribe = OPERATOR_ACTIONS.find((a) => a.name === "transcribe_site");
    expect(transcribe).toBeDefined();
    const description = transcribe!.tool_spec.description;
    expect(description).not.toMatch(/confirm/i);
    expect(description).not.toMatch(/convert_confirmation/);
  });
});
