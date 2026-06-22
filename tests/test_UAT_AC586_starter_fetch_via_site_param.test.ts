// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { bootFromQuery } from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

/**
 * Build a fetch mock that serves a starter definition tagged with a distinct
 * businessName per starter name, so the test can prove the *fetched* definition
 * (not a fallback) became the builder's initial working site.
 */
function starterFetch(): typeof fetch {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    const match = url.match(/\/starter-sites\/([^/]+)\.json$/);
    const name = match ? decodeURIComponent(match[1]) : "unknown";
    const site = load1stContactSite();
    site.config.businessName = `starter:${name}`;
    return new Response(JSON.stringify(site), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
}

function mountRoot(): HTMLElement {
  document.body.innerHTML = '<div id="fc-builder-root"></div>';
  return document.getElementById("fc-builder-root")!;
}

describe("UAT AC-586: starter site is fetched same-origin at SPA boot, selected via ?site= with 1stcontact default", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("test_UAT_AC586_no_query_param_fetches_1stcontact_default", async () => {
    const fetchImpl = starterFetch();
    const handle = await bootFromQuery({
      root: mountRoot(),
      search: "",
      fetch: fetchImpl,
      storage: null,
    });

    expect(fetchImpl).toHaveBeenCalledWith("/starter-sites/1stcontact.json");
    expect(handle).not.toBeNull();
    expect(handle!.store.getState().siteDefinition.config.businessName).toBe(
      "starter:1stcontact",
    );
    handle!.destroy();
  });

  it("test_UAT_AC586_site_param_selects_named_starter", async () => {
    const fetchImpl = starterFetch();
    const handle = await bootFromQuery({
      root: mountRoot(),
      search: "?site=acme",
      fetch: fetchImpl,
      storage: null,
    });

    expect(fetchImpl).toHaveBeenCalledWith("/starter-sites/acme.json");
    expect(handle).not.toBeNull();
    expect(handle!.store.getState().siteDefinition.config.businessName).toBe(
      "starter:acme",
    );
    handle!.destroy();
  });

  it("test_UAT_AC586_empty_site_param_falls_back_to_default", async () => {
    const fetchImpl = starterFetch();
    const handle = await bootFromQuery({
      root: mountRoot(),
      search: "?site=",
      fetch: fetchImpl,
      storage: null,
    });

    expect(fetchImpl).toHaveBeenCalledWith("/starter-sites/1stcontact.json");
    expect(handle).not.toBeNull();
    expect(handle!.store.getState().siteDefinition.config.businessName).toBe(
      "starter:1stcontact",
    );
    handle!.destroy();
  });
});
