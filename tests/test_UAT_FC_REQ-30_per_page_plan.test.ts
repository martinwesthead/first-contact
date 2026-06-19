import { describe, expect, it } from "vitest";
import { NOT_DETECTED, type ReferenceDigest } from "../packages/extractor/src/schema.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

describe("UAT FC REQ-30: digest.perPagePlan reflects discovered pages (AC7)", () => {
  it("single-page digest produces a perPagePlan with one entry whose slug derives from URL path", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-single" });
    await h.seedDigest("https://acme.test/");
    await h.invokeConfirm({ url: "https://acme.test/" });
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-single/transcription/digest.json",
    );
    expect(obj).not.toBeNull();
    const digest = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const plan = digest.perPagePlan as Array<Record<string, unknown>>;
    expect(plan).toHaveLength(1);
    expect(plan[0].url).toBe("https://acme.test/");
    expect(plan[0].slug).toBe("/");
    expect(typeof plan[0].title).toBe("string");
    expect(Array.isArray(plan[0].extractedContent)).toBe(true);
    expect(Array.isArray(plan[0].suggestedModuleTypes)).toBe(true);
  });

  it("digest with same-origin nav links to other cached digests produces multiple perPagePlan entries with distinct slugs", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-multi" });
    // Home page with nav linking to /menu and /contact.
    await h.seedDigest("https://acme.test/", {
      signals: {
        palette: {
          background: "#ffffff",
          body: "#222222",
          accent: "#16a34a",
          cta: "#2563eb",
          supporting: [],
        },
        typography: {
          body: { family: "Inter", size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
        layout: { maxContentWidth: 1024, bias: "centered", density: "balanced" },
        imagery: { imgCount: 1, backgroundCount: 0, videoCount: 0, heroDetected: true },
        content: {
          headings: [{ level: 1, text: "Acme Co" }],
          navLinks: [
            { text: "Menu", href: "https://acme.test/menu" },
            { text: "Contact", href: "https://acme.test/contact" },
            { text: "External", href: "https://other.test/somewhere" },
          ],
          formFields: [],
          listGroupCount: 0,
          sectionCount: 1,
        },
        assetInventory: [],
      },
    } as Partial<ReferenceDigest>);
    // Seed the two cached child pages.
    await h.seedDigest("https://acme.test/menu", {
      signals: {
        palette: { background: "#ffffff", body: "#222222", accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
        typography: {
          body: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h1: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h2: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          h3: { family: NOT_DETECTED, size: NOT_DETECTED, weight: NOT_DETECTED },
          primaryPair: NOT_DETECTED,
        },
        layout: { maxContentWidth: NOT_DETECTED, bias: NOT_DETECTED, density: NOT_DETECTED },
        imagery: { imgCount: 0, backgroundCount: 0, videoCount: 0, heroDetected: false },
        content: { headings: [{ level: 1, text: "Menu" }], navLinks: [], formFields: [], listGroupCount: 1, sectionCount: 1 },
        assetInventory: [],
      },
    } as Partial<ReferenceDigest>);
    await h.seedDigest("https://acme.test/contact", {
      signals: {
        palette: { background: "#ffffff", body: "#222222", accent: NOT_DETECTED, cta: NOT_DETECTED, supporting: [] },
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
          headings: [{ level: 1, text: "Contact" }],
          navLinks: [],
          formFields: [{ name: "email", kind: "email" }],
          listGroupCount: 0,
          sectionCount: 1,
        },
        assetInventory: [],
      },
    } as Partial<ReferenceDigest>);
    await h.invokeConfirm({ url: "https://acme.test/" });
    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    const obj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-multi/transcription/digest.json",
    );
    const digest = JSON.parse(await obj!.text()) as Record<string, unknown>;
    const plan = digest.perPagePlan as Array<Record<string, unknown>>;

    expect(plan.length).toBeGreaterThanOrEqual(3);
    const slugs = plan.map((p) => p.slug as string);
    expect(new Set(slugs).size).toBe(slugs.length); // all distinct
    expect(slugs).toContain("/");
    expect(slugs).toContain("/menu");
    expect(slugs).toContain("/contact");

    // Cross-origin nav links must NOT appear.
    expect(plan.every((p) => (p.url as string).startsWith("https://acme.test"))).toBe(true);

    // suggestedModuleTypes is non-empty for at least the contact page (form detected).
    const contact = plan.find((p) => p.slug === "/contact")!;
    expect((contact.suggestedModuleTypes as string[]).includes("contactForm")).toBe(true);
  });
});
