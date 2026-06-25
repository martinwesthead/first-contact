import { describe, expect, it } from "vitest";
import {
  contactFormMeta,
  footerMeta,
  getModule,
  headerMeta,
  heroMeta,
  listRegisteredModules,
  servicesGridMeta,
  textBlockMeta,
} from "@1stcontact/framework";

const PHASE0_MODULES = [
  { id: "header", expected: headerMeta },
  { id: "hero", expected: heroMeta },
  { id: "footer", expected: footerMeta },
  { id: "text-block", expected: textBlockMeta },
  { id: "services-grid", expected: servicesGridMeta },
  { id: "contact-form", expected: contactFormMeta },
] as const;

describe("UAT AC-442: framework module registry resolves all six Phase 0 modules", () => {
  it("test_UAT_AC442_registry_resolves_all_six_phase0_modules", () => {
    const registered = listRegisteredModules();
    for (const { id, expected } of PHASE0_MODULES) {
      expect(registered).toEqual(
        expect.arrayContaining([{ id: expected.id, version: expected.version }]),
      );

      const entry = getModule(expected.id, expected.version);
      expect(entry.meta).toBe(expected);
      expect(entry.meta.id).toBe(id);
      expect(entry.meta.version).toBe(expected.version);
      expect(entry.Component).toBeDefined();
      expect(typeof entry.Component).toBe("function");
    }
  });
});
