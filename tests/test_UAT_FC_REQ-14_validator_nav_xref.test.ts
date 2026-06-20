import { describe, expect, it } from "vitest";
import { validateSite } from "@1stcontact/site-schema";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";

describe("UAT FC REQ-14: Site.superRefine nav cross-reference validation", () => {
  it("validate_site_rejects_orphan_nav_page when nav points at a missing page id", () => {
    const site = load1stContactSite();
    const broken = {
      ...site,
      nav: {
        ...site.nav,
        entries: [
          { label: "Ghost", target: { kind: "page", pageId: "ghost" } },
        ],
      },
    };
    const result = validateSite(broken);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.errors.some((e) => /unknown page id.*ghost/.test(e.message)),
    ).toBe(true);
  });

  it("validate_site rejects nav anchor whose moduleId is not on the named page", () => {
    const site = load1stContactSite();
    const broken = {
      ...site,
      nav: {
        ...site.nav,
        entries: [
          {
            label: "Stray",
            target: { kind: "anchor", pageId: "home", moduleId: "no-such-module" },
          },
        ],
      },
    };
    const result = validateSite(broken);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.errors.some((e) => /unknown module id.*no-such-module/.test(e.message)),
    ).toBe(true);
  });

  it("validate_site accepts a site whose nav resolves cleanly", () => {
    const site = load1stContactSite();
    const result = validateSite(site);
    expect(result.ok).toBe(true);
  });
});
