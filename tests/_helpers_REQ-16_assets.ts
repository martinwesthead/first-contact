import type {
  MarkdownEditorHandle,
  MarkdownEditorLoader,
} from "../packages/builder-ui/src/components/assets-tab.js";

export interface MockAsset {
  body: string;
  contentType: string;
}

export interface RecordedCall {
  method: string;
  key: string;
  contentType?: string;
  body?: string;
}

/**
 * In-memory stand-in for the REQ-20 asset routes. Backs `createAssetsTab`'s
 * injected `fetch` so UATs exercise the tab against the real route contract
 * without a Worker or R2.
 */
export class MockAssetServer {
  readonly calls: RecordedCall[] = [];
  private readonly store = new Map<string, MockAsset>();

  constructor(seed: Record<string, MockAsset> = {}) {
    for (const [key, asset] of Object.entries(seed)) {
      this.store.set(key, asset);
    }
  }

  get fetch(): typeof fetch {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();
      const path = new URL(url, "http://localhost").pathname;

      if (path === "/api/assets/list" && method === "GET") {
        const items = Array.from(this.store.entries()).map(([key, a]) => ({
          key,
          size: a.body.length,
          etag: `"etag-${key}"`,
          uploaded: "2026-06-29T00:00:00.000Z",
          contentType: a.contentType,
        }));
        return jsonResponse({ items, truncated: false, cursor: null });
      }

      if (path.startsWith("/api/assets/put/") && method === "PUT") {
        const key = decodeURIComponent(path.slice("/api/assets/put/".length));
        const contentType =
          headerValue(init?.headers, "content-type") ?? "application/octet-stream";
        const body = typeof init?.body === "string" ? init.body : await readBody(init?.body);
        this.store.set(key, { body, contentType });
        this.calls.push({ method, key, contentType, body });
        return jsonResponse({ key, size: body.length, etag: `"etag-${key}"`, contentType });
      }

      if (path.startsWith("/api/assets/delete/") && method === "DELETE") {
        const key = decodeURIComponent(path.slice("/api/assets/delete/".length));
        this.store.delete(key);
        this.calls.push({ method, key });
        return new Response(null, { status: 204 });
      }

      if (path.startsWith("/assets/") && method === "GET") {
        const key = decodeURIComponent(path.slice("/assets/".length));
        const asset = this.store.get(key);
        if (!asset) return new Response("not found", { status: 404 });
        this.calls.push({ method, key });
        return new Response(asset.body, {
          status: 200,
          headers: { "content-type": asset.contentType },
        });
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function headerValue(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  return new Headers(headers).get(name);
}

async function readBody(body: BodyInit | null | undefined): Promise<string> {
  if (body == null) return "";
  if (typeof body === "string") return body;
  if (body instanceof Blob) return await body.text();
  return String(body);
}

export interface StubEditor extends MarkdownEditorHandle {
  /** Simulate the operator typing — updates content and fires onChange. */
  setMarkdown(markdown: string): void;
  initialMarkdown: string;
}

/**
 * A markdown-editor loader that records instances and lets a test drive edits
 * and dirty state, with no TipTap/ProseMirror dependency.
 */
export function makeStubEditorLoader(): {
  loader: MarkdownEditorLoader;
  instances: StubEditor[];
} {
  const instances: StubEditor[] = [];
  const loader: MarkdownEditorLoader = async (host, opts) => {
    let current = opts.initialMarkdown;
    let baseline = opts.initialMarkdown;
    const marker = host.ownerDocument.createElement("div");
    marker.setAttribute("data-stub-editor", "");
    host.appendChild(marker);
    const handle: StubEditor = {
      initialMarkdown: opts.initialMarkdown,
      getMarkdown: () => current,
      isDirty: () => current !== baseline,
      markSaved: () => {
        baseline = current;
      },
      destroy: () => {
        marker.remove();
      },
      setMarkdown: (markdown: string) => {
        current = markdown;
        opts.onChange?.();
      },
    };
    instances.push(handle);
    return handle;
  };
  return { loader, instances };
}

/** Flush pending micro/macrotasks so fire-and-forget async UI work settles. */
export async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
