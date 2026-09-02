import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { stockActions } from "../actions/stock.actions";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { stockReportFixture } from "../api/mocks/get-stock-report.fixture";
import { STOCK_STATES } from "../domain/stock-states.domain";
import { useStockReportStore } from "../stores/stock-report.store";
import type { StockPdfRenderHandle } from "../controllers/stock-report.controller";
import type { StockFilterState, StockState } from "../types/stock.types";

// The sheet's only seam onto react-pdf is the render hook; mocking it keeps the
// heavy dependency (and its font loading) out of these tests and lets each row
// choose the handle state it needs.
vi.mock("./pdf/use-stock-pdf-render", () => ({
  useStockPdfRenderHandle: vi.fn(),
}));

import { useStockPdfRenderHandle } from "./pdf/use-stock-pdf-render";
import { GeneratePdfSheet } from "./GeneratePdfSheet";

const useRenderHandle = vi.mocked(useStockPdfRenderHandle);

const FAINT_CLASS = "text-[var(--stock-faint)]";

const loadingHandle: StockPdfRenderHandle = {
  blob: null,
  loading: true,
  error: null,
  url: null,
};

// A blob that carries only what the read-back parses: pdfkit's page-tree root. The
// count is deliberately neither 1 (a default the component could fall back to) nor
// what the five-entry fixture would actually render (one page).
function pdfBlob(pageCount: number): Blob {
  return new Blob(
    [`%PDF-1.3\n1 0 obj\n<< /Type /Pages /Count ${pageCount} /Kids [] >>\nendobj\n`],
    { type: "application/pdf" },
  );
}

function readyHandle(blob = pdfBlob(3)): StockPdfRenderHandle {
  return { blob, loading: false, error: null, url: "blob:stock-report" };
}

function seededFilter(states: readonly StockState[]): StockFilterState {
  return { states: new Set(states), locations: new Set<string>(), groupByLocation: false };
}

// Mirrors the pill's path: the report is loaded, the export is initialised from the
// applied filter, then the sheet mounts.
function openSheet(handle: StockPdfRenderHandle, states: readonly StockState[] = STOCK_STATES) {
  useRenderHandle.mockReturnValue(handle);
  const store = useStockReportStore.getState();
  store.setEntries(stockReportFixture);
  store.setOptions(stockOptionsFixture);
  store.setAppliedFilter(seededFilter(states));
  stockActions.initializePdfExport();
  const onClose = vi.fn();
  render(<GeneratePdfSheet onClose={onClose} />);
  return { onClose };
}

function chips(): HTMLElement[] {
  return screen.getAllByTestId("stock-pdf-state-chip");
}

function shareButton(): HTMLElement {
  return screen.getByRole("button", { name: "Generate & share" });
}

function previewButton(): HTMLElement {
  return screen.getByRole("button", { name: "Preview" });
}

describe("GeneratePdfSheet (screen 05)", () => {
  beforeEach(() => {
    useStockReportStore.getState().reset();
    useRenderHandle.mockReset();
  });

  it("C3: the subtitle shows the page count read back from the rendered blob", async () => {
    openSheet(readyHandle(pdfBlob(3)));

    await screen.findByText("A4 · 3 pages · sections per state");
    expect(useStockReportStore.getState().exportState.pageCount).toBe(3);
  });

  it("C4(a): chips mirror the active filter's states in state order", () => {
    const included = [STOCK_STATES[0]!, STOCK_STATES[2]!];
    openSheet(readyHandle(), included);

    expect(chips().map((chip) => chip.getAttribute("data-state"))).toEqual([...STOCK_STATES]);
    expect(
      chips()
        .filter((chip) => chip.getAttribute("aria-pressed") === "true")
        .map((chip) => chip.getAttribute("data-state")),
    ).toEqual(included);
  });

  it("C4(b): excluded states render with the faint style class, included ones without it", () => {
    openSheet(readyHandle(), [STOCK_STATES[0]!, STOCK_STATES[2]!]);

    for (const chip of chips()) {
      const isIncluded = chip.getAttribute("aria-pressed") === "true";
      if (isIncluded) {
        expect(chip).not.toHaveClass(FAINT_CLASS);
      } else {
        expect(chip).toHaveClass(FAINT_CLASS);
      }
    }
    expect(chips().filter((chip) => chip.classList.contains(FAINT_CLASS))).toHaveLength(3);
  });

  it("C4(c): toggles and chips call the P8 export actions and leave the report query untouched", async () => {
    const user = userEvent.setup();
    const setQuery = vi.spyOn(stockActions, "setPdfExportQuery");
    const setGroupBy = vi.spyOn(stockActions, "setPdfExportGroupByLocation");
    const toggleState = vi.spyOn(stockActions, "togglePdfExportState");
    const setReportFilter = vi.spyOn(stockActions, "setReportFilter");
    openSheet(readyHandle());
    const before = useStockReportStore.getState().appliedFilter;

    await user.click(screen.getByRole("checkbox", { name: "Include missing totals" }));
    expect(setQuery).toHaveBeenLastCalledWith({ includeSummaryCounts: false });

    await user.click(screen.getByRole("checkbox", { name: "Show contributing locations" }));
    expect(setQuery).toHaveBeenLastCalledWith({ showContributingLocations: false });

    await user.click(screen.getByRole("checkbox", { name: "Group by location" }));
    expect(setGroupBy).toHaveBeenLastCalledWith(true);

    await user.click(chips()[1]!);
    expect(toggleState).toHaveBeenLastCalledWith(STOCK_STATES[1]);

    const query = useStockReportStore.getState().exportState.query!;
    expect(query.includeSummaryCounts).toBe(false);
    expect(query.showContributingLocations).toBe(false);
    expect(query.groupByLocation).toBe(true);
    expect(query.states.has(STOCK_STATES[1]!)).toBe(false);
    expect(chips()[1]).toHaveAttribute("aria-pressed", "false");

    const after = useStockReportStore.getState().appliedFilter;
    expect(after).toBe(before);
    expect(after.groupByLocation).toBe(false);
    expect([...after.states]).toEqual([...STOCK_STATES]);
    expect(setReportFilter).not.toHaveBeenCalled();
  });

  it("C5(share): Generate & share calls the share action exactly once and not preview", async () => {
    const user = userEvent.setup();
    const share = vi.spyOn(stockActions, "generateAndSharePdf").mockResolvedValue({
      blob: pdfBlob(3),
      filename: "beyo-stock.pdf",
      method: "shared",
    });
    const preview = vi.spyOn(stockActions, "previewPdf").mockResolvedValue({
      blob: pdfBlob(3),
      filename: "beyo-stock.pdf",
      method: "previewed",
    });
    openSheet(readyHandle());

    await user.click(shareButton());

    expect(share).toHaveBeenCalledTimes(1);
    expect(preview).not.toHaveBeenCalled();
  });

  it("C5(preview): Preview calls the preview action exactly once and not share", async () => {
    const user = userEvent.setup();
    const share = vi.spyOn(stockActions, "generateAndSharePdf").mockResolvedValue({
      blob: pdfBlob(3),
      filename: "beyo-stock.pdf",
      method: "shared",
    });
    const preview = vi.spyOn(stockActions, "previewPdf").mockResolvedValue({
      blob: pdfBlob(3),
      filename: "beyo-stock.pdf",
      method: "previewed",
    });
    openSheet(readyHandle());

    await user.click(previewButton());

    expect(preview).toHaveBeenCalledTimes(1);
    expect(share).not.toHaveBeenCalled();
  });

  it("C7(loading): both actions are disabled while the render handle is loading", () => {
    openSheet(loadingHandle);

    expect(shareButton()).toBeDisabled();
    expect(previewButton()).toBeDisabled();
  });

  it("C7(ready): both actions are enabled once the handle holds a blob", async () => {
    openSheet(readyHandle());

    await waitFor(() => expect(shareButton()).toBeEnabled());
    expect(previewButton()).toBeEnabled();
  });

  it("C8: share is invoked synchronously in the tap handler with the rendered handle", () => {
    const handle = readyHandle();
    const share = vi.spyOn(stockActions, "generateAndSharePdf").mockResolvedValue({
      blob: handle.blob!,
      filename: "beyo-stock.pdf",
      method: "shared",
    });
    openSheet(handle);

    // fireEvent dispatches synchronously; nothing is awaited between the click and
    // the assertion, so an `await` inside the handler would leave the spy uncalled.
    fireEvent.click(shareButton());

    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0]![0]).toBe(handle);
    expect(share.mock.calls[0]![0].blob).toBe(handle.blob);
  });
});

describe("GeneratePdfSheet — P7 count mode (C7(d))", () => {
  beforeEach(() => {
    useStockReportStore.getState().reset();
    vi.clearAllMocks();
  });

  function modeButton(mode: "instances" | "units"): HTMLElement {
    return screen
      .getAllByTestId("stock-pdf-count-mode")
      .find((button) => button.getAttribute("data-count-mode") === mode)!;
  }

  it("C7(d): opens seeded with the report's mode and flips its own query without touching the report", async () => {
    useStockReportStore.getState().setCountMode("units");
    openSheet(readyHandle());

    expect(modeButton("units")).toHaveAttribute("aria-pressed", "true");
    expect(modeButton("instances")).toHaveAttribute("aria-pressed", "false");
    expect(useStockReportStore.getState().exportState.query?.countMode).toBe("units");

    await userEvent.click(modeButton("instances"));

    await waitFor(() =>
      expect(useStockReportStore.getState().exportState.query?.countMode).toBe("instances"),
    );
    expect(modeButton("instances")).toHaveAttribute("aria-pressed", "true");
    expect(useStockReportStore.getState().countMode).toBe("units");
    expect(useStockReportStore.getState().appliedFilter).toEqual(seededFilter(STOCK_STATES));
  });
});
