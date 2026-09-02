import { describe, expect, it, vi } from "vitest";

// Plan 9 C6: react-pdf is the heaviest dependency in the app and must reach the report
// page only through the sheet's dynamic import. The mock factory is the instrument —
// vitest runs it the first time any module in the graph imports the package — so a
// static import anywhere under `StockReportPage` flips the flag before the page
// module has finished evaluating.
const probe = vi.hoisted(() => ({ isEvaluated: false }));

vi.mock("@react-pdf/renderer", () => {
  probe.isEvaluated = true;
  return {
    Document: () => null,
    Page: () => null,
    Text: () => null,
    View: () => null,
    Font: { register: () => undefined, registerHyphenationCallback: () => undefined },
    StyleSheet: { create: (styles: unknown) => styles },
    usePDF: () => [{ blob: null, loading: false, error: null, url: null }, () => undefined],
  };
});

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

describe("plan 9 C6: react-pdf stays out of the report page's static import graph", () => {
  it("importing StockReportPage leaves @react-pdf/renderer unevaluated; the lazy seam evaluates it", async () => {
    await import("./StockReportPage");
    expect(probe.isEvaluated).toBe(false);

    // Positive control on the same instrument: the seam behind the dynamic import is
    // exactly where the package is meant to load.
    await import("./pdf/use-stock-pdf-render");
    expect(probe.isEvaluated).toBe(true);
  });
});
