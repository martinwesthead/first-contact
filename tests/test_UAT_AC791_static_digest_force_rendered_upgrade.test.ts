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
 * AC-791: When a page's cached Reference Digest was captured static-only
 * (`fetchPath: "static"`), a convert upgrades it via the rendered fetch path
 * before assembling the transcription digest, gated by the browser budget. On
 * success the upgraded digest persisted in the fetch cache reports
 * `fetchPath: "rendered"` with a desktop screenshot key, and the resulting
 * per-page plan carries that screenshot.
 *
 * The upgrade is best-effort: with no browser binding (or an exhausted budget)
 * the convert emits a render-upgrade-skipped notification and still succeeds
 * against the static digest — the page appears in the transcription, just
 * without a screenshot, and the conversion does not fail.
 */

const STATIC_SIGNALS: ReferenceDigest["signals"] = {
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
} as const;

/** Recompute the FETCH_CACHE_KV digest key the handler uses (`sha256(url|1)`). */
async function digestKvKey(url: string): Promise<string> {
  const data = new TextEncoder().encode(`${url}|1`);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return `digest:${hex}`;
}

describe("UAT AC-791: static-only cached digests are force-upgraded to rendered before transcription (best-effort)", () => {
  it("test_UAT_AC791_static_digest_force_rendered_upgrade_best_effort", async () => {
    // ── Phase 1: browser available → the static digest is upgraded. ─────────
    const up = makeTranscribeHarness({ withBrowserBinding: true, accountId: "acct-791a" });
    const url = "https://acme.test/";

    const seeded = await up.seedDigest(url, {
      fetchPath: "static",
      screenshotKeys: {},
      signals: STATIC_SIGNALS,
    });
    // Precondition: the seeded digest really is static-only with no screenshot.
    expect(seeded.fetchPath).toBe("static");
    expect(seeded.screenshotKeys.desktop).toBeUndefined();

    let driverInvoked = false;
    const driver: BrowserDriver = {
      async renderForViewports(): Promise<DriverResult> {
        driverInvoked = true;
        return {
          html: "<html><body><h1>Acme</h1></body></html>",
          computedStyles: {
            body: { family: "Inter", size: "16px", weight: "400", backgroundColor: "rgb(255,255,255)" },
            h1: { family: "Playfair Display", size: "48px", weight: "700" },
            h2: { family: "", size: "", weight: "" },
            h3: { family: "", size: "", weight: "" },
            primaryBackgroundColor: "rgb(255,255,255)",
          },
          computedBackgroundAssets: [],
          computedFontAssets: [],
          boundingBoxes: { sections: [], cards: [] },
          screenshots: { desktop: TINY_PNG },
          durationSeconds: 3,
        };
      },
    };
    up.installDriver(driver);

    const upResult = await up.invokeTranscribe({ digestId: url });
    expect(upResult.status).toBe("ok");

    // The rendered fetch driver was actually invoked.
    expect(driverInvoked).toBe(true);

    // The digest re-read from the fetch cache is now rendered, with a desktop
    // screenshot key — subsequent read-backs see the rendered view.
    const reloadedRaw = await up.env.FETCH_CACHE_KV.get(await digestKvKey(url), "json");
    expect(reloadedRaw).toBeTruthy();
    const reloaded = ReferenceDigest.parse(reloadedRaw);
    expect(reloaded.fetchPath).toBe("rendered");
    expect(reloaded.screenshotKeys.desktop).toBeTruthy();

    // The transcription's per-page plan exposes that screenshot for the home page.
    const writtenObj = await up.env.ASSETS_BUCKET.get(
      "sites/acct-791a/transcription/digest.json",
    );
    expect(writtenObj).toBeTruthy();
    const tDigest = (await writtenObj!.json()) as {
      perPagePlan: Array<{ url: string; screenshotKey: string; screenshotUrl: string }>;
    };
    const homePlan = tDigest.perPagePlan.find((p) => p.url === url);
    expect(homePlan).toBeTruthy();
    expect(homePlan!.screenshotKey).toBe(reloaded.screenshotKeys.desktop);
    expect(homePlan!.screenshotUrl).toBe(`/assets/${reloaded.screenshotKeys.desktop}`);

    // A render-upgrade-completed notification was emitted.
    const completedNotify = up.events.find(
      (e) => (e.data as { status?: string }).status === "render_upgrade_completed",
    );
    expect(completedNotify).toBeTruthy();

    // ── Phase 2: no browser binding → best-effort skip, convert still wins. ──
    const skip = makeTranscribeHarness({ withBrowserBinding: false, accountId: "acct-791b" });
    expect(skip.env.BROWSER).toBeUndefined();

    const seededStatic = await skip.seedDigest(url, {
      fetchPath: "static",
      screenshotKeys: {},
      signals: STATIC_SIGNALS,
    });
    expect(seededStatic.fetchPath).toBe("static");

    const skipResult = await skip.invokeTranscribe({ digestId: url });
    // The conversion does not fail.
    expect(skipResult.status).toBe("ok");

    // A render-upgrade-skipped notification was emitted (browser binding missing).
    const skippedNotify = skip.events.find(
      (e) => (e.data as { status?: string }).status === "render_upgrade_skipped",
    );
    expect(skippedNotify).toBeTruthy();
    expect((skippedNotify!.data as { reason?: string }).reason).toBe(
      "browser_binding_missing",
    );

    // The cached digest is left static — no upgrade was persisted.
    const unchangedRaw = await skip.env.FETCH_CACHE_KV.get(await digestKvKey(url), "json");
    const unchanged = ReferenceDigest.parse(unchangedRaw);
    expect(unchanged.fetchPath).toBe("static");

    // The page still appears in the transcription, just without a screenshot.
    const skipWritten = await skip.env.ASSETS_BUCKET.get(
      "sites/acct-791b/transcription/digest.json",
    );
    expect(skipWritten).toBeTruthy();
    const skipDigest = (await skipWritten!.json()) as {
      perPagePlan: Array<{ url: string; screenshotKey: string }>;
    };
    const skipHome = skipDigest.perPagePlan.find((p) => p.url === url);
    expect(skipHome).toBeTruthy();
    expect(skipHome!.screenshotKey).toBe("");
  });
});
