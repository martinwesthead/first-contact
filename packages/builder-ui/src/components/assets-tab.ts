import { createSplitLayout, type SplitLayoutHandle } from "./split-layout.js";

// REQ-20 asset route contract (consumed, not defined here):
//   GET    /api/assets/list            -> { items: AssetListItem[], truncated, cursor }
//   GET    /assets/<key>               -> raw body (+ content-type, etag headers)
//   PUT    /api/assets/put/<key>       -> { key, size, etag, contentType }
//   DELETE /api/assets/delete/<key>    -> 204
const LIST_URL = "/api/assets/list";
const PUT_PREFIX = "/api/assets/put/";
const DELETE_PREFIX = "/api/assets/delete/";
const GET_PREFIX = "/assets/";

const PANEL_STORAGE_KEY = "1stcontact_assets_panel_v1";

export interface AssetListItem {
  key: string;
  size: number;
  etag: string;
  uploaded: string;
  contentType: string;
}

export type PreviewKind = "editor" | "image" | "other";

/** A mounted markdown editor, abstracted so the TipTap implementation can be
 *  swapped for a stub in tests. */
export interface MarkdownEditorHandle {
  getMarkdown(): string;
  isDirty(): boolean;
  /** Re-baseline the dirty comparison to the current content (call after save). */
  markSaved(): void;
  destroy(): void;
}

export interface MarkdownEditorMountOptions {
  initialMarkdown: string;
  /** Invoked on every editor change so the host can refresh dirty-dependent UI. */
  onChange?: () => void;
}

/** Mounts a markdown editor (toolbar + editing surface) into `host`. The default
 *  implementation lazy-loads TipTap; tests inject a lightweight stub. */
export type MarkdownEditorLoader = (
  host: HTMLElement,
  opts: MarkdownEditorMountOptions,
) => Promise<MarkdownEditorHandle>;

export interface AssetsTabOptions {
  /** Fetch implementation — injected in tests. Defaults to global fetch. */
  fetch?: typeof fetch;
  /** Confirm prompt for destructive actions — injected in tests. */
  confirm?: (message: string) => boolean;
  /** Persistence for the split width. Defaults to null (no persistence). */
  storage?: Storage | null;
  /** Markdown editor loader. Defaults to the lazy TipTap loader. */
  loadEditor?: MarkdownEditorLoader;
}

export interface VisibleAssetsContext {
  tab: "assets";
  assetList: string[];
  selectedAssetKey: string | null;
  selectedContentType: string | null;
  isEditorDirty: boolean;
}

export interface AssetsTabHandle {
  readonly root: HTMLElement;
  readonly leftPanel: HTMLElement;
  readonly rightPanel: HTMLElement;
  /** Reload the asset list from the server. */
  refresh(): Promise<void>;
  /** Snapshot of what the operator currently sees — fed to the chat tool
   *  (concrete wire-up deferred to REQ-CHAT-CONTEXT). */
  getVisibleContext(): VisibleAssetsContext;
  destroy(): void;
}

/**
 * Assets tab content (REQ-16). A two-panel surface: a scrollable asset list on
 * the left (upload + per-row delete) and a content-type-dispatched detail view
 * on the right (markdown WYSIWYG editor / image preview / download fallback).
 *
 * This factory owns the tab *content* only; it assumes `parent` is the content
 * area handed to it by the app shell (REQ-17). It consumes the REQ-20 asset
 * routes and never defines storage itself.
 */
export function createAssetsTab(
  parent: HTMLElement,
  options: AssetsTabOptions = {},
): AssetsTabHandle {
  const doc = parent.ownerDocument;
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const confirmFn = options.confirm ?? ((m: string) => globalThis.confirm(m));
  const loadEditor = options.loadEditor ?? defaultMarkdownEditorLoader;

  const split: SplitLayoutHandle = createSplitLayout(parent, {
    storage: options.storage ?? null,
    storageKey: PANEL_STORAGE_KEY,
    initialLeftWidthPx: 280,
    minLeftWidthPx: 200,
    maxLeftWidthPx: 600,
    collapseLabel: "Collapse asset list",
    restoreLabel: "Restore asset list",
  });
  split.root.setAttribute("data-fc-assets", "");

  // --- Left panel: upload control + scrollable file list ------------------
  const left = split.leftPanel;
  left.classList.add("fc-assets__list-panel");

  const uploadBar = doc.createElement("div");
  uploadBar.className = "fc-assets__upload-bar";
  const uploadButton = doc.createElement("button");
  uploadButton.type = "button";
  uploadButton.className = "fc-assets__upload";
  uploadButton.setAttribute("data-fc-assets-upload", "");
  uploadButton.textContent = "Upload";
  const fileInput = doc.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  fileInput.setAttribute("data-fc-assets-file-input", "");
  uploadBar.appendChild(uploadButton);
  uploadBar.appendChild(fileInput);
  left.appendChild(uploadBar);

  const listEl = doc.createElement("ul");
  listEl.className = "fc-assets__list";
  listEl.setAttribute("data-fc-assets-list", "");
  listEl.style.overflowY = "auto";
  left.appendChild(listEl);

  // --- Right panel: detail view -------------------------------------------
  const right = split.rightPanel;
  right.classList.add("fc-assets__detail");
  right.setAttribute("data-fc-assets-detail", "");

  // --- Mutable state ------------------------------------------------------
  let items: AssetListItem[] = [];
  let selectedKey: string | null = null;
  let selectedContentType: string | null = null;
  let editor: MarkdownEditorHandle | null = null;
  let saveButton: HTMLButtonElement | null = null;
  let destroyed = false;

  // --- Wiring -------------------------------------------------------------
  const onUploadClick = (): void => fileInput.click();
  const onFileChange = (): void => {
    const files = fileInput.files;
    if (files && files.length > 0) {
      void uploadFiles(Array.from(files));
    }
    fileInput.value = "";
  };
  uploadButton.addEventListener("click", onUploadClick);
  fileInput.addEventListener("change", onFileChange);

  function disposeEditor(): void {
    if (editor) {
      editor.destroy();
      editor = null;
    }
    saveButton = null;
  }

  async function refresh(): Promise<void> {
    const res = await doFetch(LIST_URL, { method: "GET" });
    if (!res.ok) {
      renderListError(`Failed to load assets (${res.status})`);
      return;
    }
    const data = (await res.json()) as { items?: AssetListItem[] };
    items = Array.isArray(data.items) ? data.items : [];
    renderList();
    // Drop a selection that no longer exists.
    if (selectedKey && !items.some((i) => i.key === selectedKey)) {
      selectedKey = null;
      selectedContentType = null;
      disposeEditor();
      renderEmptyDetail();
    }
  }

  function renderListError(message: string): void {
    listEl.replaceChildren();
    const li = doc.createElement("li");
    li.className = "fc-assets__list-error";
    li.textContent = message;
    listEl.appendChild(li);
  }

  function renderList(): void {
    listEl.replaceChildren();
    if (items.length === 0) {
      const li = doc.createElement("li");
      li.className = "fc-assets__list-empty";
      li.textContent = "No assets yet. Upload one to get started.";
      listEl.appendChild(li);
      return;
    }
    for (const item of items) {
      const li = doc.createElement("li");
      li.className = "fc-assets__row";
      li.setAttribute("data-fc-assets-row", item.key);
      if (item.key === selectedKey) li.classList.add("is-selected");

      const select = doc.createElement("button");
      select.type = "button";
      select.className = "fc-assets__row-select";
      select.appendChild(textSpan(doc, "fc-assets__row-icon", assetTypeIcon(item.key, item.contentType)));
      select.appendChild(textSpan(doc, "fc-assets__row-name", item.key));
      select.addEventListener("click", () => void selectAsset(item));

      const del = doc.createElement("button");
      del.type = "button";
      del.className = "fc-assets__row-delete";
      del.setAttribute("aria-label", `Delete ${item.key}`);
      del.textContent = "🗑";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        void deleteAsset(item.key);
      });

      li.appendChild(select);
      li.appendChild(del);
      listEl.appendChild(li);
    }
  }

  async function selectAsset(item: AssetListItem): Promise<void> {
    selectedKey = item.key;
    selectedContentType = item.contentType;
    renderList(); // refresh selection highlight
    disposeEditor();

    const kind = pickPreviewKind(item.contentType, item.key);
    if (kind === "image") {
      renderImageDetail(item);
    } else if (kind === "editor") {
      await renderEditorDetail(item);
    } else {
      renderOtherDetail(item);
    }
  }

  function renderEmptyDetail(): void {
    right.replaceChildren();
    const empty = doc.createElement("div");
    empty.className = "fc-assets__detail-empty";
    empty.textContent = "Select an asset to view or edit it.";
    right.appendChild(empty);
  }

  function detailHeader(item: AssetListItem): HTMLElement {
    const header = doc.createElement("div");
    header.className = "fc-assets__detail-header";
    header.appendChild(textSpan(doc, "fc-assets__detail-name", item.key));
    return header;
  }

  function renderImageDetail(item: AssetListItem): void {
    right.replaceChildren();
    right.appendChild(detailHeader(item));

    const img = doc.createElement("img");
    img.className = "fc-assets__image";
    img.setAttribute("data-fc-assets-image", "");
    img.src = `${GET_PREFIX}${encodeKey(item.key)}`;
    img.alt = item.key;

    const meta = doc.createElement("dl");
    meta.className = "fc-assets__image-meta";
    meta.setAttribute("data-fc-assets-image-meta", "");
    appendMeta(doc, meta, "Filename", item.key);
    appendMeta(doc, meta, "Type", item.contentType);
    appendMeta(doc, meta, "Size", `${(item.size / 1024).toFixed(1)} KB`);
    const dims = appendMeta(doc, meta, "Dimensions", "—");
    img.addEventListener("load", () => {
      if (img.naturalWidth) {
        dims.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
      }
    });

    right.appendChild(img);
    right.appendChild(meta);
  }

  async function renderEditorDetail(item: AssetListItem): Promise<void> {
    right.replaceChildren();
    const header = detailHeader(item);
    saveButton = doc.createElement("button");
    saveButton.type = "button";
    saveButton.className = "fc-assets__save";
    saveButton.setAttribute("data-fc-assets-save", "");
    saveButton.textContent = "Save";
    saveButton.disabled = true;
    saveButton.addEventListener("click", () => void saveCurrent(item));
    header.appendChild(saveButton);
    right.appendChild(header);

    const host = doc.createElement("div");
    host.className = "fc-assets__editor-host";
    host.setAttribute("data-fc-assets-editor", "");
    right.appendChild(host);

    const res = await doFetch(`${GET_PREFIX}${encodeKey(item.key)}`, { method: "GET" });
    const text = res.ok ? await res.text() : "";

    // Guard against a slower fetch resolving after the operator moved on.
    if (destroyed || selectedKey !== item.key) return;

    editor = await loadEditor(host, {
      initialMarkdown: text,
      onChange: refreshSaveState,
    });
    if (destroyed || selectedKey !== item.key) {
      editor.destroy();
      editor = null;
      return;
    }
    refreshSaveState();
  }

  function refreshSaveState(): void {
    if (saveButton && editor) saveButton.disabled = !editor.isDirty();
  }

  async function saveCurrent(item: AssetListItem): Promise<void> {
    if (!editor) return;
    const body = editor.getMarkdown();
    const res = await doFetch(`${PUT_PREFIX}${encodeKey(item.key)}`, {
      method: "PUT",
      headers: { "content-type": item.contentType || "text/markdown" },
      body,
    });
    if (res.ok) {
      editor.markSaved();
      refreshSaveState();
    }
  }

  function renderOtherDetail(item: AssetListItem): void {
    right.replaceChildren();
    right.appendChild(detailHeader(item));
    const note = doc.createElement("div");
    note.className = "fc-assets__no-preview";
    note.setAttribute("data-fc-assets-no-preview", "");
    note.textContent = "No preview available for this asset type.";
    const link = doc.createElement("a");
    link.className = "fc-assets__download";
    link.setAttribute("data-fc-assets-download", "");
    link.href = `${GET_PREFIX}${encodeKey(item.key)}`;
    link.setAttribute("download", item.key);
    link.textContent = `Download ${item.key}`;
    right.appendChild(note);
    right.appendChild(link);
  }

  async function uploadFiles(files: File[]): Promise<void> {
    for (const file of files) {
      await doFetch(`${PUT_PREFIX}${encodeKey(file.name)}`, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
    }
    await refresh();
  }

  async function deleteAsset(key: string): Promise<void> {
    if (!confirmFn(`Delete "${key}"? This cannot be undone.`)) return;
    const res = await doFetch(`${DELETE_PREFIX}${encodeKey(key)}`, {
      method: "DELETE",
    });
    if (res.ok) await refresh();
  }

  function getVisibleContext(): VisibleAssetsContext {
    return {
      tab: "assets",
      assetList: items.map((i) => i.key),
      selectedAssetKey: selectedKey,
      selectedContentType,
      isEditorDirty: editor ? editor.isDirty() : false,
    };
  }

  function destroy(): void {
    destroyed = true;
    uploadButton.removeEventListener("click", onUploadClick);
    fileInput.removeEventListener("change", onFileChange);
    disposeEditor();
    split.destroy();
  }

  renderEmptyDetail();
  void refresh();

  return {
    root: split.root,
    leftPanel: left,
    rightPanel: right,
    refresh,
    getVisibleContext,
    destroy,
  };
}

// --- Pure helpers (testable without a DOM editor) -------------------------

/**
 * Choose the right-panel renderer for an asset. Content-type is authoritative;
 * for assets stored as `application/octet-stream` we fall back to the key's
 * extension so `.md`/`.txt`/image files still get a useful view.
 */
export function pickPreviewKind(contentType: string, key = ""): PreviewKind {
  const ct = (contentType || "").toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("text/")) return "editor";
  const ext = key.toLowerCase().split(".").pop() ?? "";
  if (ct === "application/octet-stream" || ct === "") {
    if (ext === "md" || ext === "markdown" || ext === "txt") return "editor";
    if (["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"].includes(ext)) {
      return "image";
    }
  }
  return "other";
}

/** Emoji glyph for a file-list row. */
export function assetTypeIcon(key: string, contentType: string): string {
  const kind = pickPreviewKind(contentType, key);
  if (kind === "image") return "🖼";
  const ext = key.toLowerCase().split(".").pop() ?? "";
  if (ext === "md" || ext === "markdown") return "📝";
  if (kind === "editor") return "📄";
  return "📦";
}

/**
 * Serialize TipTap editor HTML back to Markdown via DOM walking — copied from
 * xgendev-main's `htmlToMarkdown` (dashboard/static/index.html). Pure: pass a
 * `Document` so it works under jsdom and in the browser.
 */
export function htmlToMarkdown(html: string, documentRef?: Document): string {
  const ownerDoc = documentRef ?? globalThis.document;
  const div = ownerDoc.createElement("div");
  div.innerHTML = html;

  const TEXT_NODE = 3;
  const ELEMENT_NODE = 1;

  function convertNode(node: ChildNode): string {
    if (node.nodeType === TEXT_NODE) return node.textContent ?? "";
    if (node.nodeType !== ELEMENT_NODE) return "";
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    const inner = (): string =>
      Array.from(el.childNodes).map(convertNode).join("");
    switch (tag) {
      case "p":
        return inner() + "\n\n";
      case "h1":
        return "# " + inner() + "\n\n";
      case "h2":
        return "## " + inner() + "\n\n";
      case "h3":
        return "### " + inner() + "\n\n";
      case "h4":
        return "#### " + inner() + "\n\n";
      case "h5":
        return "##### " + inner() + "\n\n";
      case "h6":
        return "###### " + inner() + "\n\n";
      case "strong":
      case "b":
        return "**" + inner() + "**";
      case "em":
      case "i":
        return "_" + inner() + "_";
      case "code":
        return el.parentElement && el.parentElement.tagName === "PRE"
          ? inner()
          : "`" + inner() + "`";
      case "pre":
        return "```\n" + inner() + "\n```\n\n";
      case "ul":
        return (
          Array.from(el.children)
            .filter((c) => c.tagName === "LI")
            .map(
              (li) =>
                "- " +
                Array.from(li.childNodes).map(convertNode).join("") +
                "\n",
            )
            .join("") + "\n"
        );
      case "ol":
        return (
          Array.from(el.children)
            .filter((c) => c.tagName === "LI")
            .map(
              (li, i) =>
                i +
                1 +
                ". " +
                Array.from(li.childNodes).map(convertNode).join("") +
                "\n",
            )
            .join("") + "\n"
        );
      case "li":
        return inner();
      case "hr":
        return "\n---\n\n";
      case "br":
        return "\n";
      case "blockquote":
        return "> " + inner() + "\n\n";
      default:
        return inner();
    }
  }

  return Array.from(div.childNodes)
    .map(convertNode)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textSpan(doc: Document, className: string, text: string): HTMLElement {
  const span = doc.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function appendMeta(
  doc: Document,
  dl: HTMLElement,
  label: string,
  value: string,
): HTMLElement {
  const dt = doc.createElement("dt");
  dt.textContent = label;
  const dd = doc.createElement("dd");
  dd.textContent = value;
  dl.appendChild(dt);
  dl.appendChild(dd);
  return dd;
}

/** Encode an asset key for use in a URL path, preserving `/` separators. */
function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * Default markdown editor: lazy-loads TipTap + marked and mounts a WYSIWYG
 * surface with a formatting toolbar. Browser-only — tests inject a stub loader.
 * Markdown round-trips via `marked()` on load and {@link htmlToMarkdown} on save
 * (per REQ-16; copied from xgendev-main's intent editor, diff machinery stripped).
 */
export const defaultMarkdownEditorLoader: MarkdownEditorLoader = async (
  host,
  opts,
) => {
  const doc = host.ownerDocument;
  const [{ marked }, tiptapCore, starterKit, placeholder] = await Promise.all([
    import("marked"),
    import("@tiptap/core"),
    import("@tiptap/starter-kit"),
    import("@tiptap/extension-placeholder"),
  ]);
  const Editor = tiptapCore.Editor;
  const StarterKit = starterKit.default;
  const Placeholder = placeholder.default;

  const toolbar = doc.createElement("div");
  toolbar.className = "fc-assets__toolbar";
  const editorEl = doc.createElement("div");
  editorEl.className = "fc-assets__prose";
  host.appendChild(toolbar);
  host.appendChild(editorEl);

  const initialHtml = await marked(opts.initialMarkdown);
  const editor = new Editor({
    element: editorEl,
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Empty document" })],
    content: initialHtml,
    onUpdate: () => opts.onChange?.(),
  });

  let baseline = editor.getHTML();

  const FORMATS: Array<[string, string, () => void]> = [
    ["bold", "B", () => editor.chain().focus().toggleBold().run()],
    ["italic", "I", () => editor.chain().focus().toggleItalic().run()],
    ["h1", "H1", () => editor.chain().focus().toggleHeading({ level: 1 }).run()],
    ["h2", "H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run()],
    ["h3", "H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run()],
    ["bulletList", "• List", () => editor.chain().focus().toggleBulletList().run()],
    ["ordered", "1. List", () => editor.chain().focus().toggleOrderedList().run()],
  ];
  for (const [format, label, run] of FORMATS) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.setAttribute("data-format", format);
    btn.textContent = label;
    btn.addEventListener("click", run);
    toolbar.appendChild(btn);
  }

  return {
    getMarkdown: () => htmlToMarkdown(editor.getHTML(), doc),
    isDirty: () => editor.getHTML() !== baseline,
    markSaved: () => {
      baseline = editor.getHTML();
    },
    destroy: () => editor.destroy(),
  };
};
