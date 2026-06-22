// @vitest-environment jsdom
//
// Reconciliation UATs for story-2524a1ae — "Convert flow chat cards: confirm a
// destructive conversion and watch transcription progress".
//
// The convert flow surfaces a single chat-card variant: the info-toned
// TranscribeProgress card. It is registered at boot under the
// `transcribe_site_done` dispatcher kind and shows a FIVE-row stage list
// (Stage 0 "Clearing draft" .. Stage 4 "Assets mirrored") that updates in
// place as stage events stream in, plus a running asset-mirror count and a
// "What couldn't mirror" surface for failed imports.
//
// The earlier destructive-confirmation gate (a warning-toned "Convert site"
// card with an ownership checkbox + Confirm/Cancel) has been removed: no
// renderer is registered for `kind: "convert_confirmation"`, so that kind
// falls through to the dispatcher's plain summary fallback.
//
// Tests exercise the card through its public entry points: the tool-result
// dispatcher (renderToolResult), bootBuilder for boot registration, and the
// card factory + applyTranscribeEvent for the streamed in-place updates.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  applyTranscribeEvent,
  bootBuilder,
  clearToolResultRenderers,
  createTranscribeProgressCard,
  getRegisteredToolResultRenderer,
  registerTranscribeProgress,
  renderMarkdownToDom,
  renderToolResult,
  type ChatToolResultRecord,
} from "@gendev/builder-ui";
import { load1stContactSite } from "./_helpers_REQ-8_site.js";
import { MemoryStorage } from "./_helpers_REQ-8_storage.js";

const URL_UNDER_TEST = "https://acme.test/";

// The five stage rows, in order (Stage 0 .. Stage 4).
const STAGE_LABELS = [
  "Clearing draft",
  "Screenshot",
  "Theme",
  "Modules",
  "Assets mirrored",
];

function dispatch(result: ChatToolResultRecord): HTMLElement {
  return renderToolResult({
    doc: document,
    result,
    renderMarkdown: (md) => renderMarkdownToDom(document, md),
  }) as HTMLElement;
}

describe("story-2524a1ae: transcribe-progress convert flow card", () => {
  beforeEach(() => {
    clearToolResultRenderers();
    registerTranscribeProgress();
  });
  afterEach(() => {
    clearToolResultRenderers();
    document.body.innerHTML = "";
  });

  // --- AC-666 ---------------------------------------------------------------
  it("test_UAT_AC666_progress_card_renders_info_toned_five_pending_stages_titled_by_url", () => {
    const handle = createTranscribeProgressCard(document, {
      url: URL_UNDER_TEST,
    });
    const root = handle.card.root;

    // Info-toned card titled "Converting {url}" (echoes the source URL).
    expect(root.getAttribute("data-fc-chat-card-tone")).toBe("info");
    expect(
      root.querySelector("[data-fc-chat-card-title]")!.textContent,
    ).toBe(`Converting ${URL_UNDER_TEST}`);

    // Exactly five stage rows, in order, each pending.
    const rows = root.querySelectorAll("[data-fc-transcribe-stage]");
    expect(rows).toHaveLength(5);
    rows.forEach((row, i) => {
      expect(
        row.querySelector(".fc-transcribe-progress__stage-label")!.textContent,
      ).toBe(STAGE_LABELS[i]);
      expect(row.getAttribute("data-fc-transcribe-stage-status")).toBe(
        "pending",
      );
    });
  });

  // --- AC-662 ---------------------------------------------------------------
  it("test_UAT_AC662_convert_confirmation_kind_falls_back_to_plain_summary_card", () => {
    // The builder is booted so the convert flow's renderers are wired; no
    // renderer exists for `convert_confirmation`.
    clearToolResultRenderers();
    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
      sessionStorageFacility: new MemoryStorage(),
    });

    expect(
      getRegisteredToolResultRenderer("convert_confirmation"),
    ).toBeUndefined();

    const confirmation: ChatToolResultRecord = {
      ok: true,
      applied: {
        tool: "transcribe_site",
        args: { url: URL_UNDER_TEST },
        summary: "confirmation required before converting",
        kind: "convert_confirmation",
        data: {
          kind: "convert_confirmation",
          url: URL_UNDER_TEST,
        },
      },
    };

    const node = dispatch(confirmation);

    // No warning-toned "Convert site" card: no ownership checkbox, no
    // Confirm/Cancel actions, title is not "Convert site".
    expect(node.getAttribute("data-fc-chat-card-tone")).not.toBe("warning");
    expect(
      node.querySelector("[data-fc-chat-card-title]")!.textContent,
    ).not.toBe("Convert site");
    expect(
      node.querySelector("[data-fc-convert-owns-checkbox]"),
    ).toBeNull();
    expect(
      node.querySelector('[data-fc-chat-card-action="Confirm"]'),
    ).toBeNull();
    expect(
      node.querySelector('[data-fc-chat-card-action="Cancel"]'),
    ).toBeNull();

    // Falls back to the dispatcher's generic summary card (tool-named,
    // success-toned, carrying the summary text).
    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("success");
    expect(
      node.querySelector("[data-fc-chat-card-title]")!.textContent,
    ).toBe("transcribe_site");
    expect(node.textContent).toContain(
      "confirmation required before converting",
    );

    destroy();
  });

  // --- AC-667 ---------------------------------------------------------------
  it("test_UAT_AC667_stage_events_update_matching_row_in_place_without_rerender", () => {
    const handle = createTranscribeProgressCard(document, {
      url: URL_UNDER_TEST,
    });
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
    expect(root.querySelector('[data-fc-transcribe-stage="1"]')).toBe(
      stage1Before,
    );
    expect(root.querySelector('[data-fc-transcribe-stage="4"]')).toBe(
      stage4Before,
    );
  });

  // --- AC-668 ---------------------------------------------------------------
  it("test_UAT_AC668_asset_mirror_stage_shows_running_count", () => {
    const handle = createTranscribeProgressCard(document, {
      url: URL_UNDER_TEST,
    });
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
    const handle = createTranscribeProgressCard(document, {
      url: URL_UNDER_TEST,
    });
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
    expect(
      failureRow.getAttribute("data-fc-transcribe-failure-reason"),
    ).toBe("body_too_large");
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
    expect(
      node.querySelector("[data-fc-transcribe-narrative]")!.textContent,
    ).toBe(narrative);

    // A "What couldn't mirror" row exists for the summarized failure URL.
    const failureRow = node.querySelector(
      '[data-fc-transcribe-failure-url="https://acme.test/huge.png"]',
    )!;
    expect(failureRow).not.toBeNull();
    expect(failureRow.textContent).toContain("https://acme.test/huge.png");
    expect(failureRow.textContent).toContain("body_too_large");
  });

  // --- AC-701 ---------------------------------------------------------------
  it("test_UAT_AC701_bootbuilder_registers_transcribe_progress_renderer_not_summary_fallback", () => {
    // Reset so we prove bootBuilder is what wires the renderer.
    clearToolResultRenderers();
    expect(
      getRegisteredToolResultRenderer("transcribe_site_done"),
    ).toBeUndefined();

    const { destroy } = bootBuilder({
      root: document.body,
      initialSite: load1stContactSite(),
      storage: new MemoryStorage(),
      sessionStorageFacility: new MemoryStorage(),
    });

    // transcribe_site_done renderer is registered, alongside the digest report.
    expect(
      getRegisteredToolResultRenderer("transcribe_site_done"),
    ).toBeDefined();
    expect(
      getRegisteredToolResultRenderer("reference_digest"),
    ).toBeDefined();

    // A transcribe_site_done result renders the multi-stage progress card —
    // info-toned "Converting {url}" with the five-row stage list — not the
    // generic summary fallback.
    const node = dispatch({
      ok: true,
      applied: {
        tool: "transcribe_site",
        args: {},
        summary: "transcription complete",
        kind: "transcribe_site_done",
        data: { kind: "transcribe_site_done", url: URL_UNDER_TEST },
      },
    });

    expect(node.getAttribute("data-fc-chat-card-tone")).toBe("info");
    expect(
      node.querySelector("[data-fc-chat-card-title]")!.textContent,
    ).toBe(`Converting ${URL_UNDER_TEST}`);
    expect(node.querySelectorAll("[data-fc-transcribe-stage]")).toHaveLength(5);

    destroy();
  });

  // --- AC-702 ---------------------------------------------------------------
  it("test_UAT_AC702_stage0_clearing_draft_flips_to_cleared_in_place", () => {
    const handle = createTranscribeProgressCard(document, {
      url: URL_UNDER_TEST,
    });
    const root = handle.card.root;

    const stage0Before = root.querySelector('[data-fc-transcribe-stage="0"]')!;
    expect(
      stage0Before.querySelector(".fc-transcribe-progress__stage-label")!
        .textContent,
    ).toBe("Clearing draft");

    // Deliver the clear-to-empty-scaffold stage event (stage 0, "cleared").
    expect(
      applyTranscribeEvent(handle, {
        tool: "transcribe_site",
        stage: 0,
        status: "cleared",
      }),
    ).toBe(true);

    // Stage 0 row is now "cleared"; later stages remain pending.
    expect(
      root
        .querySelector('[data-fc-transcribe-stage="0"]')!
        .getAttribute("data-fc-transcribe-stage-status"),
    ).toBe("cleared");
    for (const stage of [1, 2, 3, 4]) {
      expect(
        root
          .querySelector(`[data-fc-transcribe-stage="${stage}"]`)!
          .getAttribute("data-fc-transcribe-stage-status"),
      ).toBe("pending");
    }

    // Same card instance + same stage-0 node — mutated, not replaced.
    expect(handle.card.root).toBe(root);
    expect(root.querySelector('[data-fc-transcribe-stage="0"]')).toBe(
      stage0Before,
    );
  });
});
