import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { homeShellActions } from "../../home/actions/home-shell.actions";
import { settingsActions } from "../../settings/actions/settings.actions";
import { SettingsPageContext } from "../../settings/context/settings-page-context";
import { SettingsPage } from "../../settings/ui/SettingsPage";

describe("stock settings rows (D5)", () => {
  it("C1: renders both stock rows and each navigates to its page id", async () => {
    const selectSpy = vi
      .spyOn(homeShellActions, "selectNavigationPage")
      .mockImplementation(() => undefined);

    render(
      <SettingsPageContext.Provider
        value={{
          profile: null,
          isProfileLoading: true,
          profileError: null,
          bootstrapLastSyncedAt: null,
          scannerOnScanAsk: false,
          isLogoutPending: false,
          logoutError: null,
          openOption: settingsActions.openOption,
          setScannerOnScanAsk: () => undefined,
          logout: async () => undefined,
        }}
      >
        <SettingsPage />
      </SettingsPageContext.Provider>,
    );

    const reportRow = screen.getByRole("button", { name: "Stock report" });
    const locationsRow = screen.getByRole("button", { name: "Stock locations" });

    await userEvent.click(reportRow);
    expect(selectSpy).toHaveBeenLastCalledWith("settings-stock-report");

    await userEvent.click(locationsRow);
    expect(selectSpy).toHaveBeenLastCalledWith("settings-stock-locations");

    expect(selectSpy).toHaveBeenCalledTimes(2);
  });
});
