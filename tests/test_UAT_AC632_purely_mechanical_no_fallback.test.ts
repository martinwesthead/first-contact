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
    const success = await h1.invokeTranscribe({ digestId: url });
    expect(success.status).toBe("ok");
    const successPayload =
      (success as { payload?: Record<string, unknown> }).payload ?? {};
    expect(successPayload.kind).toBe("transcribe_site_done");
    expect(successPayload).toHaveProperty("summary");
    for (const forbidden of ["site", "modules", "theme", "themeTokens", "narrative"]) {
      expect(successPayload).not.toHaveProperty(forbidden);
    }

    // Edge: no prior consent/confirmation recorded → convert still runs
    // end-to-end to the mechanical summary. The reshape (REQ-34/35) removed the
    // confirmation gate, so there is no `convert_confirmation` branch to hit.
    const h2 = makeTranscribeHarness({ accountId: "acct-632b" });
    await h2.seedDigest(url);
    const fresh = await h2.invokeTranscribe({ digestId: url });
    expect(fresh.status).toBe("ok");
    const freshPayload =
      (fresh as { payload?: Record<string, unknown> }).payload ?? {};
    expect(freshPayload.kind).toBe("transcribe_site_done");
    expect(freshPayload.kind).not.toBe("convert_confirmation");
    expect(freshPayload).not.toHaveProperty("modules");
    expect(freshPayload).not.toHaveProperty("site");

    // Edge: no digest → clean failure, no synthesis fallback.
    const h3 = makeTranscribeHarness({ accountId: "acct-632c" });
    const miss = await h3.invokeTranscribe({ digestId: url });
    expect(miss.status).toBe("failed");
    expect((miss as { payload?: unknown }).payload).toBeUndefined();

    // Neither a legacy/fallback synthesis branch nor a confirmation/consent
    // gate is reachable in the orchestration source.
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
      // Confirmation/consent gate symbols removed by the reshape.
      "convert_confirmation",
      "requires_confirmation",
      "convertConfirmed",
      "confirm_convert",
    ]) {
      expect(src).not.toContain(banned);
    }
  });
});
