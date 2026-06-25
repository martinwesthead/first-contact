import { describe, expect, expectTypeOf, it } from "vitest";
import { validateSite, type ValidationError } from "@1stcontact/site-schema";

describe("UAT AC-398: validator returns ValidationError list with JSON-pointer paths on failure", () => {
  it("test_UAT_AC398_validator_returns_validation_errors_with_json_pointer_paths", () => {
    const result = validateSite({ totally: "wrong" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expectTypeOf(result.errors).toEqualTypeOf<ValidationError[]>();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);

      for (const err of result.errors) {
        expect(typeof err.path).toBe("string");
        expect(typeof err.message).toBe("string");
        expect(err.message.length).toBeGreaterThan(0);
        if (err.path !== "") {
          expect(
            err.path.startsWith("/"),
            `path '${err.path}' must be JSON pointer (start with '/' or be empty for root)`,
          ).toBe(true);
        }
      }

      expectTypeOf(result.errors[0].path).toBeString();
      expectTypeOf(result.errors[0].message).toBeString();
    }
  });
});
