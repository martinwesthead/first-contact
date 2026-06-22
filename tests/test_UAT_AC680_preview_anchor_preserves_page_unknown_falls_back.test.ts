// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { renderSiteIntoIframe } from "@gendev/builder-ui";
import { makeTwoPageSite } from "./_helpers_BUG-3_multipage_site.js";

/**
 * AC-680: In the preview iframe only `#/<pageId>` fragment hashes switch pages.
 * A bare in-page anchor hash (e.g. `#contact`) dispatched as a hashchange does
 * NOT change the displayed page — the current page stays rendered so the browser
 * can scroll within it. A `#/<pageId>` hash whose pageId matches no page falls
 * back to rendering the first page rather than producing a blank/error state.
 */
describe("UAT AC-680: preview in-page anchor hashes do not switch pages; unknown pageId falls back to first page", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC680_anchor_hash_preserves_current_page_and_unknown_pageid_falls_back_to_first", () => {
    const site = makeTwoPageSite();
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    renderSiteIntoIframe(iframe, site);

    // Move to a non-home page so we can prove an anchor leaves it untouched.
    iframe.contentWindow!.location.hash = "#/menu";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");

    // A bare in-page anchor (kind:'anchor' entries render as `#<id>` hrefs) must
    // NOT page-switch — the current (menu) page stays rendered for scrolling.
    iframe.contentWindow!.location.hash = "#contact";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("MENU-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain(
      "HOME-MARKER-TEXT",
    );

    // An unknown #/<pageId> resolves to the first page rather than a blank/error.
    iframe.contentWindow!.location.hash = "#/nonexistent";
    iframe.contentWindow!.dispatchEvent(new Event("hashchange"));
    expect(iframe.contentDocument!.body.innerHTML).toContain("HOME-MARKER-TEXT");
    expect(iframe.contentDocument!.body.innerHTML).not.toContain(
      "MENU-MARKER-TEXT",
    );
  });
});
