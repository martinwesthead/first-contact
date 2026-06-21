import { describe, expect, it } from "vitest";
import {
  NOT_DETECTED,
  ReferenceDigest,
  type BrowserDriver,
  type DriverResult,
} from "../packages/extractor/src/index.js";
import { TINY_PNG } from "./_helpers_REQ-22_rendered.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

/**
 * REQ-49 AC1 — when transcribe_site finds a cached digest with
 * fetchPath: "static" (which is what happens whenever analyze_page's
 * escalation decision came back "sufficient"), it must drive the rendered
 * fetch path, merge the computed signals, persist the upgraded digest back
 * to the cache, and surface the desktop screenshot in the TranscriptionDigest
 * perPagePlan entry. This is the core bug behind the joyfulculinarycreations.com
 * regression: the static-only digest had no screenshot / computed-styles /
 * background-image inventory, so the AI had nothing visual to anchor on.
 */
describe("UAT FC REQ-49: transcribe_site upgrades static digests via the rendered path", () => {
  it("AC1: a cached fetchPath='static' digest is upgraded — rendered driver runs, computed signals + screenshot are merged, the digest is written back to KV with fetchPath='rendered', and perPagePlan exposes the desktop screenshot", async () => {
    const h = makeTranscribeHarness({ withBrowserBinding: true });
    const url = "https://acme.test/";

    // Seed a static-only digest with no screenshot and minimal computed signals.
    const seeded = await h.seedDigest(url, {
      fetchPath: "static",
      screenshotKeys: {},
      signals: {
        palette: {
          background: NOT_DETECTED,
          body: NOT_DETECTED,
          accent: NOT_DETECTED,
          cta: NOT_DETECTED,
          supporting: [],
        },
        typography: {
          body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
        layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
        imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: {
          headings: [{ level: 1, text: "Acme" }],
          navLinks: [],
          formFields: [],
          listGroupCount: 0,
          sectionCount: 0,
        },
        assetInventory: [],
      },
    });

    const driver: BrowserDriver = {
      async renderForViewports(): Promise<DriverResult> {
        return {
          html: "<html><body><h1>Acme</h1></body></html>",
          computedStyles: {
            body: { family: "Inter", size: "16px", weight: "400", backgroundColor: "rgb(255,255,255)" },
            h1: { family: "Playfair Display", size: "48px", weight: "700" },
            h2: { family: "", size: "", weight: "" },
            h3: { family: "", size: "", weight: "" },
            primaryBackgroundColor: "rgb(255,255,255)",
          },
          computedBackgroundAssets: [
            { url: "https://acme.test/hero-bg.jpg", selector: ".hero" },
          ],
          computedFontAssets: [],
          boundingBoxes: { sections: [], cards: [] },
          screenshots: { desktop: TINY_PNG },
          durationSeconds: 3,
        };
      },
    };
    h.installDriver(driver);

    h.setAnthropicSequence([
      JSON.stringify({ modules: [], narrative: "ok" }),
    ]);

    const result = await h.invokeTranscribe({ digestId: url });
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;

    // The digest written back to KV must now report fetchPath='rendered',
    // carry the desktop screenshot key, and include the merged hero bg in
    // its asset inventory.
    const data = new TextEncoder().encode(`${url}|1`);
    const hashBuf = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(hashBuf);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    const reloadedRaw = await h.env.FETCH_CACHE_KV.get(`digest:${hex}`, "json");
    expect(reloadedRaw).toBeTruthy();
    const reloaded = ReferenceDigest.parse(reloadedRaw);
    expect(reloaded.fetchPath).toBe("rendered");
    expect(reloaded.screenshotKeys.desktop).toBeTruthy();
    expect(
      reloaded.signals.assetInventory.some(
        (a) => a.url === "https://acme.test/hero-bg.jpg" && a.kind === "background",
      ),
    ).toBe(true);
    expect(reloaded.signals.typography.body.family).toBe("Inter");

    // The seeded digest was static; we want to confirm we actually mutated it,
    // not that the cache contents are accidentally matching.
    expect(seeded.fetchPath).toBe("static");
    expect(seeded.screenshotKeys.desktop).toBeUndefined();

    // The TranscriptionDigest perPagePlan now surfaces the screenshot.
    const written = await h.env.ASSETS_BUCKET.get(
      `sites/${h.ctx.session.account_id}/transcription/digest.json`,
    );
    expect(written).toBeTruthy();
    const tDigest = (await written!.json()) as {
      perPagePlan: Array<{ url: string; screenshotKey: string; screenshotUrl: string }>;
    };
    const home = tDigest.perPagePlan.find((p) => p.url === url);
    expect(home).toBeTruthy();
    expect(home!.screenshotKey).toBe(reloaded.screenshotKeys.desktop);
    expect(home!.screenshotUrl).toBe(`/assets/${reloaded.screenshotKeys.desktop}`);

    // A stage-1 notify event must announce the upgrade completion.
    const upgradedNotify = h.events.find(
      (e) => (e.data as { status?: string }).status === "render_upgrade_completed",
    );
    expect(upgradedNotify).toBeTruthy();
  });
});
