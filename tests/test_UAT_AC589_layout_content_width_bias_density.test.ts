import { describe, expect, it } from "vitest";
import { parseLayout, NOT_DETECTED } from "../packages/extractor/src/index.js";

describe("UAT AC-589: layout signals report content width, alignment bias, and density", () => {
  it("test_UAT_AC589_layout_content_width_bias_density", () => {
    // (a) A centered container declaring max-width: 1200px over a content-rich body.
    const richHtml = `<!doctype html><html><head><style>
      .container { max-width: 1200px; margin: 0 auto; }
    </style></head><body>
      <div class="container">
        <p>one</p><p>two</p><p>three</p>
        <section>a</section><section>b</section>
        <button>go</button>
      </div>
    </body></html>`;
    const rich = parseLayout(richHtml);

    expect(rich.maxContentWidth).toBe(1200);
    expect(rich.bias).toBe("centered");
    expect(["sparse", "balanced", "dense"]).toContain(rich.density);
    expect(rich.density).not.toBe(NOT_DETECTED);

    // (b) A near-empty page with no layout CSS.
    const bareHtml = `<!doctype html><html><head></head><body></body></html>`;
    const bare = parseLayout(bareHtml);
    expect(bare.maxContentWidth).toBe(NOT_DETECTED);
    expect(bare.bias).toBe(NOT_DETECTED);
  });
});
