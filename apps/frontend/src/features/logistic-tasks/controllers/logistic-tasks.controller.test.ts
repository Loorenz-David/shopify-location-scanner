import { beforeEach, describe, expect, it, vi } from "vitest";
import * as countsApi from "../api/get-logistic-intention-counts.api";
import * as tasksApi from "../api/get-logistic-tasks.api";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import type { GetLogisticTasksResponseDto, LogisticTaskItemDto } from "../types/logistic-tasks.dto";
import {
  loadLogisticTasksController,
  loadMoreLogisticTasksController,
} from "./logistic-tasks.controller";

function page(start: number, count: number, nextCursor: string | null): GetLogisticTasksResponseDto {
  const items: LogisticTaskItemDto[] = Array.from({ length: count }, (_, offset) => ({
    id: `item-${start + offset}`,
    productId: `product-${start + offset}`,
    itemSku: null,
    itemBarcode: null,
    itemImageUrl: null,
    itemCategory: null,
    properties: null,
    itemType: "product",
    itemTitle: "Item",
    quantity: 1,
    latestLocation: null,
    orderId: null,
    orderNumber: null,
    intention: "store_pickup",
    fixItem: false,
    scheduledDate: null,
    lastLogisticEventType: "marked_intention",
    isItemFixed: false,
    fixNotes: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    logisticEvent: null,
  }));
  return { orders: [{ orderId: null, items }], hasMore: nextCursor !== null, nextCursor };
}

describe("logistic task intention totals", () => {
  beforeEach(() => {
    useLogisticTasksStore.getState().reset();
    vi.restoreAllMocks();
  });

  it("shows the server total before loading later pages and keeps it after Show more", async () => {
    const list = vi.spyOn(tasksApi, "getLogisticTasksApi")
      .mockResolvedValueOnce(page(0, 20, "next"))
      .mockResolvedValueOnce(page(20, 15, null));
    const counts = vi.spyOn(countsApi, "getLogisticIntentionCountsApi")
      .mockResolvedValue({ counts: { store_pickup: 35 } });
    const filters = { lastLogisticEventType: "marked_intention" as const };

    await loadLogisticTasksController(filters);
    await vi.waitFor(() => expect(useLogisticTasksStore.getState().intentionCounts.store_pickup).toBe(35));
    expect(useLogisticTasksStore.getState().items).toHaveLength(20);
    expect(counts).toHaveBeenCalledWith(filters, "");

    await loadMoreLogisticTasksController();
    expect(useLogisticTasksStore.getState().items).toHaveLength(35);
    expect(useLogisticTasksStore.getState().intentionCounts.store_pickup).toBe(35);
    expect(counts).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledTimes(2);
  });
});
