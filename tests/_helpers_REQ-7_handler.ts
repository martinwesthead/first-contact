import { handleContactSubmission, type FormHandlerEnv, type FormHandlerDeps } from "../apps/public-site/src/forms.js";
import { createTestDb, type TestDb } from "./_helpers_REQ-7_db.js";

export interface HandlerHarness {
  env: FormHandlerEnv;
  test: TestDb;
  call: (
    body: unknown,
    init?: {
      headers?: Record<string, string>;
      deps?: FormHandlerDeps;
      method?: string;
      bodyOverride?: BodyInit;
    },
  ) => Promise<Response>;
  fetchMock: ReturnType<typeof createFetchMock>;
  cleanup: () => Promise<void>;
}

export function createFetchMock() {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const handlers: Array<(url: string, init?: RequestInit) => Response | null> = [];
  const mock = ((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    // Last-added handler wins so tests can override defaults set by the harness.
    for (let i = handlers.length - 1; i >= 0; i--) {
      const r = handlers[i]!(url, init);
      if (r) return Promise.resolve(r);
    }
    return Promise.resolve(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
  return {
    fn: mock,
    calls,
    addHandler(h: (url: string, init?: RequestInit) => Response | null) {
      handlers.push(h);
    },
    findCall(predicate: (url: string) => boolean) {
      return calls.find((c) => predicate(c.url));
    },
  };
}

export async function createHandlerHarness(
  overrides: Partial<FormHandlerEnv> = {},
): Promise<HandlerHarness> {
  const test = await createTestDb();
  const fetchMock = createFetchMock();
  const env: FormHandlerEnv = {
    LEADS_DB: test.db as never,
    SITE_ID: "1stcontact",
    TURNSTILE_SECRET: "test-secret",
    TURNSTILE_VERIFY_URL: "https://turnstile.test/siteverify",
    RESEND_API_KEY: "test-resend-key",
    RESEND_API_URL: "https://resend.test/emails",
    RESEND_NOTIFY_TO: "ops@1stcontact.io",
    RESEND_NOTIFY_FROM: "leads@1stcontact.io",
    ...overrides,
  };
  // Default Turnstile mock: always succeed.
  fetchMock.addHandler((url) => {
    if (url.includes("siteverify")) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return null;
  });

  async function call(
    body: unknown,
    init: {
      headers?: Record<string, string>;
      deps?: FormHandlerDeps;
      method?: string;
      bodyOverride?: BodyInit;
    } = {},
  ): Promise<Response> {
    const headers = {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    };
    const req = new Request("https://example.test/api/forms/contact", {
      method: init.method ?? "POST",
      headers,
      body: init.bodyOverride ?? JSON.stringify(body),
    });
    const deps: FormHandlerDeps = {
      fetch: fetchMock.fn,
      ...(init.deps ?? {}),
    };
    return handleContactSubmission(req, env, deps);
  }

  return {
    env,
    test,
    call,
    fetchMock,
    cleanup: () => test.cleanup(),
  };
}

export async function readAllLeads(test: TestDb): Promise<Record<string, unknown>[]> {
  const db = test.db as {
    prepare: (s: string) => { all: () => Promise<{ results: Record<string, unknown>[] }> };
  };
  const result = await db.prepare("SELECT * FROM leads").all();
  return result.results;
}
