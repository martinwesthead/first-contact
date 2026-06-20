// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTranscribeEvent,
  clearToolResultRenderers,
  createTranscribeProgressCard,
  registerTranscribeProgress,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@1stcontact/builder-ui";

describe("UAT FC REQ-28: <TranscribeProgress> chat-card variant (AC3-AC8)", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerTranscribeProgress();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  it("renders a 5-row stage list (Stage 0..4) pending by default", () => {
    const handle = createTranscribeProgressCard(document, {
      url: "https://acme.test/",
    });
    document.body.appendChild(handle.card.root);

    const stages = document.querySelectorAll(
      "[data-fc-transcribe-stage]",
    );
    // REQ-34 introduced Stage 0 (Clearing draft).
    expect(stages.length).toBe(5);
    stages.forEach((s) => {
      expect(s.getAttribute("data-fc-transcribe-stage-status")).toBe("pending");
    });

    // Title carries the source URL.
    const title = document.querySelector("[data-fc-chat-card-title]")!;
    expect(title.textContent).toBe("Converting https://acme.test/");
  });

  it("AC3/AC4/AC5: stage events flip the corresponding row to status=completed", () => {
    const handle = createTranscribeProgressCard(document, {
      url: "https://acme.test/",
    });
    document.body.appendChild(handle.card.root);

    for (const stage of [1, 2, 3] as const) {
      const ok = applyTranscribeEvent(handle, {
        tool: "transcribe_site",
        stage,
        status: "completed",
      });
      expect(ok).toBe(true);
    }

    for (const stage of [1, 2, 3] as const) {
      const row = document.querySelector(
        `[data-fc-transcribe-stage="${stage}"]`,
      )!;
      expect(row.getAttribute("data-fc-transcribe-stage-status")).toBe("completed");
    }
    // Stage 4 is still pending.
    const stage4 = document.querySelector('[data-fc-transcribe-stage="4"]')!;
    expect(stage4.getAttribute("data-fc-transcribe-stage-status")).toBe("pending");
  });

  it("AC6: stage 4 'started' carries a total and stage 4 'asset_mirrored' updates the count", () => {
    const handle = createTranscribeProgressCard(document, {
      url: "https://acme.test/",
    });
    document.body.appendChild(handle.card.root);

    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "started",
      total: 3,
    });
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "asset_mirrored",
      url: "https://acme.test/a.jpg",
      r2Key: "sites/x/imports/aaa.jpg",
    });
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "asset_mirrored",
      url: "https://acme.test/b.jpg",
      r2Key: "sites/x/imports/bbb.jpg",
    });

    const stage4 = document.querySelector('[data-fc-transcribe-stage="4"]')!;
    const count = stage4.querySelector(
      "[data-fc-transcribe-stage-count]",
    )!;
    expect(count.textContent).toBe(" 2/3");
  });

  it("AC8: stage 4 'asset_failed' appends a row in 'What couldn't mirror' with the reason", () => {
    const handle = createTranscribeProgressCard(document, {
      url: "https://acme.test/",
    });
    document.body.appendChild(handle.card.root);
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "started",
      total: 2,
    });
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "asset_mirrored",
      url: "https://acme.test/ok.jpg",
      r2Key: "sites/x/imports/ok.jpg",
    });
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "asset_failed",
      url: "https://acme.test/giant.png",
      reason: "body_too_large",
    });

    const failuresSection = document.querySelector(
      "[data-fc-transcribe-failures]",
    ) as HTMLElement;
    expect(failuresSection.style.display).not.toBe("none");
    const row = document.querySelector(
      '[data-fc-transcribe-failure-url="https://acme.test/giant.png"]',
    );
    expect(row).not.toBeNull();
    expect(row!.getAttribute("data-fc-transcribe-failure-reason")).toBe(
      "body_too_large",
    );
    expect(row!.textContent).toContain("body_too_large");

    // The stage-4 count line now shows mirrored + failed in parens.
    const stage4Count = document.querySelector(
      '[data-fc-transcribe-stage="4"] [data-fc-transcribe-stage-count]',
    )!;
    expect(stage4Count.textContent).toBe(" 1/2 (1 failed)");
  });

  it("AC4: dispatcher routes kind='transcribe_site_done' tool_result to the progress card", () => {
    const result: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "transcribe_site",
        args: { digestId: "https://acme.test/" },
        summary: "Transcription complete",
        kind: "transcribe_site_done",
        data: {
          kind: "transcribe_site_done",
          url: "https://acme.test/",
          fellBackToHero: false,
          narrative: "Two sections transcribed.",
          assetMirrorSummary: {
            mirrored: 2,
            failed: 1,
            failures: [{ url: "https://acme.test/x.png", reason: "body_too_large" }],
          },
        },
      },
    };
    const node = renderToolResult({
      doc: document,
      result,
      renderMarkdown: (md) => renderMarkdownToDom(document, md),
    }) as HTMLElement;
    document.body.appendChild(node);

    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("info");
    expect(
      document.querySelector("[data-fc-transcribe-narrative]")!.textContent,
    ).toBe("Two sections transcribed.");
    const failureRow = document.querySelector(
      '[data-fc-transcribe-failure-url="https://acme.test/x.png"]',
    );
    expect(failureRow).not.toBeNull();
  });

  it("applyTranscribeEvent returns false on unrelated event payloads", () => {
    const handle = createTranscribeProgressCard(document, {
      url: "https://acme.test/",
    });
    expect(
      applyTranscribeEvent(handle, { tool: "analyze_page", stage: 1 }),
    ).toBe(false);
    expect(
      applyTranscribeEvent(handle, { tool: "transcribe_site" }),
    ).toBe(false);
  });
});
