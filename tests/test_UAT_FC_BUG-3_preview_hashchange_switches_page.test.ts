// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { renderSiteIntoIframe } from "@gendev/builder-ui";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

describe("UAT FC BUG-3: preview iframe handles hash-based page switching", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("dispatching hashchange to #/menu re-renders the iframe with the menu page's modules", () => {
    const site = makeTwoPageSite();
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    renderSiteIntoIframe(iframe, site);

    // Baseline: the home page is rendered.
    expect(iframe.contentDocument!.body.innerHTML).toContain("HOME-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain("MENU-MARKER-TEXT");

    // Simulate a user clicking the Menu tab: hash changes, hashchange fires.
    iframe.contentWindow!.location.hash = "#/menu";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));

    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain("HOME-MARKER-TEXT");
  });

  it("navigating back to #/ re-renders the home page", () => {
    const site = makeTwoPageSite();
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    renderSiteIntoIframe(iframe, site);

    // Switch to menu.
    iframe.contentWindow!.location.hash = "#/menu";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");

    // Switch back to home via the empty hash (the home nav entry emits "#/home"
    // but #/ is the canonical "root" shape that a user-typed URL might use; both
    // must resolve to the first page).
    iframe.contentWindow!.location.hash = "#/";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));

    expect(iframe.contentDocument!.body.innerHTML).toContain("HOME-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain("MENU-MARKER-TEXT");
  });

  it("an unknown #/<pageId> resolves to the first page rather than navigating away", () => {
    const site = makeTwoPageSite();
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    renderSiteIntoIframe(iframe, site);

    iframe.contentWindow!.location.hash = "#/nonexistent";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));

    expect(iframe.contentDocument!.body.innerHTML).toContain("HOME-MARKER-TEXT");
  });
});
