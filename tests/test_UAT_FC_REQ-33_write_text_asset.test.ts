import { describe, expect, it, vi } from "vitest";
import { findAction } from "../apps/control-app/src/operator/registry.js";
import type { ActionContext } from "../apps/control-app/src/operator/registry.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";

function makeCtx(env: { ASSETS_BUCKET?: R2Bucket }): {
  ctx: ActionContext;
  events: Array<{ event: string; data: Record<string, unknown> }>;
} {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  const ctx: ActionContext = {
    session: { session_id: "s1", account_id: "acct-r33", plan_tier: "trial" },
    env: env as unknown as ActionContext["env"],
    emit: vi.fn((e: { event: string; data: Record<string, unknown> }) => {
      events.push(e);
    }),
    siteDefinition: null,
    operatorLastMessage: null,
  };
  return { ctx, events };
}

describe("UAT FC REQ-33 AC11: write_text_asset writes markdown to R2 and validates keys", () => {
  it("writes a markdown text asset to R2 and returns { ok, key, bytes }", async () => {
    const action = findAction("write_text_asset");
    expect(action?.handler).toBeDefined();
    const bucket = makeMemR2();
    const { ctx, events } = makeCtx({ ASSETS_BUCKET: bucket });
    const content = "# Updated heading\n\nFresh body.";
    const result = await action!.handler!(
      { key: "sites/acct-r33/copy/about.md", content },
      ctx,
    );
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.payload?.ok).toBe(true);
      expect(result.payload?.key).toBe("sites/acct-r33/copy/about.md");
      expect(result.payload?.bytes).toBe(content.length);
    }
    const obj = await bucket.get("sites/acct-r33/copy/about.md");
    expect(obj).not.toBeNull();
    expect(await obj!.text()).toBe(content);
    expect(obj!.httpMetadata!.contentType).toBe("text/markdown");
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("action:notify");
  });

  it("AC11: rejects keys not matching sites/{siteId}/copy/{slug}.md", async () => {
    const action = findAction("write_text_asset");
    const bucket = makeMemR2();
    const { ctx } = makeCtx({ ASSETS_BUCKET: bucket });
    const result = await action!.handler!(
      { key: "uploads/abc/cat.png", content: "anything" },
      ctx,
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.error).toMatch(/sites\/\{siteId\}\/copy/);
    }
  });

  it("rejects keys with traversal attempts", async () => {
    const action = findAction("write_text_asset");
    const bucket = makeMemR2();
    const { ctx } = makeCtx({ ASSETS_BUCKET: bucket });
    const result = await action!.handler!(
      { key: "sites/x/copy/../../etc/passwd.md", content: "x" },
      ctx,
    );
    expect(result.status).toBe("failed");
  });

  it("rejects missing content (non-string)", async () => {
    const action = findAction("write_text_asset");
    const bucket = makeMemR2();
    const { ctx } = makeCtx({ ASSETS_BUCKET: bucket });
    const result = await action!.handler!(
      { key: "sites/x/copy/a.md", content: 123 as unknown as string },
      ctx,
    );
    expect(result.status).toBe("failed");
  });
});
