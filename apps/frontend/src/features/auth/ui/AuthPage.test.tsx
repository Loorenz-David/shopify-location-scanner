import { render, screen, fireEvent } from "@testing-library/react";
import { it, expect, vi } from "vitest";
import { AuthPage } from "./AuthPage";
it("offers login only and submits existing credentials", () => {
  const onLogin = vi.fn().mockResolvedValue(undefined);
  render(<AuthPage isLoading={false} errorMessage={null} onLogin={onLogin} />);
  expect(screen.queryByText(/register/i)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Username"), {
    target: { value: "existing" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(onLogin).toHaveBeenCalledWith({
    username: "existing",
    password: "password123",
  });
});
