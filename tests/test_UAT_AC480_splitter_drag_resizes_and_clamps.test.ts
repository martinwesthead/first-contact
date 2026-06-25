// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createBuilderLayout } from "@1stcontact/builder-ui/layout";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT AC-480: splitter drag resizes the chat panel, clamps to min and max, and persists the final width", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  function dispatchPointer(
    target: Element,
    type: "pointerdown" | "pointermove" | "pointerup",
    clientX: number,
  ): void {
    const event = new Event(type, { bubbles: true }) as PointerEvent;
    Object.defineProperty(event, "clientX", { value: clientX });
    Object.defineProperty(event, "clientY", { value: 0 });
    Object.defineProperty(event, "pointerId", { value: 1 });
    target.dispatchEvent(event);
  }

  it("test_UAT_AC480_splitter_drag_resizes_clamps_persists_and_rehydrates", () => {
    const storage = new MemoryStorage();
    const layout = createBuilderLayout(document.body, {
      storage,
      initialChatWidthPx: 300,
      minChatWidthPx: 200,
      maxChatWidthPx: 800,
    });

    // jsdom does not implement pointer capture — stub on the splitter.
    layout.splitter.setPointerCapture = (): void => {};
    layout.splitter.releasePointerCapture = (): void => {};

    // In-range drag tracks the delta exactly.
    dispatchPointer(layout.splitter, "pointerdown", 300);
    dispatchPointer(layout.splitter, "pointermove", 500);
    expect(layout.getPanelState().chatWidthPx).toBe(500);
    expect(layout.chatPanel.style.width).toBe("500px");

    // Drag past the upper bound clamps to max.
    dispatchPointer(layout.splitter, "pointermove", 2000);
    expect(layout.getPanelState().chatWidthPx).toBe(800);

    // Drag below the lower bound clamps to min.
    dispatchPointer(layout.splitter, "pointermove", -2000);
    expect(layout.getPanelState().chatWidthPx).toBe(200);

    // Release: persisted width = clamped width at last move.
    dispatchPointer(layout.splitter, "pointermove", 350);
    dispatchPointer(layout.splitter, "pointerup", 350);
    expect(layout.getPanelState().chatWidthPx).toBe(350);

    const persisted = storage.getItem("1stcontact_builder_panels_v1");
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted!)).toEqual({
      chatWidthPx: 350,
      collapsed: false,
    });

    // A second mount against the same storage starts at the persisted width.
    layout.destroy();
    const reMounted = createBuilderLayout(document.body, {
      storage,
      minChatWidthPx: 200,
      maxChatWidthPx: 800,
    });
    expect(reMounted.getPanelState().chatWidthPx).toBe(350);
    expect(reMounted.chatPanel.style.width).toBe("350px");
  });
});
