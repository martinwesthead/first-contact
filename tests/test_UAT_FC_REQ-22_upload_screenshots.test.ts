import { describe, expect, it } from "vitest";
import {
  uploadScreenshots,
  SCREENSHOT_BYTES_CAP,
} from "../packages/extractor/src/index.js";
import { handleAssetsRequest } from "../apps/control-app/src/assets/routes.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";
import { TINY_PNG } from "./_helpers_REQ-22_rendered.js";

describe("UAT FC REQ-22: screenshot upload + /assets/{key} (AC 7 + AC 8)", () => {
  it("AC7: three viewport screenshots upload at references/{chatId}/{turnId}/{viewport}.png with the same content-type", async () => {
    const bucket = makeMemR2();
    const upload = await uploadScreenshots(
      bucket,
      { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
      { chatId: "chat-7", turnId: "turn-aaa" },
    );
    expect(upload.keys.mobile).toBe("references/chat-7/turn-aaa/mobile.png");
    expect(upload.keys.tablet).toBe("references/chat-7/turn-aaa/tablet.png");
    expect(upload.keys.desktop).toBe("references/chat-7/turn-aaa/desktop.png");
    expect(upload.dropped.length).toBe(0);

    const meta = await bucket.head("references/chat-7/turn-aaa/desktop.png");
    expect(meta).not.toBeNull();
    expect(meta?.httpMetadata?.contentType).toBe("image/png");
  });

  it("AC7 (size cap): a screenshot over the 8 MB cap is dropped with screenshot_too_large and the others still upload", async () => {
    const bucket = makeMemR2();
    const oversized = new Uint8Array(SCREENSHOT_BYTES_CAP + 1024);
    oversized.set(TINY_PNG, 0);
    const upload = await uploadScreenshots(
      bucket,
      { mobile: TINY_PNG, tablet: oversized, desktop: TINY_PNG },
      { chatId: "chat-7b", turnId: "turn-bbb" },
    );
    expect(upload.keys.mobile).toBeDefined();
    expect(upload.keys.desktop).toBeDefined();
    expect(upload.keys.tablet).toBeUndefined();
    expect(upload.dropped.length).toBe(1);
    expect(upload.dropped[0].viewport).toBe("tablet");
    expect(upload.dropped[0].reason).toBe("screenshot_too_large");
  });

  it("AC8: GET /assets/references/{chatId}/{turnId}/desktop.png returns the bytes with Content-Type image/png", async () => {
    const bucket = makeMemR2();
    const upload = await uploadScreenshots(
      bucket,
      { desktop: TINY_PNG },
      { chatId: "chat-8", turnId: "turn-ccc" },
    );
    const key = upload.keys.desktop!;
    const req = new Request(`https://app.test/assets/${key}`, { method: "GET" });
    const resp = await handleAssetsRequest(req, { ASSETS_BUCKET: bucket });
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await resp.arrayBuffer());
    expect(bytes.length).toBe(TINY_PNG.length);
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50);
  });
});
