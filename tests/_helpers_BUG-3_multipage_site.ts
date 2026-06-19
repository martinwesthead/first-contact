import type { Site } from "@1stcontact/site-schema";
import { makeThemeTokens } from "./_fixtures_REQ-3_site.js";

/**
 * Minimal two-page site for BUG-3 tests: home + menu. Each page has a unique
 * text-block module so tests can distinguish which page rendered. The header
 * carries `kind: 'page'` nav entries — exactly the shape that produced the
 * `/menu` → control-app catch-all bug in production.
 */
export function makeTwoPageSite(): Site {
  return {
    config: { businessName: "Two Page Co" },
    theme: makeThemeTokens(),
    nav: {
      pattern: "top-tabs",
      entries: [
        { label: "Home", target: { kind: "page", pageId: "home" } },
        { label: "Menu", target: { kind: "page", pageId: "menu" } },
      ],
    },
    pages: [
      {
        id: "home",
        slug: "/",
        title: "Home",
        modules: [
          {
            id: "site-header",
            type: "header",
            version: 1,
            variant: "top-nav",
            content: {
              logo: "Two Page Co",
              entries: [
                { label: "Home", target: { kind: "page", pageId: "home" } },
                { label: "Menu", target: { kind: "page", pageId: "menu" } },
              ],
            },
          },
          {
            id: "home-marker",
            type: "text-block",
            version: 1,
            content: { heading: "Home page", body: "<p>HOME-MARKER-TEXT</p>" },
          },
        ],
      },
      {
        id: "menu",
        slug: "/menu",
        title: "Menu",
        modules: [
          {
            id: "site-header",
            type: "header",
            version: 1,
            variant: "top-nav",
            content: {
              logo: "Two Page Co",
              entries: [
                { label: "Home", target: { kind: "page", pageId: "home" } },
                { label: "Menu", target: { kind: "page", pageId: "menu" } },
              ],
            },
          },
          {
            id: "menu-marker",
            type: "text-block",
            version: 1,
            content: { heading: "Menu page", body: "<p>MENU-MARKER-TEXT</p>" },
          },
        ],
      },
    ],
  };
}
