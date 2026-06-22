import { describe, expect, it } from "vitest";
import { renderSite } from "@gendev/generate";
import type { Site } from "@gendev/site-schema";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";
import { makeTranscribeHarness } from "./_helpers_REQ-28_transcribe_site.js";

const SOURCE_PARAGRAPH =
  "Most small businesses don't need an agency. They need a website that quietly does its job — looks right, answers questions, captures leads, never breaks.";

const SOURCE_HTML = `
<!doctype html><html><head><title>Acme</title></head>
<body>
  <main>
    <h1>Acme Co</h1>
    <p>${SOURCE_PARAGRAPH}</p>
    <h2>Services</h2>
    <ul>
      <li>Building.</li>
      <li>Caretaking.</li>
    </ul>
    <p>Tell us about your business.</p>
  </main>
</body></html>
`.trim();

function renderSiteFor(siteId: string, copyKey: string): Site {
  return {
    config: { businessName: "Acme" },
    theme: makeThemeTokens(),
    nav: { pattern: "footer-only", entries: [] },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Home",
        modules: [
          {
            id: "body-1",
            type: "text-block",
            version: 1,
            variant: "prose",
            content: {
              body: { kind: "text", id: copyKey, src: copyKey },
            },
          },
        ],
      },
    ],
  };
}

describe("UAT FC REQ-33 AC13: end-to-end — source body text survives capture → bake without paraphrase", () => {
  it("Stage 5 → tools/generate roundtrip preserves the original paragraph verbatim", async () => {
    const accountId = "acct-e2e";
    const h = makeTranscribeHarness({ accountId });
    await h.seedDigest("https://acme.test/", {
      screenshotKeys: { desktop: "references/c/t/desktop.png" },
    });
    h.setAssetResponses({
      "https://acme.test/": {
        status: 200,
        contentType: "text/html",
        body: new TextEncoder().encode(SOURCE_HTML),
      },
    });
    const result = await h.invokeTranscribe({ digestId: "https://acme.test/" });
    expect(result.status).toBe("ok");

    const copyKey = `sites/${accountId}/copy/home.md`;
    const obj = await h.env.ASSETS_BUCKET.get(copyKey);
    expect(obj).not.toBeNull();
    const markdown = await obj!.text();

    // The captured markdown carries the original paragraph verbatim — no LLM
    // paraphrase, no rewording.
    expect(markdown).toContain(SOURCE_PARAGRAPH);

    // Now generate the static site referencing this copy file. The bake step
    // pulls the captured markdown from R2 and inlines it as HTML.
    const rendered = await renderSite(
      { site: renderSiteFor(accountId, copyKey) },
      {
        resolveAsset: async (ref) => {
          const o = await h.env.ASSETS_BUCKET.get((ref as { src: string }).src);
          if (!o) return undefined;
          return await o.text();
        },
      },
    );
    const html = rendered.pages[0].html;

    // Final static HTML contains the original source text — verbatim character
    // sequence. This is the "same text" guarantee for the convert flow.
    expect(html).toContain(SOURCE_PARAGRAPH);
  });
});
