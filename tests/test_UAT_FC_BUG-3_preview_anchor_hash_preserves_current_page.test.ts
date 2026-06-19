// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { renderSiteIntoIframe } from "@1stcontact/builder-ui";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

describe("UAT FC BUG-3: in-page anchor hashchange does not switch pages", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("an in-page anchor (e.g. #contact) on the menu page does NOT revert the iframe to the home page", () => {
    const site = makeTwoPageSite();
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    renderSiteIntoIframe(iframe, site);

    // Navigate to menu first.
    iframe.contentWindow!.location.hash = "#/menu";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");

    // Simulate an in-page anchor click (kind:'anchor' entries render as
    // bare-id hrefs like "#some-module"). The browser scrolls; our handler
    // must not page-switch.
    iframe.contentWindow!.location.hash = "#menu-marker";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));

    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain("HOME-MARKER-TEXT");
  });
});
