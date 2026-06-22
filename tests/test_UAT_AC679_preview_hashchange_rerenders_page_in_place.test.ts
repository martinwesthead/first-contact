// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderSiteIntoIframe } from "@gendev/builder-ui";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

/**
 * AC-679: Dispatching a `hashchange` whose hash is `#/<pageId>` on the preview
 * iframe's content window re-renders that page's modules in place — no HTTP
 * request, no navigating the iframe away to a control-app URL. `#/` returns to
 * the home (first) page. The re-render replaces the iframe document in place, so
 * the target page's unique module appears and the previous page's modules vanish.
 */
describe("UAT AC-679: preview iframe hashchange to #/<pageId> re-renders that page in place with no HTTP request", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    // Spy on fetch so we can prove page switching makes no network round-trip.
    fetchSpy = vi.fn().mockResolvedValue({ ok: false, text: async () => "" });
    globalThis.fetch = fetchSpy as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch as typeof globalThis.fetch;
    document.body.innerHTML = "";
  });

  it("test_UAT_AC679_hashchange_rerenders_target_page_in_place_without_http_request", () => {
    const site = makeTwoPageSite();
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    renderSiteIntoIframe(iframe, site);

    // Baseline: the home (first) page is rendered.
    expect(iframe.contentDocument!.body.innerHTML).toContain("HOME-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain(
      "MENU-MARKER-TEXT",
    );

    // #/<pageId> switches to the menu page in place: its unique module appears
    // and the home-page module is gone.
    iframe.contentWindow!.location.hash = "#/menu";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain(
      "HOME-MARKER-TEXT",
    );

    // #/ returns to the home (first) page; the menu module is gone again.
    iframe.contentWindow!.location.hash = "#/";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("HOME-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain(
      "MENU-MARKER-TEXT",
    );

    // No HTTP request for a page URL occurred — the iframe document was
    // rewritten in place (document.open/write/close), never navigated.
    const requestedPageUrl = fetchSpy.mock.calls.some(([arg]) => {
      const url = typeof arg === "string" ? arg : String(arg);
      return url.includes("/menu") || url.includes("/home");
    });
    expect(requestedPageUrl).toBe(false);
  });
});
