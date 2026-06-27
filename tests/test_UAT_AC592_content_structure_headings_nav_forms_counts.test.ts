import { describe, expect, it } from "vitest";
import { parseContent } from "../packages/extractor/src/index.js";

describe("UAT AC-592: content structure reports headings, nav links, form fields, and group counts", () => {
  it("test_UAT_AC592_content_structure_headings_nav_forms_counts", () => {
    const html = `<!doctype html><html><body>
      <h1>Title</h1>
      <h2>Sub</h2>
      <h3>Sub three</h3>
      <nav>
        <a href="/home">Home</a>
        <a href="/about">About</a>
      </nav>
      <form>
        <input name="email" type="email">
        <input name="fullname" type="text">
        <textarea name="message"></textarea>
        <select name="topic"></select>
      </form>
      <ul><li>x</li></ul>
      <ol><li>y</li></ol>
      <section>a</section>
      <section>b</section>
    </body></html>`;
    const content = parseContent(html);

    // Heading tree preserves level and document order.
    expect(content.headings).toEqual([
      { level: 1, text: "Title" },
      { level: 2, text: "Sub" },
      { level: 3, text: "Sub three" },
    ]);

    // Nav links carry text and href.
    expect(content.navLinks).toEqual([
      { text: "Home", href: "/home" },
      { text: "About", href: "/about" },
    ]);

    // Form fields carry name and kind (input type, else element tag).
    expect(content.formFields).toEqual([
      { name: "email", kind: "email" },
      { name: "fullname", kind: "text" },
      { name: "message", kind: "textarea" },
      { name: "topic", kind: "select" },
    ]);

    // List-group and section counts match the markup.
    expect(content.listGroupCount).toBe(2);
    expect(content.sectionCount).toBe(2);

    // An empty document yields empty arrays and zero counts.
    const empty = parseContent(`<!doctype html><html><body></body></html>`);
    expect(empty.headings).toEqual([]);
    expect(empty.navLinks).toEqual([]);
    expect(empty.formFields).toEqual([]);
    expect(empty.listGroupCount).toBe(0);
    expect(empty.sectionCount).toBe(0);
  });
});
