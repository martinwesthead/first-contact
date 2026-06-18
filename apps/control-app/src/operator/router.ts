import type { ChatHandlerEnv } from "../chat.js";
import { sessionEventBus, type SseEvent } from "./events.js";
import { findAction, type ActionResult } from "./registry.js";
import { extractSession, tierPermits } from "./types.js";

export async function handleOperatorActionRequest(
  request: Request,
  env: ChatHandlerEnv,
  actionName: string,
): Promise<Response> {
  if (request.method !== "POST") return jsonError("POST required", 405);

  const action = findAction(actionName);
  if (!action) return jsonError(`unknown action '${actionName}'`, 404);
  if (action.category !== "system_action" || !action.handler) {
    return jsonError(
      `action '${actionName}' is not invokable via /api/operator (state-edit tools are streamed via /api/chat)`,
      400,
    );
  }

  const session = extractSession(request);
  if (!tierPermits(session.plan_tier, action.plan_tier)) {
    return jsonError(
      `action '${actionName}' requires plan_tier '${action.plan_tier}'; session plan_tier is '${session.plan_tier}'`,
      403,
    );
  }
  if (!session.session_id) {
    return jsonError("x-session-id header required for operator actions", 400);
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (
    contentType.length > 0 &&
    !contentType.toLowerCase().includes("application/json")
  ) {
    return jsonError("Content-Type must be application/json", 400);
  }

  let input: Record<string, unknown> = {};
  const raw = await safeReadText(request);
  if (raw.length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (!isPlainObject(parsed)) {
        return jsonError("body must be a JSON object", 400);
      }
      input = parsed;
    } catch {
      return jsonError("invalid JSON body", 400);
    }
  }

  const sessionId = session.session_id;
  const emit = (event: SseEvent): void =>
    sessionEventBus.publish(sessionId, event);

  let result: ActionResult;
  try {
    result = await action.handler(input, {
      session,
      env,
      emit,
      siteDefinition: null,
    });
  } catch (err) {
    return jsonError(`action handler threw: ${String(err)}`, 500);
  }

  if (result.status === "precondition_failed") {
    return jsonError(result.error, 409);
  }
  if (result.status === "failed") {
    return jsonError(result.error, 500);
  }
  return jsonResponse({
    status: "ok",
    action: actionName,
    payload: result.payload ?? {},
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function jsonError(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

async function safeReadText(req: Request): Promise<string> {
  try {
    return await req.text();
  } catch {
    return "";
  }
}
