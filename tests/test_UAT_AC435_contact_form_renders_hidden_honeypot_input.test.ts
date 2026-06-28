import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";
import ContactForm from "../packages/framework/src/modules/contact-form/index.astro";

// Astro's container renderer does not inline the scoped <style> block, so the
// honeypot's concealment rule is read from the module source and anchored to
// the .fc-contact-form__honeypot class proven present in the rendered output.
const modulePath = fileURLToPath(
  new URL(
    "../packages/framework/src/modules/contact-form/index.astro",
    import.meta.url,
  ),
);
const source = readFileSync(modulePath, "utf8");

function sliceRule(src: string, selectorOpener: string): string {
  const start = src.indexOf(selectorOpener);
  if (start < 0) return "";
  const open = src.indexOf("{", start);
  if (open < 0) return "";
  const close = src.indexOf("}", open);
  if (close < 0) return "";
  return src.slice(open + 1, close);
}

describe("UAT AC-435: contact-form renders a visually concealed honeypot input", () => {
  it("test_UAT_AC435_contact_form_renders_hidden_honeypot_input", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ContactForm, {
      props: {
        variant: "inline",
        action: "/api/forms/contact",
        fields: [{ name: "email", label: "Email", type: "email", required: true }],
      },
    });

    // Honeypot container is present and aria-hidden.
    expect(html).toMatch(
      /<div[^>]+class="[^"]*fc-contact-form__honeypot[^"]*"[^>]+aria-hidden="true"/,
    );

    // Honeypot input itself is present, with tabindex=-1 to exclude from tab order.
    expect(html).toMatch(/<input[^>]+data-fc-honeypot/);
    expect(html).toMatch(/<input[^>]+tabindex="-1"/);
    expect(html).toMatch(/<input[^>]+name="website"/);

    // Visual concealment (the AC's "visually concealed" claim): the scoped CSS
    // rule for the rendered .fc-contact-form__honeypot class must take it out
    // of the visual flow off-screen — not merely hide it from assistive tech.
    const honeypotRule = sliceRule(source, ".fc-contact-form__honeypot");
    expect(honeypotRule.length, "scoped .fc-contact-form__honeypot rule exists")
      .toBeGreaterThan(0);
    // Removed from normal flow.
    expect(honeypotRule).toMatch(/position:\s*absolute/);
    // Pushed off-screen via a large negative offset (or clipped equivalent).
    const offScreen =
      /left:\s*-\d{4,}px/.test(honeypotRule) ||
      /(text-indent|left|top):\s*-\d{4,}(px|em|rem)/.test(honeypotRule) ||
      /clip(-path)?:\s*(rect|inset|polygon)/.test(honeypotRule);
    expect(
      offScreen,
      `honeypot rule must conceal off-screen; got: ${honeypotRule.trim()}`,
    ).toBe(true);
  });
});
