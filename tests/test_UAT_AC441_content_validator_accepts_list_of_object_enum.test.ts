import { describe, expect, it } from "vitest";
import type { ModuleMeta } from "../packages/framework/src/modules/types.js";
import { validateModuleContent } from "../packages/framework/src/modules/validate.js";

const META: ModuleMeta = {
  id: "test-shapes",
  version: 1,
  variants: ["default"] as const,
  dials: {},
  contentSchema: {
    tags: {
      type: { kind: "list-of", of: "string", min: 1, max: 3 },
      required: true,
    },
    profile: {
      type: {
        kind: "object",
        fields: {
          name: { type: "string", required: true },
          age: { type: "boolean", required: false },
        },
      },
      required: true,
    },
    role: {
      type: { kind: "enum", values: ["admin", "user", "guest"] },
      required: true,
    },
  },
};

describe("UAT AC-441: content validator accepts list-of, nested object, and enum shapes", () => {
  it("test_UAT_AC441_content_validator_accepts_list_of_object_enum", () => {
    const ok = validateModuleContent(META, {
      tags: ["a", "b"],
      profile: { name: "Ada" },
      role: "admin",
    });
    expect(ok.ok).toBe(true);
    expect(ok.issues).toHaveLength(0);

    const tooFew = validateModuleContent(META, {
      tags: [],
      profile: { name: "Ada" },
      role: "admin",
    });
    expect(tooFew.ok).toBe(false);
    expect(
      tooFew.issues.find(
        (i) => i.path.join(".") === "tags" && /at least 1/.test(i.message),
      ),
    ).toBeDefined();

    const tooMany = validateModuleContent(META, {
      tags: ["a", "b", "c", "d"],
      profile: { name: "Ada" },
      role: "admin",
    });
    expect(tooMany.ok).toBe(false);
    expect(
      tooMany.issues.find(
        (i) => i.path.join(".") === "tags" && /at most 3/.test(i.message),
      ),
    ).toBeDefined();

    const wrongType = validateModuleContent(META, {
      tags: ["a"],
      profile: { name: 42 },
      role: "admin",
    });
    expect(wrongType.ok).toBe(false);
    expect(
      wrongType.issues.find(
        (i) => i.path.join(".") === "profile.name" && /string/.test(i.message),
      ),
    ).toBeDefined();

    const missingNested = validateModuleContent(META, {
      tags: ["a"],
      profile: {},
      role: "admin",
    });
    expect(missingNested.ok).toBe(false);
    expect(
      missingNested.issues.find(
        (i) =>
          i.path.join(".") === "profile.name" &&
          /required/.test(i.message),
      ),
    ).toBeDefined();

    const badEnum = validateModuleContent(META, {
      tags: ["a"],
      profile: { name: "Ada" },
      role: "owner",
    });
    expect(badEnum.ok).toBe(false);
    const enumIssue = badEnum.issues.find((i) => i.path.join(".") === "role");
    expect(enumIssue).toBeDefined();
    expect(enumIssue?.message).toMatch(/admin/);
    expect(enumIssue?.message).toMatch(/user/);
    expect(enumIssue?.message).toMatch(/guest/);
  });
});
