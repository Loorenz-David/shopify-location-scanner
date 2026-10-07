import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { UsersSettingsPage } from "./UsersSettingsPage";
import { RoleContextProvider } from "../../role-context/providers/RoleContextProvider";
import { useUsersStore } from "../stores/users.store";
import { createUserApi } from "../api/create-user.api";
vi.mock("../api/create-user.api", () => ({ createUserApi: vi.fn() }));
vi.mock("../../home/ui/SlidingOverlayContainer", () => ({
  SlidingOverlayContainer: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <div>{children}</div> : null),
}));
it("creates a user through the feature flow, updates the list, and resets the panel", async () => {
  useUsersStore.getState().hydrateAndFinish([]);
  vi.mocked(createUserApi).mockResolvedValue({
    user: {
      id: "created",
      username: "new-worker",
      role: "worker",
      shopId: "shop",
      createdAt: new Date().toISOString(),
    },
  });
  render(
    <RoleContextProvider
      user={{ id: "actor", username: "actor", shopId: "shop", role: "admin" }}
    >
      <UsersSettingsPage />
    </RoleContextProvider>,
  );
  const open = screen.getByRole("button", { name: "Create user" });
  fireEvent.click(open);
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "new-worker" },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: "password123" },
  });
  fireEvent.click(
    screen.getAllByRole("button", { name: "Create user" }).at(-1)!,
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "User created successfully",
    ),
  );
  expect(screen.getByText("new-worker")).toBeInTheDocument();
  expect(screen.queryByLabelText("Username")).not.toBeInTheDocument();
  expect(open).toHaveFocus();
  fireEvent.click(open);
  expect(screen.getByLabelText("Username")).toHaveValue("");
  expect(screen.getByLabelText(/^Password/)).toHaveValue("");
});
