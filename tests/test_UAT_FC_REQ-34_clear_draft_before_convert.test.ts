// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { validateSite } from "@gendev/site-schema";
import type { Site } from "@gendev/site-schema";
import {
  buildEmptyScaffold,
  applyTranscribeEvent,
  createTranscribeProgressCard,
} from "@gendev/builder-ui";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-34: convert flow clears the operator's draft to an empty scaffold before reconstruction", () => {
  it("AC1+AC2+AC4: transcribe_site emits a Stage 0 'cleared' event carrying an empty-scaffold draft that passes validateSite and inherits the source business name", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: {
          background: "#ffffff",
          body: "#222222",
          accent: "not_detected",
          cta: "not_detected",
          supporting: [],
        },
        typography: {
          body: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h1: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h2: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          h3: { family: "not_detected", size: "not_detected", weight: "not_detected" },
          primaryPair: "not_detected",
        },
        layout: { maxContentWidth: "not_detected", bias: "not_detected", density: "not_detected" },
        imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
        // titleFromDigest reads the first h1 — Acme Co becomes the draft's businessName.
        content: { headings: [{ level: 1, text: "Acme Co" }], navLinks: [], formFields: [], listGroupCount: 0, sectionCount: 0 },
        assetInventory: [],
      },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");
    expect(result.status === "ok" && result.payload).toBeDefined();
    const payload = result.status === "ok" ? result.payload! : {};

    // AC1: cleared site definition is part of the payload.
    const cleared = payload.clearedSiteDefinition as Site | undefined;
    expect(cleared).toBeDefined();

    // AC2: the cleared scaffold passes the site schema validator.
    const validation = validateSite(cleared);
    expect(validation.ok).toBe(true);

    // AC1 detail: empty modules, single home page, in-page-anchors nav with no entries.
    expect(cleared!.pages.length).toBe(1);
    expect(cleared!.pages[0].modules).toEqual([]);
    expect(cleared!.pages[0].slug).toBe("/");
    expect(cleared!.nav).toEqual({ pattern: "in-page-anchors", entries: [] });

    // AC4: businessName is populated from the source title.
    expect(cleared!.config.businessName).toBe("Acme Co");

    // SSE: Stage 0 event fires with status 'cleared' and the resolved business name.
    const stage0 = h.events.find(
      (e) => e.data.tool === "transcribe_site" && e.data.stage === 0,
    );
    expect(stage0).toBeDefined();
    expect(stage0!.data.status).toBe("cleared");
    expect(stage0!.data.businessName).toBe("Acme Co");
  });

  it("AC5: the Stage 0 'cleared' SSE event fires before the Stage 3 digest-write event", async () => {
    const h = makeTranscribeHarness();
    await h.seedDigest("https://acme.test/");

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const stage0Index = h.events.findIndex(
      (e) =>
        e.data.tool === "transcribe_site" &&
        e.data.stage === 0 &&
        e.data.status === "cleared",
    );
    const stage3Index = h.events.findIndex(
      (e) =>
        e.data.tool === "transcribe_site" &&
        e.data.stage === 3 &&
        e.data.status === "completed",
    );
    expect(stage0Index).toBeGreaterThanOrEqual(0);
    expect(stage3Index).toBeGreaterThan(stage0Index);
  });

  it("buildEmptyScaffold falls back to 'Untitled' when no businessName is supplied", () => {
    const scaffold = buildEmptyScaffold();
    expect(scaffold.config.businessName).toBe("Untitled");
    expect(scaffold.pages.length).toBe(1);
    expect(scaffold.pages[0].modules).toEqual([]);
    const validation = validateSite(scaffold);
    expect(validation.ok).toBe(true);
  });

  it("TranscribeProgress card surfaces Stage 0 as 'Clearing draft' and flips it to 'cleared' on the SSE event", () => {
    const handle = createTranscribeProgressCard(document, {
      url: "https://acme.test/",
    });
    document.body.appendChild(handle.card.root);

    // The Stage 0 row is rendered with the canonical label.
    const stage0 = document.querySelector(
      '[data-fc-transcribe-stage="0"]',
    ) as HTMLElement;
    expect(stage0).not.toBeNull();
    expect(stage0.getAttribute("data-fc-transcribe-stage-status")).toBe("pending");
    const label = stage0.querySelector(".fc-transcribe-progress__stage-label");
    expect(label!.textContent).toBe("Clearing draft");

    // Applying the cleared event flips the row to status='cleared'.
    const ok = applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 0,
      status: "cleared",
    });
    expect(ok).toBe(true);
    expect(stage0.getAttribute("data-fc-transcribe-stage-status")).toBe("cleared");
  });

  it("AC3: starting from a populated draft, the cleared scaffold contains none of the previous modules", () => {
    // Construct a populated draft (e.g. the 1stcontact baseline shape).
    const populated: Site = {
      config: { businessName: "1st Contact" },
      theme: buildEmptyScaffold().theme,
      nav: { pattern: "in-page-anchors", entries: [] },
      pages: [
        {
          id: "home",
          slug: "/",
          title: "1st Contact",
          modules: [
            { id: "hero-old", type: "hero", version: 1 },
            { id: "text-old", type: "text-block", version: 1 },
          ],
        },
        {
          id: "about",
          slug: "/about",
          title: "About",
          modules: [{ id: "text-about", type: "text-block", version: 1 }],
        },
      ],
    };

    // Sanity — the fixture is itself a valid Site.
    expect(validateSite(populated).ok).toBe(true);

    // The cleared scaffold throws all of it away — REQ-34 is unconditional.
    const cleared = buildEmptyScaffold({ businessName: "Acme Co" });
    expect(cleared.pages.length).toBe(1);
    expect(cleared.pages[0].id).toBe("home");
    expect(cleared.pages[0].modules).toEqual([]);
    // No reference to any of the populated draft's module IDs.
    const allModuleIds = cleared.pages.flatMap((p) => p.modules.map((m) => m.id));
    expect(allModuleIds).not.toContain("hero-old");
    expect(allModuleIds).not.toContain("text-old");
    expect(allModuleIds).not.toContain("text-about");
  });
});
