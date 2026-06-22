// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createBuilderLayout } from "@gendev/builder-ui/layout";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

describe("UAT FC REQ-8: splitter drag resizes panels and persists width", () => {
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

  it("drags the splitter, clamps to min, and persists the final width", () => {
    const storage = new MemoryStorage();
    const layout = createBuilderLayout(document.body, {
      storage,
      initialChatWidthPx: 300,
      minChatWidthPx: 200,
      maxChatWidthPx: 800,
    });

    // jsdom does not implement set/release pointer capture — stub them.
    layout.splitter.setPointerCapture = (): void => {};
    layout.splitter.releasePointerCapture = (): void => {};

    dispatchPointer(layout.splitter, "pointerdown", 300);
    dispatchPointer(layout.splitter, "pointermove", 500); // delta = +200
    expect(layout.getPanelState().chatWidthPx).toBe(500);
    expect(layout.chatPanel.style.width).toBe("500px");

    // Drag past the upper bound — clamped to max.
    dispatchPointer(layout.splitter, "pointermove", 2000);
    expect(layout.getPanelState().chatWidthPx).toBe(800);

    // Drag below the lower bound — clamped to min.
    dispatchPointer(layout.splitter, "pointermove", -2000);
    expect(layout.getPanelState().chatWidthPx).toBe(200);

    // Release: persisted width is what was set on the last move.
    dispatchPointer(layout.splitter, "pointermove", 350);
    dispatchPointer(layout.splitter, "pointerup", 350);
    expect(layout.getPanelState().chatWidthPx).toBe(350);

    const persisted = storage.getItem("1stcontact_builder_panels_v1");
    expect(persisted).toBeTruthy();
    expect(JSON.parse(persisted!)).toEqual({
      chatWidthPx: 350,
      collapsed: false,
    });
  });
});
