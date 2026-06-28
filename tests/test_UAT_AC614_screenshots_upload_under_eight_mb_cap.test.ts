import { describe, expect, it } from "vitest";
import {
  uploadScreenshots,
  SCREENSHOT_BYTES_CAP,
} from "../packages/extractor/src/index.js";
import { makeMemR2 } from "./_helpers_REQ-20_r2.js";
import { TINY_PNG } from "./_helpers_REQ-22_rendered.js";

/**
 * AC-614: The upload step writes each viewport PNG to the shared assets bucket
 * at references/{chatId}/{turnId}/{viewport}.png and returns the produced keys.
 * A viewport whose PNG exceeds the 8 MB cap is dropped (reason
 * 'screenshot_too_large') rather than uploaded; a viewport the driver did not
 * produce is skipped.
 */
describe("UAT AC-614: screenshots upload to the references keyspace under an 8 MB per-viewport cap", () => {
  it("test_UAT_AC614_screenshots_upload_under_eight_mb_cap", async () => {
    // (a) Three in-cap screenshots → three keys at the references keyspace.
    const bucket = makeMemR2();
    const ok = await uploadScreenshots(
      bucket,
      { mobile: TINY_PNG, tablet: TINY_PNG, desktop: TINY_PNG },
      { chatId: "chat-1", turnId: "turn-aaa" },
    );
    expect(ok.keys.mobile).toBe("references/chat-1/turn-aaa/mobile.png");
    expect(ok.keys.tablet).toBe("references/chat-1/turn-aaa/tablet.png");
    expect(ok.keys.desktop).toBe("references/chat-1/turn-aaa/desktop.png");
    expect(ok.dropped.length).toBe(0);
    // The bytes really landed in the bucket under the desktop key.
    const meta = await bucket.head("references/chat-1/turn-aaa/desktop.png");
    expect(meta).not.toBeNull();
    expect(meta?.httpMetadata?.contentType).toBe("image/png");

    // (b) A set including one viewport over the 8 MB cap → that viewport is
    // dropped (screenshot_too_large); the others upload and return keys. The
    // tablet viewport is intentionally not produced by the driver (skipped).
    const bucket2 = makeMemR2();
    const oversized = new Uint8Array(SCREENSHOT_BYTES_CAP + 1024);
    oversized.set(TINY_PNG, 0);
    const mixed = await uploadScreenshots(
      bucket2,
      { mobile: TINY_PNG, desktop: oversized },
      { chatId: "chat-2", turnId: "turn-bbb" },
    );
    // In-cap mobile uploaded; oversized desktop dropped; absent tablet skipped.
    expect(mixed.keys.mobile).toBe("references/chat-2/turn-bbb/mobile.png");
    expect(mixed.keys.desktop).toBeUndefined();
    expect(mixed.keys.tablet).toBeUndefined();
    expect(mixed.dropped.length).toBe(1);
    expect(mixed.dropped[0].viewport).toBe("desktop");
    expect(mixed.dropped[0].reason).toBe("screenshot_too_large");
    // The dropped viewport was never written to the bucket.
    expect(await bucket2.head("references/chat-2/turn-bbb/desktop.png")).toBeNull();
  });
});
