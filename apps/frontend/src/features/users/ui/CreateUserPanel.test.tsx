import { createRef } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { CreateUserPanel } from "./CreateUserPanel";
import { usersActions } from "../actions/users.actions";

vi.mock("../actions/users.actions", () => ({
  usersActions: { createUser: vi.fn() },
}));

function setup() {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const trigger = document.createElement("button");
  document.body.append(trigger);
  const ref = createRef<HTMLButtonElement>();
  ref.current = trigger;
  const view = render(
    <CreateUserPanel
      onClose={onClose}
      onCreated={onCreated}
      returnFocusRef={ref}
    />,
  );
  return { ...view, onClose, onCreated, trigger };
}
function fill(username = "  new-user  ", password = " password123 ") {
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: username },
  });
  fireEvent.change(screen.getByLabelText(/^Password/), {
    target: { value: password },
  });
}
beforeEach(() => vi.clearAllMocks());
describe("Create user form", () => {
  it("validates, trims username, preserves password, and defaults to worker", async () => {
    const { onCreated } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Username must");
    fill("person", "short");
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Password must");
    fill();
    vi.mocked(usersActions.createUser).mockResolvedValueOnce();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(usersActions.createUser).toHaveBeenCalledWith({
      username: "new-user",
      password: " password123 ",
      role: "worker",
    });
  });
  it("blocks duplicate submission and dismissal while saving, then permits retry", async () => {
    const { onClose, onCreated } = setup();
    let reject!: (reason: Error) => void;
    vi.mocked(usersActions.createUser).mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    fill();
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "manager" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    reject(new Error("Username already exists"));
    await screen.findByText("Username already exists");
    expect(screen.getByLabelText("Username")).toHaveValue("  new-user  ");
    vi.mocked(usersActions.createUser).mockResolvedValueOnce();
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    expect(usersActions.createUser).toHaveBeenLastCalledWith(
      expect.objectContaining({ role: "manager" }),
    );
  });
  it("focuses username, traps tab, handles Escape and restores focus", () => {
    const { onClose, unmount, trigger } = setup();
    expect(screen.getByLabelText("Username")).toHaveFocus();
    screen.getByRole("button", { name: "Create user" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(
      screen.getByRole("button", { name: "Close create user" }),
    ).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
