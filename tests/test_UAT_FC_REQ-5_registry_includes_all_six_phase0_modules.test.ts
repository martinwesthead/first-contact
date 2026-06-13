import { describe, expect, it } from "vitest";
import {
  contactFormMeta,
  footerMeta,
  getModule,
  headerMeta,
  heroMeta,
  listRegisteredModules,
  type ModuleMeta,
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

describe("UAT FC REQ-5: registry includes all six Phase 0 modules", () => {
  it("listRegisteredModules contains all six (id, version) pairs", () => {
    const registered = listRegisteredModules();
    for (const { expected } of PHASE0_MODULES) {
      expect(registered).toEqual(
        expect.arrayContaining([{ id: expected.id, version: expected.version }]),
      );
    }
  });

  it.each(PHASE0_MODULES.map((m) => [m.id, m.expected] as const))(
    "getModule(%s, v1) resolves and the meta conforms to the contract",
    (_id, expected) => {
      const entry = getModule(expected.id, expected.version);
      expect(entry.meta).toBe(expected);
      expect(typeof entry.Component).toBe("function");
      expectValidMeta(entry.meta);
    },
  );
});

function expectValidMeta(meta: ModuleMeta): void {
  expect(typeof meta.id).toBe("string");
  expect(meta.id.length).toBeGreaterThan(0);
  expect(Number.isInteger(meta.version)).toBe(true);
  expect(meta.version).toBeGreaterThan(0);
  expect(Array.isArray(meta.variants)).toBe(true);
  expect(meta.variants.length).toBeGreaterThan(0);
  expect(typeof meta.dials).toBe("object");
  expect(typeof meta.contentSchema).toBe("object");
  for (const [name, spec] of Object.entries(meta.contentSchema)) {
    expect(typeof name).toBe("string");
    expect(typeof spec.required).toBe("boolean");
    expect(spec.type).toBeDefined();
  }
}
