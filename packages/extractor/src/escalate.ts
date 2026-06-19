import { parseHtml } from "./dom.js";

export type EscalationReason =
  | "thin_body"
  | "js_dominant"
  | "operator_request"
  | "sufficient";

export interface EscalationDecision {
  readonly escalate: boolean;
  readonly reason: EscalationReason;
}

export interface EscalationInput {
  readonly html: string;
  readonly forceRendered?: boolean;
}

const THIN_BODY_TEXT_LIMIT = 200;
const JS_DOMINANT_RATIO = 0.8;

/**
 * Decide whether the static fetch produced enough signal or whether the
 * Browser Rendering escalation should fire.
 *
 *   - operator_request: caller passed forceRendered=true (always wins).
 *   - thin_body: visible <body> text is under 200 chars — likely a SPA shell.
 *   - js_dominant: <script> bytes exceed 80% of <body> bytes — likely a
 *     JS-rendered app where the static HTML is mostly bundles.
 *   - sufficient: static-only signals are good enough; don't burn budget.
 */
export function shouldEscalateToRendered(
  input: EscalationInput,
): EscalationDecision {
  if (input.forceRendered === true) {
    return { escalate: true, reason: "operator_request" };
  }

  const { document } = parseHtml(input.html);
  const bodyEl = document.querySelector("body") as unknown as BodyLike | null;

  const visibleText = bodyEl ? visibleTextOf(bodyEl) : "";
  if (visibleText.length < THIN_BODY_TEXT_LIMIT) {
    return { escalate: true, reason: "thin_body" };
  }

  const bodyHtml = bodyOuterHtml(input.html);
  const totalBytes = byteLength(bodyHtml);
  const scriptBytes = sumScriptBytes(bodyEl);
  if (totalBytes > 0 && scriptBytes / totalBytes > JS_DOMINANT_RATIO) {
    return { escalate: true, reason: "js_dominant" };
  }

  return { escalate: false, reason: "sufficient" };
}

interface BodyLike {
  textContent: string | null;
  querySelectorAll(sel: string): { length: number; [i: number]: { textContent: string | null } };
}

/**
 * "Visible" text approximation: textContent minus <script> and <style> body.
 * linkedom's textContent includes script/style content, so we subtract those
 * explicitly. Whitespace is collapsed so a body full of newlines doesn't pass
 * the 200-char threshold.
 */
function visibleTextOf(body: BodyLike): string {
  const all = (body.textContent ?? "");
  const scripts = body.querySelectorAll("script");
  const styles = body.querySelectorAll("style");
  let stripped = all;
  for (let i = 0; i < scripts.length; i++) {
    stripped = stripped.replace(scripts[i].textContent ?? "", "");
  }
  for (let i = 0; i < styles.length; i++) {
    stripped = stripped.replace(styles[i].textContent ?? "", "");
  }
  return stripped.replace(/\s+/g, " ").trim();
}

function bodyOuterHtml(html: string): string {
  const match = /<body[\s\S]*<\/body>/i.exec(html);
  return match ? match[0] : html;
}

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

function sumScriptBytes(body: BodyLike | null): number {
  if (!body) return 0;
  const scripts = body.querySelectorAll("script");
  let total = 0;
  for (let i = 0; i < scripts.length; i++) {
    total += byteLength(scripts[i].textContent ?? "");
  }
  return total;
}
