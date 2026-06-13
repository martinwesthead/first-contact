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

export interface ChatResponseBody {
  text: string;
  toolCalls: Array<{ name: string; input: Record<string, unknown> }>;
}

const ANTHROPIC_DEFAULT_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const TOOL_DEFINITIONS = [
  {
    name: "set_module_content",
    description:
      "Update a single content field on an existing module instance. Use for changing text, images, links etc.",
    input_schema: {
      type: "object",
      properties: {
        instance_id: { type: "string" },
        field: { type: "string" },
        value: {},
      },
      required: ["instance_id", "field", "value"],
    },
  },
  {
    name: "set_module_dial",
    description:
      "Set a dial (finite-enum visual property) on a module instance. Value MUST be in the module's declared dial enumeration.",
    input_schema: {
      type: "object",
      properties: {
        instance_id: { type: "string" },
        dial: { type: "string" },
        value: { type: "string" },
      },
      required: ["instance_id", "dial", "value"],
    },
  },
  {
    name: "set_module_variant",
    description:
      "Set the variant of a module instance. Value MUST be in the module's declared variants list.",
    input_schema: {
      type: "object",
      properties: {
        instance_id: { type: "string" },
        variant: { type: "string" },
      },
      required: ["instance_id", "variant"],
    },
  },
  {
    name: "add_module",
    description:
      "Insert a new module instance into a page. Optionally insert after a specific existing module.",
    input_schema: {
      type: "object",
      properties: {
        page_id: { type: "string" },
        type: { type: "string" },
        version: { type: "number" },
        after_instance_id: { type: "string" },
        variant: { type: "string" },
        dials: { type: "object" },
        content: { type: "object" },
        id: { type: "string" },
      },
      required: ["page_id", "type", "version"],
    },
  },
  {
    name: "remove_module",
    description: "Remove a module instance by id.",
    input_schema: {
      type: "object",
      properties: { instance_id: { type: "string" } },
      required: ["instance_id"],
    },
  },
  {
    name: "reorder_modules",
    description:
      "Reorder all modules on a page. instance_ids must list every module on the page exactly once in the desired order.",
    input_schema: {
      type: "object",
      properties: {
        page_id: { type: "string" },
        instance_ids: { type: "array", items: { type: "string" } },
      },
      required: ["page_id", "instance_ids"],
    },
  },
  {
    name: "set_theme_token",
    description:
      "Set a site-wide theme token. Name must be in the catalog's themeTokenNames list (e.g. 'palette.primary').",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        value: { type: "string" },
      },
      required: ["name", "value"],
    },
  },
  {
    name: "set_site_config",
    description:
      "Set a single site config field (e.g. 'businessName', 'contact.email').",
    input_schema: {
      type: "object",
      properties: {
        field: { type: "string" },
        value: {},
      },
      required: ["field", "value"],
    },
  },
];

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
        tools: TOOL_DEFINITIONS,
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
  const { text, toolCalls } = extractContent(anthropicJson);
  const responseBody: ChatResponseBody = { text, toolCalls };
  return jsonResponse(responseBody);
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
