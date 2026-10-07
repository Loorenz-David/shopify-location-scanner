import { render, screen, fireEvent } from "@testing-library/react";
import { vi, it, expect } from "vitest";
import { UsersSettingsPage } from "./UsersSettingsPage";
import { RoleContextProvider } from "../../role-context/providers/RoleContextProvider";
vi.mock("../flows/use-users.flow", () => ({
  useUsersFlow: () => ({
    users: [],
    isLoading: false,
    hasLoaded: true,
    errorMessage: null,
  }),
}));
vi.mock("../../home/ui/SlidingOverlayContainer", () => ({
  SlidingOverlayContainer: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div>{children}</div> : null),
}));
it.each(["admin", "manager", "worker", "seller"] as const)(
  "shows creation only to admin and manager: %s",
  (role) => {
    render(
      <RoleContextProvider
        user={{ id: "actor", username: "actor", shopId: "shop", role }}
      >
        <UsersSettingsPage />
      </RoleContextProvider>,
    );
    const button = screen.queryByRole("button", { name: /Create user/ });
    if (role === "admin" || role === "manager") {
      expect(button).toBeInTheDocument();
      fireEvent.click(button!);
      expect(screen.getByLabelText("Role")).toHaveValue("worker");
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(
        role === "manager"
          ? ["Worker", "Seller"]
          : ["Admin", "Manager", "Worker", "Seller"],
      );
    } else expect(button).not.toBeInTheDocument();
  },
);
