// @vitest-environment jsdom
//
// Reconciliation UATs for story-2524a1ae — "Convert flow chat cards: confirm a
// destructive conversion and watch transcription progress".
//
// Two builder chat-card variants surface the convert flow inside the chat
// stream:
//   * ConvertConfirmation — warning-toned destructive-overwrite gate that emits
//     fc:convert-confirmed / fc:convert-cancelled (side-effect free).
//   * TranscribeProgress — info-toned live progress card whose four stage rows
//     update in place as stage events stream in, with a "What couldn't mirror"
//     surface for failed asset imports.
//
// These tests exercise the cards through their public entry points: the
// tool-result dispatcher (renderToolResult) for the terminal/confirmation
// renders, and the card factory + applyTranscribeEvent for the streamed
// in-place updates.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTranscribeEvent,
  clearToolResultRenderers,
  createTranscribeProgressCard,
  registerConvertConfirmation,
  registerTranscribeProgress,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@1stcontact/builder-ui";

const URL_UNDER_TEST = "https://acme.test/";
const CONFIRM_PROMPT = `Convert will replace your current draft with a transcription of ${URL_UNDER_TEST}. This cannot be automatically undone. Continue?`;

function dispatch(result: ChatToolResultRecord): HTMLElement {
  return renderToolResult({
    doc: document,
    result,
    renderMarkdown: (md) => renderMarkdownToDom(document, md),
  }) as HTMLElement;
}

function confirmationResult(): ChatToolResultRecord {
  return {
    ok: true,
    applied: {
      tool: "transcribe_site",
      args: { url: URL_UNDER_TEST },
      summary: "confirmation required before converting",
      kind: "convert_confirmation",
      data: {
        kind: "convert_confirmation",
        url: URL_UNDER_TEST,
        prompt: CONFIRM_PROMPT,
      },
    },
  };
}

describe("story-2524a1ae: convert-confirmation card", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerConvertConfirmation();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  // --- AC-662 ---------------------------------------------------------------
  it("test_UAT_AC662_confirmation_card_renders_prompt_checkbox_and_actions", () => {
    const node = dispatch(confirmationResult());

    // Warning-toned card titled "Convert site".
    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("warning");
    const title = node.querySelector("[data-fc-chat-card-title]")!;
    expect(title.textContent).toBe("Convert site");

    // Destructive-overwrite prompt naming the URL + "cannot be automatically
    // undone" wording.
    const prompt = node.querySelector("[data-fc-convert-prompt]")!;
    expect(prompt.textContent).toContain(URL_UNDER_TEST);
    expect(prompt.textContent).toContain("cannot be automatically undone");

    // "I own this site" checkbox, present and unchecked by default.
    const checkbox = node.querySelector(
      "[data-fc-convert-owns-checkbox]",
    ) as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    expect(checkbox.type).toBe("checkbox");
    expect(checkbox.checked).toBe(false);

    // Confirm + Cancel actions.
    expect(
      node.querySelector('[data-fc-chat-card-action="Confirm"]'),
    ).not.toBeNull();
    expect(
      node.querySelector('[data-fc-chat-card-action="Cancel"]'),
    ).not.toBeNull();
  });

  // --- AC-663 ---------------------------------------------------------------
  it("test_UAT_AC663_confirm_unchecked_signals_ownssite_false_and_collapses", () => {
    const node = dispatch(confirmationResult());
    document.body.appendChild(node);

    let detail: { url?: string; ownsSite?: boolean } | null = null;
    const handler = (e: Event): void => {
      detail = (e as CustomEvent).detail;
    };
    document.addEventListener("fc:convert-confirmed", handler);

    expect(node.getAttribute("data-fc-chat-card-collapsed")).toBe("false");
    (
      node.querySelector('[data-fc-chat-card-action="Confirm"]') as HTMLButtonElement
    ).click();
    document.removeEventListener("fc:convert-confirmed", handler);

    expect(detail).not.toBeNull();
    expect(detail!.url).toBe(URL_UNDER_TEST);
    expect(detail!.ownsSite).toBe(false);
    // Card collapses after the choice.
    expect(node.getAttribute("data-fc-chat-card-collapsed")).toBe("true");
  });

  // --- AC-664 ---------------------------------------------------------------
  it("test_UAT_AC664_confirm_with_ownership_checked_signals_ownssite_true", () => {
    const node = dispatch(confirmationResult());
    document.body.appendChild(node);

    const checkbox = node.querySelector(
      "[data-fc-convert-owns-checkbox]",
    ) as HTMLInputElement;
    checkbox.checked = true;

    let detail: { url?: string; ownsSite?: boolean } | null = null;
    const handler = (e: Event): void => {
      detail = (e as CustomEvent).detail;
    };
    document.addEventListener("fc:convert-confirmed", handler);

    (
      node.querySelector('[data-fc-chat-card-action="Confirm"]') as HTMLButtonElement
    ).click();
    document.removeEventListener("fc:convert-confirmed", handler);

    expect(detail).not.toBeNull();
    expect(detail!.url).toBe(URL_UNDER_TEST);
    expect(detail!.ownsSite).toBe(true);
  });

  // --- AC-665 ---------------------------------------------------------------
  it("test_UAT_AC665_cancel_signals_cancel_collapses_without_converting", () => {
    const node = dispatch(confirmationResult());
    document.body.appendChild(node);

    let cancelDetail: { url?: string } | null = null;
    let convertFired = false;
    const cancelHandler = (e: Event): void => {
      cancelDetail = (e as CustomEvent).detail;
    };
    const confirmHandler = (): void => {
      convertFired = true;
    };
    document.addEventListener("fc:convert-cancelled", cancelHandler);
    document.addEventListener("fc:convert-confirmed", confirmHandler);

    (
      node.querySelector('[data-fc-chat-card-action="Cancel"]') as HTMLButtonElement
    ).click();
    document.removeEventListener("fc:convert-cancelled", cancelHandler);
    document.removeEventListener("fc:convert-confirmed", confirmHandler);

    expect(cancelDetail).not.toBeNull();
    expect(cancelDetail!.url).toBe(URL_UNDER_TEST);
    // No conversion initiated.
    expect(convertFired).toBe(false);
    // Card collapses.
    expect(node.getAttribute("data-fc-chat-card-collapsed")).toBe("true");
  });
});

describe("story-2524a1ae: transcribe-progress card", () => {
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  const STAGE_LABELS = ["Screenshot", "Theme", "Modules", "Assets mirrored"];

  // --- AC-666 ---------------------------------------------------------------
  it("test_UAT_AC666_progress_card_renders_info_toned_four_pending_stages_titled_by_url", () => {
    const handle = createTranscribeProgressCard(document, { url: URL_UNDER_TEST });
    const root = handle.card.root;

    // Info-toned card titled "Converting {url}".
    expect(root.getAttribute("data-fc-chat-card-tone")).toBe("info");
    expect(
      root.querySelector("[data-fc-chat-card-title]")!.textContent,
    ).toBe(`Converting ${URL_UNDER_TEST}`);

    // Exactly four stage rows, in order, each pending.
    const rows = root.querySelectorAll("[data-fc-transcribe-stage]");
    expect(rows).toHaveLength(4);
    rows.forEach((row, i) => {
      expect(
        row.querySelector(".fc-transcribe-progress__stage-label")!.textContent,
      ).toBe(STAGE_LABELS[i]);
      expect(row.getAttribute("data-fc-transcribe-stage-status")).toBe("pending");
    });
  });

  // --- AC-667 ---------------------------------------------------------------
  it("test_UAT_AC667_stage_events_update_matching_row_in_place_without_rerender", () => {
    const handle = createTranscribeProgressCard(document, { url: URL_UNDER_TEST });
    const root = handle.card.root;

    // Capture node identities BEFORE any events to prove in-place mutation.
    const stage1Before = root.querySelector('[data-fc-transcribe-stage="1"]')!;
    const stage4Before = root.querySelector('[data-fc-transcribe-stage="4"]')!;

    // Stages 1–3 report completed; stage 4 (Assets mirrored) never reports.
    for (const stage of [1, 2, 3] as const) {
      expect(
        applyTranscribeEvent(handle, {
          tool: "transcribe_site",
          stage,
          status: "completed",
        }),
      ).toBe(true);
    }

    for (const stage of [1, 2, 3]) {
      expect(
        root
          .querySelector(`[data-fc-transcribe-stage="${stage}"]`)!
          .getAttribute("data-fc-transcribe-stage-status"),
      ).toBe("completed");
    }
    // Unreported stage stays pending.
    expect(
      root
        .querySelector('[data-fc-transcribe-stage="4"]')!
        .getAttribute("data-fc-transcribe-stage-status"),
    ).toBe("pending");

    // Same card instance, same row nodes — mutated, not replaced.
    expect(handle.card.root).toBe(root);
    expect(root.querySelector('[data-fc-transcribe-stage="1"]')).toBe(stage1Before);
    expect(root.querySelector('[data-fc-transcribe-stage="4"]')).toBe(stage4Before);
  });

  // --- AC-668 ---------------------------------------------------------------
  it("test_UAT_AC668_asset_mirror_stage_shows_running_count", () => {
    const handle = createTranscribeProgressCard(document, { url: URL_UNDER_TEST });
    const root = handle.card.root;

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
      url: "https://acme.test/a.png",
      r2Key: "assets/a.png",
    });
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "asset_mirrored",
      url: "https://acme.test/b.png",
      r2Key: "assets/b.png",
    });

    const count = root
      .querySelector('[data-fc-transcribe-stage="4"]')!
      .querySelector("[data-fc-transcribe-stage-count]")!;
    expect(count.textContent!.trim()).toBe("2/3");
  });

  // --- AC-669 ---------------------------------------------------------------
  it("test_UAT_AC669_failed_mirrors_listed_with_url_and_reason_count_reflects_failures", () => {
    const handle = createTranscribeProgressCard(document, { url: URL_UNDER_TEST });
    const root = handle.card.root;

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
      url: "https://acme.test/ok.png",
      r2Key: "assets/ok.png",
    });
    applyTranscribeEvent(handle, {
      tool: "transcribe_site",
      stage: 4,
      status: "asset_failed",
      url: "https://acme.test/huge.png",
      reason: "body_too_large",
    });

    // "What couldn't mirror" section is visible.
    const failures = root.querySelector(
      "[data-fc-transcribe-failures]",
    ) as HTMLElement;
    expect(failures.style.display).not.toBe("none");

    // One row naming the failed URL and its reason.
    const failureRow = failures.querySelector(
      '[data-fc-transcribe-failure-url="https://acme.test/huge.png"]',
    )!;
    expect(failureRow).not.toBeNull();
    expect(failureRow.getAttribute("data-fc-transcribe-failure-reason")).toBe(
      "body_too_large",
    );
    expect(failureRow.textContent).toContain("https://acme.test/huge.png");
    expect(failureRow.textContent).toContain("body_too_large");

    // Count reflects both success and failure.
    const count = root
      .querySelector('[data-fc-transcribe-stage="4"]')!
      .querySelector("[data-fc-transcribe-stage-count]")!;
    expect(count.textContent!.trim()).toBe("1/2 (1 failed)");
  });

  // --- AC-670 ---------------------------------------------------------------
  it("test_UAT_AC670_terminal_done_result_renders_card_with_narrative_and_failures", () => {
    clearToolResultRenderers();
    registerTranscribeProgress();

    const narrative = "Converted acme.test into a fresh draft.";
    const terminal: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "transcribe_site",
        args: {},
        summary: "transcription complete",
        kind: "transcribe_site_done",
        data: {
          kind: "transcribe_site_done",
          url: URL_UNDER_TEST,
          narrative,
          assetMirrorSummary: {
            mirrored: 1,
            failed: 1,
            failures: [
              { url: "https://acme.test/huge.png", reason: "body_too_large" },
            ],
          },
        },
      },
    };

    const node = dispatch(terminal);

    // Info-toned progress card.
    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("info");

    // Narrative text displayed.
    const narrativeEl = node.querySelector("[data-fc-transcribe-narrative]")!;
    expect(narrativeEl.textContent).toBe(narrative);

    // A "What couldn't mirror" row exists for the summarized failure URL.
    const failureRow = node.querySelector(
      '[data-fc-transcribe-failure-url="https://acme.test/huge.png"]',
    )!;
    expect(failureRow).not.toBeNull();
    expect(failureRow.textContent).toContain("https://acme.test/huge.png");
  });
});
