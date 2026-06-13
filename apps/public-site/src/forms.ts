export interface FormHandlerEnv {
  LEADS_DB: D1Database;
  SITE_ID: string;
  TURNSTILE_SECRET?: string;
  TURNSTILE_VERIFY_URL?: string;
  RESEND_API_KEY?: string;
  RESEND_API_URL?: string;
  RESEND_NOTIFY_TO?: string;
  RESEND_NOTIFY_FROM?: string;
}

export interface FormHandlerDeps {
  fetch?: typeof fetch;
  now?: () => number;
  generateId?: () => string;
  log?: (event: string, detail: Record<string, unknown>) => void;
}

const CANONICAL_FIELDS = new Set([
  "name",
  "email",
  "phone",
  "message",
  "page_path",
  "turnstile_token",
  "website",
]);

const TURNSTILE_DEFAULT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_DEFAULT_URL = "https://api.resend.com/emails";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ErrorBody {
  success: false;
  error: ErrorCode;
  message: string;
}

type ErrorCode =
  | "INVALID_JSON"
  | "INVALID_CONTENT_TYPE"
  | "MISSING_FIELD"
  | "INVALID_EMAIL"
  | "TURNSTILE_FAILED"
  | "INTERNAL";

export async function handleContactSubmission(
  request: Request,
  env: FormHandlerEnv,
  deps: FormHandlerDeps = {},
): Promise<Response> {
  const log = deps.log ?? ((event, detail) => console.log(event, detail));

  if (request.method !== "POST") {
    return errorResponse("INVALID_CONTENT_TYPE", "POST required", 405);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse(
      "INVALID_CONTENT_TYPE",
      "Content-Type must be application/json",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body is not valid JSON");
  }
  if (!isPlainObject(body)) {
    return errorResponse("INVALID_JSON", "Request body must be a JSON object");
  }

  if (typeof body.website === "string" && body.website.length > 0) {
    return jsonResponse({ success: true, dropped: true });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return errorResponse("MISSING_FIELD", "email is required");
  }
  if (!EMAIL_REGEX.test(email)) {
    return errorResponse("INVALID_EMAIL", "email is not a valid address");
  }

  const fetchImpl = deps.fetch ?? globalThis.fetch;
  let turnstilePass = false;
  if (env.TURNSTILE_SECRET) {
    const token =
      typeof body.turnstile_token === "string" ? body.turnstile_token : "";
    if (!token) {
      return errorResponse(
        "TURNSTILE_FAILED",
        "Turnstile token missing",
      );
    }
    const verifyUrl = env.TURNSTILE_VERIFY_URL ?? TURNSTILE_DEFAULT_URL;
    const remoteIp = request.headers.get("CF-Connecting-IP") ?? "";
    try {
      const form = new FormData();
      form.set("secret", env.TURNSTILE_SECRET);
      form.set("response", token);
      if (remoteIp) form.set("remoteip", remoteIp);
      const verifyResp = await fetchImpl(verifyUrl, {
        method: "POST",
        body: form,
      });
      const verifyJson = (await verifyResp.json()) as { success?: boolean };
      turnstilePass = verifyJson.success === true;
    } catch (err) {
      log("turnstile_verify_error", { error: String(err) });
      turnstilePass = false;
    }
    if (!turnstilePass) {
      return errorResponse(
        "TURNSTILE_FAILED",
        "Turnstile verification failed",
      );
    }
  }

  const now = (deps.now ?? Date.now)();
  const id = (deps.generateId ?? defaultGenerateId)();
  const name = strOrNull(body.name);
  const phone = strOrNull(body.phone);
  const message = strOrNull(body.message);
  const pagePath = strOrNull(body.page_path);
  const userAgent = request.headers.get("user-agent");
  const ipCountry = request.headers.get("CF-IPCountry");

  const extra: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!CANONICAL_FIELDS.has(k)) extra[k] = v;
  }
  const extraFields = Object.keys(extra).length > 0 ? JSON.stringify(extra) : null;

  try {
    await env.LEADS_DB.prepare(
      `INSERT INTO leads (
        id, site_id, form_id, created_at,
        name, email, phone, message, extra_fields,
        page_path, user_agent, ip_country,
        turnstile_pass, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
    )
      .bind(
        id,
        env.SITE_ID,
        "contact",
        now,
        name,
        email,
        phone,
        message,
        extraFields,
        pagePath,
        userAgent,
        ipCountry,
        turnstilePass ? 1 : 0,
      )
      .run();
  } catch (err) {
    log("leads_insert_error", { error: String(err), id });
    return errorResponse("INTERNAL", "Could not record submission", 500);
  }

  // Best-effort email notification. Resend failure does NOT fail the request
  // — the lead is already persisted.
  if (env.RESEND_API_KEY && env.RESEND_NOTIFY_TO && env.RESEND_NOTIFY_FROM) {
    const resendUrl = env.RESEND_API_URL ?? RESEND_DEFAULT_URL;
    try {
      const emailResp = await fetchImpl(resendUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: env.RESEND_NOTIFY_FROM,
          to: [env.RESEND_NOTIFY_TO],
          subject: `New lead: ${name ?? "(no name)"} <${email}>`,
          html: renderNotificationHtml({
            id,
            siteId: env.SITE_ID,
            name,
            email,
            phone,
            message,
            extra,
          }),
        }),
      });
      if (!emailResp.ok) {
        log("resend_notify_failed", {
          id,
          status: emailResp.status,
        });
      }
    } catch (err) {
      log("resend_notify_error", { id, error: String(err) });
    }
  }

  return jsonResponse({
    success: true,
    dropped: false,
    message: "Thanks — we'll be in touch.",
    lead_id: id,
  });
}

function errorResponse(
  error: ErrorCode,
  message: string,
  status = 400,
): Response {
  const body: ErrorBody = { success: false, error, message };
  return jsonResponse(body, status);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function defaultGenerateId(): string {
  return crypto.randomUUID();
}

function renderNotificationHtml(args: {
  id: string;
  siteId: string;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  extra: Record<string, unknown>;
}): string {
  const rows: string[] = [
    row("Name", args.name ?? "—"),
    row("Email", args.email),
  ];
  if (args.phone) rows.push(row("Phone", args.phone));
  if (args.message) rows.push(row("Message", args.message));
  for (const [k, v] of Object.entries(args.extra)) {
    rows.push(row(k, String(v)));
  }
  rows.push(row("Lead ID", args.id));
  rows.push(row("Site", args.siteId));
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;color:#0f172a;">
  <h2 style="margin:0 0 16px;">1st Contact — New lead</h2>
  <table style="border-collapse:collapse;font-size:14px;">${rows.join("")}</table>
</body></html>`;
}

function row(label: string, value: string): string {
  const safeLabel = escapeHtml(label);
  const safeValue = escapeHtml(value);
  return `<tr><td style="padding:4px 12px 4px 0;color:#64748b;vertical-align:top;">${safeLabel}</td><td style="padding:4px 0;">${safeValue}</td></tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
