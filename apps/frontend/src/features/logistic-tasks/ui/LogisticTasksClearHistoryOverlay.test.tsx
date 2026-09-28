import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as clearApi from "../api/task-clear.api";
import * as queueRefresh from "../flows/refresh-task-queue";
import { LogisticTasksClearHistoryOverlay } from "./LogisticTasksClearHistoryOverlay";

const batch: clearApi.TaskClearBatch = {
  id: "batch-1",
  actorName: "Manager",
  createdAt: "2026-09-28T10:00:00.000Z",
  note: "Starting fresh",
  clearedCount: 2,
  remainingCount: 2,
};

describe("cleared-task history", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(queueRefresh, "refreshTaskQueue").mockResolvedValue();
    vi.spyOn(clearApi, "getTaskClearBatchesApi").mockResolvedValue({ batches: [batch], nextCursor: null });
  });

  it("shows a batch, restores one task, and updates its status", async () => {
    const detail = vi.spyOn(clearApi, "getTaskClearBatchItemsApi")
      .mockResolvedValueOnce({
        batch,
        items: [{ id: "item-1", sku: "SKU-1", title: "Chair", orderNumber: 5, intention: "store_pickup", currentStatus: "dismissed", canRestore: true }],
        nextCursor: null,
      })
      .mockResolvedValueOnce({
        batch: { ...batch, remainingCount: 1 },
        items: [{ id: "item-1", sku: "SKU-1", title: "Chair", orderNumber: 5, intention: "store_pickup", currentStatus: "marked_intention", canRestore: false }],
        nextCursor: null,
      });
    const restore = vi.spyOn(clearApi, "restoreTaskClearItemApi")
      .mockResolvedValue({ restoredCount: 1, skippedCount: 0 });

    render(<LogisticTasksClearHistoryOverlay onClose={vi.fn()} />);
    await userEvent.click(await screen.findByRole("button", { name: /2 cleared · 2 still cleared/i }));
    const item = await screen.findByText("Chair");
    await userEvent.click(within(item.closest("div.rounded-xl") as HTMLElement).getByRole("button", { name: "Restore" }));

    expect(restore).toHaveBeenCalledWith("batch-1", "item-1");
    expect(await screen.findByText("1 restored.")).toBeInTheDocument();
    expect(detail).toHaveBeenCalledTimes(2);
    expect(screen.getByText("1 still cleared")).toBeInTheDocument();
  });

  it("navigates back from a batch, then closes history", async () => {
    vi.spyOn(clearApi, "getTaskClearBatchItemsApi").mockResolvedValue({
      batch,
      items: [],
      nextCursor: null,
    });
    const onClose = vi.fn();

    render(<LogisticTasksClearHistoryOverlay onClose={onClose} />);
    await userEvent.click(await screen.findByRole("button", { name: /2 cleared · 2 still cleared/i }));
    await userEvent.click(screen.getByRole("button", { name: "Back to clear operations" }));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Back to tasks" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
