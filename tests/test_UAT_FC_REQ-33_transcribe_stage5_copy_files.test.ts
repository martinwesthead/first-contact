import { describe, expect, it } from "vitest";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

const SOURCE_HTML_LARGE = `
<!doctype html>
<html><head><title>Acme</title></head>
<body>
  <main>
    <h1>Acme Catering</h1>
    <p>We bring the feast to you — bespoke menus, white-glove service, no hassle.</p>
    <h2>Services</h2>
    <ul>
      <li>Weddings — bespoke tasting menus.</li>
      <li>Corporate — large-scale event catering.</li>
    </ul>
    <p>Get in touch for a quote.</p>
  </main>
</body></html>
`.trim();

const SOURCE_HTML_SHORT = `
<!doctype html><html><body><main><p>Tiny page.</p></main></body></html>
`.trim();

describe("UAT FC REQ-33 AC9/AC10: transcribe_site Stage 5 writes per-page copy markdown to R2", () => {
  it("AC9: large/structured page body is written to sites/{siteId}/copy/{slug}.md with text/markdown", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-r33-1" });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(SOURCE_HTML_LARGE),
      },
    });

    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    const obj = await h.env.ASSETS_BUCKET.get("sites/acct-r33-1/copy/home.md");
    expect(obj).not.toBeNull();
    const md = await obj!.text();
    // Captured verbatim subset: heading + body + list survive.
    expect(md).toContain("# Acme Catering");
    expect(md).toContain("bespoke menus");
    expect(md).toContain("- Weddings");
    expect(obj!.httpMetadata!.contentType).toBe("text/markdown");
  });

  it("digest's perPagePlan home entry carries a copy AssetRef pointing at the written .md", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-r33-2" });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(SOURCE_HTML_LARGE),
      },
    });

    await h.invokeTranscribe({ digestId: "https://acme.test/" });
    const digestObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-r33-2/transcription/digest.json",
    );
    const digest = JSON.parse(await digestObj!.text()) as Record<string, unknown>;
    const plan = (digest.perPagePlan as Array<Record<string, unknown>>)[0];
    expect(plan).toBeDefined();
    const copy = plan.copy as Record<string, unknown>;
    expect(copy).toBeDefined();
    expect(copy.kind).toBe("text");
    expect(copy.id).toBe("sites/acct-r33-2/copy/home.md");
    expect(copy.src).toBe("/assets/sites/acct-r33-2/copy/home.md");
    expect(typeof copy.alt).toBe("string");
  });

  it("AC10: short single-paragraph page body sets inlineMarkdown instead of writing a file", async () => {
    const h = makeTranscribeHarness({ accountId: "acct-r33-3" });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    await h.invokeConfirm({ url: "https://acme.test/" });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(SOURCE_HTML_SHORT),
      },
    });

    await h.invokeTranscribe({ digestId: "https://acme.test/" });

    // No copy file written for the short body.
    const obj = await h.env.ASSETS_BUCKET.get("sites/acct-r33-3/copy/home.md");
    expect(obj).toBeNull();
    // Inline markdown is present on perPagePlan instead.
    const digestObj = await h.env.ASSETS_BUCKET.get(
      "sites/acct-r33-3/transcription/digest.json",
    );
    const digest = JSON.parse(await digestObj!.text()) as Record<string, unknown>;
    const plan = (digest.perPagePlan as Array<Record<string, unknown>>)[0];
    expect(plan.inlineMarkdown).toBe("Tiny page.");
    expect(plan.copy).toBeUndefined();
  });
});
