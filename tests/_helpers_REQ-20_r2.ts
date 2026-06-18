type Stored = {
  key: string;
  body: Uint8Array;
  contentType: string;
  etag: string;
  uploaded: Date;
};

let counter = 0;

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", bytes);
  const arr = new Uint8Array(h);
  let s = "";
  for (let i = 0; i < arr.length; i++) s += arr[i].toString(16).padStart(2, "0");
  return s.slice(0, 32);
}

async function readBody(body: ReadableStream<Uint8Array> | ArrayBuffer | Uint8Array | string | null | undefined): Promise<Uint8Array> {
  if (body === null || body === undefined) return new Uint8Array();
  if (typeof body === "string") return new TextEncoder().encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  const reader = (body as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function makeObject(stored: Stored): any {
  return {
    key: stored.key,
    size: stored.body.byteLength,
    etag: stored.etag,
    httpEtag: `"${stored.etag}"`,
    uploaded: stored.uploaded,
    httpMetadata: { contentType: stored.contentType },
    customMetadata: {},
    range: undefined,
    checksums: { toJSON: () => ({}) },
    writeHttpMetadata: () => undefined,
    storageClass: "Standard",
    version: stored.etag,
  };
}

export function makeMemR2(): R2Bucket {
  const store = new Map<string, Stored>();
  return {
    async head(key: string): Promise<R2Object | null> {
      const v = store.get(key);
      if (!v) return null;
      return makeObject(v);
    },
    async get(key: string): Promise<R2ObjectBody | null> {
      const v = store.get(key);
      if (!v) return null;
      const obj = makeObject(v) as any;
      obj.body = new Response(v.body).body;
      obj.bodyUsed = false;
      obj.arrayBuffer = async () => v.body.buffer.slice(v.body.byteOffset, v.body.byteOffset + v.body.byteLength);
      obj.text = async () => new TextDecoder().decode(v.body);
      obj.json = async () => JSON.parse(new TextDecoder().decode(v.body));
      obj.blob = async () => new Blob([v.body]);
      return obj;
    },
    async put(key: string, value: any, opts?: R2PutOptions): Promise<R2Object> {
      const bytes = await readBody(value);
      const contentType = opts?.httpMetadata && "contentType" in opts.httpMetadata
        ? (opts.httpMetadata as any).contentType ?? "application/octet-stream"
        : "application/octet-stream";
      counter += 1;
      const etag = await sha256Hex(bytes).then((h) => `${h}-${counter}`);
      const stored: Stored = {
        key,
        body: bytes,
        contentType,
        etag,
        uploaded: new Date(),
      };
      store.set(key, stored);
      return makeObject(stored);
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(opts?: R2ListOptions): Promise<R2Objects> {
      const prefix = opts?.prefix ?? "";
      const objects = [...store.values()]
        .filter((s) => s.key.startsWith(prefix))
        .map((s) => makeObject(s));
      return { objects, truncated: false, delimitedPrefixes: [] } as unknown as R2Objects;
    },
    async createMultipartUpload(): Promise<any> {
      throw new Error("memR2: multipart not supported");
    },
    async resumeMultipartUpload(): Promise<any> {
      throw new Error("memR2: multipart not supported");
    },
  } as unknown as R2Bucket;
}
