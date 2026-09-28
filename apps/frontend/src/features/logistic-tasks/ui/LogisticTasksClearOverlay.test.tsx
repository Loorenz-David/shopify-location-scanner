import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as clearApi from "../api/task-clear.api";
import * as queueRefresh from "../flows/refresh-task-queue";
import { LogisticTasksClearOverlay } from "./LogisticTasksClearOverlay";

describe("clear pending tasks", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(queueRefresh, "refreshTaskQueue").mockResolvedValue();
  });

  it("confirms the shop-wide preview count with the optional note", async () => {
    vi.spyOn(clearApi, "getTaskClearPreviewApi").mockResolvedValue({
      asOf: "2026-09-28T10:00:00.000Z",
      count: 42,
      byIntention: { store_pickup: 40, local_delivery: 2 },
    });
    const clear = vi.spyOn(clearApi, "clearPendingTasksApi")
      .mockResolvedValue({ batchId: "batch-1", clearedCount: 42 });

    render(<LogisticTasksClearOverlay onClose={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Confirm clear 42 tasks" })).toBeInTheDocument();
    expect(screen.getByText(/outside the current search, filters, tab, or loaded page/i)).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Note (optional)" }), "Starting fresh");
    await userEvent.click(screen.getByRole("button", { name: "Confirm clear 42 tasks" }));

    expect(clear).toHaveBeenCalledWith({
      asOf: "2026-09-28T10:00:00.000Z",
      expectedCount: 42,
      note: "Starting fresh",
    });
    expect(await screen.findByText("42 pending tasks cleared")).toBeInTheDocument();
  });

  it("requires a fresh preview after a conflict", async () => {
    const preview = vi.spyOn(clearApi, "getTaskClearPreviewApi")
      .mockResolvedValue({ asOf: "2026-09-28T10:00:00.000Z", count: 2, byIntention: { store_pickup: 2 } });
    vi.spyOn(clearApi, "clearPendingTasksApi").mockRejectedValue(new Error("conflict"));

    render(<LogisticTasksClearOverlay onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Confirm clear 2 tasks" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/refresh the count/i);
    await userEvent.click(screen.getByRole("button", { name: "Refresh count" }));
    expect(preview).toHaveBeenCalledTimes(2);
  });

  it("keeps the success result when the list refresh fails", async () => {
    vi.spyOn(clearApi, "getTaskClearPreviewApi")
      .mockResolvedValue({ asOf: "2026-09-28T10:00:00.000Z", count: 1, byIntention: { store_pickup: 1 } });
    vi.spyOn(clearApi, "clearPendingTasksApi")
      .mockResolvedValue({ batchId: "batch-1", clearedCount: 1 });
    vi.spyOn(queueRefresh, "refreshTaskQueue").mockRejectedValue(new Error("offline"));

    render(<LogisticTasksClearOverlay onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Confirm clear 1 tasks" }));

    expect(await screen.findByText("1 pending tasks cleared")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(/task list did not refresh/i);
  });

  it("closes from the back-arrow header", async () => {
    vi.spyOn(clearApi, "getTaskClearPreviewApi")
      .mockResolvedValue({ asOf: "2026-09-28T10:00:00.000Z", count: 0, byIntention: {} });
    const onClose = vi.fn();

    render(<LogisticTasksClearOverlay onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Back to tasks" }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
