import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * AC-632 (regression): The convert flow is purely mechanical — no internal LLM
 * site-synthesis step and no fallback to legacy synthesis. Across success and
 * edge inputs the result is always the mechanical summary / confirmation /
 * failure form, never a synthesized site/module/theme/narrative payload, and the
 * orchestration source contains no legacy synthesis branch.
 */
describe("UAT AC-632: conversion is purely mechanical with no internal-synthesis fallback", () => {
  it("test_UAT_AC632_conversion_is_mechanical_with_no_synthesis_fallback", async () => {
    const url = "https://acme.test/";

    // Success path → mechanical completion summary, no synthesized site.
    const h1 = makeTranscribeHarness({ accountId: "acct-632a" });
    await h1.seedDigest(url);
    await h1.invokeConfirm({ url });
    const success = await h1.invokeTranscribe({ digestId: url });
    expect(success.status).toBe("ok");
    const successPayload =
      (success as { payload?: Record<string, unknown> }).payload ?? {};
    expect(successPayload.kind).toBe("transcribe_site_done");
    expect(successPayload).toHaveProperty("summary");
    for (const forbidden of ["site", "modules", "theme", "themeTokens", "narrative"]) {
      expect(successPayload).not.toHaveProperty(forbidden);
    }

    // Edge: unconfirmed → confirmation request, still not a synthesized site.
    const h2 = makeTranscribeHarness({ accountId: "acct-632b" });
    await h2.seedDigest(url);
    const gate = await h2.invokeTranscribe({ digestId: url });
    const gatePayload =
      (gate as { payload?: Record<string, unknown> }).payload ?? {};
    expect(gatePayload.kind).toBe("convert_confirmation");
    expect(gatePayload).not.toHaveProperty("modules");
    expect(gatePayload).not.toHaveProperty("site");

    // Edge: no digest → clean failure, no synthesis fallback.
    const h3 = makeTranscribeHarness({ accountId: "acct-632c" });
    await h3.invokeConfirm({ url });
    const miss = await h3.invokeTranscribe({ digestId: url });
    expect(miss.status).toBe("failed");
    expect((miss as { payload?: unknown }).payload).toBeUndefined();

    // No legacy/fallback synthesis branch is reachable in the orchestration.
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      resolve(here, "../apps/control-app/src/operator/transcribe-site.ts"),
      "utf-8",
    );
    for (const banned of [
      "buildSiteFromTranscription",
      "buildHeroOnlyFallback",
      "composePromptForTranscription",
      "parseTranscriptionFromLlm",
      "validateTranscription",
      "callOpusForTranscription",
      "attemptTranscription",
      "fellBackToHero",
    ]) {
      expect(src).not.toContain(banned);
    }
  });
});
