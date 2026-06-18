type Entry = {
  value: string;
  expiresAt: number | null;
};

export interface MemKv extends KVNamespace {
  __store(): Map<string, Entry>;
  __advance(ms: number): void;
}

/**
 * In-memory KV mock satisfying the parts of KVNamespace used by the safety
 * package and the safety health route. Honors `expirationTtl` (in seconds);
 * tests can fast-forward via __advance(ms).
 */
export function makeMemKv(now: () => number = Date.now): MemKv {
  const store = new Map<string, Entry>();
  let offset = 0;
  const clock = (): number => now() + offset;

  const isExpired = (e: Entry): boolean =>
    e.expiresAt !== null && e.expiresAt <= clock();

  const kv = {
    async get(key: string, opts?: any): Promise<any> {
      const type = typeof opts === "string" ? opts : opts?.type;
      const entry = store.get(key);
      if (!entry) return null;
      if (isExpired(entry)) {
        store.delete(key);
        return null;
      }
      if (type === "json") {
        return JSON.parse(entry.value);
      }
      if (type === "arrayBuffer" || type === "stream") {
        throw new Error("memKv: only text/json reads supported");
      }
      return entry.value;
    },
    async put(key: string, value: string | ArrayBufferLike, opts?: any): Promise<void> {
      let text: string;
      if (typeof value === "string") text = value;
      else text = new TextDecoder().decode(new Uint8Array(value as ArrayBuffer));
      const ttl = typeof opts?.expirationTtl === "number" ? opts.expirationTtl : null;
      const expiresAt = ttl !== null ? clock() + ttl * 1000 : null;
      store.set(key, { value: text, expiresAt });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(opts?: any): Promise<{ keys: { name: string }[]; list_complete: true; cursor: undefined }> {
      const prefix = opts?.prefix ?? "";
      const keys: { name: string }[] = [];
      for (const [k, e] of store) {
        if (isExpired(e)) {
          store.delete(k);
          continue;
        }
        if (k.startsWith(prefix)) keys.push({ name: k });
      }
      return { keys, list_complete: true, cursor: undefined };
    },
    async getWithMetadata(): Promise<any> {
      throw new Error("memKv: getWithMetadata not implemented");
    },
    __store(): Map<string, Entry> {
      return store;
    },
    __advance(ms: number): void {
      offset += ms;
    },
  };
  return kv as unknown as MemKv;
}
