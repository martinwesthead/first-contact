import { describe, expect, it } from "vitest";
import {
  footerMeta,
  headerMeta,
  heroMeta,
  type ModuleMeta,
} from "@gendev/framework";

describe("UAT FC REQ-4: every module exports a contract-shaped moduleMeta", () => {
  it("header meta matches the contract", () => {
    expectValidMeta(headerMeta);
    expect(headerMeta.id).toBe("header");
    expect(headerMeta.variants).toContain("top-nav");
  });

  it("hero meta matches the contract", () => {
    expectValidMeta(heroMeta);
    expect(heroMeta.id).toBe("hero");
    expect(heroMeta.variants).toContain("bg-color");
    expect(heroMeta.variants).toContain("bg-image");
  });

  it("footer meta matches the contract", () => {
    expectValidMeta(footerMeta);
    expect(footerMeta.id).toBe("footer");
    expect(footerMeta.variants).toContain("minimal");
  });
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
