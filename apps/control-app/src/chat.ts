import { applyToolCall, type ToolName } from "@1stcontact/builder-ui/tools";
import type { FrameworkCatalog } from "@1stcontact/builder-ui/catalog";
import type { Site } from "@1stcontact/site-schema";
import {
  mintIntentToken,
  operatorMessageImpliesIntent,
} from "@1stcontact/web-fetch-safety";
import { REPRODUCING_A_WEBSITE_DOC } from "./llm-context.js";
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
  FETCH_RATE_KV?: KVNamespace;
  FETCH_CACHE_KV?: KVNamespace;
  FETCH_ROBOTS_KV?: KVNamespace;
  BROWSER_BUDGET_KV?: KVNamespace;
  BROWSER?: unknown;
  ASSETS_BUCKET?: R2Bucket;
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

/**
 * Structured tool result handed to the AI on the next turn (REQ-13 §Part 1).
 * The same shape is what the FE driver reads back so it can surface a
 * `tool_result` in the chat UI consistently.
 */
export type ChatToolResult =
  | {
      readonly ok: true;
      readonly applied: {
        readonly tool: string;
        readonly args: Record<string, unknown>;
        readonly summary: string;
        readonly data?: unknown;
        readonly kind?: string;
      };
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly tool: string;
        readonly validation: unknown;
      };
    };

/**
 * Final payload emitted on the `done` SSE event. Everything the FE driver
 * needs to commit the turn to the store after streaming completes.
 */
export interface ChatDonePayload {
  text: string;
  toolCalls: Array<{
    name: string;
    input: Record<string, unknown>;
    result: ChatToolResult;
  }>;
  systemActions: Array<SystemActionInvocation>;
  intentToken: string | null;
}

const ANTHROPIC_DEFAULT_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOOL_TURNS = 8;

/**
 * REQ-36 G9: stream chat responses end-to-end as Server-Sent Events.
 *
 * Event protocol (client-facing):
 *   - `token`         { delta: string }                — text delta from the AI
 *   - `tool_call`     { name, input, toolUseId }       — tool_use block completed
 *   - `tool_result`   { name, input, result, toolUseId } — server-side result of the tool
 *   - `done`          ChatDonePayload                  — final aggregate; turn complete
 *   - `error`         { error: string }                — fatal error; stream ends
 *
 * Each event is forwarded as soon as the underlying Anthropic SSE chunk
 * arrives, so the FE can render text progressively and surface tool calls
 * in the live tool-pane while the model is still thinking.
 */
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
  const intentToken = await maybeMintIntentToken(env, session, body.history);
  const operatorLastMessage =
    [...body.history].reverse().find((m) => m.role === "user")?.content ?? null;

  const fetchImpl = deps.fetch ?? globalThis.fetch;
  const url = env.ANTHROPIC_API_URL ?? ANTHROPIC_DEFAULT_URL;
  const model = env.CLAUDE_MODEL ?? DEFAULT_MODEL;

  const initialMessages: AnthropicMessageEntry[] = body.history
    .filter(
      (m): m is { role: "user" | "assistant"; content: string } =>
        m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));

  const catalog = body.frameworkCatalog as FrameworkCatalog;

  // The stream body — runs the multi-turn loop and yields SSE events to the
  // client as text deltas / tool calls arrive.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller): Promise<void> {
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: unknown): void => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const accumulatedText: string[] = [];
      const allToolCalls: Array<{
        name: string;
        input: Record<string, unknown>;
        result: ChatToolResult;
      }> = [];
      const allSystemActions: SystemActionInvocation[] = [];
      let workingSite: unknown = body.siteDefinition;
      const messages: AnthropicMessageEntry[] = [...initialMessages];

      try {
        for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
          const system = buildSystemPrompt(catalog, workingSite);
          let anthropicResponse: Response;
          try {
            anthropicResponse = await fetchImpl(url, {
              method: "POST",
              headers: {
                "x-api-key": env.CLAUDE_API_KEY!,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model,
                max_tokens: 4096,
                system,
                tools,
                messages,
                stream: true,
              }),
            });
          } catch (err) {
            log("anthropic_call_failed", { error: String(err), turn });
            sendEvent("error", {
              error: "upstream chat provider unreachable",
            });
            controller.close();
            return;
          }

          if (!anthropicResponse.ok) {
            const errText = await safeReadText(anthropicResponse);
            log("anthropic_non_ok", {
              status: anthropicResponse.status,
              text: errText,
              turn,
            });
            sendEvent("error", {
              error: `chat provider returned ${anthropicResponse.status}`,
            });
            controller.close();
            return;
          }

          const parsed = await consumeAnthropicStream(
            anthropicResponse,
            (delta) => {
              accumulatedText.push(delta);
              sendEvent("token", { delta });
            },
          );

          messages.push({ role: "assistant", content: parsed.blocks });

          const toolUseBlocks = parsed.blocks.filter(
            (b): b is AnthropicContentBlock & { type: "tool_use"; id: string } =>
              b.type === "tool_use" && typeof b.name === "string" &&
              typeof b.id === "string" && isPlainObject(b.input),
          );

          if (toolUseBlocks.length === 0) break;

          const toolResultBlocks: AnthropicContentBlock[] = [];
          for (const block of toolUseBlocks) {
            const callName = block.name as string;
            const callInput = block.input as Record<string, unknown>;
            const toolUseId = block.id;

            sendEvent("tool_call", {
              name: callName,
              input: callInput,
              toolUseId,
            });

            const action = findAction(callName);
            let result: ChatToolResult;

            if (!action) {
              result = {
                ok: false,
                error: {
                  tool: callName,
                  validation: { message: `unknown tool '${callName}'` },
                },
              };
              allToolCalls.push({ name: callName, input: callInput, result });
            } else if (action.category === "state_edit") {
              const applyResult = applyToolCall(
                workingSite as Site,
                catalog,
                { name: callName as ToolName, input: callInput },
              );
              if (applyResult.ok) {
                workingSite = applyResult.next;
                result = {
                  ok: true,
                  applied: {
                    tool: callName,
                    args: callInput,
                    summary: summarizeStateEdit(callName, callInput),
                  },
                };
              } else {
                result = {
                  ok: false,
                  error: {
                    tool: callName,
                    validation: applyResult.error,
                  },
                };
              }
              allToolCalls.push({ name: callName, input: callInput, result });
            } else {
              // system_action
              if (!action.handler) {
                const validation = {
                  message: `system action '${callName}' has no handler`,
                };
                result = { ok: false, error: { tool: callName, validation } };
                allSystemActions.push({
                  name: callName,
                  input: callInput,
                  result: { status: "failed", error: validation.message },
                });
              } else {
                let actionResult: ActionResult;
                try {
                  actionResult = await action.handler(callInput, {
                    session,
                    env,
                    emit: sessionEmitter(session),
                    siteDefinition: workingSite,
                    operatorLastMessage,
                  });
                } catch (err) {
                  actionResult = {
                    status: "failed",
                    error: `handler threw: ${String(err)}`,
                  };
                }
                allSystemActions.push({
                  name: callName,
                  input: callInput,
                  result: actionResult,
                });
                if (actionResult.status === "ok") {
                  const payload = actionResult.payload ?? {};
                  const hasKindPayload = typeof payload.kind === "string";
                  const surfacesData =
                    callName === "get_site_definition" || hasKindPayload;
                  if (
                    payload.kind === "transcribe_site_done" &&
                    payload.clearedSiteDefinition
                  ) {
                    workingSite = payload.clearedSiteDefinition;
                  }
                  result = {
                    ok: true,
                    applied: {
                      tool: callName,
                      args: callInput,
                      summary: summarizeSystemAction(callName, payload),
                      ...(surfacesData ? { data: payload } : {}),
                      ...(hasKindPayload
                        ? { kind: payload.kind as string }
                        : {}),
                    },
                  };
                } else {
                  result = {
                    ok: false,
                    error: {
                      tool: callName,
                      validation: { message: actionResult.error },
                    },
                  };
                }
              }
              const surfacesAsToolCall =
                !result.ok ||
                (result.ok && typeof result.applied.kind === "string");
              if (surfacesAsToolCall) {
                allToolCalls.push({ name: callName, input: callInput, result });
              }
            }

            sendEvent("tool_result", {
              name: callName,
              input: callInput,
              result,
              toolUseId,
            });

            toolResultBlocks.push({
              type: "tool_result",
              tool_use_id: toolUseId,
              content: JSON.stringify(result),
              ...(result.ok ? {} : { is_error: true }),
            });
          }

          messages.push({ role: "user", content: toolResultBlocks });
        }

        const donePayload: ChatDonePayload = {
          text: accumulatedText.join("").trim(),
          toolCalls: allToolCalls,
          systemActions: allSystemActions,
          intentToken: intentToken ?? null,
        };
        sendEvent("done", donePayload);
      } catch (err) {
        log("chat_stream_error", { error: String(err) });
        try {
          sendEvent("error", { error: String(err) });
        } catch {
          /* downstream already closed */
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

/**
 * Consume an Anthropic streaming Messages API response. Calls `onTextDelta`
 * for each text_delta chunk so the caller can forward it to the client
 * immediately. Returns the reassembled content blocks (text + tool_use with
 * fully accumulated JSON inputs) for the multi-turn message history.
 */
async function consumeAnthropicStream(
  response: Response,
  onTextDelta: (delta: string) => void,
): Promise<{ blocks: AnthropicContentBlock[] }> {
  if (!response.body) {
    return { blocks: [] };
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const blocks: Record<number, AnthropicContentBlock> = {};
  const toolInputBuffers: Record<number, string> = {};

  // SSE frames are delimited by a blank line. Buffer until we see one,
  // then parse the event/data lines.
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const rawFrame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");
      const parsed = parseSseFrame(rawFrame);
      if (!parsed) continue;
      handleAnthropicEvent(parsed.event, parsed.data, blocks, toolInputBuffers, onTextDelta);
    }
  }
  // Flush any final frame without trailing blank line.
  if (buffer.trim().length > 0) {
    const parsed = parseSseFrame(buffer);
    if (parsed) {
      handleAnthropicEvent(parsed.event, parsed.data, blocks, toolInputBuffers, onTextDelta);
    }
  }

  // Materialise blocks in index order, finalising tool_use input from its
  // accumulated JSON buffer (tool_use deltas arrive as partial JSON).
  const ordered = Object.keys(blocks)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((i) => {
      const block = blocks[i]!;
      if (block.type === "tool_use") {
        const raw = toolInputBuffers[i] ?? "";
        let input: Record<string, unknown> = {};
        if (raw.trim().length > 0) {
          try {
            const parsed = JSON.parse(raw);
            if (isPlainObject(parsed)) input = parsed;
          } catch {
            /* tool input JSON corrupt — leave empty so applyToolCall fails cleanly */
          }
        }
        return { ...block, input };
      }
      return block;
    });

  return { blocks: ordered };
}

function parseSseFrame(
  raw: string,
): { event: string; data: string } | null {
  const lines = raw.split("\n");
  let event = "message";
  const dataParts: string[] = [];
  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataParts.push(line.slice(5).replace(/^ /, ""));
    }
  }
  if (dataParts.length === 0) return null;
  return { event, data: dataParts.join("\n") };
}

function handleAnthropicEvent(
  event: string,
  data: string,
  blocks: Record<number, AnthropicContentBlock>,
  toolInputBuffers: Record<number, string>,
  onTextDelta: (delta: string) => void,
): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }
  if (!isPlainObject(parsed)) return;
  switch (event) {
    case "content_block_start": {
      const index = numericField(parsed, "index");
      const cb = parsed.content_block;
      if (index === null || !isPlainObject(cb)) return;
      if (cb.type === "text") {
        blocks[index] = { type: "text", text: "" };
      } else if (cb.type === "tool_use") {
        blocks[index] = {
          type: "tool_use",
          id: String(cb.id ?? ""),
          name: String(cb.name ?? ""),
          input: {},
        };
        toolInputBuffers[index] = "";
      }
      return;
    }
    case "content_block_delta": {
      const index = numericField(parsed, "index");
      const delta = parsed.delta;
      if (index === null || !isPlainObject(delta)) return;
      if (delta.type === "text_delta" && typeof delta.text === "string") {
        const block = blocks[index];
        if (block?.type === "text") {
          block.text = (block.text ?? "") + delta.text;
        }
        onTextDelta(delta.text);
      } else if (
        delta.type === "input_json_delta" &&
        typeof delta.partial_json === "string"
      ) {
        toolInputBuffers[index] = (toolInputBuffers[index] ?? "") + delta.partial_json;
      }
      return;
    }
    default:
      // content_block_stop / message_start / message_delta / message_stop /
      // ping — nothing to do at this layer.
      return;
  }
}

function numericField(obj: Record<string, unknown>, field: string): number | null {
  const v = obj[field];
  return typeof v === "number" ? v : null;
}

async function maybeMintIntentToken(
  env: ChatHandlerEnv,
  session: Session,
  history: ChatRequestBody["history"],
): Promise<string | null> {
  if (!env.FETCH_RATE_KV || !session.session_id) return null;
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser || typeof lastUser.content !== "string") return null;
  if (!operatorMessageImpliesIntent(lastUser.content)) return null;
  const { token } = await mintIntentToken(
    { FETCH_RATE_KV: env.FETCH_RATE_KV },
    { sessionId: session.session_id, accountId: session.account_id },
  );
  return token;
}

function sessionEmitter(session: Session): (event: SseEvent) => void {
  if (!session.session_id) return () => {};
  const sessionId = session.session_id;
  return (event: SseEvent): void => sessionEventBus.publish(sessionId, event);
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result" | string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

interface AnthropicMessageEntry {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

function summarizeStateEdit(
  name: string,
  input: Record<string, unknown>,
): string {
  switch (name) {
    case "set_module_content":
      return `set content.${stringy(input.field)} on ${stringy(input.instance_id)}`;
    case "set_module_dial":
      return `set dial '${stringy(input.dial)}' to '${stringy(input.value)}' on ${stringy(input.instance_id)}`;
    case "set_module_variant":
      return `set variant to '${stringy(input.variant)}' on ${stringy(input.instance_id)}`;
    case "set_theme_token":
      return `set theme token '${stringy(input.name)}' to '${stringy(input.value)}'`;
    case "set_site_config":
      return `set site config '${stringy(input.field)}'`;
    case "add_module":
      return `added ${stringy(input.type)}@v${stringy(input.version)} to page ${stringy(input.page_id)}`;
    case "remove_module":
      return `removed module ${stringy(input.instance_id)}`;
    case "reorder_modules":
      return `reordered modules on page ${stringy(input.page_id)}`;
    case "duplicate_module":
      return `duplicated module ${stringy(input.instance_id)}`;
    case "add_page":
      return `added page '${stringy(input.slug)}'`;
    case "remove_page":
      return `removed page '${stringy(input.slug)}'`;
    case "reorder_pages":
      return `reordered pages`;
    case "set_page_metadata":
      return `updated metadata for page '${stringy(input.slug)}'`;
    case "set_nav_pattern":
      return `set nav pattern to '${stringy(input.pattern)}'`;
    case "set_nav_entries": {
      const entries = Array.isArray(input.entries) ? input.entries.length : 0;
      return `replaced nav entries (${entries} entr${entries === 1 ? "y" : "ies"})`;
    }
    default:
      return `applied ${name}`;
  }
}

function summarizeSystemAction(
  name: string,
  payload: Record<string, unknown>,
): string {
  switch (name) {
    case "get_site_definition":
      return "returned current site definition";
    case "publish_stub": {
      const url = typeof payload.site_url === "string" ? payload.site_url : "";
      return url ? `published to ${url}` : "published";
    }
    case "analyze_page": {
      const digest = payload.digest as
        | { sourceUrl?: unknown; signals?: unknown }
        | undefined;
      const src =
        digest && typeof digest.sourceUrl === "string"
          ? digest.sourceUrl
          : "reference";
      const cache = typeof payload.cache === "string" ? payload.cache : "MISS";
      return `produced reference digest for ${src} (cache ${cache})`;
    }
    case "report_validation_rejection":
      return `logged validation rejection`;
    default:
      return `ran ${name}`;
  }
}

function stringy(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return JSON.stringify(v ?? null);
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
    "- After each tool call you will receive a structured tool_result confirming success (with a short summary) or reporting a validation error. Read these results to decide what to do next.",
    "- Call get_site_definition when you need to verify the current state — e.g. before a complex change that depends on existing content/structure, or after a sequence of edits to confirm the result.",
    "- Prefer duplicate_module over reconstructing a similar module from scratch: it deep-clones type/version/variant/dials/content on the same page and assigns a fresh id.",
    "- When you add or remove pages, keep the site nav consistent — call set_nav_entries with the updated page list so every page stays reachable; nav targets must reference real page / module ids.",
    "- When done, reply with one short sentence describing what you changed.",
    "",
    REPRODUCING_A_WEBSITE_DOC,
    "",
    "Current site definition snapshot (computed fresh each turn from the canonical state):",
    JSON.stringify(siteDefinition).slice(0, 16_000),
  ].join("\n");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function safeReadText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}
