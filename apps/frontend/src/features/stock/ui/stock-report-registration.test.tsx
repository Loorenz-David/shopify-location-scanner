import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { homeShellActions } from "../../home/actions/home-shell.actions";
import { HomeFeature } from "../../home/HomeFeature";
import { RoleContextProvider } from "../../role-context/providers/RoleContextProvider";
import { useStockNavigationStore } from "../stores/stock-navigation.store";
import { useStockReportStore } from "../stores/stock-report.store";

vi.mock("../../../core/ws-client/use-ws-event", () => ({
  useWsEvent: vi.fn(),
}));

// Plan 7 C9: the Settings `Stock report` row has been dead since P5 — the row existed and
// the facade call fired, but `HomeFeature`'s registry had no `settings-stock-report` entry,
// so tapping it did nothing and nothing errored. P5's C1 asserted the facade call and passed
// anyway. This test goes through the real shell: the Settings page's own row, the shell's
// registry, the lazy chunk, and asserts the report page's own heading is on screen.
describe("settings-stock-report registration (plan 7 C9)", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_STOCK_API_MODE", "mock");
    useStockNavigationStore.getState().reset();
    useStockReportStore.getState().reset();
  });

  it("C9: tapping the Settings `Stock report` row renders the report page's own heading", async () => {
    render(
      <RoleContextProvider user={{ id: "u1", username: "owner", role: "admin", shopId: null }}>
        <HomeFeature onLogout={() => undefined} />
      </RoleContextProvider>,
    );

    homeShellActions.selectNavigationPage("settings");
    await userEvent.click(await screen.findByRole("button", { name: "Stock report" }));

    expect(await screen.findByRole("heading", { name: "Stock report" })).toBeInTheDocument();
    // and it is the report itself, not a loading or error state
    await screen.findAllByTestId("stock-report-row");
  });
});
