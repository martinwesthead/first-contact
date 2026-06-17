import { sessionEventBus, type SseEvent } from "./operator/events.js";
import {
  findAction,
  visibleToolSpecs,
  type ActionResult,
} from "./operator/registry.js";
import { extractSession, type Session } from "./operator/types.js";

export interface ChatHandlerEnv {
  CLAUDE_API_KEY?: string;
  CLAUDE_MODEL?: string;
  ANTHROPIC_API_URL?: string;
}

export interface ChatHandlerDeps {
  fetch?: typeof fetch;
  log?: (event: string, detail: Record<string, unknown>) => void;
}

export interface CatalogEntryShape {
  id: string;
  version: number;
  variants: readonly string[];
  dials: Record<string, readonly string[]>;
}

export interface FrameworkCatalogShape {
  modules: ReadonlyArray<CatalogEntryShape>;
  themeTokenNames: ReadonlyArray<string>;
}

export interface ChatRequestBody {
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  siteDefinition: unknown;
  frameworkCatalog: FrameworkCatalogShape;
}

export interface SystemActionInvocation {
  readonly name: string;
  readonly input: Record<string, unknown>;
  readonly result: ActionResult;
}

export interface ChatResponseBody {
  text: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
  systemActions: Array<SystemActionInvocation>;
}

const ANTHROPIC_DEFAULT_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export async function handleChatRequest(
  request: Request,
  env: ChatHandlerEnv,
  deps: ChatHandlerDeps = {},
): Promise<Response> {
  const log = deps.log ?? ((event, detail) => console.log(event, detail));
  if (request.method !== "POST") {
    return jsonError("POST required", 405);
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonError("Content-Type must be application/json", 400);
  }
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return jsonError("invalid JSON body", 400);
  }
  if (!isPlainObject(body) || !Array.isArray(body.history)) {
    return jsonError("body must include 'history' array", 400);
  }
  if (!env.CLAUDE_API_KEY) {
    return jsonError("CLAUDE_API_KEY is not configured", 500);
  }

  const session = extractSession(request);
  const tools = visibleToolSpecs(session.plan_tier);

  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const url = env.ANTHROPIC_API_URL ?? ANTHROPIC_DEFAULT_URL;
  const model = env.CLAUDE_MODEL ?? DEFAULT_MODEL;
  const system = buildSystemPrompt(body.frameworkCatalog, body.siteDefinition);
  const messages = body.history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  let anthropicResponse: Response;
  try {
    anthropicResponse = await fetchImpl(url, {
      method: "POST",
      headers: {
        "x-api-key": env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        tools,
        messages,
      }),
    });
  } catch (err) {
    log("anthropic_call_failed", { error: String(err) });
    return jsonError("upstream chat provider unreachable", 502);
  }

  if (!anthropicResponse.ok) {
    const text = await safeReadText(anthropicResponse);
    log("anthropic_non_ok", { status: anthropicResponse.status, text });
    return jsonError(
      `chat provider returned ${anthropicResponse.status}`,
      502,
    );
  }

  const anthropicJson = (await anthropicResponse.json()) as AnthropicMessage;
  const { text, toolCalls: rawCalls } = extractContent(anthropicJson);

  // Split tool calls by registry category. State-edit calls flow back to the
  // FE for client-side validator + apply. System-action calls execute
  // server-side here; results emit on the session SSE channel AND ride back
  // in the response body so callers without an open SSE still see them.
  const stateEditCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
  const systemActions: Array<SystemActionInvocation> = [];

  for (const call of rawCalls) {
    const action = findAction(call.name);
    if (!action) {
      // Anthropic emitted a tool we don't know — pass through to FE so the
      // existing client-side rejection path records it.
      stateEditCalls.push(call);
      continue;
    }
    if (action.category === "state_edit") {
      stateEditCalls.push(call);
      continue;
    }
    if (!action.handler) {
      systemActions.push({
        name: call.name,
        input: call.input,
        result: {
          status: "failed",
          error: `system action '${call.name}' has no handler`,
        },
      });
      continue;
    }
    const emit = sessionEmitter(session);
    let result: ActionResult;
    try {
      result = await action.handler(call.input, { session, env, emit });
    } catch (err) {
      result = {
        status: "failed",
        error: `handler threw: ${String(err)}`,
      };
    }
    systemActions.push({ name: call.name, input: call.input, result });
  }

  const responseBody: ChatResponseBody = {
    text,
    toolCalls: stateEditCalls,
    systemActions,
  };
  return jsonResponse(responseBody);
}

function sessionEmitter(session: Session): (event: SseEvent) => void {
  if (!session.session_id) return () => {};
  const sessionId = session.session_id;
  return (event: SseEvent): void => sessionEventBus.publish(sessionId, event);
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | string;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
}
interface AnthropicMessage {
  content?: AnthropicContentBlock[];
}

function extractContent(message: AnthropicMessage): {
  text: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
} {
  const blocks = message.content ?? [];
  const texts: string[] = [];
  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") {
      texts.push(block.text);
    } else if (
      block.type === "tool_use" &&
      typeof block.name === "string" &&
      isPlainObject(block.input)
    ) {
      toolCalls.push({ name: block.name, input: block.input });
    }
  }
  return { text: texts.join("\n").trim(), toolCalls };
}

function buildSystemPrompt(
  catalog: FrameworkCatalogShape,
  siteDefinition: unknown,
): string {
  const modulesSection = catalog.modules
    .map((m) => {
      const dials = Object.entries(m.dials)
        .map(([d, vs]) => `      - ${d}: [${vs.join(", ")}]`)
        .join("\n");
      return `  - ${m.id}@v${m.version}
    variants: [${m.variants.join(", ")}]
    dials:
${dials}`;
    })
    .join("\n");
  const tokensSection = catalog.themeTokenNames.map((t) => `  - ${t}`).join("\n");
  return [
    "You are the 1st Contact builder AI. You translate the operator's plain-English nudges into structured tool calls against their site definition. You DO NOT write code, CSS, or HTML. Every change is a tool call.",
    "",
    "Module catalog (use exact ids and finite-enum values):",
    modulesSection,
    "",
    "Theme tokens you may set:",
    tokensSection,
    "",
    "Rules:",
    "- Always use exact dial/variant values from the catalog (e.g. 'rounded', not 'rounded-md').",
    "- One tool call per atomic change. Multiple tool calls per turn are fine.",
    "- After the tool calls, reply with one short sentence describing what you changed.",
    "",
    "Current site definition (read-only — your tool calls produce edits):",
    JSON.stringify(siteDefinition).slice(0, 16_000),
  ].join("\n");
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

async function safeReadText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}
