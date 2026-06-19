import { parseHtml } from "./dom.js";
import type { ContentTree, HeadingNode } from "./schema.js";

/**
 * parseContent — extracts a structural overview of the page: heading tree,
 * nav links, form fields, list groups, sections.
 */
export function parseContent(html: string): ContentTree {
  const { document } = parseHtml(html);

  const headings: HeadingNode[] = [];
  const hAll = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  for (let i = 0; i < hAll.length; i++) {
    const el = hAll[i];
    const level = parseInt(el.tagName.charAt(1), 10);
    const text = (el.textContent ?? "").trim();
    if (text.length > 0) headings.push({ level, text });
  }

  const navLinks: ContentTree["navLinks"] = [];
  const navAnchors = document.querySelectorAll("nav a");
  for (let i = 0; i < navAnchors.length; i++) {
    const a = navAnchors[i];
    const text = (a.textContent ?? "").trim();
    const href = a.getAttribute("href") ?? "";
    if (text.length > 0 && href.length > 0) navLinks.push({ text, href });
  }

  const formFields: ContentTree["formFields"] = [];
  const fieldEls = document.querySelectorAll("form input, form select, form textarea");
  for (let i = 0; i < fieldEls.length; i++) {
    const el = fieldEls[i];
    const tag = el.tagName.toLowerCase();
    const kind =
      tag === "input"
        ? (el.getAttribute("type") ?? "text")
        : tag;
    const name = el.getAttribute("name") ?? el.getAttribute("id") ?? tag;
    formFields.push({ name, kind });
  }

  const listGroupCount = document.querySelectorAll("ul, ol").length;
  const sectionCount = document.querySelectorAll("section").length;

  return { headings, navLinks, formFields, listGroupCount, sectionCount };
}
