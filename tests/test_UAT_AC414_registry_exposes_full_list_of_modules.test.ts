import { describe, expect, it } from "vitest";
import {
  footerMeta,
  headerMeta,
  heroMeta,
  listRegisteredModules,
} from "@1stcontact/framework";

describe("UAT AC-414: registry exposes the full list of registered modules", () => {
  it("test_UAT_AC414_registry_exposes_full_list_of_modules", () => {
    const registered = listRegisteredModules();

    expect(Array.isArray(registered)).toBe(true);
    expect(registered.length).toBeGreaterThan(0);

    for (const entry of registered) {
      expect(typeof entry.id).toBe("string");
      expect(entry.id.length).toBeGreaterThan(0);
      expect(typeof entry.version).toBe("number");
      expect(Number.isInteger(entry.version)).toBe(true);
      // {id, version} pair shape — only these two keys.
      expect(Object.keys(entry).sort()).toEqual(["id", "version"]);
    }

    expect(registered).toEqual(
      expect.arrayContaining([
        { id: headerMeta.id, version: headerMeta.version },
        { id: heroMeta.id, version: heroMeta.version },
        { id: footerMeta.id, version: footerMeta.version },
      ]),
    );
  });
});
